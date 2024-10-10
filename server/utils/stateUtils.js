export const resetPlayerReadyStatus = (session) => {
    session.players.forEach((player) => {
        player.readyForNextRound = false;
    });
};

export const getNextTurnIndex = (currentTurnIndex, playersLength) => {
    return (currentTurnIndex + 1) % playersLength;
};

export const allRoundsPlayed = (session) => {
    return session.players[0].hand.length === 0;
};
