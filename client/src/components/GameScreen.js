import React, { useState, useEffect } from 'react';
import Card from './Card';

const GameScreen = ({ sessionId, playerHand, turnName, currentHand, myName, socket }) => {
    const [selectedCard, setSelectedCard] = useState(null);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [gameState, setGameState] = useState({
        playerHand: playerHand || [],
        turnName: turnName || '',
        currentHand: currentHand || 1
    });
    const [boardCards, setBoardCards] = useState([]);
    const [roundComplete, setRoundComplete] = useState(false);
    const [winner, setWinner] = useState(null);

    useEffect(() => {
        const isTurn = turnName === myName;
        setIsMyTurn(isTurn);
        setGameState({
            playerHand: playerHand,
            turnName: turnName,
            currentHand: currentHand
        });

        // Listen for turn updates
        socket.on('nextTurn', (data) => {
            const { turnName, currentHand } = data;
            setGameState((prevState) => ({
                ...prevState,
                turnName,
                currentHand
            }));
            setIsMyTurn(turnName === myName);
            setSelectedCard(null);
        });

        // Listen for played cards to update the board
        socket.on('cardPlayed', ({ card, playerName }) => {
            setBoardCards((prevBoardCards) => [...prevBoardCards, { card, playerName }]);
        });

        // Listen for hand updates (specific to the player who just played)
        socket.on('handUpdated', ({ playerHand }) => {
            setGameState((prevState) => ({
                ...prevState,
                playerHand // Update only the current player's hand
            }));
        });

        // Round completed - all players must click 'Continue'
        socket.on('roundComplete', ({ playedCards, winningPlayer }) => {
            setBoardCards(playedCards); // Show all played cards on the board
            setWinner(winningPlayer);  // Display the winner of the round
            setRoundComplete(true);    // Show 'Continue' button
        });

        // Clear the board and start the next round
        socket.on('nextRound', ({ playerHand, turnName, currentHand }) => {
            setBoardCards([]); // Clear the board
            setRoundComplete(false); // Hide 'Continue' button
            setWinner(null);  // Reset winner display
            setGameState({
                playerHand,
                turnName,
                currentHand
            });
            setIsMyTurn(turnName === myName); // Set if it's the player's turn
        });

        return () => {
            socket.off('nextTurn');
            socket.off('cardPlayed');
            socket.off('handUpdated');
            socket.off('roundComplete');
            socket.off('nextRound');
        };
    }, [myName, turnName, playerHand, currentHand]);

    const handlePlayCard = () => {
        if (selectedCard) {
            socket.emit('playCard', { sessionId, card: selectedCard, playerName: myName });
            setSelectedCard(null);
        }
    };

    // Emit 'continueToNextRound' event when player clicks 'Continue'
    const handleContinue = () => {
        socket.emit('continueToNextRound', sessionId);
    };

    return (
        <div>
            <h1>Game in Progress (Hand {gameState.currentHand})</h1>
            <h2>It's {gameState.turnName}'s turn</h2>

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

                {isMyTurn && selectedCard && (
                    <button onClick={handlePlayCard}>Play Selected Card ({selectedCard})</button>
                )}

                {!isMyTurn && <p>Waiting for {gameState.turnName} to play...</p>}
            </div>

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
                    <button onClick={handleContinue}>Continue</button>
                </div>
            )}
        </div>
    );
};

export default GameScreen;
