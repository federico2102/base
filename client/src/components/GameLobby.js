import React, { useState, useEffect } from 'react';

const GameLobby = ({ socket, setMyName }) => {
    const [playerName, setPlayerName] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [players, setPlayers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [gameCreated, setGameCreated] = useState(false);  // Track if a game is created or joined
    const [errorMessage, setErrorMessage] = useState(null); // To show error message
    const [maxCards, setMaxCards] = useState(1);  // Number of hands chosen by the admin

    const handleCreateGame = () => {
        if (playerName) {
            setMyName(playerName);
            socket.emit('createGame', playerName, maxCards);
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

    const handleChangeMaxCards = (e) => {
            socket.emit('changeMaxCards',  parseInt(e.target.value), sessionId);
    }

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

        socket.on('addedToGame', (data) => {
            setMaxCards(data.maxCards);
            setGameCreated(true);  // Only redirect if session exists
        });

        socket.on('maxCardsUpdated', (maxCards) => {
            setMaxCards(maxCards);
        })

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
                            <label htmlFor="maxCards">Max Number of Cards:</label>
                            <select id="maxCards" value={maxCards} onChange={handleChangeMaxCards}>
                                {[1, 3, 5, 7, 9, 11, 13, 15].map(num => (
                                    <option key={num} value={num}>{num}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!isAdmin && (
                        <h3>Max Number of Cards: {maxCards}</h3>  // Non-admin sees the number of hands
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
