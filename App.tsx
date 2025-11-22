import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { contractService } from './services/mockContractService';
import { GameType, MatchState, MatchStatus } from './types';

// Layouts and Pages
import Layout from './components/Layout';
import Home from './pages/Home';
import GameSelect from './pages/GameSelect';
import WhotGame from './pages/WhotGame';
import ChessGame from './pages/ChessGame';
import SurveyGame from './pages/SurveyGame';
import Results from './pages/Results';

// --- Context ---
interface AppContextType {
  wallet: string | null;
  connect: () => Promise<void>;
  matchState: MatchState;
  setMatchState: React.Dispatch<React.SetStateAction<MatchState>>;
  updateStatus: (status: MatchStatus) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const initialMatchState: MatchState = {
  matchId: null,
  gameType: null,
  stake: '0',
  status: MatchStatus.IDLE,
  players: {
    local: { address: '', username: 'You', score: 0, isLocal: true },
    opponent: { address: '', username: 'Opponent', score: 0, isLocal: false },
  },
  turn: 'local',
  timeLeft: 60,
  winner: null,
};

const App: React.FC = () => {
  const [wallet, setWallet] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState>(initialMatchState);

  const connect = async () => {
    const address = await contractService.connectWallet();
    setWallet(address);
    setMatchState(prev => ({
        ...prev,
        players: {
            ...prev.players,
            local: { ...prev.players.local, address }
        }
    }));
  };

  const updateStatus = (status: MatchStatus) => {
    setMatchState(prev => ({ ...prev, status }));
  };

  return (
    <AppContext.Provider value={{ wallet, connect, matchState, setMatchState, updateStatus }}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/select" element={<Layout><GameSelect /></Layout>} />
          <Route path="/game/whot" element={<Layout><WhotGame /></Layout>} />
          <Route path="/game/chess" element={<Layout><ChessGame /></Layout>} />
          <Route path="/game/survey" element={<Layout><SurveyGame /></Layout>} />
          <Route path="/results" element={<Layout><Results /></Layout>} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
