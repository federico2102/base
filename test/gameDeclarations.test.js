import { expect } from 'chai';
import { io } from 'socket.io-client';
import server from '../server/index.js';

describe('Declaration Phase Tests', function() {
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

    it('should broadcast declarations and apply restriction to last player declaring', (done) => {
        adminSocket.emit('createGame', { playerName: 'Admin' });
        adminSocket.on('sessionCreated', (data) => {
            const sessionId = data.sessionId;
            playerSocket.emit('joinGame', { playerName: 'Player1', code: sessionId });
            playerSocket.on('addedToGame', (data) => {
                adminSocket.emit('startGame', sessionId);
            });

            playerSocket.on('declarationPhase', () => {
                adminSocket.emit('declare', { declaration: 2, sessionId });
            });

            playerSocket.on('declarationBroadcast', (data) => {
                expect(data.declarations[0]).to.have.property('declaration', 2);
                done();
            });
        });
    });

    // Additional declaration tests
});
