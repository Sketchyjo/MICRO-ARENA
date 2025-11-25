# ⚠️ IMPORTANT: Network Change to Celo Sepolia

The MICRO-ARENA platform has been configured to use **Celo Sepolia Testnet** instead of Celo Alfajores.

## Key Changes

### Network Details
- **Network Name**: Celo Sepolia Testnet
- **Chain ID**: 44787 (0xae37 in hex)
- **RPC URL**: https://sepolia.celo.org/rpc
- **Block Explorer**: https://sepolia.celoscan.io
- **cUSD Token Address**: 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1

### What Changed

1. **Smart Contract Deployment**
   - Hardhat config updated to `celoSepolia` network
   - Deploy script: `npm run deploy:sepolia`
   - Verify command: `npx hardhat verify --network celoSepolia`

2. **Frontend Integration**
   - Contract service uses Celo Sepolia chain definition
   - RPC URL: `https://sepolia.celo.org/rpc`
   - Block explorer links point to sepolia.celoscan.io

3. **Environment Variables**
   - `VITE_CELO_RPC_URL=https://sepolia.celo.org/rpc`
   - All other variables remain the same

### Getting Test Tokens

**Celo Sepolia Faucet**: https://faucet.celo.org

Request both:
- **CELO** (for gas fees)
- **cUSD** (for game stakes)

### Deployment Commands

```bash
# Deploy to Celo Sepolia
cd contracts
npm run deploy:sepolia

# Verify contract
npx hardhat verify --network celoSepolia <CONTRACT_ADDRESS> 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
```

### MetaMask Setup

The app will automatically prompt to add Celo Sepolia network with these settings:
- **Network Name**: Celo Sepolia Testnet
- **RPC URL**: https://sepolia.celo.org/rpc
- **Chain ID**: 44787
- **Currency Symbol**: CELO
- **Block Explorer**: https://sepolia.celoscan.io

---

**Note**: All functionality remains the same, only the network has changed from Alfajores to Sepolia.
