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
                // Step 2: Add players if there are more than just the admin
                let playersJoined = 0;
                newPlayers.forEach((player) => {
                    const playerSocket = io.connect('http://localhost:4000');
                    playerSocket.emit('joinGame', { playerName: player, code: sessionId });

                    playerSocket.once('addedToGame', (data) => {
                        playerData.push({ addedToGameData: data, socket: playerSocket });
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


export {setUpConnection, createGameAndAddPlayers};