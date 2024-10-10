# Multiplayer Card Game

## Description

This multiplayer card game is a web-based application that allows users to create and join game sessions with friends or random players. Built using React for the frontend and Socket.IO for real-time communication, the game features a simple and intuitive interface that enables players to manage their hands, interact with each other, and keep track of the game state.

### Features:
- **Create and Join Games**: Players can create new game sessions or join existing ones using a session code.
- **Real-Time Gameplay**: Utilize WebSocket connections to ensure smooth and responsive gameplay with updates reflecting in real-time.
- **Player Management**: Players can be added or removed dynamically, and the game notifies players of changes in the session.
- **Game State Management**: Players can play their cards, and the game maintains the state through shared updates.

### Technologies Used:
- React
- Socket.IO
- Node.js (for the backend)
- Express
- HTML/CSS

---

## Setup Instructions

To get the project up and running on your local machine, follow these steps:

### 1. Clone the Repository

```bash
git clone https://github.com/federico2102/base.git
cd base
```

### 2. Install Dependencies

For both the client and server, you need to install the required dependencies:

- Install server dependencies:

```bash
cd base/server
npm install
```

- Install client dependencies:

```bash
cd ../client
npm install
```

### 3. Run the Project

- Start the server:

```bash
cd ../server
node .\index.js
```

- Start the client:

```bash
cd ../client
npm start
```

### 4. Access the Application

Once both the client and server are running, you can access the application by opening a web browser and navigating to:

```
http://localhost:3000
```

---

## Game Rules

The game is a fun, competitive multiplayer card game with simple rules but strategic depth. Here's a complete guide to how the game works:

### 1. **Players**
- Minimum of 2 players; there is no upper limit on the number of players.
- If there are many players, additional decks will be used.

### 2. **Dealing Cards**
- The game starts with each player receiving **1 card** in the first hand.
- In each subsequent hand, players receive **2 more cards** than in the previous hand.
  - For example: Hand 1 = 1 card, Hand 2 = 3 cards, Hand 3 = 5 cards, etc.

### 3. **Declaring Rounds**
- Before each hand begins, each player must declare how many rounds they expect to win with their current hand.
- Players see their cards before making their declarations.
- A random player is chosen to declare first, and declarations proceed in a circular order.
- The last player to declare **cannot** choose a number that makes the total declarations match the number of cards. This ensures not everyone can win.

### 4. **Playing Rounds**
- The player who declared first starts the first round of the hand by playing a card.
- Play proceeds in a circular fashion, with each player playing one card per turn.
- The player who plays the highest card wins the round and starts the next one.

### 5. **Scoring**
- At the end of a hand, players who won **exactly** the number of rounds they declared earn:
  - **10 points** + **1 point** for each round won.
- Players who won **fewer** or **more** rounds than they declared earn:
  - **1 point** per round won.
  
### 6. **Next Hand**
- After scoring, a new hand begins with players receiving two more cards than in the previous hand.
- The player who starts will be who is next to the player who declared first on the previous hand.
- This continues until the maximum number of cards is dealt.
- After reaching the peak, the number of cards dealt starts decreasing by the same pattern, eventually going back to 1 card.

### 7. **Card Values**
- Cards are ranked from **2** (lowest) to **Ace** (highest).
- If two players play the same card, the player who played it first wins.
- The **Ace of Hearts** is the highest card overall. If two players play an Ace of Hearts, the first one played wins.

### 8. **Multiple Decks**
- If there are too many players for a single deck, multiple decks will be used. In this case, there can be more than one Ace of Hearts.

---

Enjoy the game and may the best player win!
```
