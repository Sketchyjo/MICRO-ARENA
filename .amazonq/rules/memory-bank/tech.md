# MICRO-ARENA Technology Stack

## Programming Languages

### TypeScript (Primary)
- **Version**: ~5.8.2 (frontend), ^5.3.0 (backend)
- **Usage**: All application code (frontend, backend, contracts)
- **Configuration**: Strict mode enabled across all modules

### Solidity
- **Version**: ^0.8.0 (via OpenZeppelin ^5.0.0)
- **Usage**: Smart contracts
- **Framework**: Hardhat 3.0.15

## Frontend Stack

### Core Framework
- **React**: ^19.2.0
- **React DOM**: ^19.2.0
- **React Router DOM**: ^7.9.6

### Build Tools
- **Vite**: ^6.2.0
- **Plugin**: @vitejs/plugin-react ^5.0.0
- **Module Type**: ESM (type: "module")

### 3D Graphics
- **Three.js**: ^0.181.2
- **React Three Fiber**: ^9.4.0
- **React Three Drei**: ^10.7.7
- **React Three Postprocessing**: ^3.0.4
- **React Spring Three**: ^10.0.3

### Blockchain Integration
- **viem**: ^2.7.0 (Ethereum library)
- **wagmi**: ^3.0.1 (React hooks for Ethereum)

### Real-time Communication
- **Socket.io Client**: ^4.6.1

### Game Libraries
- **chess.js**: 1.0.0-beta.8 (Chess game logic)

### UI Components
- **@composer-kit/ui**: ^0.0.3

## Backend Stack

### Runtime & Framework
- **Node.js**: 20+ (implied by dependencies)
- **Express**: ^4.18.2
- **TypeScript**: ^5.3.0

### Real-time Communication
- **Socket.io**: ^4.6.1

### Database
- **PostgreSQL**: Client via `pg` ^8.11.3
- **Migration**: Custom migration scripts

### Security & Middleware
- **Helmet**: ^7.1.0 (Security headers)
- **CORS**: ^2.8.5
- **Express Rate Limit**: ^7.1.5

### Blockchain Integration
- **viem**: ^2.7.0
- **ethers**: ^6.8.1

### Utilities
- **dotenv**: ^16.0.3 (Environment variables)
- **winston**: ^3.11.0 (Logging)
- **uuid**: ^9.0.1 (ID generation)
- **chess.js**: ^1.0.0-beta.6

### Development Tools
- **ts-node**: ^10.9.2
- **nodemon**: ^3.0.2

### Testing
- **Jest**: ^29.7.0
- **Supertest**: ^6.3.3 (HTTP testing)
- **Socket.io Client**: ^4.6.1 (WebSocket testing)

## Smart Contract Stack

### Framework
- **Hardhat**: ^3.0.15
- **Hardhat Toolbox Viem**: ^5.0.1
- **Hardhat Ignition**: ^3.0.5 (Deployment)

### Libraries
- **OpenZeppelin Contracts**: ^5.0.0
  - ReentrancyGuard
  - IERC20 interface

### Blockchain Tools
- **viem**: ^2.40.1
- **dotenv**: ^16.0.0

### Testing
- **Forge Std**: v1.9.4 (Foundry standard library)

## Development Commands

### Frontend
```bash
npm run dev      # Start Vite dev server (port 5173)
npm run build    # Production build
npm run preview  # Preview production build
```

### Backend
```bash
npm run dev         # Start with nodemon + ts-node
npm run build       # Compile TypeScript to dist/
npm run start       # Run compiled JavaScript
npm test            # Run Jest tests
npm run db:migrate  # Run database migrations
```

### Smart Contracts
```bash
npm run compile           # Compile Solidity contracts
npm test                  # Run Hardhat tests
npm run deploy:celo       # Deploy to Celo Sepolia
npm run deploy:ignition   # Deploy via Hardhat Ignition
npm run verify:celo       # Verify on CeloScan
```

## Network Configuration

### Blockchain
- **Network**: Celo Alfajores Testnet (development)
- **Production**: Celo Mainnet
- **RPC**: Celo public RPC endpoints
- **Token**: cUSD (Celo Dollar - ERC20)

### Backend Server
- **Default Port**: 3001
- **Protocol**: HTTP + WebSocket (Socket.io)
- **CORS**: Enabled for frontend origin

### Frontend
- **Default Port**: 5173 (Vite dev server)
- **WebSocket URL**: ws://localhost:3001 (development)

## Database Schema

### PostgreSQL Tables
- **matches**: Match records with game type, stakes, players
- **players**: Player statistics and wallet addresses
- **game_states**: Serialized game state for each match
- **leaderboard**: Aggregated player rankings

## Environment Variables

### Frontend (.env.local)
```
VITE_CONTRACT_ADDRESS=0x...        # Deployed MicroArena contract
VITE_WEBSOCKET_URL=ws://localhost:3001
```

### Backend (.env)
```
DATABASE_URL=postgresql://...      # PostgreSQL connection
PORT=3001
NODE_ENV=development
```

### Contracts (.env)
```
CELO_PRIVATE_KEY=0x...            # Deployer private key
CELOSCAN_API_KEY=...              # For contract verification
```

## Build System

### Module Resolution
- **Frontend**: ESM with Vite
- **Backend**: CommonJS with ts-node (dev), compiled to CommonJS (prod)
- **Contracts**: ESM with Hardhat

### TypeScript Configuration
- **Target**: ES2020+
- **Module**: ESNext (frontend), CommonJS (backend)
- **Strict Mode**: Enabled
- **JSX**: react-jsx (frontend)

## Deployment

### Docker Support
- **docker-compose.yml**: Multi-container setup
- **Dockerfile**: Backend containerization
- **Services**: Backend, PostgreSQL, (Frontend served separately)

### Production Build
1. Compile contracts: `cd contracts && npm run compile`
2. Deploy contracts: `npm run deploy:celo`
3. Build backend: `cd server && npm run build`
4. Build frontend: `npm run build`
5. Configure environment variables
6. Start services: `docker-compose up`

## Testing Strategy

### Smart Contracts
- Hardhat test suite
- Forge standard library for utilities
- Test networks: Hardhat local, Celo Alfajores

### Backend
- Jest unit tests for game engines
- Supertest for API integration tests
- Socket.io client for WebSocket tests

### Frontend
- Manual testing (no test framework configured)
- Browser-based testing with MetaMask/Valora

## Security Tools

### Smart Contracts
- OpenZeppelin audited libraries
- ReentrancyGuard pattern
- Commit-reveal pattern implementation

### Backend
- Helmet for HTTP security headers
- Rate limiting on WebSocket events
- Input validation on all endpoints
- Parameterized SQL queries

### Frontend
- Wallet signature verification
- Client-side input validation
- Secure WebSocket connections
