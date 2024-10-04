import React from 'react';

const PlayerWaiting = ({ players, adminName }) => (
    <div>
        <h2>Waiting for {adminName} to start the game...</h2>
        <h3>Current Players:</h3>
        <ul>
            {players.map((player, index) => (
                <li key={index}>{player.name}</li>
            ))}
        </ul>
    </div>
);

export default PlayerWaiting;
