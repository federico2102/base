// End of hand: Calculate scores based on the declarations and actual wins
const calculateScores = (session, io) => {
    if (!session) return;

    session.players.forEach(player => {
        const { declaredRounds, actualRoundsWon } = player;
        if(!player.score)player.score = 0;
        if (declaredRounds === actualRoundsWon) {
            player.score += 10 + actualRoundsWon;
        } else {
            player.score += actualRoundsWon;
        }
        session.gameState.scoreboard = session.gameState.scoreboard || {};
        session.gameState.scoreboard[player.name] = player.score;

        player.declaredRounds = undefined;  // Reset for the next hand
        player.actualRoundsWon = 0;  // Reset after score is calculated
    });
};

// End of game logic: Show final scoreboard and determine the winner
const endGame = (session, sessionId, io) => {
    if (!session) return;

    const winner = session.players.reduce((maxPlayer, player) =>
        player.score > maxPlayer.score ? player : maxPlayer, session.players[0]);
    io.to(sessionId).emit('gameOver', { winner: winner.name, score: winner.score });
};

export { calculateScores, endGame };
