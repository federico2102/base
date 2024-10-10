const CARDS_PER_DECK = 52;

export function calculateDecksRequired(totalCardsRequired) {
    return Math.ceil(totalCardsRequired / CARDS_PER_DECK);
}