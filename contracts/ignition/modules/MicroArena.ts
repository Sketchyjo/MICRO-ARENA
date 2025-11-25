import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CELO_CUSD_ADDRESS = "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80"; // Celo Alfajores cUSD

export default buildModule("MicroArenaModule", (m) => {
  const microArena = m.contract("MicroArena", [CELO_CUSD_ADDRESS]);
  
  return { microArena };
});