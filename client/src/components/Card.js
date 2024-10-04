import React from 'react';
import '../styles/Card.css';

const suitSymbols = {
    H: '♥', // Hearts
    D: '♦', // Diamonds
    S: '♠', // Spades
    C: '♣'  // Clubs
};

const Card = ({ value }) => {
    if (!value) return null;

    const rank = value.slice(0, -1);  // Get the rank (e.g., "2" from "2H")
    const suit = value.slice(-1);     // Get the suit (e.g., "H" from "2H")

    // Define the color based on the suit
    const isRed = suit === 'H' || suit === 'D';

    return (
        <div className="card">
            <span>{rank}</span>
            <span className="card-suit" style={{ color: isRed ? 'red' : 'black' }}>
                {suitSymbols[suit]}
            </span>
        </div>
    );
};

export default Card;
