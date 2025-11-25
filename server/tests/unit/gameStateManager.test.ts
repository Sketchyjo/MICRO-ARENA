import { GameStateManager } from '../../src/services/gameStateManager';

// Mock the database functions
jest.mock('../../src/database/db', () => ({
    saveGameState: jest.fn(),
    loadGameState: jest.fn(),
    deleteGameState: jest.fn(),
}));

describe('GameStateManager', () => {
    let manager: GameStateManager;

    beforeEach(() => {
        manager = new GameStateManager();
        jest.clearAllMocks();
    });

    describe('createGameState', () => {
        it('should create new game state for valid game type', async () => {
            const gameState = await manager.createGameState('match123', 'CHESS');
            
            expect(gameState).toHaveProperty('matchId', 'match123');
            expect(gameState).toHaveProperty('gameType', 'CHESS');
            expect(gameState).toHaveProperty('isComplete', false);
            expect(gameState.state).toBeDefined();
        });

        it('should throw error for invalid game type', async () => {
            await expect(manager.createGameState('match123', 'INVALID'))
                .rejects.toThrow('Unknown game type: INVALID');
        });
    });

    describe('applyMove', () => {
        it('should apply valid moves', async () => {
            const gameState = await manager.createGameState('match123', 'CHESS');
            gameState.player1 = 'player1';
            gameState.player2 = 'player2';
            
            const result = await manager.applyMove('match123', 'player1', 'e4');
            
            expect(result.valid).toBe(true);
            expect(result.gameState).toBeDefined();
        });

        it('should reject moves for non-existent games', async () => {
            const result = await manager.applyMove('nonexistent', 'player1', 'e4');
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Game not found');
        });

        it('should reject moves for completed games', async () => {
            const gameState = await manager.createGameState('match123', 'CHESS');
            gameState.isComplete = true;
            
            const result = await manager.applyMove('match123', 'player1', 'e4');
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Game already complete');
        });
    });

    describe('handleResignation', () => {
        it('should handle player resignation correctly', async () => {
            const gameState = await manager.createGameState('match123', 'CHESS');
            gameState.player1 = 'player1';
            gameState.player2 = 'player2';
            
            await manager.handleResignation('match123', 'player1');
            
            const updatedState = await manager.getGameState('match123');
            expect(updatedState).toBeUndefined(); // Should be deleted after completion
        });
    });

    describe('getGameState', () => {
        it('should return existing game state', async () => {
            const originalState = await manager.createGameState('match123', 'CHESS');
            
            const retrievedState = await manager.getGameState('match123');
            
            expect(retrievedState).toEqual(originalState);
        });

        it('should return undefined for non-existent games', async () => {
            const state = await manager.getGameState('nonexistent');
            
            expect(state).toBeUndefined();
        });
    });
});