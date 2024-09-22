// server/models/deck.js

const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const suits = ['H', 'D', 'S', 'C'];

// Create a new deck of cards
function createDeck() {
    const deck = [];
    for (let rank of ranks) {
        for (let suit of suits) {
            deck.push(rank + suit); // Concatenate rank and suit to create card
        }
    }
    return deck;
}

// Shuffle the deck using the Fisher-Yates algorithm
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap elements
    }
    return deck;
}

// Deal cards to players
function dealCards(deck, numPlayers, numCardsPerPlayer) {
    const hands = {};
    
    for (let i = 0; i < numPlayers; i++) {
        hands[`player${i + 1}`] = []; // Create an array for each player
        for (let j = 0; j < numCardsPerPlayer; j++) {
            hands[`player${i + 1}`].push(deck.pop()); // Deal a card from the top of the deck
        }
    }
    return hands; // Return the hands object
}

module.exports = { createDeck, shuffleDeck, dealCards };
