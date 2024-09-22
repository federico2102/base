const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Socket.IO Server is running.');
});

module.exports = router;
