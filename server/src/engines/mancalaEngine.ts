export class MancalaEngine {
    initialize() {
        return {
            board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], // 14 positions: 6 pits + store for each player
            currentPlayer: 1, // Player 1: positions 0-5 (store at 6), Player 2: positions 7-12 (store at 13)
            gameState: 'active',
            player1: null,
            player2: null,
            lastMove: null
        };
    }

    validateMove(gameState: any, move: any, playerAddress: string): { valid: boolean; error?: string } {
        const { pit } = move;
        
        // Validate player turn
        const expectedPlayer = gameState.currentPlayer;
        const actualPlayer = gameState.player1 === playerAddress ? 1 : 2;
        
        if (expectedPlayer !== actualPlayer) {
            return { valid: false, error: 'Not your turn' };
        }
        
        // Validate pit selection
        if (gameState.currentPlayer === 1) {
            if (pit < 0 || pit > 5) {
                return { valid: false, error: 'Invalid pit selection' };
            }
        } else {
            if (pit < 7 || pit > 12) {
                return { valid: false, error: 'Invalid pit selection' };
            }
        }
        
        // Check if pit has stones
        if (gameState.board[pit] === 0) {
            return { valid: false, error: 'Selected pit is empty' };
        }
        
        return { valid: true };
    }

    applyMove(gameState: any, move: any, playerAddress: string) {
        const { pit } = move;
        const newState = { ...gameState, board: [...gameState.board] };
        
        let stones = newState.board[pit];
        newState.board[pit] = 0;
        let currentPos = pit;
        
        // Distribute stones
        while (stones > 0) {
            currentPos = (currentPos + 1) % 14;
            
            // Skip opponent's store
            if ((newState.currentPlayer === 1 && currentPos === 13) || 
                (newState.currentPlayer === 2 && currentPos === 6)) {
                continue;
            }
            
            newState.board[currentPos]++;
            stones--;
        }
        
        // Check for capture
        const isPlayerSide = (newState.currentPlayer === 1 && currentPos >= 0 && currentPos <= 5) ||
                            (newState.currentPlayer === 2 && currentPos >= 7 && currentPos <= 12);\n        
        if (isPlayerSide && newState.board[currentPos] === 1) {\n            const oppositePos = 12 - currentPos;\n            if (newState.board[oppositePos] > 0) {\n                const capturedStones = newState.board[oppositePos] + 1;\n                newState.board[oppositePos] = 0;\n                newState.board[currentPos] = 0;\n                \n                if (newState.currentPlayer === 1) {\n                    newState.board[6] += capturedStones;\n                } else {\n                    newState.board[13] += capturedStones;\n                }\n            }\n        }\n        \n        // Check for extra turn (landing in own store)\n        const ownStore = newState.currentPlayer === 1 ? 6 : 13;\n        if (currentPos !== ownStore) {\n            newState.currentPlayer = newState.currentPlayer === 1 ? 2 : 1;\n        }\n        \n        newState.lastMove = { pit, player: playerAddress, timestamp: Date.now() };\n        \n        return newState;\n    }\n\n    checkCompletion(gameState: any): { isComplete: boolean; scores?: any } {\n        // Check if either side is empty\n        const player1Side = gameState.board.slice(0, 6).every(pit => pit === 0);\n        const player2Side = gameState.board.slice(7, 13).every(pit => pit === 0);\n        \n        if (player1Side || player2Side) {\n            // Move remaining stones to respective stores\n            const finalBoard = [...gameState.board];\n            \n            if (player1Side) {\n                const remainingStones = finalBoard.slice(7, 13).reduce((sum, stones) => sum + stones, 0);\n                finalBoard[13] += remainingStones;\n                for (let i = 7; i < 13; i++) finalBoard[i] = 0;\n            }\n            \n            if (player2Side) {\n                const remainingStones = finalBoard.slice(0, 6).reduce((sum, stones) => sum + stones, 0);\n                finalBoard[6] += remainingStones;\n                for (let i = 0; i < 6; i++) finalBoard[i] = 0;\n            }\n            \n            const player1Score = finalBoard[6];\n            const player2Score = finalBoard[13];\n            \n            return {\n                isComplete: true,\n                scores: { player1: player1Score, player2: player2Score }\n            };\n        }\n        \n        return { isComplete: false };\n    }\n\n    assignPlayers(gameState: any, player1: string, player2: string) {\n        gameState.player1 = player1;\n        gameState.player2 = player2;\n        return gameState;\n    }\n}