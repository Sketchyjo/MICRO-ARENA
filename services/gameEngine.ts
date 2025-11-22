import { GameType, WhotCard, SurveyQuestion } from '../types';

// Mock WebSocket / Game Server logic
class GameEngine {
  
  // WHOT GAME LOGIC
  generateWhotDeck(): WhotCard[] {
    const shapes = ['circle', 'triangle', 'cross', 'square', 'star'] as const;
    const deck: WhotCard[] = [];
    let idCounter = 0;

    shapes.forEach(shape => {
      // 1-14
      for (let i = 1; i <= 5; i++) { // Reduced deck size for blitz demo
         deck.push({
           id: `card-${idCounter++}`,
           shape,
           number: i,
           isSpecial: [1, 2, 5].includes(i)
         });
      }
    });
    return deck.sort(() => Math.random() - 0.5);
  }

  // SURVEY GAME DATA
  getSurveyQuestions(): SurveyQuestion[] {
    return [
      {
        id: 'q1',
        text: "Name something you'd find in a glovebox.",
        answers: [
          { text: "Registration/Insurance", score: 45, revealed: false },
          { text: "Gloves", score: 20, revealed: false },
          { text: "Flashlight", score: 15, revealed: false },
          { text: "Napkins", score: 10, revealed: false },
        ]
      },
      {
        id: 'q2',
        text: "Name a reason you might wake up at 2 AM.",
        answers: [
          { text: "Bathroom", score: 50, revealed: false },
          { text: "Thirsty", score: 25, revealed: false },
          { text: "Bad Dream", score: 15, revealed: false },
          { text: "Noise", score: 10, revealed: false },
        ]
      }
    ];
  }

  // CHESS UTILS
  // We will rely on the component to handle chess logic via chess.js
  // But the server would validate FEN strings here.
  validateMove(fen: string): boolean {
      return true; // Mock validation
  }

  // DETERMINISTIC RANDOMNESS (Mock)
  // In production, seed comes from block difficulty or commit-reveal random
  generateSeed(): string {
    return Math.random().toString(36).substring(7);
  }
}

export const gameEngine = new GameEngine();
