const { startGame } = require('../models/game');

const sessions = {}; // Store session data

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('createGame', (playerName) => {
            const sessionId = Math.random().toString(36).substring(2, 8);
            sessions[sessionId] = {
                players: [{ name: playerName, id: socket.id }],
                gameState: {}, 
            };

            socket.join(sessionId);
            socket.emit('sessionCreated', { sessionId });
            io.to(sessionId).emit('playerListUpdated', sessions[sessionId].players);
        });

        socket.on('joinGame', ({ playerName, code }) => {
            if (sessions[code]) {
                sessions[code].players.push({ name: playerName, id: socket.id });
                socket.join(code);
                io.to(code).emit('playerListUpdated', sessions[code].players);
                socket.emit('addedToGame', { players: sessions[code].players });
            } else {
                socket.emit('error', { message: 'Session not found!' });
            }
        });

        socket.on('startGame', (sessionId) => {
            if (sessions[sessionId]) {
                startGame(sessions[sessionId]);

                sessions[sessionId].players.forEach(player => {
                    const playerCards = player.hand; 
                    io.to(player.id).emit('yourCards', playerCards);
                    console.log(`Emitting cards to ${player.name}: `, playerCards);
                });

                io.to(sessionId).emit('gameStarted', { players: sessions[sessionId].players });
            } else {
                io.emit('error', { message: 'Invalid session to start the game!' });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
            // Code to handle user removal from session can be added here
        });
    });
};

module.exports = socketHandler;
