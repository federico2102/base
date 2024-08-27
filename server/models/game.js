// server/models/game.js

const { createDeck, shuffleDeck, dealCards } = require('./deck');

let gameState = {
    deck: [],
    players: {}
};

function startGame(session) { // Accept session as an argument
    const numPlayers = session.players.length; // Use the session to get the number of players
    gameState.deck = shuffleDeck(createDeck()); // Create and shuffle a new deck
    const playerHands = dealCards(gameState.deck, numPlayers, 2); // Deal 2 cards to each player

    // Assign hands to the specific session
    session.players.forEach((player, index) => {
        player.hand = playerHands[`player${index + 1}`]; // Assign hand
    });

    console.log("Game State after starting the game:", session.players[0].hand); // Debugging log
}

module.exports = { startGame, gameState };
