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
                            (newState.currentPlayer === 2 && currentPos >= 7 && currentPos <= 12);
        
        if (isPlayerSide && newState.board[currentPos] === 1) {
            const oppositePos = 12 - currentPos;
            if (newState.board[oppositePos] > 0) {
                const capturedStones = newState.board[oppositePos] + 1;
                newState.board[oppositePos] = 0;
                newState.board[currentPos] = 0;
                
                if (newState.currentPlayer === 1) {
                    newState.board[6] += capturedStones;
                } else {
                    newState.board[13] += capturedStones;
                }
            }
        }
        
        // Check for extra turn (landing in own store)
        const ownStore = newState.currentPlayer === 1 ? 6 : 13;
        if (currentPos !== ownStore) {
            newState.currentPlayer = newState.currentPlayer === 1 ? 2 : 1;
        }
        
        newState.lastMove = { pit, player: playerAddress, timestamp: Date.now() };
        
        return newState;
    }

    checkCompletion(gameState: any): { isComplete: boolean; scores?: any } {
        // Check if either side is empty
        const player1Side = gameState.board.slice(0, 6).every((pit: number) => pit === 0);
        const player2Side = gameState.board.slice(7, 13).every((pit: number) => pit === 0);
        
        if (player1Side || player2Side) {
            // Move remaining stones to respective stores
            const finalBoard = [...gameState.board];
            
            if (player1Side) {
                const remainingStones = finalBoard.slice(7, 13).reduce((sum: number, stones: number) => sum + stones, 0);
                finalBoard[13] += remainingStones;
                for (let i = 7; i < 13; i++) finalBoard[i] = 0;
            }
            
            if (player2Side) {
                const remainingStones = finalBoard.slice(0, 6).reduce((sum: number, stones: number) => sum + stones, 0);
                finalBoard[6] += remainingStones;
                for (let i = 0; i < 6; i++) finalBoard[i] = 0;
            }
            
            const player1Score = finalBoard[6];
            const player2Score = finalBoard[13];
            
            return {
                isComplete: true,
                scores: { player1: player1Score, player2: player2Score }
            };
        }
        
        return { isComplete: false };
    }

    assignPlayers(gameState: any, player1: string, player2: string) {
        gameState.player1 = player1;
        gameState.player2 = player2;
        return gameState;
    }
}
