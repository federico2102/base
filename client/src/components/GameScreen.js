import React, { useState, useEffect } from 'react';
import Card from './Card';

const GameScreen = ({ sessionId, playerHand, turnName, currentHand, myName, socket, resetKey }) => {
    const [selectedCard, setSelectedCard] = useState(null);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [isDeclarationPhase, setIsDeclarationPhase] = useState(true);
    const [gameState, setGameState] = useState({
        playerHand: playerHand || [],
        turnName: turnName || '',
        currentHand: currentHand || 1,
    });
    const [declarations, setDeclarations] = useState({});
    const [roundsWon, setRoundsWon] = useState({});
    const [boardCards, setBoardCards] = useState([]);
    const [scoreboard, setScoreboard] = useState({});
    const [roundFinished, setRoundFinished] = useState(false);
    const [winner, setWinner] = useState(null);
    const [waitingMessage, setWaitingMessage] = useState('');
    const [declaredRounds, setDeclaredRounds] = useState(''); // Input for declarations
    const [actualRoundsWon, setActualRoundsWon] = useState(0);
    const [maxDeclaration, setMaxDeclaration] = useState(gameState.currentHand * 2 - 1); // Max cards in the hand
    const [gameWinner, setGameWinner] = useState(null);
    const [isGameOver, setIsGameOver] = useState(false);

    // Transition from declaration phase to game playing phase
    useEffect(() => {
        setIsMyTurn(turnName === myName); // Update turn state
        setGameState((prevState) => ({
            ...prevState,
            playerHand: playerHand,
            turnName: turnName,
            currentHand: currentHand || 1,
        }));

        // Listen for declaration updates
        socket.on('declarationUpdated', ({ playerName, declaredRounds }) => {
            console.log(`${playerName} declared ${declaredRounds} rounds.`);
            setDeclarations((prev) => ({ ...prev, [playerName]: declaredRounds }));
            setRoundsWon((prev) => ({ ...prev, [playerName]: 0 }));
        });

        // Listen for next player's turn to declare
        socket.on('nextDeclarationTurn', ({ turnName }) => {
            console.log(`It's now ${turnName}'s turn to declare.`);
            setGameState((prevState) => ({
                ...prevState,
                turnName: turnName,
            }));
            setIsMyTurn(turnName === myName && isDeclarationPhase); // Update the turn for declarations
        });

        // After all declarations are made, set the first player to start the round
        socket.on('allDeclarationsMade', ({ turnName, currentHand }) => {
            setGameState((prevState) => ({
                ...prevState,
                turnName: turnName,
                currentHand: currentHand,
            }));
            setIsDeclarationPhase(false); // End declaration phase
            console.log(`It's now ${turnName}'s turn to play.`);
            setIsMyTurn(turnName === myName); // Update the turn for playing cards
        });

        // Handle the next turn during gameplay after declarations
        socket.on('nextTurn', ({ turnName, currentHand, playedCards }) => {
            console.log(`It's now ${turnName}'s turn to play.`);
            setGameState((prevState) => ({
                ...prevState,
                turnName: turnName,
                currentHand: currentHand,
            }));
            setWinner(null); // Clear winner
            setRoundFinished(false); // Reset round finished state
            setWaitingMessage(''); // Clear waiting message
            setBoardCards(playedCards); // Update board
            setIsMyTurn(turnName === myName); // Update the turn for playing cards
        });

        // Handle 'cardPlayed' event
        socket.on('cardPlayed', (playedCards) => {
            setBoardCards(playedCards); // Add the played card to the board
        });

        // The card that a player played is no longer part of the player's hand
        socket.on('handUpdated', (updatedHand) => {
            console.log('Hand updated for the current player.');
            setGameState((prevState) => ({
                ...prevState,
                playerHand: updatedHand, // Use the updated hand
            }));
        });

        // Handle 'roundFinished' event
        socket.on('roundFinished', ({ winner, roundsWon }) => {
            setWinner(winner);
            setRoundsWon((prev) => ({ ...prev, [winner]: roundsWon }));
            setRoundFinished(true); // Set round as complete and display the winner
        });

        socket.on('resetAndNextHand', ({ playerHand, turnName, currentHand, maxDeclaration, scoreboard }) => {
            console.log("Received new round data:", { playerHand, turnName, currentHand });

            // Directly set the new game state without relying on prevState for these values
            setGameState({
                playerHand: playerHand,
                turnName: turnName,
                currentHand: currentHand,
            });

            // Reset other states associated with the new round
            setBoardCards([]); // Reset the board for the new hand
            setDeclarations({}); // Clear declarations
            setRoundsWon({}); // Clear rounds won
            setWinner(null); // Clear winner
            setWaitingMessage(''); // Clear waiting message
            setDeclaredRounds(''); // Reset declared rounds input
            setActualRoundsWon(0); // Reset actual rounds won
            setRoundFinished(false); // Reset round finished state
            setIsDeclarationPhase(true); // Reset to declaration phase
            console.log(scoreboard);
            setScoreboard(scoreboard); // Update scoreboard
            setMaxDeclaration(maxDeclaration);
            setIsMyTurn(turnName === myName); // Update turn state
        });

        // Set waiting message while player waits for others to be ready
        socket.on('waitingForPlayers', ({ message }) => {
            setWaitingMessage(message);
        });

        // End of game
        socket.on('gameOver', ({ winner, scoreboard }) => {
            setIsGameOver(true); // Set game as over
            setGameWinner(winner); // Set the overall game winner
            setScoreboard(scoreboard); // Set the final scoreboard
        });

        socket.on('error', (error) => {
            alert(error.message); // Show the error message for invalid declarations
        });

        return () => {
            socket.off('declarationUpdated');
            socket.off('nextDeclarationTurn');
            socket.off('allDeclarationsMade');
            socket.off('nextTurn');
            socket.off('cardPlayed');
            socket.off('handUpdated');
            socket.off('roundFinished');
            socket.off('resetAndNextHand');
            socket.off('waitingForPlayers');
            socket.off('gameOver');
            socket.off('error');
        };
    }, [socket]);

    const handleDeclarationSubmit = () => {
        const validDeclaredRounds = declaredRounds === '' ? 0 : parseInt(declaredRounds);
        console.log(`Submitting declaration: ${validDeclaredRounds} for player: ${myName}`);
        socket.emit('declareRounds', { sessionId, playerName: myName, declaredRounds: validDeclaredRounds });
    };

    const handlePlayCard = () => {
        if (selectedCard) {
            socket.emit('playCard', { sessionId, card: selectedCard, playerName: myName });
            setSelectedCard(null);
        }
    };

    const handleContinue = () => {
        console.log(`Player is emitting playerContinue for session: ${sessionId}`);
        socket.emit('playerContinue', sessionId, myName);
    };

    if (isGameOver) {
        // Display final game over screen
        return (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>🎉 {gameWinner} Wins the Game! 🎉</h1>

                <h3>Final Board (Last Hand Played)</h3>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                    {boardCards.map((item, index) => (
                        <div key={index} style={{ marginRight: '10px' }}>
                            <Card value={item.card} />
                            <p>Played by: {item.playerName}</p>
                        </div>
                    ))}
                </div>

                <h3>Declarations (Last Round)</h3>
                {Object.keys(declarations).map((playerName) => (
                    <p key={playerName}>
                        {playerName}: {declarations[playerName]} rounds declared / {roundsWon[playerName]} rounds won
                    </p>
                ))}

                <h3>Final Scoreboard</h3>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                    {Object.keys(scoreboard).map((playerName) => (
                        <div key={playerName} style={{ marginRight: '10px' }}>
                            <p>{playerName}: {scoreboard[playerName]}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1>Game in Progress (Hand {gameState.currentHand})</h1>
            <h2>It's {isMyTurn ? 'your' : `${gameState.turnName}'s`} turn</h2>

            <div>
                <h3>Your Cards</h3>
                <div style={{display: 'flex', flexDirection: 'row'}}>
                    {gameState.playerHand.map((card, index) => (
                        <Card
                            key={index}
                            value={card}
                            onClick={() => setSelectedCard(card)}
                        />
                    ))}
                </div>
            </div>

            {isDeclarationPhase && (
                <div>
                    <h3>Make Your Declaration</h3>
                    {isMyTurn ? (
                        <div>
                            <select
                                value={declaredRounds}
                                onChange={(e) => setDeclaredRounds(e.target.value)}
                            >
                                {[...Array((maxDeclaration || 0) + 1).keys()].map((val) => (
                                    <option key={val} value={val}>
                                        {val}
                                    </option>
                                ))}
                            </select>
                            <button onClick={handleDeclarationSubmit}>Submit Declaration</button>
                        </div>
                    ) : (
                        <p>Waiting for {gameState.turnName} to declare...</p>
                    )}
                </div>
            )}

            {!isDeclarationPhase && (
                <div>
                    {isMyTurn && selectedCard && (
                        <button onClick={handlePlayCard}>Play Selected Card ({selectedCard})</button>
                    )}
                    {!isMyTurn && <p>Waiting for {gameState.turnName} to play...</p>}
                </div>
            )}

            <div>
                <h3>Board (Played Cards)</h3>
                <div style={{display: 'flex', flexDirection: 'row'}}>
                    {boardCards.map((item, index) => (
                        <div key={index} style={{marginRight: '10px'}}>
                            <Card value={item.card}/>
                            <p>Played by: {item.playerName}</p>
                        </div>
                    ))}
                </div>
            </div>

            {roundFinished && (
                <div>
                    <h2>{winner} won the round!</h2>
                    <button onClick={handleContinue}>Continue</button>
                    {waitingMessage && <p>{waitingMessage}</p>}
                </div>
            )}

            <div>
                <h3>Declarations</h3>
                {Object.keys(declarations).map((playerName) => (
                    <p key={playerName}>
                        {playerName}: {declarations[playerName]} rounds declared / {roundsWon[playerName]} rounds won
                    </p>
                ))}
            </div>

            <div>
                <h3>Global Scoreboard</h3>
                {Object.keys(scoreboard).map((playerName) => (
                    <p key={playerName}>
                        {playerName}: {scoreboard[playerName]}
                    </p>
                ))}
            </div>

        </div>
    );
};

export default GameScreen;
