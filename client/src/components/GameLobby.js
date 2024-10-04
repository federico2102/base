import React, { useState, useEffect } from 'react';

const GameLobby = ({ socket }) => {
    const [playerName, setPlayerName] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [players, setPlayers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const handleCreateGame = () => {
        socket.emit('createGame', playerName);
        setIsAdmin(true);
    };

    const handleJoinGame = () => {
        socket.emit('joinGame', { playerName, code: sessionId });
    };

    useEffect(() => {
        socket.on('sessionCreated', ({ sessionId }) => {
            setSessionId(sessionId);
        });

        socket.on('playerListUpdated', (players) => {
            setPlayers(players);
        });
    }, [socket]);

    return (
        <div>
            <h1>Multiplayer Card Game</h1>
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

            <div>
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
            </div>
        </div>
    );
};

export default GameLobby;
