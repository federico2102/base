import { startGame, getRandomPlayer } from '../game/game.js';
import { calculateDecksRequired } from '../utils/deckUtils.js';
import { determineRoundWinner } from '../game/gameLogic.js';

const sessions = {};

const handleCreateGame = (socket, playerName, io) => {
    const sessionId = Math.random().toString(36).substring(2, 8);
    // console.log(`Game created by ${playerName} with session ID: ${sessionId}`);
    if (playerName === '') {
        return socket.emit('error', { message: 'Name cannot be blank!' });
    }

    sessions[sessionId] = {
        admin: playerName,
        players: [{ name: playerName, id: socket.id, hand: [] }],
        gameState: {
            turnName: null,
            currentHand: 0,
            maxCards: 1,
            currentTurnIndex: 0,
            decksRequired: 1,
            playedCards: [],
            playersReadyForNextRound: 0,
            startingPlayerIndex: 0
        },
        started: false
    };

    socket.join(sessionId);
    socket.emit('sessionCreated', { sessionId });
    io.to(sessionId).emit('playerListUpdated', sessions[sessionId].players); // Broadcast player list to all players
};

const handleJoinGame = (socket, { playerName, code }, io) => {
    if (playerName === '' || code === '') {
        return socket.emit('error', {message: 'Name and session code cannot be blank!'});
    }

    const session = sessions[code];
    if (!session) {
        return socket.emit('error', { message: 'Session not found!' });
    }

    if (session.started) {
        return socket.emit('error', { message: 'Game has already started, you cannot join.' });
    }

    const playerExists = session.players.find(p => p.name === playerName);
    if (playerExists) {
        return socket.emit('error', { message: 'Player name already exists in the session.' });
    }

    session.players.push({ name: playerName, id: socket.id, hand: [] });
    socket.join(code);

    socket.emit('addedToGame', { players: session.players, maxCards: session.gameState.maxCards });
    io.to(code).emit('playerListUpdated', session.players); // Broadcast updated list to everyone else
};

const handleMaxCards = (socket, maxCards, sessionId, io) => {
    const session = sessions[sessionId];

    if (!session) {
        console.error('Session not found for admin socket ID:', socket.id);
        return socket.emit('error', { message: 'Session not found!' });
    }

    if (typeof maxCards !== 'number') {
        console.error('Invalid maxCards value:', maxCards);
        return socket.emit('error', { message: 'Invalid maxCards value!' });
    }

    session.gameState.maxCards = maxCards;

    io.to(sessionId).emit('maxCardsUpdated', maxCards);  // Broadcast the update to all players
}

const handleStartGame = (socket, sessionId, io) => {
    const session = sessions[sessionId];
    if (!session || session.players.length === 0) return socket.emit('error', { message: 'No players to start the game.' });

    session.started = true;
    const numPlayers = session.players.length;
    const totalCardsRequired = numPlayers * session.gameState.maxCards;

    session.gameState.decksRequired = calculateDecksRequired(totalCardsRequired);

    if (numPlayers === 1) {
        session.gameState.turnName = session.players[0].name;
        session.gameState.currentTurnIndex = 0;
    } else {
        const randomPlayer = getRandomPlayer(session.players);
        session.gameState.turnName = randomPlayer.name;
        session.gameState.currentTurnIndex = session.players.findIndex(p => p.name === randomPlayer.name);
    }

    session.gameState.startingPlayerIndex = session.gameState.currentTurnIndex;

    startGame(session, session.gameState.currentHand, session.gameState.startingPlayerIndex);

    session.gameState.currentHand++;

    // Emit the game start event to all players
    session.players.forEach(player => {
        io.to(player.id).emit('gameStarted', {
            playerHand: player.hand,
            turnName: session.gameState.turnName,
            sessionId
        });
    });
};

// Declarations phase: Players declare how many rounds they expect to win.
const handleDeclarations = (socket, { sessionId, playerName, declaredRounds }, io) => {
    const session = sessions[sessionId];
    if (!session) {
        return socket.emit('error', { message: 'Session not found!' });
    }

    const currentPlayer = session.players.find(p => p.name === playerName);
    if (!currentPlayer) {
        return socket.emit('error', { message: 'Player not found!' });
    }

    // Check if the player is the last one to declare
    const currentIndex = session.players.findIndex(p => p.name === playerName);
    const isLastPlayer = currentIndex ===
        (session.gameState.startingPlayerIndex === 0 ? session.players.length - 1 :
        session.gameState.startingPlayerIndex - 1);

    // Calculate the total declarations so far
    const totalDeclaredSoFar = session.players.reduce((total, player) => {
        return player.declaredRounds !== undefined ? total + player.declaredRounds : total;
    }, 0);

    const maxCardsThisHand = session.gameState.currentHand * 2 - 1;

    // Restrict the last player from declaring a number that makes the total equal to max cards
    if (isLastPlayer && (totalDeclaredSoFar + declaredRounds === maxCardsThisHand)) {
        return socket.emit('error', { message: "Your declaration cannot make the total equal to the number of cards in this hand." });
    }

    currentPlayer.declaredRounds = declaredRounds; // Store the declared rounds
    io.to(sessionId).emit('declarationUpdated', { playerName, declaredRounds }); // Broadcast the declaration to all players

    // Check if all players have declared
    const allDeclared = session.players.every(p => p.declaredRounds !== undefined);
    if (allDeclared) {
        const nextIndex = (currentIndex + 1) % session.players.length;
        const nextPlayer = session.players[nextIndex];
        session.gameState.turnName = nextPlayer.name;
        session.gameState.currentTurnIndex = nextIndex;

        io.to(sessionId).emit('allDeclarationsMade', session.players); // Notify all players that declarations are complete
        io.to(sessionId).emit('nextTurn', {
            turnName: session.gameState.turnName,  // First player to declare starts the round
            currentHand: session.gameState.currentHand
        });
    } else {
        // Notify the next player that it’s their turn to declare
        const nextIndex = (currentIndex + 1) % session.players.length;
        const nextPlayer = session.players[nextIndex];
        session.gameState.turnName = nextPlayer.name;
        session.gameState.currentTurnIndex = nextIndex;
        io.to(sessionId).emit('nextDeclarationTurn', { turnName: nextPlayer.name });
    }
};

const handlePlayCard = (socket, { sessionId, card, playerName }, callback = () => {}, io) => {
    const session = sessions[sessionId];
    if (!session) return callback({ success: false, message: 'Session not found!' });

    const currentPlayer = session.players[session.gameState.currentTurnIndex];
    if (currentPlayer.name !== playerName) return callback({ success: false, message: "It's not your turn!" });

    // Remove the played card from the current player's hand
    currentPlayer.hand = currentPlayer.hand.filter(c => c !== card);

    // Add the card to the board (played cards for the round)
    if (!session.gameState.playedCards) session.gameState.playedCards = [];
    session.gameState.playedCards.push({ playerName, card });

    // Broadcast the played card to all players (update the board)
    io.to(sessionId).emit('cardPlayed', { card, playerName });

    // Broadcast the updated hand for the current player only (to remove the played card from their hand)
    socket.emit('handUpdated', { playerHand: currentPlayer.hand });

    // If all players have played, determine the winner and hold until all click continue
    if (session.gameState.playedCards.length === session.players.length) {
        const winningPlayer = determineRoundWinner(session.gameState.playedCards);
        //console.log('winningPlayer: ' + winningPlayer);

        // Broadcast the complete board and winner to all players
        io.to(sessionId).emit('roundComplete', { winner: winningPlayer });

        // Reset for next round but wait for all players to click 'continue'
        session.gameState.playersReadyForNextRound = 0;  // Reset ready count
    } else {
        // Move to the next player in a circular manner
        session.gameState.currentTurnIndex = (session.gameState.currentTurnIndex + 1) % session.players.length;
        const nextPlayer = session.players[session.gameState.currentTurnIndex];
        session.gameState.turnName = nextPlayer.name;

        // Broadcast to all players whose turn it is now
        io.to(sessionId).emit('nextTurn', {
            turnName: session.gameState.turnName,
            currentHand: session.gameState.currentHand
        });
    }

    if (callback) callback({ success: true });
};

const handlePlayerContinue = (socket, sessionId, io) => {
    const session = sessions[sessionId];
    if (!session) {
        console.log("Session not found for continue event.");
        return;
    }

    console.log(`Player with socket ID: ${socket.id} clicked continue for session ${sessionId}`);

    // Increment the number of players who have clicked 'Continue'
    session.gameState.playersReadyForNextRound += 1;

    console.log(`Players ready for next round: ${session.gameState.playersReadyForNextRound}/${session.players.length}`);

    // If all players have clicked 'Continue', start the next round
    if (session.gameState.playersReadyForNextRound === session.players.length) {
        console.log("All players ready. Starting next round...");

        // Clear the board
        session.gameState.playedCards = [];
        session.gameState.currentHand++;

        // Determine who starts the next hand (the next player in line)
        session.gameState.startingPlayerIndex = (session.gameState.startingPlayerIndex + 1) % session.players.length;
        session.gameState.currentTurnIndex = session.gameState.startingPlayerIndex;
        session.gameState.turnName = session.players[session.gameState.currentTurnIndex].name;

        // Start the next hand and deal new cards
        startGame(session, session.gameState.currentHand, session.gameState.startingPlayerIndex);

        // Emit the next round start event to all players
        session.players.forEach(player => {
            io.to(player.id).emit('nextRound', {
                playerHand: player.hand,
                turnName: session.gameState.turnName,
                currentHand: session.gameState.currentHand
            });
        });
    } else {
        console.log(`Player with socket ID: ${socket.id} is waiting for other players.`);
        socket.emit('waitingForPlayers', { message: 'Waiting for other players to be ready...' });
    }
};

// End of hand: Calculate scores based on the declarations and actual wins
const calculateScores = (sessionId, io) => {
    const session = sessions[sessionId];
    if (!session) return;

    session.players.forEach(player => {
        const { declaredRounds, actualRoundsWon } = player;
        if (declaredRounds === actualRoundsWon) {
            player.score += 10 + actualRoundsWon;
        } else {
            player.score += actualRoundsWon;
        }
        player.declaredRounds = undefined;  // Reset for the next hand
        player.actualRoundsWon = 0;  // Reset after score is calculated
    });

    io.to(sessionId).emit('scoresUpdated', session.players);  // Broadcast updated scores to everyone
};

// End of game logic: Show final scoreboard and determine the winner
const endGame = (sessionId, io) => {
    const session = sessions[sessionId];
    if (!session) return;

    const winner = session.players.reduce((maxPlayer, player) => player.score > maxPlayer.score ? player : maxPlayer, session.players[0]);
    io.to(sessionId).emit('gameOver', { players: session.players, winner });
};

export {handleCreateGame,
    handleJoinGame,
    handleMaxCards,
    handleStartGame,
    handlePlayCard,
    handlePlayerContinue,
    handleDeclarations,
    calculateScores,
    endGame};
