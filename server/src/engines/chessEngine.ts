import { Chess } from 'chess.js';

export class ChessEngine {
    initialize() {
        const chess = new Chess();
        return {
            fen: chess.fen(),
            moves: [] as string[],
            currentPlayer: 1, // 1 = white (player1), 2 = black (player2)
            player1: null as string | null,
            player2: null as string | null
        };
    }

    validateMove(gameState: any, move: any, playerAddress: string): { valid: boolean; error?: string } {
        try {
            const chess = new Chess(gameState.fen);
            
            // Check if it's player's turn
            const isWhiteTurn = chess.turn() === 'w';
            const isPlayer1 = gameState.player1 === playerAddress;
            
            if ((isWhiteTurn && !isPlayer1) || (!isWhiteTurn && isPlayer1)) {
                return { valid: false, error: 'Not your turn' };
            }
            
            const result = chess.move(move);
            return { valid: !!result };
        } catch (error) {
            return { valid: false, error: 'Invalid chess move' };
        }
    }

    applyMove(gameState: any, move: any, playerAddress: string) {
        const chess = new Chess(gameState.fen);
        const moveResult = chess.move(move);
        
        return {
            ...gameState,
            fen: chess.fen(),
            moves: [...gameState.moves, moveResult?.san || ''],
            currentPlayer: chess.turn() === 'w' ? 1 : 2,
            lastMove: { from: move.from, to: move.to, promotion: move.promotion }
        };
    }

    checkCompletion(gameState: any): { isComplete: boolean; scores?: any } {
        const chess = new Chess(gameState.fen);
        
        if (!chess.isGameOver()) {
            return { isComplete: false };
        }

        let scores = { player1: 50, player2: 50 }; // Draw by default
        
        if (chess.isCheckmate()) {
            // The player whose turn it is has been checkmated (they lost)
            if (chess.turn() === 'w') {
                scores = { player1: 0, player2: 100 }; // White (player1) lost
            } else {
                scores = { player1: 100, player2: 0 }; // Black (player2) lost
            }
        }

        return { isComplete: true, scores };
    }
}
