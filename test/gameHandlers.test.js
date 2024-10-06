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
                expect(data.players.length).to.be.greaterThan(0);
                done();
            });
        });
    });
});
