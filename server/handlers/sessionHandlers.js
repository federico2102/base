import { createSession, getSession, addPlayerToSession, destroySession } from '../game/sessionManager.js';
import {getSessionOrEmitError} from "../utils/validationUtils.js";
import {errorMessages} from "../utils/messageUtils.js";

export const handleCreateGame = (socket, playerName, io) => {
    if (playerName === '') {
        return socket.emit('error', { message: errorMessages.blankName });
    }

    const sessionId = createSession(playerName, socket);
    socket.join(sessionId);
    socket.emit('sessionCreated', { sessionId });
    io.to(sessionId).emit('playerListUpdated', getSession(sessionId).players);
};

export const handleJoinGame = (socket, { playerName, code }, io) => {
    if (playerName === '' || code === '') {
        return socket.emit('error', { message: errorMessages.blankNameAndSessionCode });
    }

    const session = getSessionOrEmitError(code, socket, io);
    if (!session) return;

    if (session.started) return socket.emit('error', { message: errorMessages.gameAlreadyStarted });

    if (session.players.find(p => p.name === playerName)) {
        return socket.emit('error', { message: 'Player name already exists.' });
    }

    addPlayerToSession(session, playerName, socket);
    socket.join(code);
    socket.emit('addedToGame', { players: session.players, maxCards: session.gameState.maxCards, name: playerName });
    io.to(code).emit('playerListUpdated', session.players);
};

export const handleDestroySession = (socket, { sessionId }, io) => {
    const session = getSessionOrEmitError(sessionId, socket, io);
    if (!session) return;

    destroySession(sessionId);
    io.to(sessionId).emit('sessionDestroyed');
};