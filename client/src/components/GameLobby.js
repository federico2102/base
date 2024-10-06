import React, { useState, useEffect } from 'react';

const GameLobby = ({ socket, setMyName }) => {
    const [playerName, setPlayerName] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [players, setPlayers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [gameCreated, setGameCreated] = useState(false);  // Track if a game is created or joined
    const [errorMessage, setErrorMessage] = useState(null); // To show error message
    const [numHands, setNumHands] = useState(1);  // Number of hands chosen by the admin

    const handleCreateGame = () => {
        if (playerName) {
            setMyName(playerName);
            socket.emit('createGame', playerName, numHands);
            setIsAdmin(true);
            setGameCreated(true);
        } else {
            alert('Please enter your name.');
        }
    };

    const handleJoinGame = () => {
        if (playerName && sessionId) {
            setMyName(playerName);
            socket.emit('joinGame', { playerName, code: sessionId });
        } else {
            alert('Please enter a valid name and session code.');
        }
    };

    const handleStartGame = () => {
        socket.emit('startGame', sessionId);
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
            alert(error.message);  // Display error message
        });

        return () => {
            socket.off('sessionCreated');
            socket.off('playerListUpdated');
            socket.off('addedToGame');
            socket.off('error');
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
                    {isAdmin && (
                        <div>
                            <label htmlFor="numHands">Number of Hands:</label>
                            <select id="numHands" value={numHands} onChange={(e) =>
                                setNumHands(parseInt(e.target.value))}>
                                {[...Array(8).keys()].map(i => (
                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!isAdmin && (
                        <h3>Number of Hands: {numHands}</h3>  // Non-admin sees the number of hands
                    )}

                    <h2>Players in Lobby:</h2>
                    <ul>
                        {players.map((player, index) => (
                            <li key={index}>{player.name}</li>
                        ))}
                    </ul>

                    {isAdmin && (
                        <button onClick={handleStartGame}>Start Game</button>
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
