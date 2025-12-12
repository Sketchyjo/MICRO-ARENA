import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Celo Mainnet cUSD address
const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

export default buildModule("MicroArenaMainnetModule", (m) => {
  const microArena = m.contract("MicroArena", [CUSD_MAINNET]);
  return { microArena };
});
