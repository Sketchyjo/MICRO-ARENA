import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { GameType, MatchStatus } from '../types';
import { contractService } from '../services/mockContractService';

export default function GameSelect() {
  const navigate = useNavigate();
  const { setMatchState, updateStatus } = useApp();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [stake, setStake] = useState('1');
  const [isFinding, setIsFinding] = useState(false);

  const games = [
    {
      id: GameType.WHOT,
      title: 'Whot Duel',
      desc: 'Classic card matching. First to empty hand wins.',
      color: 'from-orange-500 to-red-500',
      icon: '🃏'
    },
    {
      id: GameType.CHESS,
      title: '3D Chess Blitz',
      desc: '1 min timer. Checkmate or material advantage.',
      color: 'from-blue-500 to-indigo-500',
      icon: '♟️'
    },
    {
      id: GameType.SURVEY,
      title: 'Survey Clash',
      desc: 'Guess the top answers. Speed matters.',
      color: 'from-emerald-500 to-teal-500',
      icon: '📊'
    }
  ];

  const handleFindMatch = async () => {
    if (!selectedGame) return;
    
    setIsFinding(true);
    updateStatus(MatchStatus.SEARCHING);

    // 1. Create Contract Match (Mock)
    const matchId = await contractService.createMatch(stake);
    
    // 2. Mock Wait for opponent
    setTimeout(async () => {
        await contractService.joinMatch(matchId);
        
        setMatchState(prev => ({
            ...prev,
            matchId: matchId.toString(),
            gameType: selectedGame,
            stake: stake,
            status: MatchStatus.IN_PROGRESS,
            players: {
                local: { ...prev.players.local, score: 0 },
                opponent: { ...prev.players.opponent, score: 0, username: 'Player_239' }
            }
        }));

        if (selectedGame === GameType.WHOT) navigate('/game/whot');
        if (selectedGame === GameType.CHESS) navigate('/game/chess');
        if (selectedGame === GameType.SURVEY) navigate('/game/survey');
        
        setIsFinding(false);
    }, 2500);
  };

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
      <h2 className="text-3xl font-bold mb-8">Choose Your Arena</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => setSelectedGame(game.id)}
            className={`relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 border ${
              selectedGame === game.id 
                ? 'border-white ring-2 ring-indigo-500 scale-105 shadow-2xl' 
                : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
            }`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${game.color} blur-[40px] opacity-40`}></div>
            <div className="text-4xl mb-4">{game.icon}</div>
            <h3 className="text-xl font-bold mb-2">{game.title}</h3>
            <p className="text-sm text-slate-400">{game.desc}</p>
          </button>
        ))}
      </div>

      <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto w-full">
        <h3 className="text-lg font-semibold mb-4">Match Settings</h3>
        
        <div className="mb-6">
            <label className="block text-xs text-slate-400 mb-2 uppercase font-bold tracking-wider">Wager (CELO)</label>
            <div className="grid grid-cols-4 gap-2">
                {['1', '5', '10', '50'].map(val => (
                    <button 
                        key={val}
                        onClick={() => setStake(val)}
                        className={`py-2 rounded-md font-mono font-bold border ${
                            stake === val 
                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                    >
                        {val}
                    </button>
                ))}
            </div>
        </div>

        <button
            disabled={!selectedGame || isFinding}
            onClick={handleFindMatch}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                !selectedGame || isFinding
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-white text-slate-900 hover:bg-indigo-50 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
            }`}
        >
            {isFinding ? (
                <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-500 border-t-slate-900 rounded-full animate-spin"></span>
                    MATCHING...
                </span>
            ) : "FIND MATCH"}
        </button>
      </div>
    </div>
  );
}
