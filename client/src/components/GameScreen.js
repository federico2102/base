import React from 'react';
import Card from './Card';

const GameScreen = ({ playerHand, turnName }) => {
    if (!playerHand || playerHand.length === 0) {
        return <div>Loading game...</div>;
    }

    return (
        <div>
            <h1>Game in Progress</h1>
            <h2>It's {turnName}'s turn</h2>
            <div>
                <h3>Your Cards</h3>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {playerHand.map((card, index) => (
                        <Card key={index} value={card} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GameScreen;
