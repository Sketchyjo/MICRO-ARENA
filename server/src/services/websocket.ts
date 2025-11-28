import { Server as SocketIOServer, Socket } from 'socket.io';
import { MatchmakingService } from './matchmaking';
import { GameStateManager } from './gameStateManager';
import { websocketLogger } from '../utils/logger';
import { verifySignature } from '../utils/auth';
import { createUser } from '../database/db';

const matchmaking = new MatchmakingService();
const gameStateManager = new GameStateManager();

// Rate limiting
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(socketId: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const userLimit = rateLimits.get(socketId);

    if (!userLimit || now > userLimit.resetTime) {
        rateLimits.set(socketId, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (userLimit.count >= limit) {
        return false;
    }

    userLimit.count++;
    return true;
}

export function initializeWebSocket(io: SocketIOServer) {
    // Authentication middleware (optional - actual auth happens via auth:connect)
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            // Token is optional - we'll authenticate via auth:connect event
            if (token) {
                // Verify token/signature here if needed
                websocketLogger.info('Token provided in handshake');
            }
            next();
        } catch (error) {
            websocketLogger.error('Authentication middleware error:', error);
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket: Socket) => {
        websocketLogger.info(`Client connected: ${socket.id}`);

        // Store player address
        let playerAddress: string | null = null;
        let isAuthenticated = false;

        // Authentication
        socket.on('auth:connect', async (data: { address: string; signature?: string; message?: string }) => {
            try {
                if (!checkRateLimit(socket.id, 5, 60000)) {
                    socket.emit('auth:error', { error: 'Rate limit exceeded' });
                    return;
                }

                // Verify signature if provided
                if (data.signature && data.message) {
                    const isValid = await verifySignature(data.address, data.message, data.signature);
                    if (!isValid) {
                        socket.emit('auth:error', { error: 'Invalid signature' });
                        return;
                    }
                }

                playerAddress = data.address;
                isAuthenticated = true;
                socket.data.playerAddress = data.address;

                // Create user if doesn't exist
                await createUser(data.address);

                websocketLogger.info(`Player authenticated: ${data.address}`);
                socket.emit('auth:success', { address: data.address });
            } catch (error) {
                websocketLogger.error('Authentication error:', error);
                socket.emit('auth:error', { error: 'Authentication failed' });
            }
        });

        // Matchmaking events
        socket.on('matchmaking:search', async (data: { gameType: string; stake: string; playerAddress: string }) => {
            try {
                websocketLogger.info(`Received matchmaking:search`, {
                    gameType: data.gameType,
                    stake: data.stake,
                    playerAddress: data.playerAddress,
                    isAuthenticated,
                    socketPlayerAddress: playerAddress
                });

                if (!isAuthenticated || playerAddress !== data.playerAddress) {
                    websocketLogger.warn(`Authentication check failed`, {
                        isAuthenticated,
                        playerAddress,
                        dataPlayerAddress: data.playerAddress
                    });
                    socket.emit('matchmaking:error', { error: 'Not authenticated' });
                    return;
                }

                if (!checkRateLimit(socket.id, 3, 10000)) {
                    socket.emit('matchmaking:error', { error: 'Rate limit exceeded' });
                    return;
                }

                websocketLogger.info(`Processing matchmaking search: ${data.gameType} - ${data.stake} cUSD`, { playerAddress });

                const match = await matchmaking.findOrCreateMatch(
                    data.gameType,
                    data.stake,
                    data.playerAddress,
                    socket.id
                );

                if (match.status === 'found') {
                    // Notify both players
                    io.to(match.player1SocketId!).emit('matchmaking:found', {
                        matchId: match.matchId,
                        opponent: match.player2,
                        gameType: match.gameType,
                        stake: match.stake,
                    });

                    io.to(match.player2SocketId!).emit('matchmaking:found', {
                        matchId: match.matchId,
                        opponent: match.player1,
                        gameType: match.gameType,
                        stake: match.stake,
                    });

                    // Initialize game state
                    const gameState = await gameStateManager.createGameState(match.matchId!, match.gameType);
                    gameState.player1 = match.player1;
                    gameState.player2 = match.player2!;
                } else {
                    socket.emit('matchmaking:searching', {
                        message: 'Searching for opponent...',
                    });
                }
            } catch (error) {
                websocketLogger.error('Matchmaking error:', error);
                socket.emit('matchmaking:error', { error: 'Failed to find match' });
            }
        });

        socket.on('matchmaking:cancel', () => {
            if (playerAddress) {
                matchmaking.cancelSearch(playerAddress);
                socket.emit('matchmaking:cancelled');
            }
        });

        // Game events
        socket.on('game:move', async (data: { matchId: string; move: any; playerAddress: string }) => {
            try {
                if (!isAuthenticated || playerAddress !== data.playerAddress) {
                    socket.emit('game:error', { error: 'Not authenticated' });
                    return;
                }

                if (!checkRateLimit(socket.id, 30, 60000)) {
                    socket.emit('game:error', { error: 'Rate limit exceeded' });
                    return;
                }

                const { matchId, move, playerAddress: movePlayerAddress } = data;

                // Validate and apply move
                const result = await gameStateManager.applyMove(matchId, movePlayerAddress, move);

                if (result.valid) {
                    // Broadcast move to opponent
                    socket.broadcast.emit('game:opponent_move', {
                        matchId,
                        move,
                        gameState: result.gameState,
                    });

                    // Check if game is complete
                    if (result.gameComplete) {
                        io.emit('game:complete', {
                            matchId,
                            scores: result.scores,
                        });
                    }
                } else {
                    socket.emit('game:invalid_move', {
                        error: result.error,
                    });
                }
            } catch (error) {
                websocketLogger.error('Game move error:', error);
                socket.emit('game:error', { error: 'Failed to process move' });
            }
        });

        socket.on('game:resign', (data: { matchId: string; playerAddress: string }) => {
            const { matchId, playerAddress } = data;

            // Mark game as complete with opponent as winner
            gameStateManager.handleResignation(matchId, playerAddress);

            io.emit('game:resigned', {
                matchId,
                resignedPlayer: playerAddress,
            });
        });

        socket.on('game:chat', (data: { matchId: string; message: string; playerAddress: string }) => {
            // Broadcast chat message to match participants
            socket.broadcast.emit('game:chat_message', {
                matchId: data.matchId,
                sender: data.playerAddress,
                message: data.message,
                timestamp: Date.now(),
            });
        });

        // Spectator events
        socket.on('spectator:join', async (data: { matchId: string }) => {
            const gameState = await gameStateManager.getGameState(data.matchId);
            if (gameState) {
                socket.join(`match:${data.matchId}`);
                socket.emit('spectator:state', { gameState });
            }
        });

        // Disconnect handling
        socket.on('disconnect', () => {
            websocketLogger.info(`Client disconnected: ${socket.id}`, { playerAddress });
            rateLimits.delete(socket.id);

            if (playerAddress) {
                matchmaking.handleDisconnect(playerAddress);
            }
        });

        // Error handling
        socket.on('error', (error) => {
            websocketLogger.error('Socket error:', error);
        });
    });

    // Periodic cleanup of stale matches
    setInterval(() => {
        matchmaking.cleanupStaleMatches();
    }, 60000); // Every minute
}
