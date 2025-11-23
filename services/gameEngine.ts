import { GameType, WhotCard, SurveyQuestion } from '../types';

// Mock WebSocket / Game Server logic
class GameEngine {
  
  // WHOT GAME LOGIC
  generateWhotDeck(): WhotCard[] {
    const shapes = ['circle', 'triangle', 'cross', 'square', 'star'] as const;
    const deck: WhotCard[] = [];
    let idCounter = 0;

    shapes.forEach(shape => {
      // Standard Whot Deck distribution
      // Circle: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14
      // Triangle: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14
      // Cross: 1, 2, 3, 5, 7, 10, 11, 13, 14
      // Square: 1, 2, 3, 5, 7, 10, 11, 13, 14
      // Star: 1, 2, 3, 4, 5, 7, 8
      
      const numbers = [];
      if (shape === 'circle' || shape === 'triangle') numbers.push(1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14);
      else if (shape === 'cross' || shape === 'square') numbers.push(1, 2, 3, 5, 7, 10, 11, 13, 14);
      else if (shape === 'star') numbers.push(1, 2, 3, 4, 5, 7, 8);

      numbers.forEach(num => {
         deck.push({
           id: `card-${idCounter++}`,
           shape,
           number: num,
           // 1 (Hold On), 2 (Pick 2), 5 (Pick 3), 8 (Suspension), 14 (General Market)
           isSpecial: [1, 2, 5, 8, 14].includes(num)
         });
      });
    });

    // Add Whot Cards (20) - 5 cards
    shapes.forEach(shape => {
        deck.push({
            id: `card-${idCounter++}`,
            shape,
            number: 20,
            isSpecial: true
        });
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
          { text: "Manual", score: 5, revealed: false },
        ]
      },
      {
        id: 'q2',
        text: "Name a reason you might wake up at 2 AM.",
        answers: [
          { text: "Bathroom", score: 50, revealed: false },
          { text: "Thirsty", score: 25, revealed: false },
          { text: "Bad Dream", score: 15, revealed: false },
          { text: "Noise", score: 8, revealed: false },
          { text: "Too Hot/Cold", score: 2, revealed: false },
        ]
      },
      {
        id: 'q3',
        text: "Name a fruit you don't peel.",
        answers: [
            { text: "Apple", score: 35, revealed: false },
            { text: "Grape", score: 30, revealed: false },
            { text: "Strawberry", score: 20, revealed: false },
            { text: "Pear", score: 10, revealed: false },
            { text: "Peach", score: 5, revealed: false },
        ]
      },
      {
        id: 'q4',
        text: "Name something people often lose.",
        answers: [
            { text: "Keys", score: 40, revealed: false },
            { text: "Phone", score: 25, revealed: false },
            { text: "Wallet/Purse", score: 15, revealed: false },
            { text: "Glasses", score: 10, revealed: false },
            { text: "Remote", score: 10, revealed: false },
        ]
      },
      {
        id: 'q5',
        text: "Name a place where you have to wait.",
        answers: [
            { text: "Doctor's Office/Hospital", score: 40, revealed: false },
            { text: "DMV", score: 30, revealed: false },
            { text: "Grocery Store/Line", score: 15, revealed: false },
            { text: "Airport", score: 10, revealed: false },
            { text: "Restaurant", score: 5, revealed: false },
        ]
      }
    ];
  }

  // CHESS UTILS
  validateMove(fen: string): boolean {
      return true; // Logic delegated to chess.js
  }

  generateSeed(): string {
    return Math.random().toString(36).substring(7);
  }
}

export const gameEngine = new GameEngine();