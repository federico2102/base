// server/socketHandler.js
const { handleCreateGame, handleJoinGame, handleStartGame, handlePlayCard, handlePlayerContinue } = require('./handlers/gameHandlers');

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected with ID:', socket.id);

        // Event to create a new game session
        socket.on('createGame', (playerName, numHands) => {
            handleCreateGame(socket, playerName, numHands, io); // Passing io for broadcasting
        });

        // Event to join an existing game session
        socket.on('joinGame', (data) => {
            handleJoinGame(socket, data, io); // Passing io for broadcasting
        });

        // Event to start the game
        socket.on('startGame', (sessionId) => {
            handleStartGame(socket, sessionId, io); // Passing io for broadcasting
        });

        // Event to play a card
        socket.on('playCard', (data, callback) => {
            handlePlayCard(socket, data, callback, io); // Passing io for broadcasting
        });

        // Event to know when all players are ready to move on to the next round
        socket.on('playerContinue', (sessionId) => {
            handlePlayerContinue(socket, sessionId, io); // Use the correct event handler
        });

        // Event for when a player disconnects
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};

module.exports = socketHandler;
