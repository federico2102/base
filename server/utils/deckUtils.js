const CARDS_PER_DECK = 52;

function calculateDecksRequired(totalCardsRequired) {
    return Math.ceil(totalCardsRequired / CARDS_PER_DECK);
}

export {calculateDecksRequired};
