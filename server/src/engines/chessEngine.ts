import { Chess } from 'chess.js';

export class ChessEngine {
    initialize() {
        return {
            chess: new Chess(),
            moves: [],
            status: 'active',
            players: { white: null, black: null },
            currentTurn: 'white'
        };
    }

    validateMove(gameState: any, move: any, playerAddress: string): { valid: boolean; error?: string } {
        try {
            const chess = new Chess(gameState.chess.fen());
            
            // Check if it's player's turn
            const isWhiteTurn = chess.turn() === 'w';
            const playerColor = gameState.players.white === playerAddress ? 'white' : 'black';
            
            if ((isWhiteTurn && playerColor !== 'white') || (!isWhiteTurn && playerColor !== 'black')) {
                return { valid: false, error: 'Not your turn' };
            }
            
            const result = chess.move(move);
            return { valid: !!result };
        } catch (error) {
            return { valid: false, error: 'Invalid chess move' };
        }
    }

    applyMove(gameState: any, move: any, playerAddress: string) {
        const chess = new Chess(gameState.chess.fen());
        const moveResult = chess.move(move);
        
        return {
            chess: { fen: () => chess.fen(), history: () => chess.history() },
            moves: [...gameState.moves, { move: moveResult, player: playerAddress, timestamp: Date.now() }],
            status: chess.isGameOver() ? 'complete' : 'active',
            players: gameState.players,
            currentTurn: chess.turn() === 'w' ? 'white' : 'black'
        };
    }

    checkCompletion(gameState: any): { isComplete: boolean; scores?: any } {
        const chess = new Chess(gameState.chess.fen());
        
        if (!chess.isGameOver()) {
            return { isComplete: false };
        }

        let scores = { player1: 50, player2: 50 }; // Draw by default
        
        if (chess.isCheckmate()) {
            if (chess.turn() === 'w') {
                scores = { player1: 0, player2: 100 }; // Black wins
            } else {
                scores = { player1: 100, player2: 0 }; // White wins
            }
        }

        return { isComplete: true, scores };
    }

    assignPlayers(gameState: any, player1: string, player2: string) {
        gameState.players.white = player1;
        gameState.players.black = player2;
        return gameState;
    }
}