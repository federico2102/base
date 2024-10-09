const cardValues = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const determineRoundWinner = (playedCards) => {
    let highestCard = null;
    let winningPlayer = null;

    playedCards.forEach(({ playerName, card }) => {
        const rank = card.slice(0, -1);  // Extract rank (2, 3, ..., K, A)
        const suit = card.slice(-1);  // Extract suit (H, D, S, C)
        const cardValue = cardValues[rank];  // Map rank to value
        const isAceOfHearts = (rank === 'A' && suit === 'H');

        if (
            isAceOfHearts ||  // Ace of Hearts is the highest priority
            !highestCard ||  // No highest card yet
            cardValue > cardValues[highestCard.rank] ||  // Current card is of higher rank
            (cardValue === cardValues[highestCard.rank] && suit === 'H') ||  // Tiebreaker: Hearts beats others
            (cardValue === cardValues[highestCard.rank] && suit > highestCard.suit)  // Compare suit if ranks are equal
        ) {
            highestCard = { rank, suit, playerName };  // Update highest card
            winningPlayer = playerName;  // Update winner
        }
    });

    return winningPlayer;
};

export {determineRoundWinner};
