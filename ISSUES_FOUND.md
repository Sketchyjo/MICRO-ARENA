# MICRO-ARENA Issues & Fixes

## Critical Issues Fixed ✅

### 1. Matchmaking Duplicate Queue Entries
**Problem**: Player re-joining queue creates duplicate entries, causing self-matching
**Location**: `server/src/services/matchmaking.ts`
**Fix**: Added `cancelSearch()` before re-adding player to queue
**Status**: ✅ FIXED

### 2. Survey Answer Matching Too Loose  
**Problem**: `includes()` matching allows "Dog" to match "Hotdog", "Doghouse"
**Location**: `server/src/engines/surveyEngine.ts`
**Fix**: Added minimum length check (3 chars) and exact match priority
**Status**: ✅ FIXED

### 3. Redundant Turn Validation
**Problem**: Double validation in gameStateManager and engine causes sync issues
**Location**: `server/src/services/gameStateManager.ts`
**Fix**: Removed manager-level validation, let engines handle it
**Status**: ✅ FIXED

## Remaining Issues ⚠️

### 4. Chess Game State Sync
**Problem**: Multiple useEffect hooks listening to same events cause race conditions
**Location**: `pages/ChessGame.tsx` lines 76, 90, 128
**Impact**: Game state may not sync properly between players
**Recommendation**: Consolidate event listeners into single useEffect

### 5. Timer Not Per-Turn
**Problem**: Chess timer counts down continuously, not per-turn
**Location**: `pages/ChessGame.tsx` line 221
**Impact**: Players can't track their individual time usage
**Recommendation**: Implement per-player timer that only counts on their turn

### 6. No Server-Side Timer Validation
**Problem**: No backend enforcement of time limits
**Location**: `server/src/services/gameStateManager.ts`
**Impact**: Players can exceed time without penalty
**Recommendation**: Add timestamp tracking and timeout detection in backend

### 7. Game State Lost on Refresh
**Problem**: No recovery if player refreshes browser during game
**Location**: `services/gameIntegration.ts`
**Impact**: Player loses match if they accidentally refresh
**Recommendation**: Store active match ID in localStorage, rejoin on reconnect

### 8. Missing Blockchain Transaction Recovery
**Problem**: No retry logic if blockchain transaction fails
**Location**: `services/contractService.ts`
**Impact**: Player loses stake if transaction fails mid-process
**Recommendation**: Add transaction status tracking and retry mechanism

### 9. Survey Game: No Duplicate Guess Prevention
**Problem**: Players can guess same answer multiple times
**Location**: `server/src/engines/surveyEngine.ts`
**Impact**: Wastes turns on already-revealed answers
**Recommendation**: Track guessed words per player, reject duplicates

### 10. Chess: Captured Pieces Calculation on Every Render
**Problem**: Heavy calculation runs on every FEN change
**Location**: `pages/ChessGame.tsx` line 195
**Impact**: Performance degradation
**Recommendation**: Memoize calculation or move to chess.js event

## Minor Issues 📝

### 11. WebSocket Reconnection During Active Game
**Problem**: Reconnection implemented but doesn't rejoin active match room
**Location**: `services/websocketClient.ts` line 33
**Impact**: Player disconnected from game updates after reconnect
**Recommendation**: Emit `game:rejoin` event with matchId on reconnect

### 12. No Rate Limiting on Frontend
**Problem**: Only backend has rate limiting
**Location**: Frontend game pages
**Impact**: Users can spam moves, hitting rate limits
**Recommendation**: Add debouncing on move submission buttons

### 13. Survey: Case-Sensitive Answer Storage
**Problem**: Answers stored with capital letters, matching is case-insensitive
**Location**: `server/src/engines/surveyEngine.ts`
**Impact**: Inconsistent display of revealed answers
**Recommendation**: Normalize answer storage or display

### 14. Missing Error Messages for Invalid Moves
**Problem**: `game:invalid_move` event not handled in all game pages
**Location**: Various game pages
**Impact**: Players don't know why their move was rejected
**Recommendation**: Add toast notifications for invalid moves

### 15. No Spectator Disconnect Handling
**Problem**: Spectators not removed from rooms on disconnect
**Location**: `server/src/services/websocket.ts`
**Impact**: Memory leak from stale spectator connections
**Recommendation**: Track spectators and clean up on disconnect

## Testing Recommendations 🧪

1. **Test matchmaking with 3+ players** - Verify no duplicate matches
2. **Test survey answers** - Try partial matches, plurals, typos
3. **Test reconnection during game** - Disconnect/reconnect mid-match
4. **Test blockchain transaction failures** - Simulate network errors
5. **Test timer edge cases** - What happens at 0 seconds?
6. **Test concurrent moves** - Both players move simultaneously
7. **Load test WebSocket** - 100+ concurrent connections

## Priority Fixes

**High Priority**:
- Issue #7: Game state recovery on refresh
- Issue #8: Blockchain transaction recovery
- Issue #11: WebSocket rejoin active match

**Medium Priority**:
- Issue #4: Chess state sync consolidation
- Issue #9: Survey duplicate guess prevention
- Issue #14: Invalid move error messages

**Low Priority**:
- Issue #5: Per-turn timer
- Issue #10: Captured pieces optimization
- Issue #12: Frontend rate limiting
