import { ChessEngine } from '../engines/chessEngine';
import { WhotEngine } from '../engines/whotEngine';
import { SurveyEngine } from '../engines/surveyEngine';
import { MancalaEngine } from '../engines/mancalaEngine';
import { Connect4Engine } from '../engines/connect4Engine';
import { WordleEngine } from '../engines/wordleEngine';
import { saveGameState, loadGameState, deleteGameState } from '../database/db';
import { gameLogger } from '../utils/logger';

interface GameState {
    matchId: string;
    gameType: string;
    state: any;
    player1: string;
    player2: string;
    currentTurn: string;
    isComplete: boolean;
    scores?: { player1: number; player2: number };
    lastMove?: any;
    createdAt: number;
    updatedAt: number;
}

interface MoveResult {
    valid: boolean;
    gameState?: any;
    gameComplete?: boolean;
    scores?: { player1: number; player2: number };
    error?: string;
}

export class GameStateManager {
    private gameStates: Map<string, GameState> = new Map();
    private engines: Map<string, any> = new Map();

    constructor() {
        // Initialize game engines
        this.engines.set('CHESS', new ChessEngine());
        this.engines.set('WHOT', new WhotEngine());
        this.engines.set('SURVEY', new SurveyEngine());
        this.engines.set('MANCALA', new MancalaEngine());
        this.engines.set('CONNECT4', new Connect4Engine());
        this.engines.set('WORDLE', new WordleEngine());
    }

    /**
     * Create new game state
     */
    async createGameState(matchId: string, gameType: string): Promise<GameState> {
        const engine = this.engines.get(gameType.toUpperCase());
        if (!engine) {
            throw new Error(`Unknown game type: ${gameType}`);
        }

        const initialState = engine.initialize();

        const gameState: GameState = {
            matchId,
            gameType: gameType.toUpperCase(),
            state: initialState,
            player1: '',
            player2: '',
            currentTurn: 'player1',
            isComplete: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        this.gameStates.set(matchId, gameState);

        // Persist to database
        try {
            await saveGameState(matchId, gameState);
        } catch (error) {
            gameLogger.error('Failed to save game state:', error);
        }

        gameLogger.info(`Game state created: ${matchId} - ${gameType}`);
        return gameState;
    }

    /**
     * Apply a move to the game state
     */
    async applyMove(matchId: string, playerAddress: string, move: any): Promise<MoveResult> {
        let gameState = this.gameStates.get(matchId);

        // Try to load from database if not in memory
        if (!gameState) {
            try {
                gameState = await loadGameState(matchId);
                if (gameState) {
                    this.gameStates.set(matchId, gameState);
                }
            } catch (error) {
                gameLogger.error('Failed to load game state:', error);
            }
        }

        if (!gameState) {
            return { valid: false, error: 'Game not found' };
        }

        if (gameState.isComplete) {
            return { valid: false, error: 'Game already complete' };
        }

        // Validate it's the correct player's turn
        const isPlayer1 = gameState.player1 === playerAddress;
        const isPlayer2 = gameState.player2 === playerAddress;
        const isPlayer1Turn = gameState.currentTurn === 'player1';

        if ((isPlayer1Turn && !isPlayer1) || (!isPlayer1Turn && !isPlayer2)) {
            gameLogger.warn(`Wrong player attempted move: ${matchId}`, {
                playerAddress,
                currentTurn: gameState.currentTurn,
                player1: gameState.player1,
                player2: gameState.player2
            });
            return { valid: false, error: 'Not your turn' };
        }

        const engine = this.engines.get(gameState.gameType);
        if (!engine) {
            return { valid: false, error: 'Game engine not found' };
        }

        // Inject player addresses into internal state for engine validation
        gameState.state.player1 = gameState.player1;
        gameState.state.player2 = gameState.player2;

        // Validate move
        const validation = engine.validateMove(gameState.state, move, playerAddress);
        if (!validation.valid) {
            gameLogger.warn(`Invalid move attempt: ${matchId}`, { playerAddress, move, error: validation.error });
            return { valid: false, error: validation.error };
        }

        // Apply move
        const newState = engine.applyMove(gameState.state, move, playerAddress);
        gameState.state = newState;
        gameState.lastMove = { move, player: playerAddress, timestamp: Date.now() };
        gameState.updatedAt = Date.now();

        // Sync turn with engine state
        if (newState.currentPlayer !== undefined) {
            gameState.currentTurn = newState.currentPlayer === 1 ? 'player1' : 'player2';
        }

        // Check if game is complete
        const completion = engine.checkCompletion(newState);
        if (completion.isComplete) {
            gameState.isComplete = true;
            gameState.scores = completion.scores;

            gameLogger.info(`Game complete: ${matchId}`, { scores: completion.scores });

            // Clean up from memory and database
            this.gameStates.delete(matchId);
            try {
                await deleteGameState(matchId);
            } catch (error) {
                gameLogger.error('Failed to delete game state:', error);
            }

            return {
                valid: true,
                gameState: newState,
                gameComplete: true,
                scores: completion.scores,
            };
        }

        // Persist updated state
        try {
            await saveGameState(matchId, gameState);
        } catch (error) {
            gameLogger.error('Failed to save game state:', error);
        }

        return {
            valid: true,
            gameState: newState,
            gameComplete: false,
        };
    }

    /**
     * Handle player resignation
     */
    async handleResignation(matchId: string, playerAddress: string): Promise<void> {
        let gameState = this.gameStates.get(matchId);

        if (!gameState) {
            try {
                gameState = await loadGameState(matchId);
                if (gameState) {
                    this.gameStates.set(matchId, gameState);
                }
            } catch (error) {
                gameLogger.error('Failed to load game state for resignation:', error);
            }
        }

        if (!gameState) return;

        gameState.isComplete = true;

        // Opponent wins by resignation
        const isPlayer1 = gameState.player1 === playerAddress;
        gameState.scores = {
            player1: isPlayer1 ? 0 : 100,
            player2: isPlayer1 ? 100 : 0,
        };

        gameLogger.info(`Player resignation: ${matchId}`, { playerAddress });

        // Clean up
        this.gameStates.delete(matchId);
        try {
            await deleteGameState(matchId);
        } catch (error) {
            gameLogger.error('Failed to delete game state after resignation:', error);
        }
    }

    /**
     * Get game state
     */
    async getGameState(matchId: string): Promise<GameState | undefined> {
        let gameState = this.gameStates.get(matchId);

        if (!gameState) {
            try {
                gameState = await loadGameState(matchId);
                if (gameState) {
                    this.gameStates.set(matchId, gameState);
                }
            } catch (error) {
                gameLogger.error('Failed to load game state:', error);
            }
        }

        return gameState;
    }

    /**
     * Delete game state (cleanup)
     */
    deleteGameState(matchId: string): void {
        this.gameStates.delete(matchId);
    }

    /**
     * Get all active games
     */
    getActiveGames(): GameState[] {
        return Array.from(this.gameStates.values()).filter(g => !g.isComplete);
    }
}
