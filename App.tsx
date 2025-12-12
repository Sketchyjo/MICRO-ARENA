import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ComposerKitProvider } from '@composer-kit/ui/core';
import { celo } from 'viem/chains';
import { http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { contractService } from './services/contractService';
import { GameType, MatchState, MatchStatus } from './types';

// Layouts and Pages
import Layout from './components/Layout';
import Home from './pages/Home';
import GameSelect from './pages/GameSelect';
import WhotGame from './pages/WhotGame';
import ChessGame from './pages/ChessGame';
import SurveyGame from './pages/SurveyGame';
import MancalaGame from './pages/MancalaGame';
import Connect4Game from './pages/Connect4Game';
import WordleGame from './pages/WordleGame';
import Results from './pages/Results';
import ContractTest from './pages/ContractTest';

import { gameIntegration } from './services/gameIntegration';

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
  timeLeft: 600,
  winner: null,
};

// AppContent component
const AppContent: React.FC = () => {
  const [wallet, setWallet] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState>(initialMatchState);

  // Listen for wallet connection changes from window.ethereum
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0 && accounts[0] !== wallet) {
            console.log('✅ Wallet already connected:', accounts[0]);
            setWallet(accounts[0]);
            try {
              await gameIntegration.initialize(accounts[0]);
            } catch (error) {
              console.error('Failed to initialize game integration:', error);
            }
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkWalletConnection();

    // Listen for account changes
    if (typeof window.ethereum !== 'undefined' && window.ethereum.on) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          console.log('✅ Wallet connected:', accounts[0]);
          setWallet(accounts[0]);
          gameIntegration.initialize(accounts[0]).catch(console.error);
        } else {
          console.log('❌ Wallet disconnected');
          setWallet(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  const connect = async () => {
    const connectedAddress = await contractService.connectWallet();
    await gameIntegration.initialize(connectedAddress);
    setWallet(connectedAddress);
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
          <Route path="/game/mancala" element={<Layout><MancalaGame /></Layout>} />
          <Route path="/game/connect4" element={<Layout><Connect4Game /></Layout>} />
          <Route path="/game/wordle" element={<Layout><WordleGame /></Layout>} />
          <Route path="/results" element={<Layout><Results /></Layout>} />
          <Route path="/contract-test" element={<Layout><ContractTest /></Layout>} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
};

const config = {
  chains: [celo],
  transports: {
    [celo.id]: http("https://forno.celo.org")
  },
  connectors: [injected()]
} as const;

// Main App component that wraps AppContent with ComposerKitProvider
const App: React.FC = () => {
  return (
    <ComposerKitProvider
      chain={celo}
      rpcUrl="https://forno.celo.org"
      colorMode="dark"
      config={config}
    >
      <AppContent />
    </ComposerKitProvider>
  );
};

export default App;