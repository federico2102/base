import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import GameLobby from './components/GameLobby.js';
import GameScreen from './components/GameScreen.js';

const socket = io('http://localhost:4000'); // Ensure this points to your server

const App = () => {
    const [gameStarted, setGameStarted] = useState(false);
    const [playerHand, setPlayerHand] = useState([]);  // To store player's hand
    const [turnName, setTurnName] = useState('');      // To store the current player's turn name
    const [sessionId, setSessionId] = useState('');    // To store the session ID
    const [myName, setMyName] = useState('');          // Store the player's own name (from GameLobby)
    const [currentHand, setCurrentHand] = useState(0);  // Store the hand number
    const [resetKey, setResetKey] = useState(0);    // To force gameScreen component to unmount and remount


    useEffect(() => {
        // Listen for when the game starts
        socket.on('gameStarted', ({ playerHand, turnName, currentHand, sessionId }) => {
            setPlayerHand(playerHand);  // Set the player's hand from the server
            setTurnName(turnName);      // Set the current player's turn name from the server
            setSessionId(sessionId);    // Set the sessionId from the server
            setCurrentHand(currentHand);    // Set the current hand number
            setGameStarted(true);       // Set the game as started
        });

        return () => {
            socket.off('gameStarted');
            //socket.off('nextHand');
        };
    }, []);

    return (
        <div>
            {gameStarted ? (
                <GameScreen
                    sessionId={sessionId}  // Pass the session ID to GameScreen
                    playerHand={playerHand}
                    turnName={turnName}
                    currentHand={currentHand}
                    myName={myName}  // Pass the player's own name to GameScreen
                    socket={socket}
                    resetKey={resetKey}
                />
            ) : (
                <GameLobby socket={socket} setMyName={setMyName} />  // Pass setMyName to GameLobby to capture the player's name
            )}
        </div>
    );
};

export default App;
