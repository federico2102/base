import { createDeck, shuffleDeck, dealCards } from './deck.js';

const startGame = (session, currentHand, previousStartingPlayerIndex) => {
    // Logic to determine the number of cards to deal for the next hand
    const nextHandNumber =currentHand + 1;
    let cardsToDeal = (nextHandNumber * 2 - 1 <= session.gameState.maxCards)
        ? 2 * nextHandNumber - 1  // First increasing phase
        : session.gameState.maxCards;   // Starting second half of the game
    if (nextHandNumber * 2 - 1 > session.gameState.maxCards+2) {    // Decreasing phase
        cardsToDeal = session.gameState.maxCards - (2 * nextHandNumber - 3 - session.gameState.maxCards);
    }

    const numPlayers = session.players.length;

    session.gameState.deck = shuffleDeck(createDeck(session.gameState.decksRequired));
    const playerHands = dealCards(session.gameState.deck, numPlayers, cardsToDeal);

    session.players.forEach((player, index) => {
        player.hand = playerHands[`player${index + 1}`];
    });
};

const getRandomPlayer = (players) => {
    return players[Math.floor(Math.random() * players.length)];
};

export  {startGame, getRandomPlayer};
