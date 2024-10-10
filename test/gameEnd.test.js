import { expect } from 'chai';
import { io } from 'socket.io-client';
import server from '../server/index.js';

describe('Game End Tests', function() {
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

    /*it('should update the scoreboard and reset declaration board after a hand finishes', (done) => {
        adminSocket.emit('createGame', { playerName: 'Admin' });
        adminSocket.on('sessionCreated', (data) => {
            const sessionId = data.sessionId;
            playerSocket.emit('joinGame', { playerName: 'Player1', code: sessionId });
            playerSocket.on('addedToGame', (data) => {
                adminSocket.emit('startGame', sessionId);
            });

            playerSocket.on('handFinished', (data) => {
                expect(data.scoreboard).to.have.property('Admin');
                expect(data.scoreboard).to.have.property('Player1');
                expect(data.declarations).to.be.empty;
                done();
            });
        });
    });*/

    // Other game end tests
});
