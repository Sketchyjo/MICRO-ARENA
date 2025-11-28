# Production-Ready Gameplay Integration Guide

This guide explains how to integrate the blockchain-based matchmaking, gameplay, and scoring system into your games.

## Overview

The integration consists of 5 main components:

1. **Contract Service** (`services/contractService.ts`) - Blockchain interactions
2. **Game Integration Service** (`services/gameIntegration.ts`) - Orchestrates contract + WebSocket
3. **WebSocket Client** (`services/websocketClient.ts`) - Real-time communication
4. **UI Components** - Matchmaking modal, Game HUD, Score submission
5. **useGameFlow Hook** (`hooks/useGameFlow.ts`) - React hook for game lifecycle

## Quick Start

### 1. Initialize on App Load

In your `App.tsx`, initialize the game integration service when wallet connects:

```typescript
import { gameIntegration } from './services/gameIntegration';
import { contractService } from './services/contractService';

const connect = async () => {
    const address = await contractService.connectWallet();
    await gameIntegration.initialize(address);
    setWallet(address);
};
```

### 2. Use in Game Component

```typescript
import { useGameFlow } from '../hooks/useGameFlow';
import MatchmakingModal from '../components/MatchmakingModal';
import GameHUD from '../components/GameHUD';
import ScoreSubmissionModal from '../components/ScoreSubmissionModal';
import { GameType } from '../types';

function YourGame() {
    const { gameState, startMatchmaking, sendMove, submitScore } = useGameFlow();
    const [showMatchmaking, setShowMatchmaking] = useState(true);
    const [showScoreSubmission, setShowScoreSubmission] = useState(false);
    const [finalScore, setFinalScore] = useState(0);

    // When match is found
    useEffect(() => {
        if (gameState?.status === 'MATCHED') {
            setShowMatchmaking(false);
            // Start your game logic
        }
    }, [gameState]);

    // When game ends
    const handleGameEnd = (score: number) => {
        setFinalScore(score);
        setShowScoreSubmission(true);
    };

    return (
        <>
            <MatchmakingModal
                gameType={GameType.CHESS}
                isOpen={showMatchmaking}
                onClose={() => setShowMatchmaking(false)}
                onMatchFound={(matchId) => console.log('Match found:', matchId)}
            />

            {gameState?.status === 'ACTIVE' && (
                <GameHUD
                    gameState={gameState}
                    timeLeft={600}
                    onResign={() => gameIntegration.resignGame()}
                />
            )}

            <ScoreSubmissionModal
                isOpen={showScoreSubmission}
                score={finalScore}
                onClose={() => setShowScoreSubmission(false)}
                onComplete={() => navigate('/results')}
            />

            {/* Your game UI here */}
        </>
    );
}
```

## Game Flow States

The `gameState.status` progresses through these states:

1. **IDLE** - No active match
2. **CREATING_MATCH** - Creating match on blockchain
3. **SEARCHING** - In matchmaking queue
4. **MATCHED** - Opponent found
5. **ACTIVE** - Game in progress
6. **GAME_OVER** - Game finished, ready to submit score
7. **COMMITTING** - Submitting score commitment
8. **WAITING_REVEAL** - Waiting for opponent to commit
9. **REVEALING** - Revealing score
10. **COMPLETED** - Match complete, payout distributed

## Sending Moves

When a player makes a move in your game:

```typescript
const handleMove = (move: any) => {
    // Validate move locally first
    if (isValidMove(move)) {
        // Send to opponent via WebSocket
        sendMove(move);
        
        // Update local game state
        applyMove(move);
    }
};
```

## Receiving Opponent Moves

Listen for opponent moves via WebSocket:

```typescript
useEffect(() => {
    websocketClient.onOpponentMove((data) => {
        // Validate opponent's move
        if (isValidMove(data.move)) {
            applyMove(data.move);
        }
    });

    return () => {
        websocketClient.off('game:opponent_move');
    };
}, []);
```

## Score Calculation

Each game type has specific score ranges (defined in the smart contract):

- **Chess**: 0 (loss), 50 (draw), 100 (win)
- **WHOT**: 0-1000 points
- **Survey Clash**: 0-500 points
- **Mancala**: 0-48 (number of stones captured)
- **Connect4**: 0 (loss), 50 (draw), 100 (win)
- **Wordle**: 0-600 points

Calculate the score based on your game's outcome, then submit:

```typescript
const calculateScore = () => {
    if (gameType === GameType.CHESS) {
        if (winner === 'local') return 100;
        if (winner === 'draw') return 50;
        return 0;
    }
    // Other game types...
};

const score = calculateScore();
await submitScore(score);
```

## Error Handling

The `useGameFlow` hook provides error state:

```typescript
const { gameState, error } = useGameFlow();

useEffect(() => {
    if (error) {
        // Show error to user
        toast.error(error);
    }
}, [error]);
```

## Backend Server

Make sure the backend server is running:

```bash
cd server
npm install
npm run dev
```

The server handles:
- WebSocket connections for real-time gameplay
- Matchmaking queue management
- Game state persistence
- Move validation

## Environment Variables

Frontend (`.env.local`):
```env
VITE_CONTRACT_ADDRESS=0xeDA72a2C5Bfb7c6f88F27768FCeF697C20954E31
VITE_CUSD_ADDRESS=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
VITE_CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
VITE_WEBSOCKET_URL=http://localhost:3001
```

Backend (`server/.env`):
```env
DATABASE_URL=postgresql://localhost:5432/microarena
PORT=3001
CONTRACT_ADDRESS=0xeDA72a2C5Bfb7c6f88F27768FCeF697C20954E31
FRONTEND_URL=http://localhost:5173
```

## Testing

1. **Get Testnet Tokens**:
   - Visit [Celo Alfajores Faucet](https://faucet.celo.org/alfajores)
   - Get CELO and cUSD for testing

2. **Test Matchmaking**:
   - Open two browser windows
   - Connect different wallets in each
   - Start matchmaking with same stake amount
   - Verify match is found

3. **Test Gameplay**:
   - Make moves in one window
   - Verify they appear in the other window
   - Test resignation, timeout, etc.

4. **Test Score Submission**:
   - Complete a game
   - Submit scores from both players
   - Verify commit-reveal flow works
   - Check payout is distributed

## Common Issues

### "Wallet not connected"
- Ensure `contractService.connectWallet()` is called before `gameIntegration.initialize()`

### "Match not found"
- Ensure backend server is running
- Check WebSocket connection in browser console
- Verify both players are searching with compatible stakes

### "Transaction failed"
- Check you have enough CELO for gas
- Check you have enough cUSD for the stake
- Verify contract address is correct

### "Opponent move not appearing"
- Check WebSocket connection
- Verify both players are in the same match
- Check browser console for errors

## Next Steps

1. Integrate into your specific game
2. Add game-specific move validation
3. Implement game-specific scoring logic
4. Add spectator mode support
5. Add chat functionality
6. Deploy to production

## Support

For issues or questions:
- Check the implementation plan: `implementation_plan.md`
- Review the task breakdown: `task.md`
- Check backend logs: `server/logs/`
