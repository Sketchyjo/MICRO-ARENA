interface Card {
    shape: string;
    number: number;
    special?: string;
}

export class WhotEngine {
    private shapes = ['circle', 'triangle', 'cross', 'square', 'star'];
    private numbers = [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14];
    private specials = ['pick2', 'pick3', 'holdon', 'suspension', 'whot'];

    initialize() {
        const deck = this.createDeck();
        const shuffled = this.shuffle(deck);
        
        return {
            deck: shuffled.slice(14),
            player1Hand: shuffled.slice(0, 7),
            player2Hand: shuffled.slice(7, 14),
            discardPile: [],
            currentPlayer: 1,
            gameState: 'active',
            lastCard: null,
            player1: null,
            player2: null,
            pickCount: 0,
            suspended: false
        };
    }

    validateMove(gameState: any, move: any, playerAddress: string): { valid: boolean; error?: string } {
        const { cardIndex, declaredShape } = move;
        
        // Validate player turn
        const expectedPlayer = gameState.currentPlayer;
        const actualPlayer = gameState.player1 === playerAddress ? 1 : 2;
        
        if (expectedPlayer !== actualPlayer) {
            return { valid: false, error: 'Not your turn' };
        }
        
        const currentHand = gameState.currentPlayer === 1 ? gameState.player1Hand : gameState.player2Hand;
        
        if (cardIndex < 0 || cardIndex >= currentHand.length) {
            return { valid: false, error: 'Invalid card index' };
        }
        
        const card = currentHand[cardIndex];
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        
        if (!topCard) return { valid: true }; // First move
        
        // WHOT card can be played anytime
        if (card.special === 'whot') {
            if (!declaredShape || !this.shapes.includes(declaredShape)) {
                return { valid: false, error: 'Must declare shape for WHOT card' };
            }
            return { valid: true };
        }
        
        // Must match shape or number
        if (card.shape !== topCard.shape && card.number !== topCard.number) {
            return { valid: false, error: 'Card must match shape or number' };
        }
        
        return { valid: true };
    }

    applyMove(gameState: any, move: any, playerAddress: string) {
        const { cardIndex, declaredShape } = move;
        const newState = { ...gameState };
        
        if (newState.currentPlayer === 1) {
            const card = newState.player1Hand.splice(cardIndex, 1)[0];
            newState.discardPile.push(card);
        } else {
            const card = newState.player2Hand.splice(cardIndex, 1)[0];
            newState.discardPile.push(card);
        }
        
        const playedCard = newState.discardPile[newState.discardPile.length - 1];
        
        // Handle special cards
        if (playedCard.special === 'whot' && declaredShape) {
            playedCard.shape = declaredShape;
        }
        
        newState.currentPlayer = newState.currentPlayer === 1 ? 2 : 1;
        return newState;
    }

    checkCompletion(gameState: any): { isComplete: boolean; scores?: any } {
        if (gameState.player1Hand.length === 0) {
            return { isComplete: true, scores: { player1: 1000, player2: gameState.player2Hand.length * 10 } };
        }
        
        if (gameState.player2Hand.length === 0) {
            return { isComplete: true, scores: { player1: gameState.player1Hand.length * 10, player2: 1000 } };
        }
        
        return { isComplete: false };
    }

    private createDeck(): Card[] {
        const deck: Card[] = [];
        
        // Regular cards
        for (const shape of this.shapes) {
            for (const number of this.numbers) {
                deck.push({ shape, number });
            }
        }
        
        // Special cards
        for (const special of this.specials) {
            deck.push({ shape: 'special', number: 0, special });
        }
        
        return deck;
    }

    private shuffle(array: Card[]): Card[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}