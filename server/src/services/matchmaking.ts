import { createMatch, getUserStats } from '../database/db';
import { matchmakingLogger } from '../utils/logger';

interface MatchmakingQueue {
    gameType: string;
    stake: string;
    playerAddress: string;
    socketId: string;
    timestamp: number;
    eloRating: number;
}

interface Match {
    matchId?: string;
    gameType: string;
    stake: string;
    player1: string;
    player2?: string;
    player1SocketId?: string;
    player2SocketId?: string;
    status: 'searching' | 'found';
    createdAt: number;
}

export class MatchmakingService {
    private queue: Map<string, MatchmakingQueue[]> = new Map();
    private activeMatches: Map<string, Match> = new Map();
    private playerToMatch: Map<string, string> = new Map();

    /**
     * Find existing match or add player to queue
     */
    async findOrCreateMatch(
        gameType: string,
        stake: string,
        playerAddress: string,
        socketId: string
    ): Promise<Match> {
        const queueKey = `${gameType}:${stake}`;

        // Check if player is already in a match
        if (this.playerToMatch.has(playerAddress)) {
            const existingMatchId = this.playerToMatch.get(playerAddress)!;
            const existingMatch = this.activeMatches.get(existingMatchId);
            if (existingMatch) {
                return existingMatch;
            }
        }

        // Get player stats for ELO-based matching
        let playerElo = 1200; // Default ELO
        try {
            const stats = await getUserStats(playerAddress);
            if (stats) {
                playerElo = stats.elo_rating || 1200;
            }
        } catch (error) {
            matchmakingLogger.warn('Failed to get player stats:', error);
        }

        // Get or create queue for this game type and stake
        if (!this.queue.has(queueKey)) {
            this.queue.set(queueKey, []);
        }

        const gameQueue = this.queue.get(queueKey)!;

        // Try to find a match with similar stake and ELO
        const stakeNum = parseFloat(stake);
        const stakeTolerance = stakeNum * 0.1;
        const eloTolerance = 200; // ELO difference tolerance

        let bestMatch: { index: number; score: number } | null = null;

        for (let i = 0; i < gameQueue.length; i++) {
            const waiting = gameQueue[i];
            const waitingStake = parseFloat(waiting.stake);

            // Don't match with self
            if (waiting.playerAddress === playerAddress) continue;

            // Check stake similarity
            if (Math.abs(waitingStake - stakeNum) <= stakeTolerance) {
                // Calculate match score (lower is better)
                const stakeScore = Math.abs(waitingStake - stakeNum) / stakeNum;
                const eloScore = Math.abs(waiting.eloRating - playerElo) / 400; // Normalize ELO difference
                const timeScore = (Date.now() - waiting.timestamp) / (5 * 60 * 1000); // Waiting time bonus
                
                const totalScore = stakeScore + eloScore - timeScore;

                if (!bestMatch || totalScore < bestMatch.score) {
                    bestMatch = { index: i, score: totalScore };
                }
            }
        }

        if (bestMatch) {
            // Found a match!
            const waiting = gameQueue.splice(bestMatch.index, 1)[0];
            const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const match: Match = {
                matchId,
                gameType,
                stake,
                player1: waiting.playerAddress,
                player2: playerAddress,
                player1SocketId: waiting.socketId,
                player2SocketId: socketId,
                status: 'found',
                createdAt: Date.now(),
            };

            this.activeMatches.set(matchId, match);
            this.playerToMatch.set(waiting.playerAddress, matchId);
            this.playerToMatch.set(playerAddress, matchId);

            // Record match in database
            try {
                await createMatch(matchId, gameType, waiting.playerAddress, playerAddress, stake);
            } catch (error) {
                matchmakingLogger.error('Failed to record match in database:', error);
            }

            matchmakingLogger.info(`Match found: ${matchId}`, {
                player1: waiting.playerAddress,
                player2: playerAddress,
                gameType,
                stake
            });

            return match;
        }

        // No match found, add to queue
        gameQueue.push({
            gameType,
            stake,
            playerAddress,
            socketId,
            timestamp: Date.now(),
            eloRating: playerElo,
        });

        matchmakingLogger.info(`Player added to queue: ${playerAddress}`, {
            gameType,
            stake,
            eloRating: playerElo,
            queueSize: gameQueue.length
        });

        return {
            gameType,
            stake,
            player1: playerAddress,
            status: 'searching',
            createdAt: Date.now(),
        };
    }

    /**
     * Cancel matchmaking search
     */
    cancelSearch(playerAddress: string): void {
        // Remove from all queues
        for (const [queueKey, gameQueue] of this.queue.entries()) {
            const index = gameQueue.findIndex(q => q.playerAddress === playerAddress);
            if (index !== -1) {
                gameQueue.splice(index, 1);
                matchmakingLogger.info(`Cancelled search for: ${playerAddress}`, { queueKey });
            }
        }
    }

    /**
     * Handle player disconnect
     */
    handleDisconnect(playerAddress: string): void {
        this.cancelSearch(playerAddress);

        // Remove from active match tracking
        const matchId = this.playerToMatch.get(playerAddress);
        if (matchId) {
            this.playerToMatch.delete(playerAddress);
            // Note: Don't remove the match itself as it might be in progress
        }
    }

    /**
     * Clean up stale matches and queue entries
     */
    cleanupStaleMatches(): void {
        const now = Date.now();
        const QUEUE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        const MATCH_TIMEOUT = 30 * 60 * 1000; // 30 minutes

        let totalCleaned = 0;

        // Clean up queue
        for (const [queueKey, gameQueue] of this.queue.entries()) {
            const initialLength = gameQueue.length;
            const filtered = gameQueue.filter(q => now - q.timestamp < QUEUE_TIMEOUT);
            const cleaned = initialLength - filtered.length;
            
            if (cleaned > 0) {
                totalCleaned += cleaned;
                this.queue.set(queueKey, filtered);
            }
        }

        // Clean up old matches
        let matchesCleaned = 0;
        for (const [matchId, match] of this.activeMatches.entries()) {
            if (now - match.createdAt > MATCH_TIMEOUT) {
                this.activeMatches.delete(matchId);
                matchesCleaned++;
            }
        }

        if (totalCleaned > 0 || matchesCleaned > 0) {
            matchmakingLogger.info('Cleanup completed', {
                queueEntriesCleaned: totalCleaned,
                matchesCleaned
            });
        }
    }

    /**
     * Get active match by ID
     */
    getMatch(matchId: string): Match | undefined {
        return this.activeMatches.get(matchId);
    }

    /**
     * Get queue stats
     */
    getQueueStats(): { [key: string]: number } {
        const stats: { [key: string]: number } = {};
        for (const [queueKey, gameQueue] of this.queue.entries()) {
            stats[queueKey] = gameQueue.length;
        }
        return stats;
    }
}
