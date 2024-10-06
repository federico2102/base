const cardValues = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const determineRoundWinner = (playedCards) => {
    let highestCard = null;
    let winningPlayer = null;

    playedCards.forEach(({ playerName, card }) => {
        const rank = card.slice(0, -1);
        const suit = card.slice(-1);
        const cardValue = cardValues[rank];
        const isAceOfHearts = (rank === 'A' && suit === 'H');

        if (
            isAceOfHearts ||
            !highestCard ||
            cardValue > cardValues[highestCard.rank] ||
            (cardValue === cardValues[highestCard.rank] && highestCard.suit !== 'H')
        ) {
            highestCard = { rank, suit, playerName };
            winningPlayer = playerName;
        }
    });

    return winningPlayer;
};

export {determineRoundWinner};
