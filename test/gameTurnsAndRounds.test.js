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
            .then(({sessionId, playerData}) => {
                const promises = playerData.map(({playerInfo, socket}) => {
                    return new Promise((resolve, reject) => {
                        socket.emit('playCard', {sessionId, card: '2H', playerName: playerInfo.name});

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
                    clientSocket.emit('destroySession', {sessionId});
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
            .then(({sessionId, playerData}) => {
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

    it('should allow each player to play a card on their turn and remove it from their hand', function (done) {
        const clientSocket = clientSocketRef.current;

        // Step 1: Start the game and advance past the declaration phase
        advanceThroughDeclarationsPhase(io, clientSocket, 5)
            .then(({ sessionId, playerData }) => {
                let currentPlayerIndex;

                // Step 2: Start with the player whose turn it is after all declarations
                return new Promise((resolve) => {
                    playerData[0].socket.once('allDeclarationsMade', (data) => {
                        // Get the first player based on the 'turnName' from 'allDeclarationsMade' event
                        currentPlayerIndex = playerData.findIndex(p => p.playerInfo.name === data.turnName);
                        resolve();
                    });
                }).then(() => {
                    // Step 3: Define a helper function to play a card for each player sequentially
                    const playCardForPlayer = (playerIndex) => {
                        return new Promise((resolve, reject) => {
                            const playerSocket = playerData[playerIndex].socket;
                            const playerHandBefore = playerData[playerIndex].playerInfo.playerHand.slice();  // Copy the hand before

                            // Play the first card in the player's hand
                            playerSocket.emit('playCard', {
                                sessionId,
                                card: playerHandBefore[0], // Play the first card in hand
                                playerName: playerData[playerIndex].playerInfo.name,
                            });

                            // Listen for the hand to be updated after the card is played
                            playerSocket.once('handUpdated', (handData) => {
                                try {
                                    // Ensure the card is removed from the hand
                                    expect(handData).to.not.include(playerHandBefore[0]);  // Card should be removed
                                    expect(handData.length).to.equal(playerHandBefore.length - 1);  // Hand size should decrease by 1
                                    resolve();  // Resolve and move to the next player
                                } catch (error) {
                                    reject(error);  // Reject if there's an issue
                                }
                            });
                        });
                    };

                    // Step 4: Play cards for all players in a circular sequence
                    const playForAllPlayers = async () => {
                        for (let i = 0; i < playerData.length; i++) {
                            // Play the card for the current player
                            await playCardForPlayer(currentPlayerIndex);

                            // Move to the next player in a circular manner
                            currentPlayerIndex = (currentPlayerIndex + 1) % playerData.length;
                        }
                    };

                    // Start playing cards for all players
                    return playForAllPlayers();
                });
            })
            .then(() => {
                done();  // Complete the test successfully
            })
            .catch((error) => {
                done(error);  // Fail the test if any error occurs
            });
    });

    it('should broadcast the played card to all players and add it to the board', (done) => {
        const clientSocket = clientSocketRef.current;

        // Step 1: Start the game and advance past the declaration phase
        advanceThroughDeclarationsPhase(io, clientSocket, 5)
            .then(({sessionId, playerData}) => {
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

                    // Step 4: Listen for card broadcast to all players
                    let cardsReceived = 0;
                    playerData.forEach(({socket}, index) => {
                        socket.once('cardPlayed', (cardData) => {
                            try {
                                expect(cardData[0].card).to.equal(playerHandBefore[0]);  // Ensure the card is the same for all
                                expect(cardData[0].playerName).to.equal(playerData[playerIndex].playerInfo.name);  // Player who played the card
                                cardsReceived++;

                                // Ensure all players received the played card
                                if (cardsReceived === playerData.length) {
                                    done(); // Complete the test successfully
                                }
                            } catch (error) {
                                done(error);
                            }
                        });
                    });
                });
            })
            .catch((error) => {
                done(error);  // Fail the test in case of error
            });
    });
});

