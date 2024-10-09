const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const suits = ['H', 'D', 'S', 'C'];  // Hearts, Diamonds, Spades, Clubs

function createDeck(numDecks = 1) {
    let deck = [];
    for (let i = 0; i < numDecks; i++) {
        for (let rank of ranks) {
            for (let suit of suits) {
                deck.push(rank + suit);  // Create cards for each suit and rank
            }
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));  // Get a random index
        [deck[i], deck[j]] = [deck[j], deck[i]];  // Swap elements at i and j
    }
    return deck;
}

function dealCards(deck, numPlayers, numCardsPerPlayer) {
    const hands = {};
    for (let i = 0; i < numPlayers; i++) {
        hands[i] = [];
        for (let j = 0; j < numCardsPerPlayer; j++) {
            hands[i].push(deck.pop());
        }
    }
    return hands;
}

export {createDeck, shuffleDeck, dealCards};
