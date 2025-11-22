import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';

export default function Home() {
  const navigate = useNavigate();
  const { wallet, connect } = useApp();

  const handleEnter = async () => {
    if (!wallet) await connect();
    navigate('/select');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center z-10">
        <div className="max-w-3xl mx-auto space-y-8">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">
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
                    className="px-8 py-4 bg-white text-slate-900 rounded-lg font-bold text-lg hover:bg-indigo-50 transition-colors shadow-xl"
                >
                    {wallet ? "ENTER ARENA" : "CONNECT WALLET TO PLAY"}
                </button>
                <button className="px-8 py-4 bg-transparent border border-slate-700 text-white rounded-lg font-bold text-lg hover:bg-slate-800 transition-colors">
                    VIEW LEADERBOARD
                </button>
            </div>

            <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-70">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                    <div className="text-indigo-400 font-bold mb-1">FAST PACED</div>
                    <p className="text-sm text-slate-500">Games take less than 3 minutes.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                    <div className="text-emerald-400 font-bold mb-1">SECURE</div>
                    <p className="text-sm text-slate-500">Funds held in Celo smart contracts.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                    <div className="text-purple-400 font-bold mb-1">LOW FEES</div>
                    <p className="text-sm text-slate-500">Built on Celo for sub-cent transactions.</p>
                </div>
            </div>
        </div>
    </div>
  );
}
