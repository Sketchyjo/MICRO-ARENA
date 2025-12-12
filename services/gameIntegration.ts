import { contractService, Match } from './contractService';
import { websocketClient } from './websocketClient';
import { GameType, MatchStatus } from '../types';

export interface GameState {
    matchId: bigint | null;
    tempMatchId: string | null;  // Server-side temp match ID before blockchain
    gameType: GameType | null;
    stake: string;
    status: MatchStatus;
    playerAddress: string;
    opponentAddress: string;
    isPlayer1: boolean;
    commitBlock: bigint | null;
    salt: string | null;
    localScore: number | null;
    opponentScore: number | null;
    winner: string | null;
    error: string | null;
}

type GameStateCallback = (state: GameState) => void;
type ErrorCallback = (error: string) => void;

class GameIntegrationService {
    private gameState: GameState;
    private stateCallbacks: GameStateCallback[] = [];
    private errorCallbacks: ErrorCallback[] = [];
    private isInitialized = false;

    constructor() {
        this.gameState = this.getInitialState();
    }

    private getInitialState(): GameState {
        return {
            matchId: null,
            tempMatchId: null,
            gameType: null,
            stake: '0',
            status: MatchStatus.IDLE,
            playerAddress: '',
            opponentAddress: '',
            isPlayer1: false,
            commitBlock: null,
            salt: null,
            localScore: null,
            opponentScore: null,
            winner: null,
            error: null,
        };
    }

    /**
     * Initialize the service
     */
    async initialize(playerAddress: string): Promise<void> {
        // If already initialized with same address, skip
        if (this.isInitialized && this.gameState.playerAddress === playerAddress) {
            console.log('✅ Game integration already initialized for this address');
            return;
        }

        // If wallet changed, reset and reinitialize
        if (this.isInitialized && this.gameState.playerAddress !== playerAddress) {
            console.log('🔄 Wallet changed, reinitializing...');
            this.cleanup();
        }

        this.gameState.playerAddress = playerAddress;

        // Connect to WebSocket
        try {
            await websocketClient.connect(playerAddress);
            this.setupWebSocketListeners();
            this.setupContractListeners();
            this.isInitialized = true;
            console.log('✅ Game integration service initialized for:', playerAddress);
        } catch (error: any) {
            this.handleError(`Failed to initialize: ${error.message}`);
            throw error;
        }
    }

    /**
     * Setup WebSocket event listeners
     */
    private setupWebSocketListeners(): void {
        // Matchmaking events
        websocketClient.onMatchFound(async (data) => {
            console.log('🎮 Match found:', data);

            // Store the server's game state for initialization
            if (data.gameState) {
                (window as any).__serverGameState = data.gameState;
                (window as any).__isPlayer1 = data.isPlayer1;
            }

            // Check if matchId is a valid blockchain ID (numeric string)
            const isBlockchainMatch = /^\d+$/.test(data.matchId);
            console.log('🔍 Match ID type:', data.matchId, 'Is blockchain match:', isBlockchainMatch);

            // Check if we already have a blockchain match ID (Player 1 created it before searching)
            const alreadyHasBlockchainMatch = this.gameState.matchId !== null;
            console.log('🔍 Already has blockchain match:', alreadyHasBlockchainMatch, this.gameState.matchId?.toString());

            // PLAYER 1: Create blockchain match when matched with temporary ID
            // Skip if we already created a blockchain match before searching
            if (!isBlockchainMatch && data.isPlayer1 && !alreadyHasBlockchainMatch) {
                // Prevent multiple creation attempts
                if (this.gameState.status === MatchStatus.CREATING_MATCH) {
                    console.log('⚠️ Already creating match, ignoring duplicate event');
                    return;
                }

                try {
                    console.log('📝 Player 1: Creating blockchain match...');
                    this.updateState({ status: MatchStatus.CREATING_MATCH });

                    const { matchId, txHash } = await contractService.createMatch(
                        this.gameTypeToNumber(this.gameState.gameType!),
                        data.stake
                    );

                    console.log('✅ Player 1: Blockchain match created:', matchId.toString(), txHash);

                    // Update local state with blockchain match ID
                    this.updateState({
                        matchId,
                        tempMatchId: data.matchId,  // Store temp match ID
                        opponentAddress: data.opponent,
                        isPlayer1: true,
                        status: MatchStatus.MATCHED,
                    });

                    // Notify server of the blockchain match ID so it can tell Player 2
                    console.log('📤 Player 1: Notifying server of blockchain match ID...');
                    websocketClient.socket?.emit('match:blockchain_created', {
                        tempMatchId: data.matchId,
                        blockchainMatchId: matchId.toString(),
                        playerAddress: this.gameState.playerAddress
                    });

                    return;
                } catch (error: any) {
                    console.error('❌ Player 1: Failed to create blockchain match:', error);
                    this.handleError(`Failed to create blockchain match: ${error.message}`);

                    // Notify server that blockchain match creation failed so Player 2 doesn't get stuck
                    websocketClient.socket?.emit('match:blockchain_failed', {
                        tempMatchId: data.matchId,
                        error: error.message
                    });

                    this.updateState({ status: MatchStatus.IDLE });
                    return;
                }
            }

            // PLAYER 1: Already has blockchain match, just notify server
            if (!isBlockchainMatch && data.isPlayer1 && alreadyHasBlockchainMatch) {
                console.log('✅ Player 1: Using existing blockchain match:', this.gameState.matchId!.toString());
                this.updateState({
                    tempMatchId: data.matchId,  // Store temp match ID
                    opponentAddress: data.opponent,
                    isPlayer1: true,
                    status: MatchStatus.MATCHED,
                });

                // Notify server of the existing blockchain match ID
                websocketClient.socket?.emit('match:blockchain_created', {
                    tempMatchId: data.matchId,
                    blockchainMatchId: this.gameState.matchId!.toString(),
                    playerAddress: this.gameState.playerAddress
                });
                return;
            }

            // PLAYER 2: Wait for blockchain match ID from server, then join
            if (!isBlockchainMatch && !data.isPlayer1) {
                console.log('⏳ Player 2: Waiting for Player 1 to create blockchain match...');
                this.updateState({
                    status: MatchStatus.MATCHED,
                    tempMatchId: data.matchId,  // Store temp match ID for later
                    opponentAddress: data.opponent,
                    isPlayer1: false
                });
                // Will receive blockchain match ID via 'match:blockchain_ready' event
                return;
            }

            // If already a blockchain match (Player 1 re-matched or direct blockchain match)
            if (isBlockchainMatch) {
                const matchIdBigInt = BigInt(data.matchId);

                // PLAYER 2: Join the blockchain match
                if (!data.isPlayer1) {
                    // Prevent multiple join attempts
                    if (this.gameState.status === MatchStatus.JOINING || this.gameState.status === MatchStatus.ACTIVE) {
                        console.log('⚠️ Already joining/active, ignoring duplicate event');
                        return;
                    }

                    try {
                        console.log(`🔗 Player 2: Joining blockchain match ${data.matchId}...`);
                        this.updateState({ status: MatchStatus.JOINING });
                        await contractService.joinMatch(matchIdBigInt, data.stake);
                        console.log('✅ Player 2: Successfully joined blockchain match');
                    } catch (error) {
                        console.error('❌ Player 2: Failed to join blockchain match:', error);
                        this.handleError('Failed to join blockchain match. Game may not save scores properly.');
                    }
                }

                // Update state for both players
                this.updateState({
                    matchId: matchIdBigInt,
                    opponentAddress: data.opponent,
                    isPlayer1: data.isPlayer1,
                    status: MatchStatus.MATCHED,
                });
            }
        });

        // NEW: Listen for blockchain match ready event (for Player 2)
        websocketClient.socket?.on('match:blockchain_ready', async (data: { blockchainMatchId: string; stake: string }) => {
            console.log('📥 Player 2: Received blockchain match ID:', data.blockchainMatchId);

            try {
                // Prevent multiple join attempts
                if (this.gameState.status === MatchStatus.JOINING || this.gameState.status === MatchStatus.ACTIVE) {
                    console.log('⚠️ Already joining/active, ignoring duplicate event');
                    return;
                }

                const matchIdBigInt = BigInt(data.blockchainMatchId);

                console.log(`🔗 Player 2: Joining blockchain match ${data.blockchainMatchId}...`);
                this.updateState({ status: MatchStatus.JOINING });

                await contractService.joinMatch(matchIdBigInt, data.stake);
                console.log('✅ Player 2: Successfully joined blockchain match and staked funds');

                this.updateState({
                    matchId: matchIdBigInt,
                    status: MatchStatus.MATCHED,
                });

                // Notify server that Player 2 has joined and staked
                console.log('📤 Player 2: Notifying server of successful join...');
                websocketClient.socket?.emit('match:player2_joined', {
                    tempMatchId: this.gameState.tempMatchId,
                    blockchainMatchId: data.blockchainMatchId
                });
            } catch (error: any) {
                console.error('❌ Player 2: Failed to join blockchain match:', error);
                this.handleError(`Failed to join blockchain match: ${error.message}`);
            }
        });

        websocketClient.onMatchSearching(async (data) => {
            console.log('🔍 Received matchmaking:searching event:', data);
            console.log('🔍 Current state:', {
                matchId: this.gameState.matchId?.toString(),
                gameType: this.gameState.gameType,
                stake: this.gameState.stake,
                status: this.gameState.status
            });

            // If we're searching and don't have a blockchain match yet, we're the first player
            // Create the blockchain match now
            if (!this.gameState.matchId && this.gameState.gameType && this.gameState.stake) {
                // Prevent multiple creation attempts
                if (this.gameState.status === MatchStatus.CREATING_MATCH) {
                    console.log('⚠️ Already creating match, ignoring duplicate event');
                    return;
                }

                try {
                    console.log('📝 Creating blockchain match as first player...');
                    console.log('📝 Game type:', this.gameState.gameType, '-> number:', this.gameTypeToNumber(this.gameState.gameType));
                    console.log('📝 Stake:', this.gameState.stake);
                    this.updateState({ status: MatchStatus.CREATING_MATCH });

                    const { matchId, txHash } = await contractService.createMatch(
                        this.gameTypeToNumber(this.gameState.gameType),
                        this.gameState.stake
                    );

                    console.log('✅ Blockchain match created:', matchId, txHash);

                    this.updateState({
                        matchId,
                        isPlayer1: true,
                        status: MatchStatus.SEARCHING,
                    });

                    // Re-search with the blockchain match ID (small delay to avoid rate limit)
                    console.log('🔍 Re-joining queue with blockchain match ID...');
                    setTimeout(() => {
                        websocketClient.searchMatch(
                            this.gameState.gameType!,
                            this.gameState.stake,
                            this.gameState.playerAddress,
                            matchId.toString()
                        );
                    }, 500);
                } catch (error: any) {
                    console.error('❌ Failed to create blockchain match:', error);
                    this.handleError(`Failed to create blockchain match: ${error.message}`);
                    this.updateState({ status: MatchStatus.IDLE });
                }
            } else {
                // Already have a match ID, just update status
                this.updateState({ status: MatchStatus.SEARCHING });
            }
        });

        websocketClient.onMatchError((data) => {
            console.error('❌ Matchmaking error:', data.error);
            this.handleError(data.error);
        });

        // Game events
        websocketClient.onOpponentMove((data) => {
            console.log('👤 Opponent move:', data.move);
            // This will be handled by individual game components
        });

        websocketClient.onGameComplete((data) => {
            console.log('🏁 Game complete:', data);
            this.updateState({ status: MatchStatus.GAME_OVER });
        });

        websocketClient.onGameResigned((data) => {
            console.log('🏳️ Opponent resigned');
            this.handleError('Opponent resigned from the game');
            this.updateState({ status: MatchStatus.GAME_OVER, winner: this.gameState.playerAddress });
        });

        websocketClient.onInvalidMove((data) => {
            console.error('❌ Invalid move:', data.error);
            this.handleError(`Invalid move: ${data.error}`);
        });
    }

    /**
     * Setup contract event listeners
     */
    private setupContractListeners(): void {
        contractService.on('MatchJoined', (data) => {
            console.log('✅ Match joined:', data);
            if (this.gameState.matchId && BigInt(data.matchId) === this.gameState.matchId) {
                this.updateState({ status: MatchStatus.ACTIVE });
            }
        });

        contractService.on('ScoreCommitted', (data) => {
            console.log('📝 Score committed:', data);
            // Track opponent's commit
        });

        contractService.on('ScoreRevealed', (data) => {
            console.log('🔓 Score revealed:', data);
            // Track opponent's reveal
        });

        contractService.on('MatchCompleted', (data) => {
            console.log('🎉 Match completed:', data);
            if (this.gameState.matchId && BigInt(data.matchId) === this.gameState.matchId) {
                this.updateState({
                    status: MatchStatus.COMPLETED,
                    winner: data.winner,
                });
            }
        });
    }

    /**
     * Start matchmaking
     */
    async startMatchmaking(gameType: GameType, stake: string): Promise<void> {
        try {
            console.log('🎮 Starting matchmaking:', { gameType, stake, playerAddress: this.gameState.playerAddress });

            this.updateState({
                gameType,
                stake,
                status: MatchStatus.SEARCHING,
            });

            // Check cUSD balance
            const balance = await contractService.getCUSDBalance();
            console.log('💰 Balance check:', balance, 'cUSD');
            if (parseFloat(balance) < parseFloat(stake)) {
                throw new Error(`Insufficient cUSD balance. You have ${balance} cUSD but need ${stake} cUSD`);
            }

            // First, try to join matchmaking queue WITHOUT creating blockchain match
            // The server will tell us if we're matched or if we need to create a match
            console.log('🔍 Searching for existing matches via WebSocket...');
            websocketClient.searchMatch(gameType, stake, this.gameState.playerAddress, '');

            // Note: We'll create the blockchain match only if we're the first player
            // This will be handled in the WebSocket response handler
        } catch (error: any) {
            this.handleError(`Failed to start matchmaking: ${error.message}`);
            this.updateState({ status: MatchStatus.IDLE });
            throw error;
        }
    }

    /**
     * Cancel matchmaking
     */
    async cancelMatchmaking(): Promise<void> {
        try {
            if (this.gameState.matchId) {
                // Cancel on-chain match
                await contractService.cancelMatch(this.gameState.matchId);
            }

            // Cancel WebSocket search
            websocketClient.cancelSearch();

            this.updateState({
                status: MatchStatus.IDLE,
                matchId: null,
            });
        } catch (error: any) {
            this.handleError(`Failed to cancel matchmaking: ${error.message}`);
            throw error;
        }
    }

    /**
     * Join an existing match
     */
    async joinMatch(matchId: bigint, stake: string): Promise<void> {
        try {
            this.updateState({ status: MatchStatus.JOINING });

            await contractService.joinMatch(matchId, stake);

            this.updateState({
                matchId,
                stake,
                isPlayer1: false,
                status: MatchStatus.ACTIVE,
            });
        } catch (error: any) {
            this.handleError(`Failed to join match: ${error.message}`);
            this.updateState({ status: MatchStatus.IDLE });
            throw error;
        }
    }

    /**
     * Send a game move
     */
    sendMove(move: any): void {
        // Use tempMatchId for WebSocket communication (server room ID)
        const wsMatchId = this.gameState.tempMatchId || this.gameState.matchId?.toString();
        if (!wsMatchId) {
            this.handleError('No active match');
            return;
        }

        try {
            console.log('📤 Sending move to match:', wsMatchId, move);
            websocketClient.sendMove(
                wsMatchId,
                move,
                this.gameState.playerAddress
            );
        } catch (error: any) {
            this.handleError(`Failed to send move: ${error.message}`);
        }
    }

    /**
     * Resign from game
     */
    resignGame(): void {
        const wsMatchId = this.gameState.tempMatchId || this.gameState.matchId?.toString();
        if (!wsMatchId) {
            this.handleError('No active match');
            return;
        }

        try {
            websocketClient.resignGame(
                wsMatchId,
                this.gameState.playerAddress
            );

            this.updateState({
                status: MatchStatus.GAME_OVER,
                winner: this.gameState.opponentAddress,
            });
        } catch (error: any) {
            this.handleError(`Failed to resign: ${error.message}`);
        }
    }

    /**
     * Submit final score (commit phase)
     */
    async submitScore(score: number): Promise<void> {
        if (!this.gameState.matchId) {
            throw new Error('No active match');
        }

        // Check if already committed for this match
        const existingCommit = this.loadCommitData(this.gameState.matchId.toString());
        if (existingCommit) {
            console.log('⚠️ Already committed for this match, using existing data');
            this.updateState({
                localScore: existingCommit.score,
                salt: existingCommit.salt,
                commitBlock: BigInt(existingCommit.commitBlock),
                status: MatchStatus.WAITING_REVEAL,
            });
            return;
        }

        try {
            this.updateState({ status: MatchStatus.COMMITTING });

            // Generate salt
            const salt = contractService.generateSalt();

            // Commit score on-chain
            const { txHash, commitBlock } = await contractService.commitScore(
                this.gameState.matchId,
                score,
                salt
            );

            console.log('✅ Score committed:', txHash);

            // Save commit data to localStorage for recovery
            this.saveCommitData(this.gameState.matchId.toString(), {
                score,
                salt,
                commitBlock: commitBlock.toString(),
                playerAddress: this.gameState.playerAddress,
            });

            this.updateState({
                localScore: score,
                salt,
                commitBlock,
                status: MatchStatus.WAITING_REVEAL,
            });
        } catch (error: any) {
            this.handleError(`Failed to commit score: ${error.message}`);
            throw error;
        }
    }

    /**
     * Save commit data to localStorage
     */
    private saveCommitData(matchId: string, data: { score: number; salt: string; commitBlock: string; playerAddress: string }): void {
        try {
            const key = `microarena_commit_${matchId}_${data.playerAddress}`;
            localStorage.setItem(key, JSON.stringify(data));
            console.log('💾 Commit data saved to localStorage');
        } catch (e) {
            console.warn('Failed to save commit data to localStorage:', e);
        }
    }

    /**
     * Load commit data from localStorage
     */
    private loadCommitData(matchId: string): { score: number; salt: string; commitBlock: string } | null {
        try {
            const key = `microarena_commit_${matchId}_${this.gameState.playerAddress}`;
            const data = localStorage.getItem(key);
            if (data) {
                console.log('📂 Loaded commit data from localStorage');
                return JSON.parse(data);
            }
        } catch (e) {
            console.warn('Failed to load commit data from localStorage:', e);
        }
        return null;
    }

    /**
     * Clear commit data from localStorage
     */
    private clearCommitData(matchId: string): void {
        try {
            const key = `microarena_commit_${matchId}_${this.gameState.playerAddress}`;
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Failed to clear commit data:', e);
        }
    }

    /**
     * Reveal score
     */
    async revealScore(): Promise<void> {
        if (!this.gameState.matchId) {
            throw new Error('No active match');
        }

        // Try to load from localStorage if state is missing
        let { salt, commitBlock, localScore } = this.gameState;
        if (!salt || !commitBlock || localScore === null) {
            const savedData = this.loadCommitData(this.gameState.matchId.toString());
            if (savedData) {
                salt = savedData.salt;
                commitBlock = BigInt(savedData.commitBlock);
                localScore = savedData.score;
                console.log('📂 Recovered commit data from localStorage');
            } else {
                throw new Error('Missing commit data. Cannot reveal score.');
            }
        }

        try {
            this.updateState({ status: MatchStatus.REVEALING });

            const txHash = await contractService.revealScore(
                this.gameState.matchId,
                localScore,
                salt,
                commitBlock
            );

            console.log('✅ Score revealed:', txHash);

            // Clear saved commit data after successful reveal
            this.clearCommitData(this.gameState.matchId.toString());

            this.updateState({ status: MatchStatus.WAITING_COMPLETION });
        } catch (error: any) {
            this.handleError(`Failed to reveal score: ${error.message}`);
            throw error;
        }
    }

    /**
     * Claim timeout win
     */
    async claimTimeout(): Promise<void> {
        if (!this.gameState.matchId) {
            throw new Error('No active match');
        }

        try {
            const txHash = await contractService.claimTimeout(this.gameState.matchId);
            console.log('✅ Timeout claimed:', txHash);

            this.updateState({
                status: MatchStatus.COMPLETED,
                winner: this.gameState.playerAddress,
            });
        } catch (error: any) {
            this.handleError(`Failed to claim timeout: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get match details from contract
     */
    async getMatchDetails(): Promise<Match | null> {
        if (!this.gameState.matchId) return null;

        try {
            return await contractService.getMatch(this.gameState.matchId);
        } catch (error: any) {
            this.handleError(`Failed to get match details: ${error.message}`);
            return null;
        }
    }

    /**
     * Subscribe to state changes
     */
    onStateChange(callback: GameStateCallback): () => void {
        this.stateCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            this.stateCallbacks = this.stateCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Subscribe to errors
     */
    onError(callback: ErrorCallback): () => void {
        this.errorCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Get current state
     */
    getState(): GameState {
        return { ...this.gameState };
    }

    /**
     * Update state and notify listeners
     */
    private updateState(updates: Partial<GameState>): void {
        this.gameState = { ...this.gameState, ...updates, error: null };
        this.notifyStateChange();
    }

    /**
     * Handle error
     */
    private handleError(error: string): void {
        this.gameState.error = error;
        this.errorCallbacks.forEach(callback => callback(error));
        this.notifyStateChange();
    }

    /**
     * Notify state change listeners
     */
    private notifyStateChange(): void {
        this.stateCallbacks.forEach(callback => callback(this.getState()));
    }

    /**
     * Convert GameType to number for contract
     */
    private gameTypeToNumber(gameType: GameType): number {
        const mapping: Record<GameType, number> = {
            [GameType.CHESS]: 0,
            [GameType.WHOT]: 1,
            [GameType.SURVEY]: 2,
            [GameType.MANCALA]: 3,
            [GameType.CONNECT4]: 4,
            [GameType.TRIVIA]: 5,
            [GameType.RPS]: 6,
            [GameType.CHECKERS]: 7,
            [GameType.PENALTY]: 8,
        };
        return mapping[gameType] ?? 0;
    }

    /**
     * Reset state
     */
    reset(): void {
        this.gameState = this.getInitialState();
        this.gameState.playerAddress = contractService.getAccount() || '';
        this.notifyStateChange();
    }

    /**
     * Cleanup
     */
    cleanup(): void {
        websocketClient.disconnect();
        this.stateCallbacks = [];
        this.errorCallbacks = [];
        this.isInitialized = false;
    }
}

export const gameIntegration = new GameIntegrationService();
