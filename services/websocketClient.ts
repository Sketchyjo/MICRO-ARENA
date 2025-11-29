import { io, Socket } from 'socket.io-client';

class WebSocketClient {
    public socket: Socket | null = null;
    private serverUrl: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor() {
        this.serverUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';
    }

    /**
     * Connect to WebSocket server
     */
    connect(playerAddress: string): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('🔌 Connecting to WebSocket:', this.serverUrl);
            console.log('🔌 Player address:', playerAddress);

            this.socket = io(this.serverUrl, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
            });

            this.socket.on('connect', () => {
                console.log('✅ WebSocket connected to', this.serverUrl);
                console.log('✅ Socket ID:', this.socket?.id);
                this.reconnectAttempts = 0;

                // Authenticate
                console.log('🔐 Authenticating with address:', playerAddress);
                this.socket!.emit('auth:connect', { address: playerAddress });
                resolve();
            });

            this.socket.on('auth:success', (data) => {
                console.log('✅ Authenticated successfully:', data.address);
            });

            this.socket.on('auth:error', (data) => {
                console.error('❌ Authentication error:', data.error);
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ WebSocket connection error:', error);
                console.error('❌ Error message:', error.message);
                this.reconnectAttempts++;

                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    reject(new Error('Failed to connect to server'));
                }
            });

            this.socket.on('disconnect', (reason) => {
                console.log('🔌 WebSocket disconnected:', reason);
            });
        });
    }

    /**
     * Search for a match
     */
    searchMatch(gameType: string, stake: string, playerAddress: string, blockchainMatchId: string): void {
        if (!this.socket) throw new Error('Not connected');

        console.log('🔍 Searching for match:', { gameType, stake, playerAddress, blockchainMatchId });
        this.socket.emit('matchmaking:search', {
            gameType,
            stake,
            playerAddress,
            blockchainMatchId,
        });
    }

    /**
     * Cancel matchmaking search
     */
    cancelSearch(): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.emit('matchmaking:cancel');
    }

    /**
     * Send a game move
     */
    sendMove(matchId: string, move: any, playerAddress: string): void {
        if (!this.socket) throw new Error('Not connected');

        this.socket.emit('game:move', {
            matchId,
            move,
            playerAddress,
        });
    }

    /**
     * Resign from game
     */
    resignGame(matchId: string, playerAddress: string): void {
        if (!this.socket) throw new Error('Not connected');

        this.socket.emit('game:resign', {
            matchId,
            playerAddress,
        });
    }

    /**
     * Send chat message
     */
    sendChat(matchId: string, message: string, playerAddress: string): void {
        if (!this.socket) throw new Error('Not connected');

        this.socket.emit('game:chat', {
            matchId,
            message,
            playerAddress,
        });
    }

    /**
     * Join as spectator
     */
    joinAsSpectator(matchId: string): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.emit('spectator:join', { matchId });
    }

    /**
     * Listen for matchmaking events
     */
    onMatchFound(callback: (data: any) => void): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.on('matchmaking:found', callback);
    }

    onMatchSearching(callback: (data: any) => void): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.on('matchmaking:searching', callback);
    }

    onMatchError(callback: (data: any) => void): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.on('matchmaking:error', callback);
    }

    /**
     * Listen for game events
     */
    onOpponentMove(callback: (data: any) => void): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.on('game:opponent_move', callback);
    }

    onGameComplete(callback: (data: any) => void): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.on('game:complete', callback);
    }

    onGameResigned(callback: (data: any) => void): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.on('game:resigned', callback);
    }

    onInvalidMove(callback: (data: any) => void): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.on('game:invalid_move', callback);
    }

    onChatMessage(callback: (data: any) => void): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.on('game:chat_message', callback);
    }

    /**
     * Listen for spectator events
     */
    onSpectatorState(callback: (data: any) => void): void {
        if (!this.socket) throw new Error('Not connected');
        this.socket.on('spectator:state', callback);
    }

    /**
     * Remove event listener
     */
    off(event: string, callback?: any): void {
        if (!this.socket) return;
        this.socket.off(event, callback);
    }

    /**
     * Disconnect from server
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const websocketClient = new WebSocketClient();
