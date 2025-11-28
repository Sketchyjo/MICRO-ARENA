interface SurveyQuestion {
    question: string;
    answers: { text: string; points: number }[];
}

export class SurveyEngine {
    private questions: SurveyQuestion[] = [
        {
            question: "Name something you find in a kitchen",
            answers: [
                { text: "Refrigerator", points: 35 },
                { text: "Stove", points: 28 },
                { text: "Sink", points: 22 },
                { text: "Microwave", points: 15 }
            ]
        },
        {
            question: "Name a popular pet",
            answers: [
                { text: "Dog", points: 45 },
                { text: "Cat", points: 35 },
                { text: "Fish", points: 12 },
                { text: "Bird", points: 8 }
            ]
        }
    ];

    initialize() {
        const question = this.questions[Math.floor(Math.random() * this.questions.length)];
        
        return {
            currentQuestion: question,
            player1Score: 0,
            player2Score: 0,
            player1Strikes: 0,
            player2Strikes: 0,
            currentPlayer: 1,
            revealedAnswers: [],
            gameState: 'active',
            player1: null,
            player2: null
        };
    }

    validateMove(gameState: any, move: any, playerAddress: string): { valid: boolean; error?: string } {
        const { guess } = move;
        
        // Validate player turn
        const expectedPlayer = gameState.currentPlayer;
        const actualPlayer = gameState.player1 === playerAddress ? 1 : 2;
        
        if (expectedPlayer !== actualPlayer) {
            return { valid: false, error: 'Not your turn' };
        }
        
        if (!guess || typeof guess !== 'string') {
            return { valid: false, error: 'Invalid guess' };
        }
        
        if (gameState.player1Strikes >= 3 || gameState.player2Strikes >= 3) {
            return { valid: false, error: 'Game over - too many strikes' };
        }
        
        return { valid: true };
    }

    applyMove(gameState: any, move: any, playerAddress: string) {
        const { guess } = move;
        const newState = { ...gameState };
        
        const answer = newState.currentQuestion.answers.find(
            (a: { text: string; points: number }) => a.text.toLowerCase().includes(guess.toLowerCase()) && 
            !newState.revealedAnswers.includes(a.text)
        );
        
        if (answer) {
            newState.revealedAnswers.push(answer.text);
            if (newState.currentPlayer === 1) {
                newState.player1Score += answer.points;
            } else {
                newState.player2Score += answer.points;
            }
        } else {
            if (newState.currentPlayer === 1) {
                newState.player1Strikes++;
            } else {
                newState.player2Strikes++;
            }
        }
        
        // Switch turns
        newState.currentPlayer = newState.currentPlayer === 1 ? 2 : 1;
        
        return newState;
    }

    checkCompletion(gameState: any): { isComplete: boolean; scores?: any } {
        // Game ends if all answers revealed or player gets 3 strikes
        const allAnswersRevealed = gameState.revealedAnswers.length === gameState.currentQuestion.answers.length;
        const player1Eliminated = gameState.player1Strikes >= 3;
        const player2Eliminated = gameState.player2Strikes >= 3;
        
        if (allAnswersRevealed || player1Eliminated || player2Eliminated) {
            let scores;
            
            if (player1Eliminated && !player2Eliminated) {
                scores = { player1: 0, player2: 500 };
            } else if (player2Eliminated && !player1Eliminated) {
                scores = { player1: 500, player2: 0 };
            } else {
                scores = { player1: gameState.player1Score, player2: gameState.player2Score };
            }
            
            return { isComplete: true, scores };
        }
        
        return { isComplete: false };
    }

    assignPlayers(gameState: any, player1: string, player2: string) {
        gameState.player1 = player1;
        gameState.player2 = player2;
        return gameState;
    }
}