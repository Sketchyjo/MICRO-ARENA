import { contractService, Match } from './contractService';
import { websocketClient } from './websocketClient';
import { GameType, MatchStatus } from '../types';

export interface GameState {
    matchId: bigint | null;
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
        if (this.isInitialized) return;

        this.gameState.playerAddress = playerAddress;

        // Connect to WebSocket
        try {
            await websocketClient.connect(playerAddress);
            this.setupWebSocketListeners();
            this.setupContractListeners();
            this.isInitialized = true;
            console.log('✅ Game integration service initialized');
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
        websocketClient.onMatchFound((data) => {
            console.log('🎮 Match found:', data);
            this.updateState({
                matchId: BigInt(data.matchId),
                opponentAddress: data.opponent,
                status: MatchStatus.MATCHED,
            });
        });

        websocketClient.onMatchSearching((data) => {
            console.log('🔍 Searching for match...');
            this.updateState({ status: MatchStatus.SEARCHING });
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
                status: MatchStatus.CREATING_MATCH,
            });

            // Check cUSD balance
            const balance = await contractService.getCUSDBalance();
            console.log('💰 Balance check:', balance, 'cUSD');
            if (parseFloat(balance) < parseFloat(stake)) {
                throw new Error(`Insufficient cUSD balance. You have ${balance} cUSD but need ${stake} cUSD`);
            }

            // Create match on-chain
            console.log('📝 Creating match on blockchain...');
            const { matchId, txHash } = await contractService.createMatch(
                this.gameTypeToNumber(gameType),
                stake
            );

            console.log('✅ Match created:', matchId, txHash);

            this.updateState({
                matchId,
                isPlayer1: true,
                status: MatchStatus.SEARCHING,
            });

            // Join matchmaking queue
            console.log('🔍 Joining matchmaking queue via WebSocket...');
            websocketClient.searchMatch(gameType, stake, this.gameState.playerAddress);
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
        if (!this.gameState.matchId) {
            this.handleError('No active match');
            return;
        }

        try {
            websocketClient.sendMove(
                this.gameState.matchId.toString(),
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
        if (!this.gameState.matchId) {
            this.handleError('No active match');
            return;
        }

        try {
            websocketClient.resignGame(
                this.gameState.matchId.toString(),
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
     * Reveal score
     */
    async revealScore(): Promise<void> {
        if (!this.gameState.matchId || !this.gameState.salt || !this.gameState.commitBlock || this.gameState.localScore === null) {
            throw new Error('Missing commit data');
        }

        try {
            this.updateState({ status: MatchStatus.REVEALING });

            const txHash = await contractService.revealScore(
                this.gameState.matchId,
                this.gameState.localScore,
                this.gameState.salt,
                this.gameState.commitBlock
            );

            console.log('✅ Score revealed:', txHash);

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
            [GameType.WORDLE]: 5,
        };
        return mapping[gameType];
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
