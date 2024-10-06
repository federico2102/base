import express from 'express';
import http from 'http';
import {Server} from 'socket.io';
import cors from'cors';
import socketHandler from './socketHandler.js';

const app = express();
const server = http.createServer(app);

// Enable CORS for Express
app.use(cors({
    origin: 'http://localhost:3000',  // Allow requests from React app running on port 3000
    methods: ['GET', 'POST'],
    credentials: true
}));

// Enable CORS for Socket.IO
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",  // Allow WebSocket requests from React
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Handle socket connections
socketHandler(io);

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default server;

