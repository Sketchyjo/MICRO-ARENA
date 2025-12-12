/**
 * Penalty Precision Duel Engine
 * Players take turns as shooter and goalkeeper for 5 rounds each (10 total kicks)
 * Shooter picks a zone (1-9), goalkeeper picks a zone to dive
 * Score based on successful goals vs saves
 */
export class PenaltyEngine {
    private readonly ROUNDS = 5;

    initialize() {
        return {
            round: 1,
            phase: 'player1_shoot', // player1_shoot, player1_save, player2_shoot, player2_save
            player1Goals: 0,
            player2Goals: 0,
            player1Saves: 0,
            player2Saves: 0,
            currentShot: null,
            currentDive: null,
            history: [],
            player1: null,
            player2: null,
            gameState: 'active',
            winner: null
        };
    }

    validateMove(gameState: any, move: any, playerAddress: string): { valid: boolean; error?: string } {
        const { zone } = move; // 1-9 grid position

        if (zone < 1 || zone > 9) {
            return { valid: false, error: 'Invalid zone (1-9)' };
        }

        const isPlayer1 = gameState.player1 === playerAddress;
        const isPlayer2 = gameState.player2 === playerAddress;

        if (!isPlayer1 && !isPlayer2) {
            return { valid: false, error: 'Not a player in this match' };
        }

        // Check if it's this player's turn based on phase
        if (gameState.phase === 'player1_shoot' && !isPlayer1) {
            return { valid: false, error: 'Waiting for player 1 to shoot' };
        }
        if (gameState.phase === 'player2_save' && !isPlayer2) {
            return { valid: false, error: 'Waiting for player 2 to save' };
        }
        if (gameState.phase === 'player2_shoot' && !isPlayer2) {
            return { valid: false, error: 'Waiting for player 2 to shoot' };
        }
        if (gameState.phase === 'player1_save' && !isPlayer1) {
            return { valid: false, error: 'Waiting for player 1 to save' };
        }

        return { valid: true };
    }

    applyMove(gameState: any, move: any, playerAddress: string) {
        const { zone } = move;
        const newState = { ...gameState, history: [...gameState.history] };

        if (newState.phase === 'player1_shoot') {
            newState.currentShot = zone;
            newState.phase = 'player2_save';
        } else if (newState.phase === 'player2_save') {
            newState.currentDive = zone;
            const goal = newState.currentShot !== newState.currentDive;
            if (goal) newState.player1Goals++;
            else newState.player2Saves++;
            newState.history.push({ round: newState.round, shooter: 'player1', shot: newState.currentShot, dive: newState.currentDive, goal });
            newState.currentShot = null;
            newState.currentDive = null;
            newState.phase = 'player2_shoot';
        } else if (newState.phase === 'player2_shoot') {
            newState.currentShot = zone;
            newState.phase = 'player1_save';
        } else if (newState.phase === 'player1_save') {
            newState.currentDive = zone;
            const goal = newState.currentShot !== newState.currentDive;
            if (goal) newState.player2Goals++;
            else newState.player1Saves++;
            newState.history.push({ round: newState.round, shooter: 'player2', shot: newState.currentShot, dive: newState.currentDive, goal });
            newState.currentShot = null;
            newState.currentDive = null;
            newState.round++;
            newState.phase = 'player1_shoot';
        }

        // Check if game is complete
        if (newState.round > this.ROUNDS) {
            newState.gameState = 'complete';
            if (newState.player1Goals > newState.player2Goals) {
                newState.winner = 1;
            } else if (newState.player2Goals > newState.player1Goals) {
                newState.winner = 2;
            } else {
                newState.winner = 0; // Draw
            }
        }

        return newState;
    }

    checkCompletion(gameState: any): { isComplete: boolean; scores?: any } {
        if (gameState.gameState === 'complete') {
            // Score: goals * 10 + saves * 10 (max 100 per player)
            const p1Score = (gameState.player1Goals * 10) + (gameState.player1Saves * 10);
            const p2Score = (gameState.player2Goals * 10) + (gameState.player2Saves * 10);
            return { isComplete: true, scores: { player1: p1Score, player2: p2Score } };
        }
        return { isComplete: false };
    }

    assignPlayers(gameState: any, player1: string, player2: string) {
        gameState.player1 = player1;
        gameState.player2 = player2;
        return gameState;
    }
}
