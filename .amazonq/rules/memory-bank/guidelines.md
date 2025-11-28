# MICRO-ARENA Development Guidelines

## Code Quality Standards

### TypeScript Configuration
- **Strict Mode**: Enabled across all modules (frontend, backend, contracts)
- **Target**: ES2020+ for modern JavaScript features
- **Module System**: ESM for frontend/contracts, CommonJS for backend production
- **Type Safety**: Explicit typing required, avoid `any` except for external library compatibility

### Code Formatting Patterns
- **Indentation**: 4 spaces (backend/contracts), 2 spaces (frontend components)
- **Line Length**: Prefer 120-140 characters maximum
- **Semicolons**: Consistently used across all TypeScript files
- **Quotes**: Single quotes for strings, double quotes for JSX attributes
- **Trailing Commas**: Used in multi-line arrays and objects

### Naming Conventions
- **Files**: camelCase for services (`contractService.ts`), PascalCase for components (`ChessBoard2D.tsx`)
- **Classes**: PascalCase (`ContractService`, `MatchmakingService`, `AudioService`)
- **Interfaces**: PascalCase with descriptive names (`Match`, `MatchmakingQueue`, `PlayerStats`)
- **Functions**: camelCase with verb prefixes (`createMatch`, `handleDisconnect`, `playChessMove`)
- **Constants**: UPPER_SNAKE_CASE for global constants (`CUSD_ADDRESS`, `ERC20_ABI`, `MICRO_ARENA_ABI`)
- **Private Methods**: camelCase with `private` keyword (`getContext`, `playTone`, `generateScoreHash`)
- **React Props**: PascalCase interfaces ending in `Props` (`ChessBoardProps`)

### Documentation Standards
- **JSDoc Comments**: Used for all public methods in service classes
- **Inline Comments**: Explain complex logic, especially blockchain operations and game algorithms
- **Section Headers**: ASCII comment headers for organizing code sections (`// --- GAME SPECIFIC SOUNDS ---`)
- **Error Context**: Console logs include descriptive context (`console.error('Failed to create match:', error)`)

## Architectural Patterns

### Service Layer Pattern (5/5 files)
All business logic encapsulated in singleton service classes:

```typescript
class ContractService {
    private publicClient: any;
    private walletClient: any;
    private account: `0x${string}` | null = null;
    
    constructor() {
        // Initialize clients
    }
    
    async connectWallet(): Promise<string> { }
    async createMatch(gameType: number, stake: string): Promise<{ matchId: bigint; txHash: string }> { }
}

export const contractService = new ContractService();
```

**Pattern**: Private state, public async methods, singleton export

### Error Handling Pattern (5/5 files)
Consistent try-catch with descriptive error messages:

```typescript
try {
    const result = await operation();
    console.log('✅ Operation successful:', result);
    return result;
} catch (error: any) {
    console.error('Failed to perform operation:', error);
    throw new Error(`Operation failed: ${error.message || 'Unknown error'}`);
}
```

**Pattern**: Log success with emoji, catch with typed error, rethrow with context

### Async/Await Pattern (4/5 files)
All asynchronous operations use async/await, never raw Promises:

```typescript
async function startServer() {
    await initializeDatabase();
    logger.info('Database connected');
    
    initializeWebSocket(io);
    logger.info('WebSocket initialized');
}
```

### State Management Pattern (4/5 files)
- **Backend**: Map-based in-memory state with cleanup intervals
- **Frontend**: React hooks (useState, useEffect) for local state
- **Blockchain**: Smart contract as source of truth for financial state

```typescript
private queue: Map<string, MatchmakingQueue[]> = new Map();
private activeMatches: Map<string, Match> = new Map();
private playerToMatch: Map<string, string> = new Map();
```

## Blockchain Integration Patterns

### viem Library Usage (2/2 blockchain files)
Preferred over ethers for type safety:

```typescript
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from 'viem';

const publicClient = createPublicClient({
    chain: celoSepolia,
    transport: http(RPC_URL),
});

const walletClient = createWalletClient({
    account: this.account,
    chain: celoSepolia,
    transport: custom(window.ethereum),
});
```

### Contract Interaction Pattern
1. **Read Operations**: Use `publicClient.readContract()`
2. **Write Operations**: Use `walletClient.writeContract()` + `publicClient.waitForTransactionReceipt()`
3. **Event Listening**: Use `publicClient.watchContractEvent()` with callback pattern

```typescript
const hash = await this.walletClient.writeContract({
    address: this.contractAddress as `0x${string}`,
    abi: MICRO_ARENA_ABI,
    functionName: 'createMatch',
    args: [gameType, stakeWei],
});

const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
```

### ABI Definition Pattern
Define ABIs as `const` arrays with full type information:

```typescript
const MICRO_ARENA_ABI = [
    {
        inputs: [{ name: 'gameType', type: 'uint8' }, { name: 'stake', type: 'uint256' }],
        name: 'createMatch',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    // ... more entries
] as const;
```

### Commit-Reveal Implementation
Two-phase score submission with hash verification:

```typescript
// Commit Phase
const scoreHash = keccak256(
    encodePacked(
        ['uint256', 'bytes32', 'address', 'uint256'],
        [BigInt(score), saltBytes, sender as `0x${string}`, blockNumber]
    )
);

// Reveal Phase
await this.walletClient.writeContract({
    functionName: 'revealScore',
    args: [matchId, BigInt(score), saltBytes, commitBlock],
});
```

## Backend Patterns

### Express Middleware Stack
Standard order: Security → CORS → Rate Limiting → Body Parsing → Logging → Routes → Error Handling

```typescript
app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(monitoring.requestMiddleware());
app.use(notFound);
app.use(globalErrorHandler);
```

### Async Route Handler Pattern
Wrap all async routes with `asyncHandler` utility:

```typescript
app.get('/api/player/:address/stats', asyncHandler(async (req: Request, res: Response) => {
    const { address } = req.params;
    const stats = await getUserStats(address);
    res.json(stats);
}));
```

### Logging Pattern
Use structured logging with context:

```typescript
logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    query: req.query
});

matchmakingLogger.info('Match found: ${matchId}', {
    player1: waiting.playerAddress,
    player2: playerAddress,
    gameType,
    stake
});
```

### Matchmaking Algorithm Pattern
Score-based matching with tolerance thresholds:

```typescript
const stakeScore = Math.abs(waitingStake - stakeNum) / stakeNum;
const eloScore = Math.abs(waiting.eloRating - playerElo) / 400;
const timeScore = (Date.now() - waiting.timestamp) / (5 * 60 * 1000);
const totalScore = stakeScore + eloScore - timeScore;

if (!bestMatch || totalScore < bestMatch.score) {
    bestMatch = { index: i, score: totalScore };
}
```

## Frontend Patterns

### React Component Structure
Functional components with hooks, props interface first:

```typescript
interface ChessBoardProps {
    fen: string;
    onMove: (from: string, to: string) => boolean;
    getLegalMoves?: (square: string) => string[];
    orientation?: 'white' | 'black';
    checkSquare?: string | null;
}

export default function ChessBoard2D({ fen, onMove, getLegalMoves, orientation = 'white', checkSquare }: ChessBoardProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [validMoves, setValidMoves] = useState<string[]>([]);
    
    useEffect(() => {
        // Side effects
    }, [fen]);
    
    return (/* JSX */);
}
```

### State Management with Hooks
- **useState**: Local UI state (selected square, valid moves)
- **useEffect**: Side effects and cleanup (clear selection on FEN change)
- **Custom Hooks**: Reusable logic (useWallet, useGameFlow)

### SVG Component Pattern
Inline SVG with gradients and filters for visual effects:

```typescript
const Pieces: Record<string, (props: any) => React.ReactNode> = {
    P: (props) => (
        <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
            <defs>
                <linearGradient id="whitePawnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e8e8e8" />
                </linearGradient>
            </defs>
            <path fill="url(#whitePawnGrad)" />
        </svg>
    ),
};
```

### Tailwind CSS Patterns
- **Responsive Design**: Mobile-first with `md:` breakpoints
- **Dynamic Classes**: Template literals for conditional styling
- **Utility Composition**: Combine utilities for complex effects

```typescript
className={`${bgColor} relative flex items-center justify-center cursor-pointer
    ${isSelected ? 'ring-inset ring-4 ring-yellow-400 shadow-[inset_0_0_20px_rgba(250,204,21,0.5)]' : ''}
`}
```

### Animation Patterns
CSS transitions for smooth interactions:

```typescript
className="w-full h-full transition-all duration-300 ease-out origin-center"
className={`${isSelected ? '-translate-y-2 drop-shadow-2xl scale-110' : 'hover:-translate-y-1 hover:drop-shadow-xl hover:scale-105'}`}
```

## Audio Service Pattern

### Web Audio API Usage
Singleton service with lazy AudioContext initialization:

```typescript
class AudioService {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;
    
    private getContext(): AudioContext {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }
}
```

### Sound Synthesis Pattern
Oscillator + Gain envelope for procedural sounds:

```typescript
private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, volume: number = 0.1) {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
}
```

### Game-Specific Sound Design
Descriptive method names with layered tones:

```typescript
playCapture() {
    this.playTone(1200, 'square', 0.05, 0, 0.05);
    this.playTone(100, 'sawtooth', 0.2, 0.02, 0.1);
}

playWin() {
    this.playTone(523.25, 'triangle', 0.2, 0);
    this.playTone(659.25, 'triangle', 0.2, 0.2);
    this.playTone(783.99, 'triangle', 0.2, 0.4);
    this.playTone(1046.50, 'triangle', 0.6, 0.6);
}
```

## Testing Patterns

### Backend Testing
- **Jest**: Unit tests for game engines
- **Supertest**: HTTP endpoint testing
- **Socket.io Client**: WebSocket integration tests

### Smart Contract Testing
- **Hardhat**: Test framework with local blockchain
- **Forge Std**: Foundry utilities for advanced testing

## Security Practices

### Input Validation
Always validate user input before processing:

```typescript
if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address format' });
}
```

### Rate Limiting
Apply to all API routes:

```typescript
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP',
});
app.use('/api/', limiter);
```

### Environment Variables
Never hardcode sensitive values:

```typescript
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || 'default_address';
const rpcUrl = import.meta.env.VITE_CELO_RPC_URL || 'default_rpc';
```

## Performance Optimization

### Cleanup Intervals
Regular cleanup of stale data:

```typescript
setInterval(() => {
    matchmaking.cleanupStaleMatches();
}, 60000); // Every minute
```

### Lazy Initialization
Initialize expensive resources only when needed:

```typescript
private getContext(): AudioContext {
    if (!this.ctx) {
        this.ctx = new AudioContext();
    }
    return this.ctx;
}
```

### Event Listener Management
Proper cleanup to prevent memory leaks:

```typescript
disconnect(): void {
    if (this.unwatch) {
        this.unwatch();
        this.unwatch = null;
    }
    this.eventListeners.clear();
}
```

## Common Code Idioms

### Optional Chaining & Nullish Coalescing
```typescript
const stats = await getUserStats(address);
const playerElo = stats?.elo_rating ?? 1200;
```

### Array Destructuring
```typescript
const [wins, losses] = stats as [bigint, bigint];
```

### Template Literals for IDs
```typescript
const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const queueKey = `${gameType}:${stake}`;
```

### Type Assertions for Blockchain Types
```typescript
address: this.contractAddress as `0x${string}`
args: [addr as `0x${string}`]
```

### Graceful Degradation
```typescript
if (this.isMuted || !('speechSynthesis' in window)) return;
```
