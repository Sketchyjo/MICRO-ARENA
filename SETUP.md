# 🚀 MICRO-ARENA Quick Setup Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] MetaMask or Valora wallet installed
- [ ] Git installed

## Step-by-Step Setup

### 1. Get Test Tokens (5 minutes)

Visit the Celo Alfajores faucet to get free test tokens:

**🔗 https://faucet.celo.org**

You'll need:
- **CELO** (for gas fees) - Request at least 1 CELO
- **cUSD** (for game stakes) - Request at least 10 cUSD

### 2. Install Dependencies (3 minutes)

```bash
# Root directory (frontend)
npm install

# Backend server
cd server
npm install
cd ..

# Smart contracts
cd contracts
npm install
cd ..
```

### 3. Database Setup (2 minutes)

```bash
# Create PostgreSQL database
createdb microarena

# Or using psql:
psql -U postgres
CREATE DATABASE microarena;
\q
```

### 4. Environment Configuration (5 minutes)

```bash
# Copy example environment file
cp .env.example .env.local
```

Edit `.env.local` with your values:

```bash
# Frontend - Update these
VITE_CONTRACT_ADDRESS=           # Will get after deployment
VITE_CUSD_TOKEN_ADDRESS=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_CELO_RPC_URL=https://alfajores-forno.celo-testnet.org

# Backend - Update these
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/microarena
PORT=3001
FRONTEND_URL=http://localhost:5173

# Contracts - Update this
CELO_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE  # Export from MetaMask
```

**⚠️ IMPORTANT:** Never commit your private key to Git!

### 5. Deploy Smart Contract (5 minutes)

```bash
cd contracts

# Compile contract
npm run compile

# Deploy to Alfajores testnet
npm run deploy:alfajores

# 📝 COPY THE CONTRACT ADDRESS from output
# Example: 0x1234567890abcdef...

# Paste it into .env.local as VITE_CONTRACT_ADDRESS
```

### 6. Start Backend Server (1 minute)

```bash
cd server

# Start development server
npm run dev

# You should see:
# ✅ Database connected
# ✅ WebSocket initialized
# 🚀 Server running on port 3001
```

### 7. Start Frontend (1 minute)

```bash
# In root directory
npm run dev

# You should see:
# VITE v6.x.x ready in xxx ms
# ➜ Local: http://localhost:5173
```

### 8. Test the Application (5 minutes)

1. **Open browser** → http://localhost:5173

2. **Connect Wallet**
   - Click "Connect Wallet" button
   - Approve connection in MetaMask/Valora
   - Ensure you're on Celo Alfajores network

3. **Check Balance**
   - You should see your cUSD balance
   - If zero, revisit Step 1 (faucet)

4. **Select a Game**
   - Choose any of the 6 games
   - Set stake amount (e.g., 1 cUSD)
   - Click "Find Match"

5. **Test Matchmaking**
   - Open another browser window (incognito)
   - Connect with a different wallet
   - Search for the same game with similar stake
   - Match should be found!

6. **Play the Game**
   - Make moves in real-time
   - Watch opponent moves appear
   - Complete the game

7. **Score Submission**
   - After game ends, commit your score
   - Reveal within 3 minutes
   - Receive payout if you won!

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it:
# macOS (Homebrew)
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### "Wrong network" in MetaMask
1. Click network dropdown in MetaMask
2. Select "Celo Alfajores Testnet"
3. If not listed, the app will prompt to add it

### "Insufficient funds"
- Visit https://faucet.celo.org
- Request CELO and cUSD
- Wait 30 seconds for tokens to arrive

### "Contract not deployed"
```bash
cd contracts
npm run deploy:alfajores

# Copy the address to .env.local
# Restart frontend: npm run dev
```

### "WebSocket connection failed"
```bash
# Ensure backend is running
cd server
npm run dev

# Check if port 3001 is available
lsof -i :3001
```

### "Transaction failed"
- Check you have enough CELO for gas
- Check you approved cUSD spending
- Check contract address is correct in .env.local

---

## 📚 Next Steps

### For Development
- Read [README.md](file:///Users/tobi/Development/MICRO-ARENA/README.md) for full documentation
- Review [walkthrough.md](file:///Users/tobi/.gemini/antigravity/brain/43b54bf0-4cb2-44d0-acc0-ae3b0007f3ed/walkthrough.md) for architecture details
- Check [implementation_plan.md](file:///Users/tobi/.gemini/antigravity/brain/43b54bf0-4cb2-44d0-acc0-ae3b0007f3ed/implementation_plan.md) for future enhancements

### For Testing
1. Test all 6 games
2. Try spectator mode
3. Test timeout scenarios
4. Check leaderboard updates
5. Verify payouts on CeloScan

### For Deployment
1. Set up production PostgreSQL
2. Configure production environment variables
3. Deploy to Celo mainnet (change network in hardhat.config.ts)
4. Set up monitoring and logging
5. Configure domain and SSL

---

## 🎉 Success Checklist

- [ ] All dependencies installed
- [ ] Database created and connected
- [ ] Smart contract deployed to Alfajores
- [ ] Backend server running on port 3001
- [ ] Frontend running on port 5173
- [ ] Wallet connected successfully
- [ ] cUSD balance showing
- [ ] Match found via matchmaking
- [ ] Game played successfully
- [ ] Score committed and revealed
- [ ] Payout received

**If all checked, you're ready to go! 🚀**

---

## 💡 Tips

- **Use Incognito Mode** to test with multiple wallets
- **Check Console Logs** for debugging (F12 in browser)
- **Monitor Backend Logs** for server-side issues
- **Use CeloScan** to verify transactions: https://alfajores.celoscan.io
- **Join Discord** for community support (if available)

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review error messages in console
3. Check backend server logs
4. Verify all environment variables are set
5. Ensure you're on Alfajores testnet

**Happy Gaming! 🎮**
