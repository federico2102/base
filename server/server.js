const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Import CORS
const healthRoute = require('./routes/health');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ["GET", "POST"],
        credentials: true,
    }
});

// Middleware
app.use(cors()); // Enable CORS

// Health Check Route
app.use('/', healthRoute);

// Handle socket connections
socketHandler(io); // Initialize the socket handler

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
