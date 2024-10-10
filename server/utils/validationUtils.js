import { getSession } from "../game/sessionManager.js";
import {errorMessages} from "./messageUtils.js";

export const getSessionOrEmitError = (sessionId, socket, io) => {
    const session = getSession(sessionId);
    if (!session) {
        socket.emit('error', { message: errorMessages.sessionNotFound });
        return null;
    }
    return session;
};

export const getPlayerOrEmitError = (playerName, session, socket) => {
    const player = session.players.find(p => p.name === playerName);
    if (!player) {
        socket.emit('error', { message: errorMessages.playerNotFound });
        return null;
    }
    return player;
};