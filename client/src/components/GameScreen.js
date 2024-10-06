import React, { useState, useEffect } from 'react';
import Card from './Card';

const GameScreen = ({ sessionId, playerHand, turnName, currentHand, myName, socket }) => {
    const [selectedCard, setSelectedCard] = useState(null);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [isDeclarationPhase, setIsDeclarationPhase] = useState(true);
    const [gameState, setGameState] = useState({
        playerHand: playerHand || [],
        turnName: turnName || '',
        currentHand: currentHand || 1
    });
    const [declarations, setDeclarations] = useState({});
    const [boardCards, setBoardCards] = useState([]);
    const [roundComplete, setRoundComplete] = useState(false);
    const [winner, setWinner] = useState(null);
    const [waitingMessage, setWaitingMessage] = useState('');
    const [declaredRounds, setDeclaredRounds] = useState(''); // Input for declarations
    const [maxDeclaration, setMaxDeclaration] = useState(gameState.currentHand * 2 - 1); // Max cards in the hand
    const [isLastPlayer, setIsLastPlayer] = useState(false); // Check if the player is the last one to declare

    // Transition from declaration phase to game playing phase
    useEffect(() => {
        const isTurn = turnName === myName && isDeclarationPhase;  // Check if it's my turn during declaration phase
        setIsMyTurn(isTurn); // Update turn state
        setGameState({
            playerHand: playerHand,
            turnName: turnName,
            currentHand: currentHand
        });

        // Listen for declaration updates
        socket.on('declarationUpdated', ({ playerName, declaredRounds }) => {
            console.log(`${playerName} declared ${declaredRounds} rounds.`);
            setDeclarations(prev => ({ ...prev, [playerName]: declaredRounds }));
        });

        // Listen for next player's turn to declare
        socket.on('nextDeclarationTurn', ({ turnName }) => {
            console.log(`It's now ${turnName}'s turn to declare.`);
            setGameState((prevState) => ({ ...prevState, turnName }));
            setIsMyTurn(turnName === myName && isDeclarationPhase);  // Update the turn for declarations
        });

        // After all declarations are made, set the first player to start the round
        socket.on('allDeclarationsMade', (players) => {
            console.log('All declarations have been made:', players);
            setIsDeclarationPhase(false);  // End declaration phase
            setIsMyTurn(turnName === myName && !isDeclarationPhase);  // Update the first player to play
        });

        // Handle the next turn during gameplay after declarations
        socket.on('nextTurn', ({ turnName, currentHand }) => {
            console.log(`It's now ${turnName}'s turn to play.`);
            setGameState((prevState) => ({
                ...prevState,
                turnName,
                currentHand
            }));
            setIsMyTurn(turnName === myName && !isDeclarationPhase);  // Update the turn for playing cards
        });

        // Handle errors (such as last player restriction)
        socket.on('error', (error) => {
            alert(error.message);  // Show the error message for invalid declarations
        });

        return () => {
            socket.off('declarationUpdated');
            socket.off('nextDeclarationTurn');
            socket.off('allDeclarationsMade');
            socket.off('nextTurn');
            socket.off('error');
        };
    }, [socket, isDeclarationPhase, myName]);

    const handleDeclarationSubmit = () => {
        const validDeclaredRounds = declaredRounds === '' ? 0 : parseInt(declaredRounds);
        console.log(`Submitting declaration: ${validDeclaredRounds} for player: ${myName}`);
        socket.emit('declareRounds', { sessionId, playerName: myName, declaredRounds: validDeclaredRounds });
        setDeclaredRounds(''); // Clear input after submission
    };

    // Calculate allowed declaration options for the last player
    useEffect(() => {
        if (isLastPlayer) {
            const totalDeclared = Object.values(declarations).reduce((sum, val) => sum + (val || 0), 0);
            const restrictedMax = maxDeclaration - totalDeclared;
            setMaxDeclaration(restrictedMax >= 0 ? restrictedMax : 0);
        }
    }, [isLastPlayer, declarations, maxDeclaration]);

    const handlePlayCard = () => {
        if (selectedCard) {
            socket.emit('playCard', { sessionId, card: selectedCard, playerName: myName });
            setSelectedCard(null);
        }
    };

    // Emit 'continueToNextRound' event when player clicks 'Continue'
    const handleContinue = () => {
        console.log(`Player is emitting playerContinue for session: ${sessionId}`);
        socket.emit('playerContinue', sessionId); // Emit the correct event
    };

    return (
        <div>
            <h1>Game in Progress (Hand {gameState.currentHand})</h1>
            <h2>It's {gameState.turnName}'s turn</h2>

            {/* Always show player's cards */}
            <div>
                <h3>Your Cards</h3>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {gameState.playerHand.map((card, index) => (
                        <Card
                            key={index}
                            value={card}
                            onClick={() => setSelectedCard(card)}
                        />
                    ))}
                </div>
            </div>

            {/* Declarations Phase */}
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
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {boardCards.map((item, index) => (
                        <div key={index} style={{ marginRight: '10px' }}>
                            <Card value={item.card} />
                            <p>Played by: {item.playerName}</p>
                        </div>
                    ))}
                </div>
            </div>

            {roundComplete && (
                <div>
                    <h2>{winner} won the round!</h2>
                    <button onClick={handleContinue}>Continue</button> {/* When clicked, emits the continue event */}
                </div>
            )}

            {/* Declarations Section */}
            <div>
                <h3>Declarations</h3>
                {Object.keys(declarations).map((playerName) => (
                    <p key={playerName}>{playerName}: {declarations[playerName]} rounds declared</p>
                ))}
            </div>

            {/* Scoreboard Section */}
            <div>
                <h3>Global Scoreboard</h3>
                {/* UI for displaying the global scoreboard */}
            </div>
        </div>
    );
};

export default GameScreen;
