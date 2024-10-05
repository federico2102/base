const { createDeck, shuffleDeck, dealCards } = require('./deck');

function startGame(session, currentHand) {
    const numPlayers = session.players.length;

    if (numPlayers === 0) {
        throw new Error("No players in the session");  // Ensure there are players
    }

    // Determine the number of cards for the current hand (1, 3, 5, etc.)
    const numCardsPerPlayer = 2 * currentHand - 1;

    // Create and shuffle the deck, then deal the determined number of cards
    session.gameState.deck = shuffleDeck(createDeck(session.gameState.decksRequired));
    const playerHands = dealCards(session.gameState.deck, numPlayers, numCardsPerPlayer);

    session.players.forEach((player, index) => {
        player.hand = playerHands[`player${index + 1}`];
    });

    // Initialize currentTurnIndex if not already set
    session.gameState.currentTurnIndex = 0;

    // Set the turn to the first player
    session.gameState.turnName = session.players[session.gameState.currentTurnIndex].name;
}

function getRandomPlayer(players) {
    const randomIndex = Math.floor(Math.random() * players.length);
    return players[randomIndex];
}

module.exports = { startGame, getRandomPlayer };
