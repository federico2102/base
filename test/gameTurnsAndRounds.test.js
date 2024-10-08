import { expect } from 'chai';
import { io } from 'socket.io-client';
import server from '../server/index.js';
import { setUpConnection, createGameAndAddPlayers, advanceThroughDeclarationsPhase } from "./utils/testUtils.test.js";

// For these tests I assume that the declarations work, and I will focus on turns, scores, hand and round winners
describe('Turns And Rounds Mechanics Tests', function() {
    this.timeout(5000);  // Increase Mocha timeout to 5 seconds

    let clientSocketRef = {current: null}; // Reference object

    // Set up connection using the helper
    setUpConnection(io, clientSocketRef);

    it('should not allow player to play a card during declarations phase', (done) => {
        const clientSocket = clientSocketRef.current;

        // Create the first session and verify players can't play during declarations phase
        createGameAndAddPlayers(io, clientSocket, 5)
            .then(({ sessionId, playerData }) => {
                const promises = playerData.map(({ playerInfo, socket }) => {
                    return new Promise((resolve, reject) => {
                        socket.emit('playCard', { sessionId, card: '2H', playerName: playerInfo.name });

                        socket.once('error', (errorData) => {
                            try {
                                expect(errorData.message).to.equal('Cannot play cards during declarations phase!');
                                resolve(); // Resolve the promise when error is caught
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });
                });

                return Promise.all(promises).then(() => {
                    // Once all errors have been caught, destroy the session and finish the test
                    clientSocket.emit('destroySession', { sessionId });
                    done();
                });
            })
            .catch((error) => {
                done(error);
            });
    });

    it('should not allow player to play a card if it\'s not the player\'s turn', (done) => {
        const clientSocket = clientSocketRef.current;

        // Start the game and advance past the declaration phase
        advanceThroughDeclarationsPhase(io, clientSocket, 5)
            .then(({ sessionId, playerData }) => {
                return new Promise((resolve) => {
                    playerData[0].socket.once('allDeclarationsMade', (data) => {
                        const playerIndex = playerData.findIndex(p => p.playerInfo.name === data.turnName);
                        resolve(playerIndex);
                    });
                }).then((playerIndex) => {
                    const wrongPlayerIndex = (playerIndex + 1) % playerData.length;

                    // Simulate the wrong player trying to play a card
                    playerData[wrongPlayerIndex].socket.emit('playCard', {
                        sessionId,
                        card: '3D',
                        playerName: playerData[wrongPlayerIndex].playerInfo.name,
                    });

                    playerData[wrongPlayerIndex].socket.once('error', (errorData) => {
                        try {
                            expect(errorData.message).to.equal("It's not your turn!");
                            done();
                        } catch (error) {
                            done(error);
                        }
                    });
                });
            })
            .catch((error) => {
                done(error);
            });
    });

    it('should allow the player to play a card on their turn and remove it from their hand', function (done) {
        const clientSocket = clientSocketRef.current;

        // Step 1: Start the game and advance past the declaration phase
        advanceThroughDeclarationsPhase(io, clientSocket, 5)
            .then(({ sessionId, playerData }) => {
                return new Promise((resolve) => {
                    playerData[0].socket.once('allDeclarationsMade', (data) => {
                        const playerIndex = playerData.findIndex(p => p.playerInfo.name === data.turnName);
                        resolve(playerIndex);
                    });
                }).then((playerIndex) => {
                    const playerSocket = playerData[playerIndex].socket;
                    const playerHandBefore = playerData[playerIndex].playerInfo.playerHand.slice();  // Copy the hand before

                    // Step 3: Play a card
                    playerSocket.emit('playCard', {
                        sessionId,
                        card: playerData[playerIndex].playerInfo.playerHand[0],
                        playerName: playerData[playerIndex].playerInfo.name,
                    });

                    // Step 4: Listen for hand updates to verify card removal
                    return new Promise((resolve, reject) => {
                        playerSocket.once('handUpdated', (handData) => {
                            try {
                                //console.log("Hand updated:", handData.playerHand);
                                expect(handData.playerHand).to.not.include(playerHandBefore[0]);  // Ensure the card is removed
                                expect(handData.playerHand.length).to.equal(playerHandBefore.length - 1);  // Card count should decrease by 1
                                resolve();
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });
                });
            })
            .then(() => {
                done(); // Complete the test successfully
            })
            .catch((error) => {
                done(error);  // Fail the test in case of error
            });
    });





/*it('should broadcast the played card to all players and add it to the board', (done) => {
    const clientSocket = clientSocketRef.current;

    // Step 1: Start the game and advance past the declaration phase
    advanceThroughDeclarationsPhase(io, clientSocket, 5)
        .then(({ sessionId, playerData }) => {
            let playerIndex = 0;

            // Step 2: Find the player whose turn it is
            playerData[0].socket.once('allDeclarationsMade', (data) => {
                playerIndex = playerData.findIndex(p => p.playerInfo.name === data.turnName);
            });

            // Step 3: Listen for the cardPlayed event on all sockets
            let cardsPlayedBroadcasts = 0;
            playerData.forEach(({ socket }) => {
                socket.once('cardPlayed', (cardData) => {
                    try {
                        expect(cardData.card).to.equal('3D');  // Ensure the card is broadcast
                        expect(cardData.playerName).to.equal(playerData[playerIndex].playerInfo.name);  // Correct player
                        cardsPlayedBroadcasts++;
                        if (cardsPlayedBroadcasts === playerData.length) {
                            done();
                        }
                    } catch (error) {
                        done(error);
                    }
                });
            });

            // Step 4: Play a card to trigger the broadcast
            const playerSocket = playerData[playerIndex].socket;
            playerSocket.emit('playCard', {
                sessionId,
                card: '3D',
                playerName: playerData[playerIndex].playerInfo.name,
            });
        })
        .catch((error) => {
            done(error);
        });
});*/


});
