import { expect } from 'chai';
import { io } from 'socket.io-client';
import server from '../server/index.js';
import { setUpConnection, createGameAndAddPlayers } from "./utils/testUtils.test.js";

describe('Game Start Tests', function() {
    let clientSocketRef = { current: null }; // Reference object

    // Set up connection using the helper
    setUpConnection(io, clientSocketRef);

    it('should deal one card to each player and broadcast currentHand and turnName to all players', (done) => {
        const clientSocket = clientSocketRef.current;

        // Create a game with multiple players using the helper function
        createGameAndAddPlayers(io, clientSocket, 5)  // Admin + 4 players
            .then(({ sessionId, playerData }) => {
                // Step 1: Start the game (admin action)
                clientSocket.emit('startGame', sessionId);

                let playersStartedGame = 0;

                // Step 2: Loop through each player and listen for the "gameStarted" event
                playerData.forEach(({ socket }) => {
                    socket.on('gameStarted', (data) => {
                        try {
                            expect(data.playerHand).to.be.an('array');  // Ensure that the cards are an array
                            expect(data.playerHand.length).to.be.equal(1);  // Ensure that the player received at least 1 card
                            expect(data.turnName).to.be.not.equal('');  // Ensure that all players get a turnName
                            expect(data.currentHand).to.be.equal(1);    // Ensure all players get that it's the first hand

                            playersStartedGame++;

                            // Step 3: Once all players have started the game, finish the test
                            if (playersStartedGame === playerData.length) {
                                done();  // Test passes when all players have received their cards
                            }
                        } catch (error) {
                            done(error);  // Fail the test if there's an error
                        }
                    });
                });

                // Step 4: Handle errors in the sockets
                playerData.forEach(({ socket }) => {
                    socket.on('error', (err) => {
                        done(err);  // Fail the test if there is an error in any player's socket
                    });
                });
            })
            .catch((error) => {
                done(error);  // Fail the test if game creation or player joining fails
            });
    });

    it('turn is assigned to an existing player', (done) => {
        const clientSocket = clientSocketRef.current;

        // Create a game with multiple players using the helper function
        createGameAndAddPlayers(io, clientSocket, 5)  // Admin + 4 players
            .then(({ sessionId, playerData }) => {
                // Step 1: Start the game (admin action)
                clientSocket.emit('startGame', sessionId);

                // Step 2: Listen for the 'gameStarted' event
                clientSocket.on('gameStarted', (data) => {
                    try {
                        const { turnName } = data;

                        // Ensure that turnName is not empty and is one of the existing players
                        expect(turnName).to.be.a('string').that.is.not.empty;

                        // Verify that the turnName matches one of the players' names
                        const playerNames = playerData[3].addedToGameData.players.map(player => player.name);  // Get player names
                        expect(playerNames).to.include(turnName);  // Ensure that turnName is in the list of player names

                        done();  // Test passes if the turn is correctly assigned
                    } catch (error) {
                        done(error);  // Fail the test if there's an error
                    }
                });

                // Step 3: Handle errors in the sockets
                clientSocket.on('error', (err) => {
                    done(err);  // Fail the test if there's an error
                });
            })
            .catch((error) => {
                done(error);  // Fail the test if game creation or player joining fails
            });
    });

    it('should not allow anyone to play a card at the start of the game', (done) => {
        const clientSocket = clientSocketRef.current;

        createGameAndAddPlayers(io, clientSocket, 5)
            .then(({ sessionId, playerData }) => {
                clientSocket.emit('startGame', sessionId);
                let playersProcessed = 0;  // Track how many players have received the error

                // Step 2: Loop through each player and listen for the "gameStarted" event
                playerData.forEach(({ addedToGameData, socket }, index) => {
                    socket.on('gameStarted', (data) => {
                        socket.emit('playCard', {
                            sessionId, card: data.playerHand[0],
                            playerName: addedToGameData.players[index].name
                        });

                        // Step 3: Listen for the 'error' event
                        socket.on('error', (data) => {
                            expect(data.message).to.equal('Cannot play cards during declarations phase!');
                            playersProcessed++;

                            // Step 4: Only call done() after all players have processed
                            if (playersProcessed === playerData.length) {
                                done();
                            }
                        });
                    });
                });
            })
            .catch((error) => {
                done(error);  // Fail the test if game creation or player joining fails
            });
    });
});
