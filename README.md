# MICRO-ARENA 🎮

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://microarena-frontend.onrender.com)
[![Backend](https://img.shields.io/badge/api-online-blue)](https://microarena-server.onrender.com)
[![Celo](https://img.shields.io/badge/blockchain-Celo-yellow)](https://celo.org)

**Production-ready blockchain gaming platform for 1v1 skill-based duels with cUSD micro-stakes on Celo.**

🎮 **[Play Now →](https://microarena-frontend.onrender.com)**

---

## 🌟 Overview

MICRO-ARENA is a decentralized competitive gaming platform where players wager cUSD (Celo Dollar) on skill-based 1v1 matches. The platform combines real-time WebSocket gameplay with blockchain-secured stakes and an anti-cheat commit-reveal scoring system.

### Why MICRO-ARENA?

- **Fair Play**: Commit-reveal pattern makes cheating mathematically impossible
- **Instant Gameplay**: WebSocket-powered real-time matches with no blockchain delays during play
- **Low Stakes, High Fun**: Micro-wagers starting from 1 cUSD make gaming accessible
- **Trustless Payouts**: Smart contracts automatically determine winners and distribute funds

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| **6 Competitive Games** | Chess, WHOT, Survey Clash, Mancala, Connect4, Wordle Duel |
| **Real-time Multiplayer** | WebSocket-powered instant gameplay |
| **Blockchain Stakes** | Secure cUSD wagering with smart contracts |
| **Anti-Cheat System** | Commit-reveal pattern for score submission |
| **Smart Matchmaking** | Skill and stake-based opponent matching |
| **Leaderboard** | Track top players and statistics |

---

## 🎲 Games

### Chess ♟️
Classic chess with standard rules. Checkmate your opponent to win.

### WHOT 🃏
Popular Nigerian card game. Match shapes or numbers, use special cards strategically. First to empty hand wins.

### Survey Clash 📊
Family Feud-style guessing game. Guess top survey answers, avoid 3 strikes.

### Mancala 🪨
Ancient strategy game. Capture stones and fill your store. Most stones wins.

### Connect4 🔴🟡
Classic 4-in-a-row. Connect four pieces vertically, horizontally, or diagonally.

### Wordle Duel 🔤
Competitive word guessing. Race to solve the 5-letter word in fewer guesses.

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│  Backend Server │────▶│   PostgreSQL    │
│  React + Vite   │     │ Express+Socket.io│     │    Database     │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │    ┌─────────────────┐│
         └───▶│  Celo Blockchain│◀┘
              │  Smart Contract │
              └─────────────────┘
```

### Project Structure

```
MICRO-ARENA/
├── contracts/           # Solidity smart contracts (Hardhat)
│   └── contract/
│       └── MicroArena.sol
├── server/              # Node.js backend
│   └── src/
│       ├── engines/     # Game logic (chess, whot, mancala, etc.)
│       ├── services/    # Matchmaking, WebSocket, GameState
│       └── database/    # PostgreSQL setup
├── pages/               # React game page components
├── components/          # Reusable UI components
├── services/            # Frontend services (blockchain, websocket)
└── hooks/               # React custom hooks
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ / pnpm
- MetaMask or Valora wallet
- Celo Sepolia testnet tokens

### Get Test Tokens

1. **CELO (for gas)**: [Celo Faucet](https://faucet.celo.org)
2. **cUSD (for stakes)**: [Celo Faucet](https://faucet.celo.org)

### Local Development

```bash
# Clone repository
git clone https://github.com/Sketchyjo/MICRO-ARENA.git
cd MICRO-ARENA

# Install dependencies
pnpm install
cd server && pnpm install && cd ..
cd contracts && pnpm install && cd ..

# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Start backend
cd server && pnpm run dev

# Start frontend (new terminal)
pnpm run dev
```

### Environment Variables

Create `.env.local` in root:
```env
VITE_CONTRACT_ADDRESS=0xb07035b03dFfdbcE9A51806fE103103bC6e7350c
VITE_CUSD_TOKEN_ADDRESS=0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org/
```

Create `.env` in `server/`:
```env
DATABASE_URL=postgresql://microarena:microarena123@localhost:5433/microarena
PORT=3001
NODE_ENV=development
```

---

## 🎮 How to Play

1. **Connect Wallet** - Click "Connect Wallet" and approve in MetaMask/Valora
2. **Select Game** - Choose from 6 available games
3. **Set Stake** - Enter your wager amount (minimum 1 cUSD)
4. **Find Match** - Matchmaking pairs you with a similar-stake opponent
5. **Play** - Compete in real-time via WebSocket
6. **Submit Score** - Commit and reveal your score on-chain
7. **Collect Winnings** - Smart contract automatically pays the winner

---

## 📊 Smart Contract

**Deployed on Celo Sepolia**: [`0xb07035b03dFfdbcE9A51806fE103103bC6e7350c`](https://celoscan.io/address/0xb07035b03dFfdbcE9A51806fE103103bC6e7350c)

### Key Functions

| Function | Description |
|----------|-------------|
| `createMatch(gameType, stake)` | Create match with cUSD stake |
| `joinMatch(matchId)` | Join existing match |
| `commitScore(matchId, scoreHash)` | Submit score hash (commit phase) |
| `revealScore(matchId, score, salt)` | Reveal actual score |
| `claimTimeout(matchId)` | Claim win if opponent abandons |

### Security Features

- ✅ **Commit-Reveal Pattern** - Prevents score manipulation
- ✅ **Timeout Protection** - 5min commit, 3min reveal windows
- ✅ **ReentrancyGuard** - Prevents reentrancy attacks
- ✅ **Platform Fee** - 2% on winnings

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS, Three.js |
| **Backend** | Node.js, Express, Socket.io, PostgreSQL |
| **Blockchain** | Solidity, Hardhat, viem, Celo |
| **Infrastructure** | Render (hosting), Neon (database) |

---

## 📡 API Reference

### REST Endpoints

```
GET  /health                        # Health check
GET  /api/matches/available/:type   # Available matches
GET  /api/player/:address/stats     # Player statistics
GET  /api/match/:matchId            # Match details
```

### WebSocket Events

**Client → Server:**
- `auth:connect` - Authenticate with wallet
- `matchmaking:search` - Find opponent
- `game:move` - Send game move
- `game:resign` - Forfeit match

**Server → Client:**
- `matchmaking:found` - Match ready
- `game:opponent_move` - Opponent's move
- `game:complete` - Game finished

---

## 🚢 Deployment

### Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://microarena-frontend.onrender.com |
| Backend | https://microarena-server.onrender.com |
| Contract | [CeloScan](https://celoscan.io/address/0xb07035b03dFfdbcE9A51806fE103103bC6e7350c) |

### Deploy Your Own

The project includes a `render.yaml` blueprint for one-click deployment to Render:

1. Fork this repository
2. Connect to Render
3. Create new Blueprint → Select repo
4. Configure environment variables
5. Deploy

---

## 🔐 Security

- Commit-reveal pattern for tamper-proof scoring
- Server-side move validation for all games
- Rate limiting on WebSocket events
- Parameterized SQL queries
- ReentrancyGuard on contract functions

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Celo Foundation](https://celo.org) - Blockchain infrastructure
- [OpenZeppelin](https://openzeppelin.com) - Secure contract libraries
- [chess.js](https://github.com/jhlywa/chess.js) - Chess engine

---

<p align="center">
  <strong>Built with ❤️ for the Celo ecosystem</strong>
</p>

<p align="center">
  <a href="https://microarena-frontend.onrender.com">Play Now</a> •
  <a href="https://github.com/Sketchyjo/MICRO-ARENA/issues">Report Bug</a> •
  <a href="https://github.com/Sketchyjo/MICRO-ARENA/issues">Request Feature</a>
</p>
