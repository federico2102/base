import { expect } from 'chai';
import { io } from 'socket.io-client';
import server from '../server/index.js';
import { setUpConnection, createGameAndAddPlayers } from "./utils/testUtils.test.js";

describe('Declaration Phase Tests', function() {
    let clientSocketRef = { current: null }; // Reference object

    // Set up connection using the helper
    setUpConnection(io, clientSocketRef);

    it('should accept only valid declarations and catch invalid ones', (done) => {
        const clientSocket = clientSocketRef.current;

        createGameAndAddPlayers(io, clientSocket, 5)
            .then(({ sessionId, playerData }) => {
                clientSocket.emit('startGame', sessionId);

                let declarationsReceived = 0;
                let errorsReceived = 0;
                let playerIndex = 0;

                // Listen for gameStarted to find the correct player
                clientSocket.once('gameStarted', (data) => {
                    playerIndex = playerData.findIndex(p => p.playerInfo.name === data.turnName);

                    const firstPlayerSocket = playerData[playerIndex].socket;
                    const playerName = playerData[playerIndex].playerInfo.name;

                    // Emit valid and invalid declarations sequentially
                    const emitDeclarations = () => {
                        // Step 1: Test valid declaration for the first hand (should only be 0 or 1)
                        firstPlayerSocket.emit('declareRounds', { sessionId, playerName, declaredRounds: 0, testMode: true });

                        // Another valid declaration
                        firstPlayerSocket.emit('declareRounds', { sessionId, playerName, declaredRounds: 1, testMode: true });

                        // Step 2: Test an invalid declaration (greater than max allowed)
                        firstPlayerSocket.emit('declareRounds', { sessionId, playerName, declaredRounds: 2, testMode: true });

                        // Another invalid declaration (negative rounds)
                        firstPlayerSocket.emit('declareRounds', { sessionId, playerName, declaredRounds: -1, testMode: true });
                    };

                    // Listen for valid declarations
                    firstPlayerSocket.on('declarationUpdated', (declData) => {
                        try {
                            expect(declData.declaredRounds).to.be.oneOf([0, 1]); // Ensure both valid declarations were accepted
                            declarationsReceived++;
                            if (declarationsReceived === 2 && errorsReceived === 2) {
                                done();
                            }
                        } catch (error) {
                            done(error);
                        }
                    });

                    // Listen for errors from invalid declarations
                    firstPlayerSocket.on('error', (errorData) => {
                        try {
                            expect(errorData.message).to.equal('Invalid declaration');
                            errorsReceived++;
                            if (declarationsReceived === 2 && errorsReceived === 2) {
                                done();
                            }
                        } catch (error) {
                            done(error);
                        }
                    });

                    // Start emitting declarations after receiving gameStarted
                    emitDeclarations();
                });
            })
            .catch((error) => {
                done(error);  // Fail the test if game creation or player joining fails
            });
    });


    it('should broadcast declarations to all players', function (done) {
        const clientSocket = clientSocketRef.current;

        createGameAndAddPlayers(io, clientSocket, 5)
            .then(({ sessionId, playerData }) => {
                clientSocket.emit('startGame', sessionId);
                let declarationCount = 0;
                let name = '';

                // Find player who declares and make a valid declaration
                playerData.forEach(({ playerInfo, socket }, index) => {
                    socket.on('gameStarted', (data) => {
                        if (playerInfo.players[index].name === data.turnName) {
                            name = data.turnName;
                            // Emit declaration for the first player
                            socket.emit('declareRounds', {
                                sessionId,
                                playerName: data.turnName,
                                declaredRounds: 0,
                            });
                        }
                    });
                });

                // Listen for declarations on all players' sockets
                playerData.forEach(({ socket }) => {
                    socket.on('declarationUpdated', (declData) => {
                        try {
                            // Validate that the declaration was broadcasted correctly
                            expect(declData.playerName).to.equal(name);
                            expect(declData.declaredRounds).to.equal(0);
                            declarationCount++;

                            // Once all players have received the declaration
                            if (declarationCount === playerData.length) {
                                done(); // Test passes once all players receive the broadcast
                            }
                        } catch (error) {
                            done(error);
                        }
                    });
                });

                // Error handling for socket
                clientSocket.on('error', (err) => {
                    done(err);
                });
            })
            .catch((error) => {
                done(error);  // Handle errors during game creation or player joining
            });
    });

    it('should only be able to declare if it is the player\'s turn', (done) => {
        const clientSocket = clientSocketRef.current;

        createGameAndAddPlayers(io, clientSocket, 5)
            .then(({ sessionId, playerData }) => {
                clientSocket.emit('startGame', sessionId);

                let declarationAttempted = 0;
                let errorsReceived = 0;

                // Find the first player and emit the declaration
                playerData.forEach(({ playerInfo, socket }, index) => {
                    const playerName = playerInfo.players[index].name;

                    socket.on('gameStarted', (data) => {
                        // The player whose turn it is should be able to declare
                        if (playerName === data.turnName) {
                            socket.emit('declareRounds', {
                                sessionId,
                                playerName,
                                declaredRounds: 0,
                                testMode: true
                            });

                            socket.on('declarationUpdated', (declData) => {
                                try {
                                    expect(declData.playerName).to.equal(playerName);
                                    expect(declData.declaredRounds).to.equal(0);
                                    declarationAttempted++;
                                    if (declarationAttempted === 1 && errorsReceived === playerData.length - 1) {
                                        done(); // Finish when the correct player declares and others are rejected
                                    }
                                } catch (error) {
                                    done(error);
                                }
                            });
                        } else {
                            // Other players who are not supposed to declare should be rejected
                            socket.emit('declareRounds', {
                                sessionId,
                                playerName,
                                declaredRounds: 0,
                                testMode: true
                            });

                            socket.on('error', (errData) => {
                                try {
                                    expect(errData.message).to.equal('It\'s not your turn to declare!');
                                    errorsReceived++;
                                    if (declarationAttempted === 1 && errorsReceived === playerData.length - 1) {
                                        done(); // Finish when the correct player declares and others are rejected
                                    }
                                } catch (error) {
                                    done(error);
                                }
                            });
                        }
                    });
                });
            })
            .catch((error) => {
                done(error);  // Fail the test if game creation or player joining fails
            });
    });

});
