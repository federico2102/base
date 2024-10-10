import { getSession } from '../game/sessionManager.js';
import { initializeHand, getRandomPlayer } from '../game/gameSetup.js';
import { calculateDecksRequired } from '../utils/deckUtils.js';
import { determineRoundWinner } from '../game/roundLogic.js';
import { calculateScores, endGame } from "../game/gameResults.js";
import { getSessionOrEmitError, getPlayerOrEmitError } from "../utils/validationUtils.js";
import {
    broadcastAllDeclarationsMade,
    broadcastCardPlayed,
    broadcastDeclarationUpdate,
    broadcastGameStart,
    broadcastHandUpdate, broadcastMaxCardsUpdated,
    broadcastNextDeclarationTurn,
    broadcastNextTurn,
    broadcastResetAndNextHand,
    broadcastRoundFinished, broadcastWaitingMessage
} from "../utils/broadcastUtils.js";
import {allRoundsPlayed, getNextTurnIndex, resetPlayerReadyStatus} from "../utils/stateUtils.js";
import {errorMessages} from "../utils/messageUtils.js";

export const handleMaxCards = (socket, maxCards, sessionId, io) => {
    const session = getSessionOrEmitError(sessionId, socket, io);
    if (!session) return;

    if (typeof maxCards !== 'number') {
        return socket.emit('error', { message: errorMessages.invalidMaxCards });
    }

    session.gameState.maxCards = maxCards;

    // Broadcast the update to all players
    broadcastMaxCardsUpdated(io, sessionId, maxCards);
}

export const handleStartGame = (socket, sessionId, io) => {
    const session = getSessionOrEmitError(sessionId, socket, io);
    if (!session) return;

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
    session.gameState.currentHand++;

    initializeHand(session, session.gameState.currentHand);

    // Emit the game start event to all players
    broadcastGameStart(io, sessionId, session);
};

// Declarations phase: Players declare how many rounds they expect to win.
export const handleDeclarations = (socket, { sessionId, playerName, declaredRounds,
    testMode = false }, io) => {
    const session = getSessionOrEmitError(sessionId, socket, io);
    if (!session) return;

    const currentPlayer = getPlayerOrEmitError(playerName, session, socket);
    if(!currentPlayer) return;

    if (playerName !== session.gameState.turnName)
        return socket.emit('error', { message: errorMessages.notYourTurn });

    const maxCardsThisHand = currentPlayer.hand.length;

    // Make sure the declaration is valid
    if (declaredRounds < 0 || declaredRounds > maxCardsThisHand)
        return socket.emit('error', { message: errorMessages.invalidDeclaration });

    // Check if the player is the last one to declare
    const currentIndex = session.players.findIndex(p => p.name === playerName);
    const isLastPlayer = currentIndex ===
        (session.gameState.startingPlayerIndex === 0 ? session.players.length - 1 :
        session.gameState.startingPlayerIndex - 1);

    // Calculate the total declarations so far
    const totalDeclaredSoFar = session.players.reduce((total, player) => {
        return player.declaredRounds !== undefined ? total + player.declaredRounds : total;
    }, 0);

    // Restrict the last player from declaring a number that makes the total equal to max cards
    if (isLastPlayer && (totalDeclaredSoFar + declaredRounds === maxCardsThisHand)) {
        return socket.emit('error', { message: errorMessages.lastPlayerRestriction });
    }

    currentPlayer.declaredRounds = declaredRounds; // Store the declared rounds
    currentPlayer.actualRoundsWon = 0;

    // Update turn
        const nextIndex = getNextTurnIndex(currentIndex, session.players.length);
        const nextPlayer = session.players[nextIndex];
    if(!testMode) {
        session.gameState.turnName = nextPlayer.name;
        session.gameState.currentTurnIndex = nextIndex;
    }

    // Broadcast the declaration to all players
    broadcastDeclarationUpdate(io, sessionId, playerName, declaredRounds);

    // Check if all players have declared
    const allDeclared = session.players.every(p => p.declaredRounds !== undefined);
    if (allDeclared) {
        if(!testMode){
            // Set declarationsPhase off for the current session
            session.gameState.isDeclarationsPhase = false;

            // Notify all players that declarations phase is over and start the round
            broadcastAllDeclarationsMade(io, sessionId, session);
        }
    } else {
            // Notify the next player that it’s their turn to declare
            broadcastNextDeclarationTurn(io, sessionId, nextPlayer.name);
    }
};

export const handlePlayCard = (socket, { sessionId, card, playerName } , io) => {
    const session = getSessionOrEmitError(sessionId, socket, io);
    if (!session) return;

    // Player can only play a card if it's not declarations phase
    if (session.gameState.isDeclarationsPhase)
        return socket.emit('error', { message: errorMessages.canOnlyDeclare });

    const currentPlayer = session.players[session.gameState.currentTurnIndex];

    if (currentPlayer.name !== playerName) return socket.emit('error', {message: errorMessages.notYourTurn });

    // Remove the played card from the current player's hand
    currentPlayer.hand = currentPlayer.hand.filter(c => c !== card);

    // Broadcast the updated hand for the current player only (to remove the played card from their hand)
    broadcastHandUpdate(io, currentPlayer.id, currentPlayer.hand);

    // Add the card to the board (played cards for the round)
    session.gameState.playedCards.push({ playerName, card });

    // Broadcast the played card to all players (update the board)
    broadcastCardPlayed(io, sessionId, session.gameState.playedCards);

    // If all players have played, determine the winner and hold until all click continue
    if (session.gameState.playedCards.length === session.players.length) {
        const winningPlayer = determineRoundWinner(session.gameState.playedCards);
        //console.log('winningPlayer: ' + winningPlayer);

        // Update actualRoundsWon for the winning player
        session.players.find(p => p.name === winningPlayer).actualRoundsWon++;
        const roundsWon = session.players.find(p => p.name === winningPlayer).actualRoundsWon;

        // Set round winner to know who starts the next round (if there are more rounds left in the hand)
        session.roundWinner = winningPlayer;

        // Broadcast the complete board and winner to all players
        broadcastRoundFinished(io, sessionId, winningPlayer, roundsWon);

        // If that was the last hand, calculate the game winner and finish the game
        if(session.gameState.currentHand === session.gameState.maxCards+1){
            calculateScores(session, io);
            endGame(session, sessionId, io);
        }

    } else {
        // Move to the next player in a circular manner
        session.gameState.currentTurnIndex =
            getNextTurnIndex(session.gameState.currentTurnIndex, session.players.length);
        const nextPlayer = session.players[session.gameState.currentTurnIndex];
        session.gameState.turnName = nextPlayer.name;

        // Broadcast to all players whose turn it is now
        broadcastNextTurn(io, sessionId, session);
    }
};

export const handlePlayerContinue = (socket, sessionId, playerName, io) => {
    const session = getSessionOrEmitError(sessionId, socket, io);
    if (!session) return;

    //console.log(`Player with socket ID: ${socket.id} clicked continue for session ${sessionId}`);

    // Set current player as ready
    session.players.find(p => p.name === playerName).readyForNextRound = true;

    // Check if all players are ready
    const allPlayersReadyForNextRound = session.players.reduce((total, player) => {
        return player.readyForNextRound !== undefined ? total && player.readyForNextRound : total && false;
    }, true);


    // If all players have clicked 'Continue', start the next round
    if (allPlayersReadyForNextRound) {
        console.log("All players ready");

        // Clear the board
        session.gameState.playedCards = [];

        // Reset players ready for next round
        resetPlayerReadyStatus(session)

        // If all the rounds of the hand have been played
        if(allRoundsPlayed(session)) {
            console.log('Starting new hand...');

            // Calculate and update each player's scores
            calculateScores(session, io);

            // Determine who starts the next hand (the next player in line)
            session.gameState.startingPlayerIndex =
                getNextTurnIndex(session.gameState.startingPlayerIndex, session.players.length);
            session.gameState.currentTurnIndex = session.gameState.startingPlayerIndex;
            session.gameState.turnName = session.players[session.gameState.currentTurnIndex].name;

            // Declarations phase
            session.isDeclarationsPhase = true;

            // Update hand number
            session.gameState.currentHand++;

            // Start the next hand and deal new cards
            initializeHand(session, session.gameState.currentHand);

            // Emit reset and next hand info in one go to all players
            broadcastResetAndNextHand(io, session);

        } else {
            console.log('Starting new round...');
            session.gameState.currentTurnIndex = session.players
                .findIndex(player => player.name === session.roundWinner);
            session.gameState.turnName = session.roundWinner;

            broadcastNextTurn(io, sessionId, session);
        }
    } else {
        console.log(`Player with socket ID: ${socket.id} is waiting for other players.`);
        broadcastWaitingMessage(io, socket.id);
    }
};
