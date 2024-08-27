// server/server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Import CORS
const { startGame } = require('./models/game'); // Import game logic

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000', // Allow requests from your React application
        methods: ["GET", "POST"],
        credentials: true,
    }
});

// Store session data
const sessions = {}; // Object to hold game sessions

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle creating a new game
    socket.on('createGame', (playerName) => {
        const sessionId = Math.random().toString(36).substring(2, 8); // Generate a unique session ID
        // Initialize the session with players and an empty game state
        sessions[sessionId] = {
            players: [{ name: playerName, id: socket.id }],
            gameState: {}, // Initialize game state as empty
        };

        socket.join(sessionId); // Join the player to the session room
        socket.emit('sessionCreated', { sessionId }); // Notify the creator of the session code
        io.to(sessionId).emit('playerListUpdated', sessions[sessionId].players); // Notify all players in the session
    });

    // Handle joining an existing game session
    socket.on('joinGame', ({ playerName, code }) => {
        if (sessions[code]) {
            sessions[code].players.push({ name: playerName, id: socket.id });
            socket.join(code);
            
            // Emit updated player list to all players in the session
            io.to(code).emit('playerListUpdated', sessions[code].players);
            
            // Additional emission for the new player
            socket.emit('addedToGame', { players: sessions[code].players }); // Notify the new player that they have joined
        } else {
            socket.emit('error', { message: 'Session not found!' }); // Handle session not found
        }
    });
    

    // Handle starting the game
    socket.on('startGame', (sessionId) => {
        if (sessions[sessionId]) {
            // const numPlayers = sessions[sessionId].players.length; // Get the number of players in the session
            startGame(sessions[sessionId]); // Call the game logic to start the game and deal cards

       // Emit each player's cards so they see only their own.
       sessions[sessionId].players.forEach(player => {
        const playerCards = player.hand; // Get player's hand stored in session
        socket.to(player.id).emit('yourCards', playerCards); // Emit each player's cards
        });

            // Emit the game start notification to everyone in the session
            io.to(sessionId).emit('gameStarted', { players: sessions[sessionId].players }); // Notify all players
        } else {
        socket.emit('error', { message: 'Invalid session to start the game!' });
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
        // Additional code can be added here to remove the user from the session
    });
});

// Set up a basic route for checking server health
app.get('/', (req, res) => {
    res.send('Socket.IO Server is running.');
});

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
