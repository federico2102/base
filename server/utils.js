// Each deck has 52 cards
const CARDS_PER_DECK = 52;

function calculateDecksRequired(totalCardsRequired) {
    return Math.ceil(totalCardsRequired / CARDS_PER_DECK);  // Minimum decks needed
}

module.exports = { calculateDecksRequired };
