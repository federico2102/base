import { createDeck, shuffleDeck, dealCards } from './deck.js';

const startGame = (session, currentHand) => {
    // Logic to determine the number of cards to deal for the next hand
    let cardsToDeal = (currentHand * 2 - 1 <= session.gameState.maxCards)
        ? 2 * currentHand - 1  // First increasing phase
        : session.gameState.maxCards;   // Starting second half of the game
    if (currentHand * 2 - 1 > session.gameState.maxCards+2) {    // Decreasing phase
        cardsToDeal = session.gameState.maxCards - (2 * currentHand - 3 - session.gameState.maxCards);
    }

    const numPlayers = session.players.length;

    session.gameState.deck = shuffleDeck(createDeck(session.gameState.decksRequired));
    const playerHands = dealCards(session.gameState.deck, numPlayers, cardsToDeal);

    session.players.forEach((player, index) => {
        player.hand = playerHands[index];
    });
};

const getRandomPlayer = (players) => {
    return players[Math.floor(Math.random() * players.length)];
};

export  {startGame, getRandomPlayer};
