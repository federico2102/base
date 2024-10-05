// server/socketHandler.js
const { startGame, getRandomPlayer } = require('./models/game');
const { calculateDecksRequired } = require('./utils');

const sessions = {};

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected with ID:', socket.id);

        socket.on('createGame', (playerName, numHands) => {
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
                    decksRequired: 1  // Will calculate later
                },
                started: false
            };

            socket.join(sessionId);
            socket.emit('sessionCreated', { sessionId });
            io.to(sessionId).emit('playerListUpdated', sessions[sessionId].players);
        });

        socket.on('joinGame', ({ playerName, code }) => {
            const session = sessions[code];
            if (session) {
                console.log(`${playerName} is trying to join session ${code}`);
                if (session.started) {
                    socket.emit('error', { message: 'Game has already started, you cannot join.' });
                } else {
                    const playerExists = session.players.find(player => player.name === playerName);
                    if (!playerExists) {
                        session.players.push({ name: playerName, id: socket.id, hand: [] });
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
                // console.log(`Starting game for session ${sessionId}`);
                session.started = true;
                const numPlayers = session.players.length;
                const maxCardsPerHand = 2 * session.gameState.maxHands - 1;
                const totalCardsRequired = numPlayers * maxCardsPerHand;

                session.gameState.decksRequired = calculateDecksRequired(totalCardsRequired);

                if (numPlayers === 1) {
                    // If there's only one player, assign the turn directly to them
                    session.gameState.turnName = session.players[0].name;
                    session.gameState.currentTurnIndex = 0;
                    // console.log(`Single player game. Turn is for ${session.players[0].name}`);
                } else {
                    // Choose a random starting player
                    const randomPlayer = getRandomPlayer(session.players);
                    session.gameState.turnName = randomPlayer.name;
                    session.gameState.currentTurnIndex = session.players.findIndex(player => player.name === randomPlayer.name);
                    // console.log(`Multiple players game. Starting turn is for ${randomPlayer.name}`);
                }

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

        socket.on('playCard', ({ sessionId, card, playerName }, callback) => {
            const session = sessions[sessionId];
            if (session) {
                const currentPlayer = session.players[session.gameState.currentTurnIndex];

                if (currentPlayer.name === playerName) {
                    console.log(`${playerName} is playing card ${card}`);

                    // Remove the played card from the player's hand
                    currentPlayer.hand = currentPlayer.hand.filter(c => c !== card);

                    // Broadcast the card played to all clients
                    io.to(sessionId).emit('cardPlayed', { card, playerName });

                    // Check if current player has played all their cards
                    if (currentPlayer.hand.length === 0) {
                        session.gameState.currentHand++;

                        // If all hands have been played, end the game
                        if (session.gameState.currentHand > session.gameState.maxHands) {
                            io.to(sessionId).emit('gameOver', { message: 'Game Over!' });
                            return callback({ success: true });
                        }

                        // Start a new hand
                        startGame(session, session.gameState.currentHand);
                    } else {
                        // Move to the next player in a circular manner
                        session.gameState.currentTurnIndex = (session.gameState.currentTurnIndex + 1) % session.players.length;
                        const nextPlayer = session.players[session.gameState.currentTurnIndex];
                        session.gameState.turnName = nextPlayer.name;

                        console.log(`Next turn is for ${session.gameState.turnName}`);

                        io.to(sessionId).emit('nextTurn', {
                            playerHand: nextPlayer.hand,
                            turnName: nextPlayer.name,
                            currentHand: session.gameState.currentHand
                        });
                    }

                    callback({ success: true });  // Send success callback
                } else {
                    console.error(`It's not ${playerName}'s turn to play.`);
                    callback({ success: false, message: "It's not your turn!" });
                }
            } else {
                callback({ success: false, message: 'Session not found!' });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};

module.exports = socketHandler;
