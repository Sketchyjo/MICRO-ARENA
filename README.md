# MICRO-ARENA 🎮

Production-ready blockchain gaming platform for 1v1 skill-based duels with cUSD micro-stakes on Celo.

## 🎯 Features

- **6 Competitive Games**: Chess, WHOT, Survey Clash, Mancala, Connect4, Wordle Duel
- **Real-time Multiplayer**: WebSocket-powered instant gameplay
- **Blockchain Stakes**: Secure cUSD wagering with smart contracts
- **Commit-Reveal Pattern**: Anti-cheat score submission
- **Matchmaking**: Skill and stake-based opponent matching
- **Spectator Mode**: Watch live matches
- **Leaderboard**: Track top players and stats

## 🏗️ Architecture

```
MICRO-ARENA/
├── contracts/          # Solidity smart contracts
│   ├── MicroArena.sol # Main game contract
│   ├── hardhat.config.ts
│   └── scripts/deploy.ts
├── server/            # Node.js backend
│   ├── src/
│   │   ├── index.ts   # Express + Socket.io server
│   │   ├── services/  # Matchmaking, WebSocket, GameState
│   │   ├── engines/   # Game logic for all 6 games
│   │   └── database/  # PostgreSQL setup
│   └── package.json
├── services/          # Frontend services
│   ├── contractService.ts  # Blockchain integration
│   ├── websocketClient.ts  # Real-time communication
│   └── gameEngine.ts       # Client-side game logic
├── pages/             # React game components
└── components/        # Reusable UI components
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- MetaMask or Valora wallet
- Celo Alfajores testnet CELO (for gas)
- Alfajores cUSD (for stakes)

### 1. Clone and Install

```bash
git clone <repository-url>
cd MICRO-ARENA

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..

# Install contract dependencies
cd contracts && npm install && cd ..
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

**Required variables:**
- `VITE_CONTRACT_ADDRESS`: Deployed MicroArena contract address
- `VITE_WEBSOCKET_URL`: Backend WebSocket URL (default: ws://localhost:3001)
- `DATABASE_URL`: PostgreSQL connection string
- `CELO_PRIVATE_KEY`: Deployer private key (for contracts)

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb microarena

# Update DATABASE_URL in .env.local
# Example: postgresql://user:password@localhost:5432/microarena
```

### 4. Deploy Smart Contract

```bash
cd contracts

# Compile contract
npm run compile

# Deploy to Alfajores testnet
npm run deploy:alfajores

# Copy the deployed contract address to .env.local
# VITE_CONTRACT_ADDRESS=0x...
```

### 5. Start Backend Server

```bash
cd server
npm run dev

# Server will run on http://localhost:3001
# WebSocket available at ws://localhost:3001
```

### 6. Start Frontend

```bash
# In root directory
npm run dev

# Frontend will run on http://localhost:5173
```

## 🎮 How to Play

### 1. Connect Wallet
- Click "Connect Wallet" button
- Approve connection in MetaMask/Valora
- Ensure you're on Celo Alfajores testnet

### 2. Get Test Tokens
- **CELO (for gas)**: https://faucet.celo.org
- **cUSD (for stakes)**: https://faucet.celo.org

### 3. Select Game
- Choose from 6 available games
- Set your stake amount (minimum 1 cUSD)
- Click "Find Match"

### 4. Play Match
- Matchmaking finds opponent with similar stake
- Play game in real-time via WebSocket
- Moves validated by backend game engine

### 5. Score Submission
- After game ends, commit your score on-chain
- Reveal score within 3 minutes
- Smart contract determines winner and distributes payout

## 🎲 Game Rules

### Chess ♟️
- Standard chess rules
- Checkmate wins, stalemate draws
- Score: Winner gets 100 points

### WHOT 🃏
- Nigerian card game
- Match shape or number
- Special cards: Pick 2, Pick 3, Hold On, Suspension, WHOT
- First to empty hand wins

### Survey Clash 📊
- Family Feud-style game
- Guess top survey answers
- 3 strikes and you're out
- Higher total score wins

### Mancala 🪨
- Kalah variant
- Capture stones, get extra turns
- Most stones in store wins

### Connect4 🔴🟡
- Classic 4-in-a-row
- Vertical, horizontal, or diagonal
- First to connect 4 wins

### Wordle Duel 🔤
- Competitive Wordle
- 6 guesses to find 5-letter word
- Faster solve = higher score

## 📊 Smart Contract Details

### MicroArena.sol

**Key Functions:**
- `createMatch(gameType, stake)`: Create new match with cUSD stake
- `joinMatch(matchId)`: Join existing match
- `commitScore(matchId, scoreHash)`: Submit score hash (commit phase)
- `revealScore(matchId, score, salt)`: Reveal actual score (reveal phase)
- `claimTimeout(matchId)`: Claim win if opponent doesn't commit/reveal

**Security Features:**
- Commit-reveal pattern prevents score manipulation
- Timeout protection (5min commit, 3min reveal)
- ReentrancyGuard on all state-changing functions
- ERC20 (cUSD) integration for stakes

**Platform Fee:** 2% on winnings

## 🔧 Development

### Run Tests

```bash
# Smart contract tests
cd contracts && npm test

# Backend tests
cd server && npm test
```

### Build for Production

```bash
# Frontend
npm run build

# Backend
cd server && npm run build

# Contracts
cd contracts && npm run compile
```

### Verify Contract on CeloScan

```bash
cd contracts
npx hardhat verify --network alfajores <CONTRACT_ADDRESS> <CUSD_ADDRESS>
```

## 📡 API Endpoints

### REST API (Backend)

- `GET /health` - Health check
- `GET /api/matches/available/:gameType` - Get available matches
- `GET /api/player/:address/stats` - Get player statistics
- `GET /api/match/:matchId` - Get match details

### WebSocket Events

**Client → Server:**
- `auth:connect` - Authenticate with wallet address
- `matchmaking:search` - Search for match
- `matchmaking:cancel` - Cancel search
- `game:move` - Send game move
- `game:resign` - Resign from game
- `game:chat` - Send chat message

**Server → Client:**
- `matchmaking:found` - Match found
- `matchmaking:searching` - Still searching
- `game:opponent_move` - Opponent made move
- `game:complete` - Game finished
- `game:resigned` - Opponent resigned

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, Socket.io, PostgreSQL
- **Blockchain**: Solidity, Hardhat, viem, Celo
- **Games**: chess.js, custom game engines

## 🔐 Security Considerations

- ✅ Commit-reveal pattern for score submission
- ✅ Timeout protection against abandonment
- ✅ ReentrancyGuard on contract functions
- ✅ Input validation on all endpoints
- ✅ Rate limiting on WebSocket events
- ✅ SQL injection prevention with parameterized queries

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 🆘 Support

- **Issues**: GitHub Issues
- **Discord**: [Join our community]
- **Docs**: [Full documentation]

## 🎉 Acknowledgments

- Celo Foundation for testnet support
- OpenZeppelin for secure contract libraries
- chess.js for chess engine

---

**Built with ❤️ for the Celo ecosystem**
