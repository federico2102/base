const { createDeck, shuffleDeck, dealCards } = require('./deck');

let gameState = {
    deck: [],
    players: {}
};

function startGame(session) {  // Accept session as an argument
    const numPlayers = session.players.length; // Use the session to get the number of players
    gameState.deck = shuffleDeck(createDeck()); // Create and shuffle a new deck
    const playerHands = dealCards(gameState.deck, numPlayers, 2); // Deal 2 cards to each player
    
    // Ensure that each player's hand is assigned properly
    session.players.forEach((player, index) => {
        player.hand = playerHands[`player${index + 1}`]; // Assign the hand to each player in the session
    });

    console.log("Game State after starting the game:", session); // Debug log to check player hands
}

// Removed duplicate dealCards function since it's defined in deck.js
module.exports = { startGame, gameState };
