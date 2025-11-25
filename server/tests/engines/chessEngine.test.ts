import { ChessEngine } from '../../src/engines/chessEngine';

describe('ChessEngine', () => {
    let engine: ChessEngine;

    beforeEach(() => {
        engine = new ChessEngine();
    });

    describe('initialize', () => {
        it('should create initial chess state', () => {
            const state = engine.initialize();
            
            expect(state).toHaveProperty('chess');
            expect(state).toHaveProperty('moves');
            expect(state).toHaveProperty('status');
            expect(state.status).toBe('active');
            expect(state.moves).toEqual([]);
        });
    });

    describe('validateMove', () => {
        it('should validate legal chess moves', () => {
            const state = engine.initialize();
            state.players = { white: 'player1', black: 'player2' };
            
            const result = engine.validateMove(state, 'e4', 'player1');
            expect(result.valid).toBe(true);
        });

        it('should reject illegal chess moves', () => {
            const state = engine.initialize();
            state.players = { white: 'player1', black: 'player2' };
            
            const result = engine.validateMove(state, 'e5', 'player1'); // Can't move pawn 2 squares from e2 to e5
            expect(result.valid).toBe(false);
        });

        it('should reject moves when not player turn', () => {
            const state = engine.initialize();
            state.players = { white: 'player1', black: 'player2' };
            
            const result = engine.validateMove(state, 'e5', 'player2'); // Black can't move first
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Not your turn');
        });
    });

    describe('applyMove', () => {
        it('should apply valid moves and update state', () => {
            const state = engine.initialize();
            state.players = { white: 'player1', black: 'player2' };
            
            const newState = engine.applyMove(state, 'e4', 'player1');
            
            expect(newState.moves).toHaveLength(1);
            expect(newState.moves[0].player).toBe('player1');
            expect(newState.currentTurn).toBe('black');
        });
    });

    describe('checkCompletion', () => {
        it('should detect game completion', () => {
            const state = engine.initialize();
            // Simulate a completed game state
            state.chess = { 
                isGameOver: () => true,
                isCheckmate: () => true,
                turn: () => 'b' // Black to move but checkmated
            };
            
            const result = engine.checkCompletion(state);
            
            expect(result.isComplete).toBe(true);
            expect(result.scores).toEqual({ player1: 100, player2: 0 }); // White wins
        });

        it('should return false for ongoing games', () => {
            const state = engine.initialize();
            
            const result = engine.checkCompletion(state);
            
            expect(result.isComplete).toBe(false);
        });
    });
});