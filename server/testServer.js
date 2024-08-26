// testServer.js

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001; // Make sure this matches the port you're testing

// Use CORS middleware
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from your React app
    methods: ["GET", "POST"], // Allow these HTTP methods
}));

// Test route
app.get('/', (req, res) => {
    res.send('CORS is working!');
});

app.listen(PORT, () => {
    console.log(`Simple server running on http://localhost:${PORT}`);
});
