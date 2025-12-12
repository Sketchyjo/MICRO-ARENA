import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Celo Sepolia Testnet cUSD address
const CUSD_SEPOLIA = "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b";

export default buildModule("MicroArenaModule", (m) => {
  const microArena = m.contract("MicroArena", [CUSD_SEPOLIA]);
  return { microArena };
});