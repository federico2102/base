import React, { useState, useEffect } from 'react';

const GameLobby = ({ socket }) => {
    const [playerName, setPlayerName] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [players, setPlayers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [gameCreated, setGameCreated] = useState(false);  // Track if a game is created or joined
    const [errorMessage, setErrorMessage] = useState(null); // To show error message

    const handleCreateGame = () => {
        if (playerName) {
            socket.emit('createGame', playerName);
            setIsAdmin(true);
            setGameCreated(true);
        } else {
            alert('Please enter your name.');
        }
    };

    const handleJoinGame = () => {
        if (playerName && sessionId) {
            socket.emit('joinGame', { playerName, code: sessionId });
        } else {
            alert('Please enter a valid name and session code.');
        }
    };

    useEffect(() => {
        socket.on('sessionCreated', ({ sessionId }) => {
            setSessionId(sessionId);
        });

        socket.on('playerListUpdated', (players) => {
            setPlayers(players);
            if (players.length > 0 && !isAdmin) {
                setAdminName(players[0].name);
            }
        });

        socket.on('addedToGame', () => {
            setGameCreated(true);  // Only redirect if session exists
        });

        socket.on('error', (error) => {
            setErrorMessage(error.message);  // Display error message
        });

        return () => {
            socket.off('error');
            socket.off('addedToGame');
        };
    }, [socket]);

    return (
        <div>
            <h1>Multiplayer Card Game</h1>

            {errorMessage && (
                <div className="error-popup">
                    <p>{errorMessage}</p>
                    <button onClick={() => setErrorMessage(null)}>Close</button>
                </div>
            )}

            {!gameCreated && (
                <div>
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                    />
                    <button onClick={handleCreateGame}>Create Game</button>
                    <input
                        type="text"
                        placeholder="Enter access code"
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                    />
                    <button onClick={handleJoinGame}>Join Game</button>
                </div>
            )}

            {gameCreated && (
                <div>
                    {isAdmin && <h3>Session Code: {sessionId}</h3>}

                    <h2>Players in Lobby:</h2>
                    <ul>
                        {players.map((player, index) => (
                            <li key={index}>{player.name}</li>
                        ))}
                    </ul>

                    {isAdmin && (
                        <button onClick={() => socket.emit('startGame', sessionId)}>
                            Start Game
                        </button>
                    )}

                    {!isAdmin && adminName && (
                        <p>Waiting for {adminName} to start the game...</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default GameLobby;
