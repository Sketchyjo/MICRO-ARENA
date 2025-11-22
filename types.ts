export enum GameType {
  WHOT = 'WHOT',
  CHESS = 'CHESS',
  SURVEY = 'SURVEY'
}

export enum MatchStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  FOUND = 'FOUND',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REVEALING = 'REVEALING',
  PAYOUT = 'PAYOUT'
}

export interface Player {
  address: string;
  username: string;
  score: number;
  isLocal: boolean;
}

export interface MatchState {
  matchId: string | null;
  gameType: GameType | null;
  stake: string; // in CELO
  status: MatchStatus;
  players: {
    local: Player;
    opponent: Player;
  };
  turn: 'local' | 'opponent';
  timeLeft: number;
  winner: 'local' | 'opponent' | 'draw' | null;
}

// Whot Types
export interface WhotCard {
  id: string;
  shape: 'circle' | 'triangle' | 'cross' | 'square' | 'star';
  number: number; // 1-14. Special: 1, 2, 8, 14, 20
  isSpecial: boolean;
}

// Survey Types
export interface SurveyQuestion {
  id: string;
  text: string;
  answers: { text: string; score: number; revealed: boolean }[];
}

// Contract Simulation
export interface ContractMatch {
  id: number;
  player1: string;
  player2: string;
  stake: string;
  p1Commit: string;
  p2Commit: string;
  isActive: boolean;
}
