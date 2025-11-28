export enum GameType {
  WHOT = 'WHOT',
  CHESS = 'CHESS',
  SURVEY = 'SURVEY',
  MANCALA = 'MANCALA',
  CONNECT4 = 'CONNECT4',
  WORDLE = 'WORDLE'
}

export enum MatchStatus {
  IDLE = 'IDLE',
  CREATING_MATCH = 'CREATING_MATCH',
  SEARCHING = 'SEARCHING',
  MATCHED = 'MATCHED',
  JOINING = 'JOINING',
  ACTIVE = 'ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  GAME_OVER = 'GAME_OVER',
  COMMITTING = 'COMMITTING',
  WAITING_REVEAL = 'WAITING_REVEAL',
  REVEALING = 'REVEALING',
  WAITING_COMPLETION = 'WAITING_COMPLETION',
  COMPLETED = 'COMPLETED',
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
  isSpectator?: boolean; // New flag for spectator mode
}

export interface GameHistoryItem {
  id: string;
  gameType: GameType;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  stake: string;
  date: string;
  payout?: string;
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

// Mancala Types
export interface MancalaGameState {
  pits: number[]; // 14 pits: [0-5] = player 1, [6] = store 1, [7-12] = player 2, [13] = store 2
  currentPlayer: 'local' | 'opponent';
  selectedPit: number | null;
  gamePhase: 'playing' | 'ended';
  lastMove: { pit: number; extraTurn: boolean; captured: number } | null;
}