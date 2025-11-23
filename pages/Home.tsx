import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { gameEngine } from '../services/gameEngine';
import { GameType } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const { wallet, connect } = useApp();
  const [activeTab, setActiveTab] = useState<'play' | 'history'>('play');
  const history = gameEngine.getMockHistory();

  const handleEnter = async () => {
    if (!wallet) await connect();
    navigate('/select');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start z-10 w-full animate-slide-up">
        {/* Navigation Tabs */}
        <div className="flex gap-8 mb-12 border-b border-slate-700 w-full max-w-xl justify-center">
            <button 
                onClick={() => setActiveTab('play')}
                className={`pb-4 px-4 font-brand font-bold text-lg transition-all ${
                    activeTab === 'play' 
                    ? 'text-indigo-400 border-b-2 border-indigo-400' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                PLAY ARENA
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`pb-4 px-4 font-brand font-bold text-lg transition-all ${
                    activeTab === 'history' 
                    ? 'text-indigo-400 border-b-2 border-indigo-400' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                GAME HISTORY
            </button>
        </div>

        {activeTab === 'play' ? (
            <div className="max-w-3xl mx-auto space-y-8 text-center animate-fade-in">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight drop-shadow-2xl">
                    STAKE. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">PLAY.</span> WIN.
                </h1>
                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                    The first decentralized 1v1 micro-betting platform on Celo. 
                    Challenge opponents in Whot, 3D Chess, or Survey Clash. 
                    Provably fair. Instant payouts.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                    <button 
                        onClick={handleEnter}
                        className="px-8 py-4 bg-white text-slate-900 rounded-lg font-bold text-lg hover:bg-indigo-50 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 transform"
                    >
                        {wallet ? "ENTER ARENA" : "CONNECT WALLET TO PLAY"}
                    </button>
                    <button className="px-8 py-4 bg-transparent border border-slate-700 text-white rounded-lg font-bold text-lg hover:bg-slate-800 transition-colors hover:scale-105 transform">
                        LEADERBOARD
                    </button>
                </div>

                <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80">
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition-colors">
                        <div className="text-indigo-400 font-bold mb-1">FAST PACED</div>
                        <p className="text-sm text-slate-500">Games take less than 3 minutes.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition-colors">
                        <div className="text-emerald-400 font-bold mb-1">SECURE</div>
                        <p className="text-sm text-slate-500">Funds held in Celo smart contracts.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition-colors">
                        <div className="text-purple-400 font-bold mb-1">LOW FEES</div>
                        <p className="text-sm text-slate-500">Built on Celo for sub-cent transactions.</p>
                    </div>
                </div>
            </div>
        ) : (
            <div className="w-full max-w-4xl animate-slide-up">
                {wallet ? (
                    <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800/80 border-b border-slate-700">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Game</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Opponent</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Result</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Stake</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Payout/Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {history.map((match) => (
                                    <tr key={match.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-bold flex items-center gap-2">
                                            <span className="text-xl">
                                                {match.gameType === GameType.CHESS ? '♟️' : 
                                                 match.gameType === GameType.WHOT ? '🃏' : '📊'}
                                            </span>
                                            {match.gameType}
                                        </td>
                                        <td className="p-4 text-slate-300">{match.opponent}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                match.result === 'win' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30' : 
                                                match.result === 'loss' ? 'bg-red-900/50 text-red-400 border border-red-500/30' : 
                                                'bg-slate-700 text-slate-300'
                                            }`}>
                                                {match.result}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-slate-300">{match.stake} CELO</td>
                                        <td className="p-4 text-right">
                                            {match.result === 'win' ? (
                                                <div className="font-bold text-emerald-400">+{match.payout}</div>
                                            ) : (
                                                <div className="text-slate-500">{match.date}</div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-slate-500 text-lg mb-4">Connect your wallet to view your match history.</p>
                        <button 
                            onClick={handleEnter}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                        >
                            Connect Wallet
                        </button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}