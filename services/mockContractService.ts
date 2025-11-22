import { ContractMatch } from '../types';

// Simulating Celo/Solidity interactions
// In production, this would use 'viem' or 'ethers'

class MockContractService {
  private walletAddress: string | null = null;
  private balance: number = 150.5; // Mock CELO balance
  private matches: Map<number, ContractMatch> = new Map();
  private currentMatchId = 1000;

  async connectWallet(): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.walletAddress = "0x71C...9A21";
        resolve(this.walletAddress);
      }, 800);
    });
  }

  getWallet(): string | null {
    return this.walletAddress;
  }

  getBalance(): number {
    return this.balance;
  }

  // Function: createMatch(stake)
  async createMatch(stake: string): Promise<number> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const id = this.currentMatchId++;
        this.matches.set(id, {
          id,
          player1: this.walletAddress || "0xLocal",
          player2: "0x0000000000000000000000000000000000000000",
          stake,
          p1Commit: "",
          p2Commit: "",
          isActive: true
        });
        console.log(`[Contract] Match ${id} created with stake ${stake} CELO`);
        resolve(id);
      }, 1000);
    });
  }

  // Function: joinMatch(matchId)
  async joinMatch(matchId: number): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const match = this.matches.get(matchId);
        if (match) {
          match.player2 = "0xOpponent...B23"; // Simulated opponent
          console.log(`[Contract] Joined match ${matchId}`);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000);
    });
  }

  // Function: commitScore(hash)
  async commitScore(matchId: number, hash: string): Promise<void> {
     console.log(`[Contract] Committing score hash: ${hash} for Match ${matchId}`);
     // In real contract, this stores keccak256(score + salt)
     return new Promise(r => setTimeout(r, 500));
  }

  // Function: revealScore(score, salt)
  async revealScore(matchId: number, score: number, salt: string): Promise<'winner' | 'loser' | 'draw'> {
    console.log(`[Contract] Revealing: Score ${score}, Salt ${salt}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulation: Randomly decide winner or based on score if we had real multiplayer sync
        // For demo purposes, high score wins
        const opponentScore = Math.floor(Math.random() * 100); 
        console.log(`[Contract] Opponent revealed: ${opponentScore}`);
        
        if (score > opponentScore) resolve('winner');
        else if (score < opponentScore) resolve('loser');
        else resolve('draw');
      }, 2000);
    });
  }
  
  async payoutWinner(matchId: number): Promise<string> {
      return new Promise(r => setTimeout(() => r("0xTxHash...Success"), 1000));
  }
}

export const contractService = new MockContractService();
