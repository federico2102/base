import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import GameLobby from './components/GameLobby';
import GameScreen from './components/GameScreen';

const socket = io('http://localhost:4000');

const App = () => {
    const [gameStarted, setGameStarted] = useState(false);
    const [playerHand, setPlayerHand] = useState([]);
    const [turnName, setTurnName] = useState('');

    useEffect(() => {
        socket.on('gameStarted', ({ playerHand, turnName }) => {
            setPlayerHand(playerHand);  // Set the player's hand
            setTurnName(turnName);      // Set the current player's turn name
            setGameStarted(true);       // Set the game as started
        });

        return () => {
            socket.off('gameStarted');
        };
    }, []);

    return (
        <div>
            {gameStarted ? (
                <GameScreen playerHand={playerHand} turnName={turnName} />
            ) : (
                <GameLobby socket={socket} />
            )}
        </div>
    );
};

export default App;
