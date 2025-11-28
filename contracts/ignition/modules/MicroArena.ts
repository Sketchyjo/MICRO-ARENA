import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CELO_CUSD_ADDRESS = "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b"; 

export default buildModule("MicroArenaModule", (m) => {
  const microArena = m.contract("MicroArena", [CELO_CUSD_ADDRESS]);

  return { microArena };
});