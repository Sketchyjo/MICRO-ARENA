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
      title: 'Chess Blitz',
      desc: '10 min timer. Checkmate or material advantage.',
      color: 'from-blue-500 to-indigo-500',
      icon: '♟️'
    },
    {
      id: GameType.SURVEY,
      title: 'Survey Clash',
      desc: 'Guess the top answers. Speed matters.',
      color: 'from-emerald-500 to-teal-500',
      icon: '📊'
    },
    {
      id: GameType.MANCALA,
      title: 'Mancala Duel',
      desc: 'Ancient strategy. Capture the most stones.',
      color: 'from-amber-600 to-yellow-600',
      icon: '🪨'
    },
    {
      id: GameType.CONNECT4,
      title: 'Connect 4',
      desc: 'Strategic Blitz. Connect 4 to win.',
      color: 'from-blue-600 to-cyan-500',
      icon: '🔴'
    },
    {
      id: GameType.WORDLE,
      title: 'Wordle Duel',
      desc: 'Intellectual Race. Guess the word.',
      color: 'from-green-500 to-lime-500',
      icon: '🔤'
    }
  ];

  const handleFindMatch = async () => {
    if (!selectedGame) return;

    setIsFinding(true);
    updateStatus(MatchStatus.SEARCHING);

    const matchId = await contractService.createMatch(stake);

    setTimeout(async () => {
      await contractService.joinMatch(matchId);

      setMatchState(prev => ({
        ...prev,
        matchId: matchId.toString(),
        gameType: selectedGame,
        stake: stake,
        status: MatchStatus.IN_PROGRESS,
        isSpectator: false,
        players: {
          local: { ...prev.players.local, score: 0 },
          opponent: { ...prev.players.opponent, score: 0, username: 'Player_239' }
        }
      }));

      if (selectedGame === GameType.WHOT) navigate('/game/whot');
      if (selectedGame === GameType.CHESS) navigate('/game/chess');
      if (selectedGame === GameType.SURVEY) navigate('/game/survey');
      if (selectedGame === GameType.MANCALA) navigate('/game/mancala');
      if (selectedGame === GameType.CONNECT4) navigate('/game/connect4');
      if (selectedGame === GameType.WORDLE) navigate('/game/wordle');

      setIsFinding(false);
    }, 2500);
  };

  const handleSpectate = (gameType: GameType) => {
    setMatchState(prev => ({
      ...prev,
      gameType: gameType,
      status: MatchStatus.IN_PROGRESS,
      isSpectator: true, // Enable Spectator Mode
      players: {
        local: { ...prev.players.local, username: 'Pro_Gamer_1' },
        opponent: { ...prev.players.opponent, username: 'ChessMaster_99' }
      }
    }));

    if (gameType === GameType.WHOT) navigate('/game/whot', { state: { isSpectator: true } });
    if (gameType === GameType.CHESS) navigate('/game/chess', { state: { isSpectator: true } });
    if (gameType === GameType.SURVEY) navigate('/game/survey', { state: { isSpectator: true } });
    if (gameType === GameType.MANCALA) navigate('/game/mancala', { state: { isSpectator: true } });
    if (gameType === GameType.CONNECT4) navigate('/game/connect4', { state: { isSpectator: true } });
    if (gameType === GameType.WORDLE) navigate('/game/wordle', { state: { isSpectator: true } });
  };

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full animate-slide-up pb-10">

      {/* PLAY SECTION */}
      <h2 className="text-3xl font-bold mb-6 font-brand">Choose Your Arena</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => setSelectedGame(game.id)}
            className={`relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 border group ${selectedGame === game.id
              ? 'border-white ring-2 ring-indigo-500 scale-105 shadow-2xl bg-slate-800'
              : 'border-slate-700 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-800'
              }`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${game.color} blur-[40px] opacity-40 group-hover:opacity-60 transition-opacity`}></div>
            <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform">{game.icon}</div>
            <h3 className="text-xl font-bold mb-2">{game.title}</h3>
            <p className="text-sm text-slate-400">{game.desc}</p>
          </button>
        ))}
      </div>

      <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto w-full mb-16 shadow-2xl">
        <h3 className="text-lg font-semibold mb-4 text-center text-indigo-300">MATCH CONFIGURATION</h3>

        <div className="mb-6">
          <label className="block text-xs text-slate-400 mb-2 uppercase font-bold tracking-wider">Wager (CELO)</label>
          <div className="grid grid-cols-4 gap-2">
            {['1', '5', '10', '50'].map(val => (
              <button
                key={val}
                onClick={() => setStake(val)}
                className={`py-2 rounded-md font-mono font-bold border transition-all ${stake === val
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800'
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
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${!selectedGame || isFinding
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

      {/* SPECTATOR SECTION */}
      <h2 className="text-2xl font-bold mb-6 font-brand text-slate-400 border-t border-slate-800 pt-8">Spectate Live Matches</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div onClick={() => handleSpectate(GameType.CHESS)} className="cursor-pointer bg-slate-900/80 border border-slate-700 hover:border-indigo-500 rounded-xl p-4 flex items-center justify-between group transition-all">
          <div className="flex items-center gap-3">
            <div className="text-2xl">♟️</div>
            <div>
              <div className="font-bold text-sm">GrandMaster vs Rookie</div>
              <div className="text-xs text-slate-500">Chess • 50 CELO</div>
            </div>
          </div>
          <div className="px-3 py-1 bg-red-900/30 text-red-500 text-xs font-bold rounded-full animate-pulse border border-red-900/50">LIVE</div>
        </div>
        <div onClick={() => handleSpectate(GameType.WHOT)} className="cursor-pointer bg-slate-900/80 border border-slate-700 hover:border-orange-500 rounded-xl p-4 flex items-center justify-between group transition-all">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🃏</div>
            <div>
              <div className="font-bold text-sm">CardKing vs LuckBox</div>
              <div className="text-xs text-slate-500">Whot • 10 CELO</div>
            </div>
          </div>
          <div className="px-3 py-1 bg-red-900/30 text-red-500 text-xs font-bold rounded-full animate-pulse border border-red-900/50">LIVE</div>
        </div>
      </div>

    </div>
  );
}