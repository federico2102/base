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

function getRandomPlayer(players) {
    if (players.length === 0) {
        return null; // Return null if the list is empty
    }
    const randomIndex = Math.floor(Math.random() * players.length); // Generate a random index
    return players[randomIndex]; // Return the player at that index
}


// Removed duplicate dealCards function since it's defined in deck.js
module.exports = { startGame, gameState, getRandomPlayer };
