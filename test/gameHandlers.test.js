import { expect } from 'chai';
import { io } from 'socket.io-client';
import server from '../server/index.js';

describe('Game Creation and Joining Tests', function() {
    let clientSocket;

    // Before each test, create a new socket connection
    beforeEach((done) => {
        clientSocket = io.connect('http://localhost:4000'); // Ensure this matches your server URL
        clientSocket.on('connect', done);
    });

    // Disconnect after each test
    afterEach((done) => {
        if (clientSocket.connected) {
            clientSocket.disconnect();
        }
        done();
    });

    it('should not allow game creation with a blank name', (done) => {
        clientSocket.emit('createGame', '', 5); // Emitting a blank name
        clientSocket.on('error', (data) => {
            expect(data.message).to.equal('Name cannot be blank!');
            done();
        });
    });

    it('should allow creating a new game', (done) => {
        clientSocket.emit('createGame', 'Player1', 5); // Emitting a valid name
        clientSocket.on('sessionCreated', (data) => {
            expect(data.sessionId).to.be.a('string');
            done();
        });
    });

    it('should not allow joining a session with a blank name or code', (done) => {
        clientSocket.emit('joinGame', { playerName: '', code: '' });
        clientSocket.on('error', (data) => {
            expect(data.message).to.equal('Name and session code cannot be blank!');
            done();
        });
    });

    it('should not allow joining a game with a wrong code', (done) => {
        clientSocket.emit('joinGame', { playerName: 'Player2', code: 'wrongCode' });
        clientSocket.on('error', (data) => {
            expect(data.message).to.equal('Session not found!');
            done();
        });
    });

    it('should not allow joining if the name is already used', (done) => {
        clientSocket.emit('createGame', 'Player1', 5); // Create a game first
        clientSocket.on('sessionCreated', (data) => {
            const sessionId = data.sessionId;
            clientSocket.emit('joinGame', { playerName: 'Player1', code: sessionId }); // Try joining with the same name
            clientSocket.on('error', (data) => {
                expect(data.message).to.equal('Player name already exists in the session.');
                done();
            });
        });
    });

    it('should not allow joining if the game has already started', (done) => {
        clientSocket.emit('createGame', 'Player1', 5);
        clientSocket.on('sessionCreated', (data) => {
            const sessionId = data.sessionId;
            clientSocket.emit('startGame', sessionId); // Start the game
            clientSocket.emit('joinGame', { playerName: 'Player2', code: sessionId });
            clientSocket.on('error', (data) => {
                expect(data.message).to.equal('Game has already started, you cannot join.');
                done();
            });
        });
    });

    it('should allow joining an existing game', (done) => {
        clientSocket.emit('createGame', 'Player1', 5); // Emitting a valid name
        clientSocket.on('sessionCreated', (data) => {
            const sessionId = data.sessionId;
            clientSocket.emit('joinGame', { playerName: 'Player2', code: sessionId });
            clientSocket.on('addedToGame', (data) => {
                expect(data.players.length).to.be.equal(2);
                done();
            });
        });
    });

    it('should allow many players to join an existing game', (done) => {
        let newPlayers = [];
        for (let i = 1; i < 20; i++) {
            newPlayers.push('Player' + i);
        }

        clientSocket.emit('createGame', 'Player0', 5); // Admin creates the game

        clientSocket.on('sessionCreated', (data) => {
            const sessionId = data.sessionId;
            let playersJoined = 0;

            // Emit joinGame event for each player in sequence
            newPlayers.forEach(player => {
                clientSocket.emit('joinGame', { playerName: player, code: sessionId });
            });

            // Listen for 'addedToGame' event and count the players that have joined
            clientSocket.on('addedToGame', (data) => {
                playersJoined++;
                if (playersJoined === 19) { // When all 19 players have joined (excluding admin)
                    expect(data.players.length).to.be.equal(20); // 1 admin + 19 players
                    done();
                }
            });
        });
    });

});

describe('Admin changes maxCards and all players receive update', function() {
    let adminSocket;
    let playerSocket;

    // Increase timeout because the socket connection might take time
    this.timeout(15000);  // Increased the timeout to 15 seconds for more time

    // Set up a new server and socket connections before each test
    beforeEach((done) => {
        // Create a connection for the admin
        adminSocket = io.connect('http://localhost:4000');
        adminSocket.on('connect', () => {
            //console.log('Admin connected');

            // Create a connection for another player once the admin connects
            playerSocket = io.connect('http://localhost:4000');
            playerSocket.on('connect', () => {
                //console.log('Player connected');
                done();
            });
        });
    });

    // Close the sockets after each test
    afterEach(() => {
        if (adminSocket.connected) {
            adminSocket.disconnect();
            //console.log('Admin disconnected');
        }
        if (playerSocket.connected) {
            playerSocket.disconnect();
            //console.log('Player disconnected');
        }
    });

    it('should update maxCards when the admin changes it, and all players should receive the update', (done) => {
        const newMaxCards = 7;  // The admin sets maxCards to 7

        // Step 1: Admin creates a game session
        adminSocket.emit('createGame', { playerName: 'Admin'});
        //console.log('Admin emitted createGame');

        // Step 2: Listen for session creation on the admin side
        adminSocket.on('sessionCreated', (data) => {
            const sessionId = data.sessionId;
            //console.log(`Session created with ID: ${sessionId}`);

            // Step 3: Simulate a player joining the game session
            playerSocket.emit('joinGame', { playerName: 'Player1', code: sessionId });
            playerSocket.on('addedToGame', (data) => {
                //console.log('Player joined game. Players length = ' + data.players.length);

                // Step 4: Simulate the admin changing maxCards AFTER the player has joined
                adminSocket.emit('changeMaxCards', newMaxCards, sessionId);
                //console.log('Admin emitted changeMaxCards');
            });

            // Step 5: Listen for the maxCards update on the player side
            playerSocket.on('maxCardsUpdated', maxCards => {
                //console.log(`Player received maxCardsUpdated: ${maxCards}`);
                try {
                    expect(maxCards).to.equal(newMaxCards);  // Verify the updated value
                    done();  // Test passes
                } catch (error) {
                    done(error);  // Fail the test if there's an error
                }
            });
        });

        adminSocket.on('error', (err) => {
            console.error('Admin received an error:', err);
            done(err);
        });

        playerSocket.on('error', (err) => {
            console.error('Player received an error:', err);
            done(err);
        });
    });
});




