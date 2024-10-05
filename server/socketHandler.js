const { startGame,getRandomPlayer } = require('./models/game');
const { calculateDecksRequired } = require('./utils');

const sessions = {};

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('createGame', (playerName, numHands) => {
            const sessionId = Math.random().toString(36).substring(2, 8);
            sessions[sessionId] = {
                admin: playerName,
                players: [{ name: playerName, id: socket.id }],
                gameState: {
                    turnName: null,
                    currentHand: 1,
                    maxHands: numHands,
                    currentTurnIndex: 0,
                    decksRequired: 1  // Will calculate later
                },
                started: false
            };

            socket.join(sessionId);
            socket.emit('sessionCreated', { sessionId });
            io.to(sessionId).emit('playerListUpdated', sessions[sessionId].players);
        });

        socket.on('joinGame', ({ playerName, code }) => {
            if (sessions[code]) {
                const session = sessions[code];

                if (session.started) {
                    // If the game has already started, send an error message
                    socket.emit('error', { message: 'Game has already started, you cannot join.' });
                } else {
                    const playerExists = session.players.find(player => player.name === playerName);

                    if (!playerExists) {
                        session.players.push({ name: playerName, id: socket.id });
                        socket.join(code);
                        io.to(code).emit('playerListUpdated', session.players);
                        socket.emit('addedToGame', { players: session.players });
                    } else {
                        socket.emit('error', { message: 'Player with this name already exists in the session.' });
                    }
                }
            } else {
                socket.emit('error', { message: 'Session not found!' });
            }
        });


        socket.on('startGame', (sessionId) => {
            const session = sessions[sessionId];
            if (session && session.players.length > 0) {
                session.started = true;
                const numPlayers = session.players.length;
                const maxCardsPerHand = 2 * session.gameState.maxHands - 1;
                const totalCardsRequired = numPlayers * maxCardsPerHand;

                session.gameState.decksRequired = calculateDecksRequired(totalCardsRequired);

                const randomPlayer = getRandomPlayer(session.players);  // Choose a random starting player
                session.gameState.turnName = randomPlayer.name;

                startGame(session, session.gameState.currentHand);  // Start the game with hand 1

                // Emit game state to all players, including their hands
                session.players.forEach(player => {
                    io.to(player.id).emit('gameStarted', {
                        playerHand: player.hand,  // Send each player their own hand
                        turnName: session.gameState.turnName
                    });
                });

            } else {
                socket.emit('error', { message: 'No players to start the game.' });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
};

module.exports = socketHandler;
