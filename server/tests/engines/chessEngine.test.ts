import { ChessEngine } from '../../src/engines/chessEngine';

describe('ChessEngine', () => {
    let engine: ChessEngine;

    beforeEach(() => {
        engine = new ChessEngine();
    });

    describe('initialize', () => {
        it('should create initial chess state', () => {
            const state = engine.initialize();
            
            expect(state).toHaveProperty('fen');
            expect(state).toHaveProperty('moves');
            expect(state).toHaveProperty('currentPlayer');
            expect(state.currentPlayer).toBe(1);
            expect(state.moves).toEqual([]);
        });
    });

    describe('validateMove', () => {
        it('should validate legal chess moves', () => {
            const state = engine.initialize();
            state.player1 = 'player1';
            state.player2 = 'player2';
            
            const result = engine.validateMove(state, { from: 'e2', to: 'e4' }, 'player1');
            expect(result.valid).toBe(true);
        });

        it('should reject illegal chess moves', () => {
            const state = engine.initialize();
            state.player1 = 'player1';
            state.player2 = 'player2';
            
            const result = engine.validateMove(state, { from: 'e2', to: 'e5' }, 'player1');
            expect(result.valid).toBe(false);
        });

        it('should reject moves when not player turn', () => {
            const state = engine.initialize();
            state.player1 = 'player1';
            state.player2 = 'player2';
            
            const result = engine.validateMove(state, { from: 'e7', to: 'e5' }, 'player2');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Not your turn');
        });
    });

    describe('applyMove', () => {
        it('should apply valid moves and update state', () => {
            const state = engine.initialize();
            state.player1 = 'player1';
            state.player2 = 'player2';
            
            const newState = engine.applyMove(state, { from: 'e2', to: 'e4' }, 'player1');
            
            expect(newState.moves).toHaveLength(1);
            expect(newState.currentPlayer).toBe(2); // Black's turn
        });
    });

    describe('checkCompletion', () => {
        it('should return false for ongoing games', () => {
            const state = engine.initialize();
            
            const result = engine.checkCompletion(state);
            
            expect(result.isComplete).toBe(false);
        });
    });
});
