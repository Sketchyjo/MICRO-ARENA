interface Card {
    shape: string;
    number: number;
    special?: string;
    id?: string;
}

export class WhotEngine {
    private shapes = ['circle', 'triangle', 'cross', 'square', 'star'];
    private numbers = [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14];

    initialize() {
        const deck = this.createDeck();
        const shuffled = this.shuffle(deck);

        return {
            deck: shuffled.slice(13),
            player1Hand: shuffled.slice(0, 6),
            player2Hand: shuffled.slice(6, 12),
            discardPile: [shuffled[12]],
            currentPlayer: 1,
            gameState: 'active',
            pendingPickup: 0,
            requiredShape: null as string | null,
        };
    }

    validateMove(gameState: any, move: any, playerAddress: string): { valid: boolean; error?: string } {
        const expectedPlayer = gameState.currentPlayer;
        const actualPlayer = gameState.player1 === playerAddress ? 1 : 2;

        if (expectedPlayer !== actualPlayer) {
            return { valid: false, error: 'Not your turn' };
        }

        // Handle DRAW_CARD move
        if (move.type === 'DRAW_CARD') {
            return { valid: true };
        }

        // Handle PLAY_CARD move
        if (move.type === 'PLAY_CARD') {
            const card = move.card;
            if (!card) return { valid: false, error: 'No card provided' };

            const currentHand = gameState.currentPlayer === 1 ? gameState.player1Hand : gameState.player2Hand;
            const cardInHand = currentHand.find((c: Card) => 
                c.shape === card.shape && c.number === card.number
            );

            if (!cardInHand) {
                return { valid: false, error: 'Card not in hand' };
            }

            const topCard = gameState.discardPile[gameState.discardPile.length - 1];
            if (!topCard) return { valid: true };

            // WHOT card (number 20) can be played anytime
            if (card.number === 20) {
                return { valid: true };
            }

            // If there's a required shape from WHOT card
            if (gameState.requiredShape) {
                if (card.shape !== gameState.requiredShape && card.number !== 20) {
                    return { valid: false, error: `Must play ${gameState.requiredShape} or WHOT` };
                }
                return { valid: true };
            }

            // Must match shape or number
            if (card.shape !== topCard.shape && card.number !== topCard.number) {
                return { valid: false, error: 'Card must match shape or number' };
            }

            return { valid: true };
        }

        return { valid: false, error: 'Invalid move type' };
    }

    applyMove(gameState: any, move: any, playerAddress: string) {
        const newState = JSON.parse(JSON.stringify(gameState));
        const isPlayer1 = newState.player1 === playerAddress;
        const currentHand = isPlayer1 ? newState.player1Hand : newState.player2Hand;

        if (move.type === 'DRAW_CARD') {
            const count = move.count || 1;
            for (let i = 0; i < count && newState.deck.length > 0; i++) {
                const drawnCard = newState.deck.pop();
                if (drawnCard) currentHand.push(drawnCard);
            }
            newState.pendingPickup = 0;
            newState.currentPlayer = isPlayer1 ? 2 : 1;
            return newState;
        }

        if (move.type === 'PLAY_CARD') {
            const card = move.card;
            const cardIndex = currentHand.findIndex((c: Card) => 
                c.shape === card.shape && c.number === card.number
            );

            if (cardIndex !== -1) {
                const playedCard = currentHand.splice(cardIndex, 1)[0];
                newState.discardPile.push(playedCard);

                // Clear required shape when any card is played
                newState.requiredShape = null;

                // Handle WHOT card (number 20) - set required shape
                if (card.number === 20 && move.requiredShape) {
                    newState.requiredShape = move.requiredShape;
                }

                // Handle special card effects
                if (card.number === 2) {
                    newState.pendingPickup = (newState.pendingPickup || 0) + 2;
                } else if (card.number === 5) {
                    newState.pendingPickup = (newState.pendingPickup || 0) + 3;
                } else if (card.number === 1) {
                    // Hold On - player goes again, don't switch turn
                    return newState;
                } else if (card.number === 8) {
                    // Suspension - skip opponent's turn
                    return newState;
                } else if (card.number === 14) {
                    // General Market - opponent picks 1
                    newState.pendingPickup = 1;
                }
            }

            newState.currentPlayer = isPlayer1 ? 2 : 1;
        }

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
        for (const shape of this.shapes) {
            for (const number of this.numbers) {
                deck.push({ shape, number });
            }
        }
        // Add WHOT cards (number 20)
        for (let i = 0; i < 4; i++) {
            deck.push({ shape: 'whot', number: 20 });
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
