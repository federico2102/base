// server/game/game.js
const { createDeck, shuffleDeck, dealCards } = require('./deck');

const startGame = (session, currentHand, previousStartingPlayerIndex) => {
    const numPlayers = session.players.length;
    const numCardsPerPlayer = 2 * currentHand - 1;

    session.gameState.deck = shuffleDeck(createDeck(session.gameState.decksRequired));
    const playerHands = dealCards(session.gameState.deck, numPlayers, numCardsPerPlayer);

    session.players.forEach((player, index) => {
        player.hand = playerHands[`player${index + 1}`];
    });

    session.gameState.currentTurnIndex = (previousStartingPlayerIndex + 1) % numPlayers;
    session.gameState.turnName = session.players[session.gameState.currentTurnIndex].name;
};

const getRandomPlayer = (players) => {
    return players[Math.floor(Math.random() * players.length)];
};

module.exports = { startGame, getRandomPlayer };
