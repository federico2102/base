// server/handlers/gameHandlers.js
const { startGame, getRandomPlayer } = require('../game/game');
const { calculateDecksRequired } = require('../utils/deckUtils');
const { determineRoundWinner } = require('../game/gameLogic');

const sessions = {};

const handleCreateGame = (socket, playerName, numHands, io) => {
    const sessionId = Math.random().toString(36).substring(2, 8);
    console.log(`Game created by ${playerName} with session ID: ${sessionId}`);

    sessions[sessionId] = {
        admin: playerName,
        players: [{ name: playerName, id: socket.id, hand: [] }],
        gameState: {
            turnName: null,
            currentHand: 1,
            maxHands: numHands,
            currentTurnIndex: 0,
            decksRequired: 1,
            playedCards: [],
            playersReadyForNextRound: 0  // Track how many players have clicked 'continue'
        },
        started: false
    };

    socket.join(sessionId);
    socket.emit('sessionCreated', { sessionId });
    io.to(sessionId).emit('playerListUpdated', sessions[sessionId].players); // Broadcast player list to all players
};

const handleJoinGame = (socket, { playerName, code }, io) => {
    const session = sessions[code];
    if (!session) {
        return socket.emit('error', { message: 'Session not found!' });
    }

    if (session.started) {
        return socket.emit('error', { message: 'Game has already started, you cannot join.' });
    }

    const playerExists = session.players.find(p => p.name === playerName);
    if (playerExists) {
        return socket.emit('error', { message: 'Player name already exists in the session.' });
    }

    session.players.push({ name: playerName, id: socket.id, hand: [] });
    socket.join(code);

    socket.emit('addedToGame', { players: session.players });
    io.to(code).emit('playerListUpdated', session.players); // Broadcast updated list to everyone else
};

const handleStartGame = (socket, sessionId, io) => {
    const session = sessions[sessionId];
    if (!session || session.players.length === 0) return socket.emit('error', { message: 'No players to start the game.' });

    session.started = true;
    const numPlayers = session.players.length;
    const maxCardsPerHand = 2 * session.gameState.maxHands - 1;
    const totalCardsRequired = numPlayers * maxCardsPerHand;

    session.gameState.decksRequired = calculateDecksRequired(totalCardsRequired);

    if (numPlayers === 1) {
        session.gameState.turnName = session.players[0].name;
        session.gameState.currentTurnIndex = 0;
    } else {
        const randomPlayer = getRandomPlayer(session.players);
        session.gameState.turnName = randomPlayer.name;
        session.gameState.currentTurnIndex = session.players.findIndex(p => p.name === randomPlayer.name);
    }

    startGame(session, session.gameState.currentHand, session.gameState.currentTurnIndex);

    // Emit the game start event to all players
    session.players.forEach(player => {
        io.to(player.id).emit('gameStarted', {
            playerHand: player.hand,
            turnName: session.gameState.turnName,
            sessionId
        });
    });
};

const handlePlayCard = (socket, { sessionId, card, playerName }, callback, io) => {
    const session = sessions[sessionId];
    if (!session) return callback({ success: false, message: 'Session not found!' });

    const currentPlayer = session.players[session.gameState.currentTurnIndex];
    if (currentPlayer.name !== playerName) return callback({ success: false, message: "It's not your turn!" });

    // Remove the played card from the current player's hand
    currentPlayer.hand = currentPlayer.hand.filter(c => c !== card);

    // Add the card to the board (played cards for the round)
    if (!session.gameState.playedCards) session.gameState.playedCards = [];
    session.gameState.playedCards.push({ playerName, card });

    // Broadcast the played card to all players (update the board)
    io.to(sessionId).emit('cardPlayed', { card, playerName });

    // Broadcast the updated hand for the current player only (to remove the played card from their hand)
    socket.emit('handUpdated', { playerHand: currentPlayer.hand });

    // If all players have played, determine the winner and hold until all click continue
    if (session.gameState.playedCards.length === session.players.length) {
        const winningPlayer = determineRoundWinner(session.gameState.playedCards);

        // Broadcast the complete board and winner to all players
        io.to(sessionId).emit('roundComplete', { playedCards: session.gameState.playedCards, winningPlayer });

        // Reset for next round but wait for all players to click 'continue'
        session.gameState.playersReadyForNextRound = 0;  // Reset ready count
    } else {
        // Move to the next player in a circular manner
        session.gameState.currentTurnIndex = (session.gameState.currentTurnIndex + 1) % session.players.length;
        const nextPlayer = session.players[session.gameState.currentTurnIndex];
        session.gameState.turnName = nextPlayer.name;

        // Broadcast to all players whose turn it is now
        io.to(sessionId).emit('nextTurn', {
            turnName: session.gameState.turnName,
            currentHand: session.gameState.currentHand
        });
    }

    if (callback) callback({ success: true });
};

const handlePlayerContinue = (socket, sessionId, io) => {
    const session = sessions[sessionId];
    if (!session) return;

    // Increment the number of players who have clicked 'Continue'
    session.gameState.playersReadyForNextRound += 1;

    // If all players have clicked 'Continue', start the next round
    if (session.gameState.playersReadyForNextRound === session.players.length) {
        // Clear the board and deal new cards for the next hand
        session.gameState.playedCards = [];

        // Move to the next hand
        session.gameState.currentHand += 1;

        // Start the next round
        startGame(session, session.gameState.currentHand, session.gameState.currentTurnIndex);

        // Emit the next round start event to all players
        session.players.forEach(player => {
            io.to(player.id).emit('nextRound', {
                playerHand: player.hand,
                turnName: session.gameState.turnName,
                currentHand: session.gameState.currentHand
            });
        });
    }
};

module.exports = {
    handleCreateGame,
    handleJoinGame,
    handleStartGame,
    handlePlayCard,
    handlePlayerContinue // Add the handler here
};
