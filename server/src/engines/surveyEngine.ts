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
        },
        {
            question: "Name something people do on vacation",
            answers: [
                { text: "Relax", points: 40 },
                { text: "Swim", points: 25 },
                { text: "Sightsee", points: 20 },
                { text: "Shop", points: 15 }
            ]
        },
        {
            question: "Name a fruit",
            answers: [
                { text: "Apple", points: 38 },
                { text: "Banana", points: 30 },
                { text: "Orange", points: 20 },
                { text: "Grape", points: 12 }
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
            revealedAnswers: [] as string[],
            player1: null as string | null,
            player2: null as string | null
        };
    }

    validateMove(gameState: any, move: any, playerAddress: string): { valid: boolean; error?: string } {
        const { guess } = move;
        
        // Validate player turn
        const isPlayer1 = gameState.player1 === playerAddress;
        const expectedPlayer1Turn = gameState.currentPlayer === 1;
        
        if ((expectedPlayer1Turn && !isPlayer1) || (!expectedPlayer1Turn && isPlayer1)) {
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
        const newState = JSON.parse(JSON.stringify(gameState));
        const isPlayer1 = newState.player1 === playerAddress;
        
        const normalizedGuess = guess.toLowerCase().trim();
        const answer = newState.currentQuestion.answers.find(
            (a: { text: string; points: number }) => {
                const normalizedAnswer = a.text.toLowerCase().trim();
                return (normalizedAnswer === normalizedGuess || 
                        normalizedAnswer.includes(normalizedGuess) && normalizedGuess.length >= 3) &&
                       !newState.revealedAnswers.includes(a.text);
            }
        );
        
        if (answer) {
            newState.revealedAnswers.push(answer.text);
            if (isPlayer1) {
                newState.player1Score += answer.points;
            } else {
                newState.player2Score += answer.points;
            }
            newState.lastGuess = { guess, correct: true, answer: answer.text, points: answer.points };
        } else {
            if (isPlayer1) {
                newState.player1Strikes++;
            } else {
                newState.player2Strikes++;
            }
            newState.lastGuess = { guess, correct: false };
        }
        
        // Switch turns
        newState.currentPlayer = newState.currentPlayer === 1 ? 2 : 1;
        
        return newState;
    }

    checkCompletion(gameState: any): { isComplete: boolean; scores?: any } {
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
}
