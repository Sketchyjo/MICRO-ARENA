# MicroArena Contract Deployment Guide

## Prerequisites

1. **Get Celo Alfajores testnet tokens:**
   - CELO (for gas): https://faucet.celo.org
   - cUSD (for testing): https://faucet.celo.org

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Add your private key to .env
   ```

3. **Store private key securely:**
   ```bash
   npx hardhat keystore set CELO_PRIVATE_KEY
   ```

## Deployment Options

### Option 1: Using Hardhat Ignition (Recommended)
```bash
npm run deploy:ignition
```

### Option 2: Using Script
```bash
npm run deploy:celo
```

## Contract Addresses

- **cUSD Token (Alfajores):** `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
- **Network:** Celo Alfajores Testnet (Chain ID: 44787)
- **RPC:** https://alfajores-forno.celo-testnet.org

## Verification

After deployment, verify the contract:
```bash
npm run verify:celo <CONTRACT_ADDRESS> 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
```

## Usage

1. **Create Match:** Call `createMatch(gameType, stake)` with cUSD approval
2. **Join Match:** Call `joinMatch(matchId)` with matching stake
3. **Submit Score:** Use commit-reveal pattern:
   - `commitScore(matchId, keccak256(score, salt, address, blockNumber))`
   - `revealScore(matchId, score, salt, blockNumber)`