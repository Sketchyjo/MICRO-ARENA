import hre from "hardhat";
import { formatEther, parseEther } from "viem";

// Celo Mainnet cUSD address
const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

async function main() {
    console.log("🚀 Deploying MicroArena to Celo Mainnet...\n");

    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    
    const deployerAddress = deployer.account.address;
    console.log("📍 Deployer address:", deployerAddress);

    const balance = await publicClient.getBalance({ address: deployerAddress });
    console.log("💰 Deployer balance:", formatEther(balance), "CELO");

    if (balance < parseEther("0.05")) {
        console.error("❌ Insufficient CELO. Need at least 0.05 CELO for deployment");
        process.exit(1);
    }

    const chainId = await publicClient.getChainId();
    console.log("🔗 Chain ID:", chainId);
    
    if (chainId !== 42220) {
        console.error("❌ Not on Celo Mainnet! Chain ID should be 42220");
        process.exit(1);
    }

    console.log("\n⚠️  MAINNET DEPLOYMENT - REAL FUNDS AT RISK");
    console.log("📋 cUSD Token:", CUSD_MAINNET);
    console.log("\nDeploying in 10 seconds... (Ctrl+C to cancel)\n");
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log("📝 Deploying MicroArena contract...");
    
    const microArena = await hre.viem.deployContract("MicroArena", [CUSD_MAINNET]);

    console.log("\n✅ MicroArena deployed successfully!");
    console.log("📍 Contract address:", microArena.address);
    console.log("🔗 CeloScan:", `https://celoscan.io/address/${microArena.address}`);

    console.log("\n📊 Verifying contract state...");
    
    const cUSD = await microArena.read.cUSD();
    const owner = await microArena.read.owner();
    const feeCollector = await microArena.read.feeCollector();
    const platformFee = await microArena.read.platformFeePercent();
    const minStake = await microArena.read.minStake();
    const maxStake = await microArena.read.maxStake();
    const paused = await microArena.read.paused();

    console.log("  cUSD Token:", cUSD);
    console.log("  Owner:", owner);
    console.log("  Fee Collector:", feeCollector);
    console.log("  Platform Fee:", platformFee.toString(), "%");
    console.log("  Min Stake:", formatEther(minStake), "cUSD");
    console.log("  Max Stake:", formatEther(maxStake), "cUSD");
    console.log("  Paused:", paused);

    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT INFO:");
    console.log("=".repeat(60));
    console.log(`VITE_CONTRACT_ADDRESS=${microArena.address}`);
    console.log(`VITE_CUSD_TOKEN_ADDRESS=${CUSD_MAINNET}`);
    console.log(`VITE_CELO_RPC_URL=https://forno.celo.org`);
    console.log("=".repeat(60));

    console.log("\n📝 POST-DEPLOYMENT CHECKLIST:");
    console.log("  [ ] Verify contract on CeloScan: npx hardhat verify --network celoMainnet " + microArena.address + " " + CUSD_MAINNET);
    console.log("  [ ] Transfer ownership to multi-sig (Gnosis Safe recommended)");
    console.log("  [ ] Set appropriate feeCollector address");
    console.log("  [ ] Review and adjust maxStake if needed");
    console.log("  [ ] Update frontend .env with new contract address");
    console.log("  [ ] Update backend configuration");
    console.log("  [ ] Test with minimum stake before going live");
    console.log("  [ ] Monitor first few matches closely");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
