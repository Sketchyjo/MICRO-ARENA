# MICRO-ARENA Project Structure

## Directory Organization

```
MICRO-ARENA/
├── contracts/          # Blockchain smart contracts (Hardhat)
├── server/            # Backend Node.js server
├── components/        # React UI components
├── pages/             # React game page components
├── services/          # Frontend service layer
├── hooks/             # React custom hooks
└── [root files]       # Frontend app entry points
```

## Core Components

### 1. Smart Contracts (`/contracts/`)
**Purpose**: Blockchain layer for stake management and score verification

```
contracts/
├── contract/
│   ├── MicroArena.sol      # Main game contract with commit-reveal
│   └── MockERC20.sol       # Test token for development
├── scripts/                # Deployment scripts
├── test/                   # Contract tests
├── ignition/               # Hardhat Ignition deployment modules
├── hardhat.config.ts       # Hardhat configuration
└── package.json            # Contract dependencies
```

**Key Files**:
- `MicroArena.sol`: Core contract handling match creation, joining, score submission (commit/reveal), and payouts
- `hardhat.config.ts`: Network configuration for Celo Alfajores/Mainnet

### 2. Backend Server (`/server/`)
**Purpose**: Real-time game logic, matchmaking, and WebSocket communication

```
server/
├── src/
│   ├── index.ts           # Express + Socket.io server entry
│   ├── database/          # PostgreSQL setup and migrations
│   ├── engines/           # Game logic for all 6 games
│   │   ├── chessEngine.ts
│   │   ├── whotEngine.ts
│   │   ├── surveyEngine.ts
│   │   ├── mancalaEngine.ts
│   │   ├── connect4Engine.ts
│   │   └── wordleEngine.ts
│   ├── services/
│   │   ├── matchmaking.ts  # Player matching logic
│   │   ├── websocket.ts    # Socket.io event handlers
│   │   └── gameState.ts    # Match state management
│   └── utils/             # Logging, validation helpers
├── tests/                 # Jest test suites
└── package.json
```

**Key Responsibilities**:
- Real-time move validation
- Matchmaking based on skill and stake
- WebSocket event routing
- Game state persistence
- Player statistics tracking

### 3. Frontend Components (`/components/`)
**Purpose**: Reusable UI components

```
components/
├── ChessBoard2D.tsx          # 2D chess board with Three.js
├── GameHUD.tsx               # In-game UI overlay
├── Layout.tsx                # App layout wrapper
├── MatchmakingModal.tsx      # Match search interface
├── RulesModal.tsx            # Game rules display
├── ScoreSubmissionModal.tsx  # Blockchain score submission
└── WalletConnection.tsx      # Wallet connect button
```

### 4. Game Pages (`/pages/`)
**Purpose**: Individual game implementations

```
pages/
├── Home.tsx              # Landing page
├── GameSelect.tsx        # Game selection screen
├── ChessGame.tsx         # Chess game interface
├── WhotGame.tsx          # WHOT card game
├── SurveyGame.tsx        # Survey Clash game
├── MancalaGame.tsx       # Mancala board game
├── Connect4Game.tsx      # Connect4 game
├── WordleGame.tsx        # Wordle Duel game
└── Results.tsx           # Match results screen
```

### 5. Frontend Services (`/services/`)
**Purpose**: Business logic and external integrations

```
services/
├── contractService.ts      # Blockchain interaction (viem)
├── websocketClient.ts      # Socket.io client wrapper
├── gameEngine.ts           # Client-side game logic
├── gameIntegration.ts      # Game-contract integration
├── audioService.ts         # Sound effects management
└── mockContractService.ts  # Testing mock
```

### 6. Custom Hooks (`/hooks/`)
**Purpose**: Reusable React logic

```
hooks/
├── useGameFlow.ts    # Game state management hook
└── useWallet.ts      # Wallet connection hook
```

## Architectural Patterns

### Three-Tier Architecture
1. **Presentation Layer**: React frontend with real-time UI updates
2. **Application Layer**: Node.js backend with game engines and matchmaking
3. **Data Layer**: PostgreSQL database + Celo blockchain

### Communication Flow

```
Player A                    Backend Server              Blockchain              Player B
   |                              |                          |                      |
   |--[Connect Wallet]----------->|                          |                      |
   |--[Create Match]------------->|--[createMatch()]-------->|                      |
   |                              |<-[Match Created]---------|                      |
   |<-[Matchmaking Search]--------|                          |                      |
   |                              |<-[Join Match]------------|<-[Join Match]--------|
   |<-[Match Found]---------------|                          |--[Match Found]------>|
   |                              |                          |                      |
   |--[Game Move]---------------->|                          |                      |
   |                              |--[Validate Move]-------->|                      |
   |                              |--[Broadcast Move]--------|--[Opponent Move]---->|
   |                              |                          |                      |
   |--[Commit Score]------------->|                          |                      |
   |                              |--[commitScore()]-------->|                      |
   |--[Reveal Score]------------->|                          |                      |
   |                              |--[revealScore()]-------->|                      |
   |                              |<-[Winner Determined]-----|                      |
   |<-[Payout Received]-----------|                          |                      |
```

### Key Design Patterns

1. **Commit-Reveal Pattern**: Two-phase score submission prevents cheating
   - Phase 1: Submit hash of (score + salt)
   - Phase 2: Reveal actual score and salt for verification

2. **Service Layer Pattern**: Separation of concerns
   - `contractService`: Blockchain operations
   - `websocketClient`: Real-time communication
   - `gameEngine`: Game logic validation

3. **State Management**: 
   - Frontend: React hooks for local state
   - Backend: PostgreSQL for persistent state
   - Blockchain: Smart contract for financial state

4. **Event-Driven Architecture**: WebSocket events for real-time updates
   - Client emits: `game:move`, `matchmaking:search`
   - Server broadcasts: `game:opponent_move`, `game:complete`

## Data Flow

### Match Creation Flow
1. Player sets stake and game type in UI
2. Frontend calls `contractService.createMatch()`
3. Smart contract locks cUSD stake
4. Backend receives match creation event
5. Matchmaking service adds to available matches pool

### Gameplay Flow
1. Players connected via WebSocket
2. Moves sent to backend for validation
3. Game engine validates move legality
4. Valid moves broadcast to opponent
5. Game state persisted to PostgreSQL

### Score Submission Flow
1. Game ends, frontend calculates score
2. Player commits score hash to smart contract
3. Player reveals score within timeout window
4. Smart contract verifies hash matches revealed score
5. Contract determines winner and transfers funds

## Module Relationships

```
Frontend (React)
    ↓ uses
Services Layer (contractService, websocketClient)
    ↓ communicates with
Backend Server (Express + Socket.io)
    ↓ validates with
Game Engines (chess, whot, etc.)
    ↓ persists to
PostgreSQL Database

Frontend (React)
    ↓ directly interacts with
Smart Contracts (MicroArena.sol)
    ↓ manages
cUSD Token (ERC20)
```

## Configuration Files

- `vite.config.ts`: Frontend build configuration
- `tsconfig.json`: TypeScript compiler options (root, server, contracts)
- `hardhat.config.ts`: Blockchain network configuration
- `docker-compose.yml`: Multi-container orchestration
- `.env.local`: Environment variables (contract address, WebSocket URL, database)
