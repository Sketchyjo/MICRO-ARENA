# MICRO-ARENA Mainnet Deployment Guide

## Pre-Deployment Checklist

- [ ] Audit smart contract (recommended: OpenZeppelin, Trail of Bits)
- [ ] Test thoroughly on Celo Sepolia testnet
- [ ] Secure deployer wallet with sufficient CELO for gas
- [ ] Set up multi-sig wallet for contract ownership (Gnosis Safe)
- [ ] Prepare production database (Neon, Supabase, or AWS RDS)

## 1. Deploy Smart Contract

```bash
cd contracts

# Configure environment
cp .env.mainnet.example .env
# Edit .env with your mainnet private key and RPC URL

# Deploy to Celo Mainnet
pnpm run deploy:mainnet

# Note the deployed contract address from output
# Verify on CeloScan
pnpm run verify:mainnet <CONTRACT_ADDRESS> 0x765DE816845861e75A25fCA122bb6898B8B1282a
```

## 2. Post-Contract Deployment

After deployment, consider these admin actions:

```solidity
// Transfer ownership to multi-sig
transferOwnership(MULTISIG_ADDRESS)

// Set fee collector to treasury
setFeeCollector(TREASURY_ADDRESS)

// Adjust max stake if needed (default: 1000 cUSD)
setMaxStake(NEW_MAX_STAKE_IN_WEI)
```

## 3. Deploy Backend

Update `server/.env.production`:
```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
FRONTEND_URL=https://your-frontend-domain.com
CONTRACT_ADDRESS=0x_YOUR_DEPLOYED_CONTRACT
CUSD_TOKEN_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
```

Deploy via Render:
- Use `render.mainnet.yaml` as blueprint
- Or manually configure with above env vars

## 4. Deploy Frontend

Update `.env.production`:
```env
VITE_CONTRACT_ADDRESS=0x_YOUR_DEPLOYED_CONTRACT
VITE_CUSD_TOKEN_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
VITE_WEBSOCKET_URL=wss://your-backend-domain.com
VITE_CELO_RPC_URL=https://forno.celo.org
```

Build and deploy:
```bash
pnpm run build
# Deploy dist/ folder to your hosting
```

## 5. Verification

- [ ] Connect wallet on mainnet
- [ ] Create a match with minimum stake (1 cUSD)
- [ ] Join match from another wallet
- [ ] Complete a full game flow
- [ ] Verify payouts work correctly
- [ ] Check CeloScan for transaction confirmations

## Contract Addresses

| Network | Contract | cUSD Token |
|---------|----------|------------|
| Celo Sepolia | `0xb07035b03dFfdbcE9A51806fE103103bC6e7350c` | `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b` |
| Celo Mainnet | TBD | `0x765DE816845861e75A25fCA122bb6898B8B1282a` |

## Emergency Procedures

If issues arise post-deployment:

1. **Pause contract**: `pause()` - stops new matches
2. **Enable emergency mode**: `setEmergencyMode(true)` - allows player withdrawals
3. **Blacklist bad actors**: `setBlacklist(address, true)`

## Support

- Contract issues: Check CeloScan for failed transactions
- Backend issues: Check Render logs
- Frontend issues: Check browser console
