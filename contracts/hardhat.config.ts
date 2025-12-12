import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  paths: {
    sources: "./contract",
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 1, // Minimize deployment cost
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    celoSepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("CELO_SEPOLIA_RPC_URL"),
      accounts: [configVariable("CELO_PRIVATE_KEY")],
      chainId: 11142220,
    },
    celoMainnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("CELO_MAINNET_RPC_URL"),
      accounts: [configVariable("CELO_MAINNET_PRIVATE_KEY")],
      chainId: 42220,
    },
  },
});
