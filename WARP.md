# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

MICRO-ARENA is a production-ready blockchain gaming platform for 1v1 skill-based duels with cUSD micro-stakes on Celo. The platform features 6 competitive games (Chess, WHOT, Survey Clash, Mancala, Connect4, Wordle Duel) with real-time multiplayer via WebSocket, blockchain-based wagering through smart contracts, and a commit-reveal pattern for anti-cheat score submission.

## Essential Commands

### Frontend Development
```bash
# Install dependencies
pnpm install

# Run development server (runs on http://localhost:3000)
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

### Backend Development
```bash
# Install dependencies
cd server && pnpm install

# Run development server (runs on http://localhost:3001)
pnpm run dev

# Build TypeScript
pnpm run build

# Start production server
pnpm run start

# Run tests
pnpm test

# Database migration
pnpm run db:migrate
```

### Smart Contract Development
```bash
# Install dependencies
cd contracts && pnpm install

# Compile contracts
pnpm run compile

# Run tests
pnpm test

# Deploy to Celo Sepolia testnet
pnpm run deploy:celo

# Deploy using Hardhat Ignition
pnpm run deploy:ignition

# Verify contract on CeloScan
pnpm run verify:celo
```

### Docker Operations
```bash
# Start all services (PostgreSQL, Redis, Backend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Start only database
docker-compose up postgres -d
```

## Architecture

### High-Level Structure
```
MICRO-ARENA/
├── contracts/          # Solidity smart contracts (Hardhat)
├── server/            # Node.js backend (Express + Socket.io)
├── services/          # Frontend service layer
├── pages/             # React game components
├── components/        # Reusable UI components
└── hooks/             # React custom hooks
```

### Three-Tier Architecture

**1. Blockchain Layer (Solidity + Hardhat)**
- `contracts/contract/MicroArena.sol`: Main game contract with commit-reveal pattern
- Security features: ReentrancyGuard, timeout protection, score validation per game type
- Manages match creation, joining, score commitment/reveal, and payouts
- Integrates with cUSD ERC20 token on Celo Alfajores testnet
- Platform fee: 2% on winnings
- Key timeouts: 5min commit, 3min reveal

**2. Backend Layer (Node.js + Express + Socket.io)**
- **Game Engines** (`server/src/engines/`): Six independent game logic engines (chess, whot, survey, mancala, connect4, wordle) with server-side move validation
- **Services** (`server/src/services/`):
  - `matchmaking.ts`: ELO-based matching, stake tolerance (10% range), queue management
  - `websocket.ts`: Real-time communication, signature-based authentication, rate limiting
  - `gameStateManager.ts`: Active game state persistence with PostgreSQL fallback
- **Database** (`server/src/database/`): PostgreSQL integration for users, matches, game states, transactions
- **Utilities** (`server/src/utils/`): Winston logging, error handling, health monitoring

**3. Frontend Layer (React + Vite + TypeScript)**
- **Services** (`services/`):
  - `contractService.ts`: Blockchain integration using viem, handles wallet connection, transactions, and event listening
  - `websocketClient.ts`: Socket.io client wrapper for real-time game communication
  - `gameEngine.ts`: Client-side game state management
- **Hooks** (`hooks/`): `useWallet.ts`, `useGameFlow.ts` for shared logic
- **Pages** (`pages/`): Individual game implementations (ChessGame, WhotGame, etc.)
- **Components** (`components/`): Reusable UI (WalletConnection, GameHUD, ScoreSubmissionModal, etc.)

### Data Flow

**Match Creation Flow:**
1. User approves cUSD spending via `contractService.ts`
2. User calls `createMatch()` or `joinMatch()` on smart contract
3. Backend listens for `MatchCreated`/`MatchJoined` events
4. Matchmaking service pairs players with similar stakes/ELO
5. WebSocket notifies both players when match is found

**Gameplay Flow:**
1. Players send moves via `websocketClient.sendMove()`
2. Backend validates moves using game engine in `server/src/engines/`
3. Game state persisted to PostgreSQL
4. Valid moves broadcast to opponent via WebSocket
5. Game engine detects win/loss/draw conditions
6. Backend emits `game:complete` event with final scores

**Score Submission Flow (Commit-Reveal Pattern):**
1. Game ends, frontend calculates score
2. Client generates `salt` (random bytes32)
3. Client computes `scoreHash = keccak256(abi.encodePacked(score, salt, msg.sender, block.number))`
4. User calls `commitScore(matchId, scoreHash)` on-chain
5. After both players commit, user calls `revealScore(matchId, score, salt, commitBlock)`
6. Smart contract validates: `keccak256(abi.encodePacked(score, salt, msg.sender, commitBlock)) == commitHash`
7. Contract determines winner and distributes payout (minus 2% platform fee)
8. If opponent fails to commit/reveal within timeout, user can claim via `claimTimeout()`

### Key Dependencies

**Frontend:**
- `react` 19.2.0 / `react-dom` 19.2.0
- `viem` 2.7.0 (Ethereum library for TypeScript)
- `socket.io-client` 4.6.1 (WebSocket client)
- `chess.js` 1.0.0-beta.8 (Chess engine)
- `@react-three/fiber` / `three` (3D rendering)

**Backend:**
- `express` 4.18.2 (REST API)
- `socket.io` 4.6.1 (WebSocket server)
- `pg` 8.11.3 (PostgreSQL client)
- `winston` 3.11.0 (Logging)
- `helmet` / `express-rate-limit` (Security)
- `ethers` 6.8.1 (Signature verification)

**Smart Contracts:**
- `@openzeppelin/contracts` 5.0.0 (Secure contract libraries)
- `hardhat` 3.0.15 (Development framework)
- `@nomicfoundation/hardhat-toolbox-viem` 5.0.1

### Network Configuration

**Celo Alfajores Testnet:**
- Chain ID: 44787
- RPC: `https://alfajores-forno.celo-testnet.org`
- cUSD Token: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
- Block Explorer: `https://alfajores.celoscan.io`
- Faucet: `https://faucet.celo.org`

**Celo Sepolia (Alternative):**
- Chain ID: 11142220
- RPC: Configured in `hardhat.config.ts`

### Environment Variables

**Frontend (`.env.local`):**
```bash
VITE_CONTRACT_ADDRESS=<deployed_contract_address>
VITE_CUSD_TOKEN_ADDRESS=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
```

**Backend:**
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/microarena
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
LOG_LEVEL=info
```

**Contracts:**
```bash
CELO_PRIVATE_KEY=<deployer_private_key>
```

## Development Guidelines

### Testing

**Backend Tests:**
```bash
cd server
pnpm test                    # Run all tests
pnpm run test:unit          # Unit tests only
pnpm run test:integration   # Integration tests only
pnpm run test:coverage      # With coverage report
```

**Smart Contract Tests:**
```bash
cd contracts
pnpm test                   # Run Hardhat tests
```

Test files located in `server/tests/` and `contracts/test/`.

### Adding New Games

When adding a new game engine:

1. **Create Backend Engine** (`server/src/engines/newGameEngine.ts`):
   - Implement `initializeGame()`, `validateMove()`, `applyMove()`, `checkGameOver()`
   - Return structured game state and validation results
   - Add comprehensive move validation logic

2. **Update GameStateManager** (`server/src/services/gameStateManager.ts`):
   - Import and register new engine
   - Add game type to enum/constants

3. **Create Frontend Page** (`pages/NewGamePage.tsx`):
   - Implement game UI using React components
   - Connect to `websocketClient` for real-time moves
   - Handle game state updates via WebSocket events

4. **Update Smart Contract** (`contracts/contract/MicroArena.sol`):
   - Add new game type enum value
   - Update `isValidScore()` with game-specific score range validation

5. **Update Routing** (`App.tsx`):
   - Add new route for game page

### Security Considerations

**Smart Contract Security:**
- All state-changing functions use `ReentrancyGuard` from OpenZeppelin
- Enhanced commit-reveal pattern includes sender address and block number to prevent replay attacks
- Game-specific score validation prevents manipulation
- Timeout mechanisms protect against abandonment attacks
- Access controls ensure only match participants can submit scores

**Backend Security:**
- Rate limiting: 100 requests per 15 minutes per IP on API routes
- Socket-level rate limiting to prevent spam
- Signature-based WebSocket authentication using ethers.js
- Input validation on all endpoints and WebSocket events
- Helmet middleware for HTTP security headers
- CORS configuration restricts frontend origin
- SQL injection prevention via parameterized queries (pg library)

**Best Practices:**
- Never commit private keys to version control
- Use `.env.local` for sensitive configuration (already in `.gitignore`)
- Always validate user input on both frontend and backend
- Server-side game move validation is authoritative (client validation is UX only)
- WebSocket authentication required before any game operations
- Database queries use connection pooling and prepared statements

### Observability

**Health Endpoints:**
- `GET /health`: Basic health status, uptime, memory, services status, matchmaking queue stats
- `GET /health/detailed`: Comprehensive metrics including CPU usage

**Logging:**
- Winston logger with component-specific loggers
- Structured logging with context (request ID, player address, etc.)
- Log levels: ERROR (critical failures), WARN (potential issues), INFO (operations), DEBUG (detailed debugging)
- Logs stored in `server/logs/`

**Monitoring:**
- Memory usage and CPU utilization tracked via `server/src/utils/monitoring.ts`
- Request/response times and error rates
- Active WebSocket connections
- Database connection health
- Matchmaking queue statistics available via `/api/matchmaking/stats`

### Database Schema

**Key Tables:**
- `users`: Player profiles with ELO ratings, wins/losses/draws, total earnings
- `matches`: Complete match history with player addresses, stakes, outcomes, timestamps
- `game_states`: Active game persistence (board state, current turn, move history)
- `transactions`: On-chain transaction tracking for audit trails

**Connection Management:**
- Connection pooling via `pg` library
- Automatic cleanup of old game states
- Health checks for database availability

### Common Issues

**"Wrong network" in MetaMask:**
- Ensure Celo Alfajores (Chain ID 44787) is selected
- App will prompt to add network if not present

**"Insufficient funds" errors:**
- Need CELO for gas fees (get from https://faucet.celo.org)
- Need cUSD for game stakes (also from faucet)

**WebSocket connection failures:**
- Verify backend is running on port 3001
- Check `VITE_WEBSOCKET_URL` in `.env.local`
- Check CORS settings in `server/src/index.ts` if frontend URL changed

**Contract deployment issues:**
- Ensure `CELO_PRIVATE_KEY` is set in environment
- Verify deployer wallet has CELO for gas
- Check network configuration in `hardhat.config.ts`

**Database connection errors:**
- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Ensure database exists: `createdb microarena`

### Production Deployment Checklist

- [ ] Deploy PostgreSQL with persistent volumes
- [ ] Configure Redis for caching (docker-compose includes Redis service)
- [ ] Deploy smart contract to Celo mainnet (update network in hardhat.config.ts)
- [ ] Set production environment variables
- [ ] Configure domain and SSL certificates
- [ ] Set up monitoring and alerting (CloudWatch, Grafana)
- [ ] Enable error tracking (Sentry or similar)
- [ ] Configure backups for database
- [ ] Test health endpoints
- [ ] Verify WebSocket connections work through load balancer
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Document rollback procedures
