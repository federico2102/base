import { expect } from 'chai';
import { io } from 'socket.io-client';
import server from '../server/index.js';

describe('Turn and Round Mechanics Tests', function() {
    let adminSocket;
    let playerSocket;

    this.timeout(15000);

    beforeEach((done) => {
        adminSocket = io.connect('http://localhost:4000');
        adminSocket.on('connect', () => {
            playerSocket = io.connect('http://localhost:4000');
            playerSocket.on('connect', done);
        });
    });

    afterEach(() => {
        if (adminSocket.connected) {
            adminSocket.disconnect();
        }
        if (playerSocket.connected) {
            playerSocket.disconnect();
        }
    });

    it('should prevent players from playing cards during declaration phase', (done) => {
        adminSocket.emit('createGame', { playerName: 'Admin' });
        adminSocket.on('sessionCreated', (data) => {
            const sessionId = data.sessionId;
            playerSocket.emit('joinGame', { playerName: 'Player1', code: sessionId });
            playerSocket.on('addedToGame', (data) => {
                adminSocket.emit('startGame', sessionId);
            });

            playerSocket.on('declarationPhase', () => {
                playerSocket.emit('playCard', { card: 5, sessionId });
            });

            playerSocket.on('error', (data) => {
                expect(data.message).to.equal('Cannot play cards during declaration phase.');
                done();
            });
        });
    });

    // Other turn and round tests
});
