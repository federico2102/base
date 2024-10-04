import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

const App = () => {
    const [sessionId, setSessionId] = useState('');
    const [players, setPlayers] = useState([]);
    const [playerName, setPlayerName] = useState('');

    useEffect(() => {
        socket.on('sessionCreated', ({ sessionId }) => {
            setSessionId(sessionId);
            alert(`Game created! Session ID: ${sessionId}`);
        });

        socket.on('playerListUpdated', (players) => {
            setPlayers(players);
        });

        socket.on('addedToGame', ({ players }) => {
            setPlayers(players);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
            alert(error.message);
        });

        return () => {
            socket.off();
        };
    }, []);

    const handleCreateGame = () => {
        if (playerName) {
            socket.emit('createGame', playerName);
        } else {
            alert('Please enter your name.');
        }
    };

    const handleJoinGame = () => {
        const code = prompt("Enter the game code:");
        if (code) {
            socket.emit('joinGame', { playerName, code });
        }
    };

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
            <button onClick={handleJoinGame}>Join Game</button>

            {sessionId && (
                <div>
                    <h2>Waiting for players...</h2>
                    <ul>
                        {players.map(player => (
                            <li key={player.id}>{player.name}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default App;
