import { expect } from 'chai';
import { io } from 'socket.io-client';
import server from '../server/index.js';
import { setUpConnection, createGameAndAddPlayers } from "./utils/testUtils.test.js";

describe('Game Creation and Joining Tests', function() {
    let clientSocketRef = { current: null }; // Reference object

    // Set up connection using the helper
    setUpConnection(io, clientSocketRef);

    it('should not allow game creation with a blank name', (done) => {
        const clientSocket = clientSocketRef.current;

        clientSocket.emit('createGame', '');  // Blank name
        clientSocket.on('error', (data) => {
            expect(data.message).to.equal('Name cannot be blank!');
            done();
        });
    });

    it('should allow creating a new game', (done) => {
        const clientSocket = clientSocketRef.current;

        clientSocket.emit('createGame', 'Player1');  // Valid name
        clientSocket.on('sessionCreated', (data) => {
            expect(data.sessionId).to.be.a('string');
            done();
        });
    });

    it('should not allow joining a session with a blank name or code', (done) => {
        const clientSocket = clientSocketRef.current;

        clientSocket.emit('joinGame', { playerName: '', code: '' });  // Blank name and code
        clientSocket.on('error', (data) => {
            expect(data.message).to.equal('Name and session code cannot be blank!');
            done();
        });
    });

    it('should not allow joining a game with a wrong code', (done) => {
        const clientSocket = clientSocketRef.current;

        clientSocket.emit('joinGame', { playerName: 'Player2', code: 'wrongCode' });  // Wrong code
        clientSocket.on('error', (data) => {
            expect(data.message).to.equal('Session not found!');
            done();
        });
    });

    it('should not allow joining if the name is already used', (done) => {
        const clientSocket = clientSocketRef.current;

        // Use the helper to create a game with one player
        createGameAndAddPlayers(io, clientSocket, 1)
            .then(({ sessionId }) => {
                // Try joining with the same name as the first player
                clientSocket.emit('joinGame', { playerName: 'Player0', code: sessionId });
                clientSocket.on('error', (data) => {
                    expect(data.message).to.equal('Player name already exists in the session.');
                    done();
                });
            })
            .catch((error) => {
                done(error);
            });
    });

    it('should not allow joining if the game has already started', (done) => {
        const clientSocket = clientSocketRef.current;

        // Use the helper to create a game with one player
        createGameAndAddPlayers(io, clientSocket, 1)
            .then(({ sessionId }) => {
                // Start the game
                clientSocket.emit('startGame', sessionId);

                // Try joining after the game has started
                clientSocket.emit('joinGame', { playerName: 'Player2', code: sessionId });
                clientSocket.on('error', (data) => {
                    expect(data.message).to.equal('Game has already started, you cannot join.');
                    done();
                });
            })
            .catch((error) => {
                done(error);
            });
    });

    it('should allow joining an existing game', (done) => {
        const clientSocket = clientSocketRef.current;

        // Use the helper to create a game with one player
        createGameAndAddPlayers(io, clientSocket, 1)
            .then(({ sessionId }) => {
                // Join the game as a new player
                clientSocket.emit('joinGame', { playerName: 'Player2', code: sessionId });
                clientSocket.on('addedToGame', (data) => {
                    expect(data.players.length).to.be.equal(2);  // Admin + 1 player
                    done();
                });
            })
            .catch((error) => {
                done(error);
            });
    });

    it('should allow many players to join an existing game', (done) => {
        const clientSocket = clientSocketRef.current;

        createGameAndAddPlayers(io, clientSocket, 20, done)
            .then(({ sessionId, playerData }) => {
                expect(playerData.length).to.be.equal(19);
                expect(playerData[18].addedToGameData.players.length).to.be.equal(20)   // 1 admin, 19 players
                done();
            })
            .catch((error) => {
                done(error);
            });
    });

    it('should update maxCards when the admin changes it, and all players should receive the update', (done) => {
        const newMaxCards = 7;  // The admin sets maxCards to 7
        const clientSocket = clientSocketRef.current;

        createGameAndAddPlayers(io, clientSocket, 20)  // Add 19 players (excluding admin)
            .then(({ sessionId, playerData }) => {
                // Step 4: Simulate the admin changing maxCards AFTER the players have joined
                clientSocket.emit('changeMaxCards', newMaxCards, sessionId);

                let playersUpdated = 0;

                // Step 5: Loop through all player sockets to listen for the maxCards update
                playerData.forEach(({ socket }) => {
                    socket.on('maxCardsUpdated', (maxCards) => {
                        try {
                            expect(maxCards).to.equal(newMaxCards);  // Verify the updated value for each player
                            playersUpdated++;

                            // Once all players have received the update, mark the test as done
                            if (playersUpdated === playerData.length) {
                                done();  // Test passes when all players have received the update
                            }
                        } catch (error) {
                            done(error);  // Fail the test if there's an error
                        }
                    });
                });
            })
            .catch((error) => {
                done(error);
            });
    });

});
