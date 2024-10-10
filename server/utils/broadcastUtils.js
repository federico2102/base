export const broadcastMaxCardsUpdated = (io, sessionId, maxCards) => {
    io.to(sessionId).emit('maxCardsUpdated', maxCards);
}

export const broadcastNextTurn = (io, sessionId, session = []) => {
    io.to(sessionId).emit('nextTurn', {
        turnName: session.gameState.turnName,
        currentHand: session.gameState.currentHand,
        playedCards: session.gameState.playedCards
    });
};

export const broadcastHandUpdate = (io, playerId, playerHand) => {
    io.to(playerId).emit('handUpdated', playerHand);
};

export const broadcastNextDeclarationTurn = (io, sessionId, nextPlayer) => {
    io.to(sessionId).emit('nextDeclarationTurn', { turnName: nextPlayer });
};

export const broadcastRoundFinished = (io, sessionId, winner, roundsWon) => {
    io.to(sessionId).emit('roundFinished', {
        winner: winner,
        roundsWon: roundsWon,
    });
};

export const broadcastGameStart = (io, sessionId, session) => {
    session.players.forEach(player => {
        io.to(player.id).emit('gameStarted', {
            playerHand: player.hand,
            turnName: session.gameState.turnName,
            currentHand: session.gameState.currentHand,
            sessionId
        });
    });
};

export const broadcastAllDeclarationsMade = (io, sessionId, session) => {
    io.to(sessionId).emit('allDeclarationsMade', {
        turnName: session.gameState.turnName,
        currentHand: session.gameState.currentHand
    });
};

export const broadcastDeclarationUpdate = (io, sessionId, playerName, declaredRounds) => {
    io.to(sessionId).emit('declarationUpdated', {
        playerName,
        declaredRounds
    });
};

export const broadcastCardPlayed = (io, sessionId, playedCards) => {
    io.to(sessionId).emit('cardPlayed', playedCards);
}

export const broadcastResetAndNextHand = (io, session) => {
    session.players.forEach(player => {
        io.to(player.id).emit('resetAndNextHand', {
            playerHand: player.hand,
            turnName: session.gameState.turnName,
            currentHand: session.gameState.currentHand,
            maxDeclaration: player.hand.length,
            scoreboard: session.gameState.scoreboard
        });
    });
}

export const broadcastWaitingMessage = (io, socketId) => {
    io.to(socketId).emit('waitingForPlayers', { message: 'Waiting for other players to be ready...' });
}