function setUpConnection(io, clientSocket){
    beforeEach((done) => {
        clientSocket.current = io.connect('http://localhost:4000');
        clientSocket.current.on('connect', done);
    });

    afterEach((done) => {
        if (clientSocket.current.connected) {
            clientSocket.current.disconnect();
        }
        done();
    });
}

function createGameAndAddPlayers(io, clientSocket, numPlayers) {
    return new Promise((resolve, reject) => {
        const newPlayers = [];
        const playerData = [];

        // Create player names for all players except admin
        for (let i = 1; i < numPlayers; i++) {
            newPlayers.push('Player' + i);
        }

        // Step 1: Create a new game (admin is Player0)
        clientSocket.emit('createGame', 'Player0');

        clientSocket.once('sessionCreated', (data) => {
            const sessionId = data.sessionId;

            if (numPlayers === 1) {
                // If there's only the admin, resolve immediately
                resolve({ sessionId, playerData });
            } else {
                // Step 2: Add the admin to playerData
                const adminData = { players: [{ name: 'Player0' }], name: 'Player0' };
                playerData.push({ playerInfo: adminData, socket: clientSocket });

                // Step 3: Add other players
                let playersJoined = 0;
                newPlayers.forEach((player) => {
                    const playerSocket = io.connect('http://localhost:4000');
                    playerSocket.emit('joinGame', { playerName: player, code: sessionId });

                    playerSocket.once('addedToGame', (data) => {
                        playerData.push({ playerInfo: data, socket: playerSocket });
                        playersJoined++;
                        if (playersJoined === numPlayers - 1) {
                            resolve({ sessionId, playerData });
                        }
                    });

                    playerSocket.on('error', (err) => {
                        reject(err);
                    });
                });
            }
        });

        clientSocket.on('error', (err) => {
            reject(err);
        });
    });
}

function advanceThroughDeclarationsPhase(io, clientSocket, numPlayers) {
    return new Promise((resolve, reject) => {
        createGameAndAddPlayers(io, clientSocket, numPlayers)
            .then(({ sessionId, playerData }) => {
                clientSocket.emit('startGame', sessionId);

                let playerIndex = 0;
                let declarationsMade = 0;
                let handsReceived = 0;

                const handleDeclarationUpdate = () => {
                    declarationsMade++;
                    if (declarationsMade === numPlayers) {
                        // When all players have declared, resolve the promise
                        resolve({ sessionId, playerData });
                    } else {
                        handleNextDeclaration();
                    }
                };

                const emitDeclarationForCurrentPlayer = () => {
                    const currentPlayer = playerData[playerIndex];
                    const currentPlayerName = currentPlayer.playerInfo.name;
                    currentPlayer.socket.emit('declareRounds', {
                        sessionId,
                        playerName: currentPlayerName,
                        declaredRounds: 0, // All players declare 0 rounds initially
                    });
                };

                const handleNextDeclaration = () => {
                    playerData[playerIndex].socket.once('nextDeclarationTurn', (data) => {
                        playerIndex = playerData.findIndex(p => p.playerInfo.name === data.turnName);
                        emitDeclarationForCurrentPlayer();
                    });
                };

                // Listen for 'gameStarted' on each player's socket to get their hand
                playerData.forEach(({ socket, playerInfo }) => {
                    const onGameStarted = (data) => {
                        playerInfo.playerHand = data.playerHand; // Assign the hand
                        handsReceived++;

                        // Once all hands are received, determine the player to declare first
                        if (handsReceived === numPlayers) {
                            playerIndex = playerData.findIndex(p => p.playerInfo.name === data.turnName);

                            // Set up declaration update listeners for all players
                            playerData.forEach(({ socket }) => {
                                socket.on('declarationUpdated', handleDeclarationUpdate);

                                // Handle socket errors
                                socket.on('error', (err) => {
                                    reject(err);
                                });
                            });

                            // Emit the first player's declaration
                            emitDeclarationForCurrentPlayer();
                        }
                    };

                    // Set up 'gameStarted' listener with proper cleanup
                    socket.once('gameStarted', onGameStarted);
                });
            })
            .catch((err) => {
                reject(err);
            });
    });
}

export {setUpConnection, createGameAndAddPlayers, advanceThroughDeclarationsPhase};