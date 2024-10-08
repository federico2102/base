import { expect } from 'chai';
import { io } from 'socket.io-client';
import server from '../server/index.js';
import { setUpConnection, createGameAndAddPlayers } from "./utils/testUtils.test.js";

// For these testes I assume that the declarations work, and I will focus on turns, scores, hand and round winners
describe('Turns And Rounds Mechanics Tests', function() {
    let clientSocketRef = { current: null }; // Reference object

    // Set up connection using the helper
    setUpConnection(io, clientSocketRef);


});
