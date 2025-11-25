export class Connect4Engine {
    private readonly ROWS = 6;
    private readonly COLS = 7;

    initialize() {
        return {
            board: Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(0)),
            currentPlayer: 1,
            gameState: 'active',
            player1: null,
            player2: null,
            moves: [],
            winner: null
        };
    }

    validateMove(gameState: any, move: any, playerAddress: string): { valid: boolean; error?: string } {
        const { column } = move;
        
        // Validate player turn
        const expectedPlayer = gameState.currentPlayer;
        const actualPlayer = gameState.player1 === playerAddress ? 1 : 2;
        
        if (expectedPlayer !== actualPlayer) {
            return { valid: false, error: 'Not your turn' };
        }
        
        // Validate column
        if (column < 0 || column >= this.COLS) {
            return { valid: false, error: 'Invalid column' };
        }
        
        // Check if column is full
        if (gameState.board[0][column] !== 0) {
            return { valid: false, error: 'Column is full' };
        }
        
        return { valid: true };
    }

    applyMove(gameState: any, move: any, playerAddress: string) {
        const { column } = move;
        const newState = { 
            ...gameState, 
            board: gameState.board.map(row => [...row]),
            moves: [...gameState.moves]
        };
        
        // Find the lowest empty row in the column
        let row = this.ROWS - 1;
        while (row >= 0 && newState.board[row][column] !== 0) {
            row--;
        }
        
        // Place the piece
        newState.board[row][column] = newState.currentPlayer;
        newState.moves.push({ 
            row, 
            column, 
            player: newState.currentPlayer, 
            playerAddress,
            timestamp: Date.now() 
        });
        
        // Check for win
        if (this.checkWin(newState.board, row, column, newState.currentPlayer)) {
            newState.winner = newState.currentPlayer;
            newState.gameState = 'complete';
        } else if (this.isBoardFull(newState.board)) {
            newState.gameState = 'complete';
            newState.winner = 0; // Draw
        } else {
            // Switch turns
            newState.currentPlayer = newState.currentPlayer === 1 ? 2 : 1;
        }
        
        return newState;
    }

    checkCompletion(gameState: any): { isComplete: boolean; scores?: any } {
        if (gameState.gameState === 'complete') {
            let scores;
            
            if (gameState.winner === 1) {
                scores = { player1: 100, player2: 0 };
            } else if (gameState.winner === 2) {
                scores = { player1: 0, player2: 100 };
            } else {
                scores = { player1: 50, player2: 50 }; // Draw
            }
            
            return { isComplete: true, scores };
        }
        
        return { isComplete: false };
    }

    private checkWin(board: number[][], row: number, col: number, player: number): boolean {
        // Check horizontal
        if (this.checkDirection(board, row, col, 0, 1, player) ||
            this.checkDirection(board, row, col, 0, -1, player)) {
            return true;
        }
        
        // Check vertical
        if (this.checkDirection(board, row, col, 1, 0, player) ||
            this.checkDirection(board, row, col, -1, 0, player)) {
            return true;
        }
        
        // Check diagonal (top-left to bottom-right)
        if (this.checkDirection(board, row, col, 1, 1, player) ||
            this.checkDirection(board, row, col, -1, -1, player)) {
            return true;
        }
        
        // Check diagonal (top-right to bottom-left)
        if (this.checkDirection(board, row, col, 1, -1, player) ||
            this.checkDirection(board, row, col, -1, 1, player)) {
            return true;
        }
        
        return false;
    }

    private checkDirection(board: number[][], row: number, col: number, 
                          deltaRow: number, deltaCol: number, player: number): boolean {
        let count = 1; // Count the current piece
        
        // Check in positive direction
        let r = row + deltaRow;
        let c = col + deltaCol;
        while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && board[r][c] === player) {
            count++;
            r += deltaRow;
            c += deltaCol;
        }
        
        // Check in negative direction
        r = row - deltaRow;
        c = col - deltaCol;
        while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && board[r][c] === player) {
            count++;
            r -= deltaRow;
            c -= deltaCol;
        }
        
        return count >= 4;
    }

    private isBoardFull(board: number[][]): boolean {
        return board[0].every(cell => cell !== 0);
    }

    assignPlayers(gameState: any, player1: string, player2: string) {
        gameState.player1 = player1;
        gameState.player2 = player2;
        return gameState;
    }
}