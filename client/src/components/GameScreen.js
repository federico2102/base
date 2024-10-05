import React, { useState, useEffect } from 'react';
import Card from './Card';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

const GameScreen = ({ sessionId, playerHand, turnName, currentHand, myName }) => {
    const [selectedCard, setSelectedCard] = useState(null);  // Track the selected card
    const [isMyTurn, setIsMyTurn] = useState(false);  // Track if it's the player's turn
    const [gameState, setGameState] = useState({
        playerHand: playerHand || [],
        turnName: turnName || '',
        currentHand: currentHand || 1
    });

    useEffect(() => {
        // Initialize the turn when the game starts
        const isTurn = turnName === myName;
        console.log(`Initializing game. Is it my turn? ${isTurn} (Turn is for ${turnName}, my name is ${myName})`);
        setIsMyTurn(isTurn);  // Set the initial turn based on the game start data
        setGameState({
            playerHand: playerHand,
            turnName: turnName,
            currentHand: currentHand
        });

        // Listen for turn updates from the server
        socket.on('nextTurn', (data) => {
            console.log('Received nextTurn event:', data);
            const { playerHand, turnName, currentHand } = data;

            setGameState({
                playerHand: playerHand,
                turnName: turnName,
                currentHand: currentHand
            });

            // Check if it's the current player's turn
            const isTurn = turnName === myName;
            console.log(`Is it my turn? ${isTurn} (Server says turn is for ${turnName}, my name is ${myName})`);
            setIsMyTurn(isTurn);  // Set true if it's the player's turn
            setSelectedCard(null);  // Clear the selected card after the turn is updated
        });

        // Listen for a card being played by another player
        socket.on('cardPlayed', ({ card, playerName }) => {
            console.log(`Player ${playerName} played card ${card}`);
        });

        return () => {
            socket.off('nextTurn');
            socket.off('cardPlayed');
        };
    }, [myName, turnName, playerHand, currentHand]);

    const handlePlayCard = () => {
        if (selectedCard) {
            console.log(`Playing card: ${selectedCard}`);
            socket.emit('playCard', { sessionId, card: selectedCard, playerName: myName });
            setSelectedCard(null);  // Clear selected card after playing
        } else {
            console.log('No card selected to play.');
        }
    };

    return (
        <div>
            <h1>Game in Progress (Hand {gameState.currentHand})</h1>
            <h2>It's {gameState.turnName}'s turn</h2>  {/* This should reflect the current player's turn */}

            <div>
                <h3>Your Cards</h3>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {gameState.playerHand.map((card, index) => (
                        <Card
                            key={index}
                            value={card}
                            onClick={() => setSelectedCard(card)}  // Handle card selection
                        />
                    ))}
                </div>

                {/* Show "Play Selected Card" button only if it's the player's turn and a card is selected */}
                {isMyTurn && selectedCard && (
                    <button onClick={handlePlayCard}>Play Selected Card ({selectedCard})</button>
                )}

                {/* Show a waiting message if it's not the player's turn */}
                {!isMyTurn && <p>Waiting for {gameState.turnName} to play...</p>}
            </div>
        </div>
    );
};

export default GameScreen;
