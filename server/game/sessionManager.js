const sessions = {};

export const createSession = (playerName, socket) => {
    const sessionId = Math.random().toString(36).substring(2, 8);
    sessions[sessionId] = {
        admin: playerName,
        players: [{ name: playerName, id: socket.id, hand: [] }],
        gameState: {
            turnName: null,
            currentHand: 0,
            maxCards: 1,
            currentTurnIndex: 0,
            decksRequired: 1,
            playedCards: [],
            scoreboard: {},
            startingPlayerIndex: 0,
            isDeclarationsPhase: true,
            roundWinner: ''
        },
        started: false
    };
    return sessionId;
};

export const getSession = (sessionId) => sessions[sessionId];

export const addPlayerToSession = (session, playerName, socket) => {
    session.players.push({ name: playerName, id: socket.id, hand: [] });
};

export const destroySession = (sessionId) => {
    delete sessions[sessionId];
};