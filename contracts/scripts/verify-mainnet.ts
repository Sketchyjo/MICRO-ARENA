import hre from "hardhat";

// Celo Mainnet cUSD address
const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
        console.error("❌ Please set CONTRACT_ADDRESS environment variable");
        console.log("Usage: CONTRACT_ADDRESS=0x... npx hardhat run scripts/verify-mainnet.ts --network celoMainnet");
        process.exit(1);
    }

    console.log("🔍 Verifying MicroArena on CeloScan...");
    console.log("📍 Contract:", contractAddress);

    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [CUSD_MAINNET],
        });
        console.log("✅ Contract verified successfully!");
    } catch (error: any) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ Contract is already verified");
        } else {
            throw error;
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    });
