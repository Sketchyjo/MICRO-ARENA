import React, { useState, useEffect } from 'react';
import ChessBoard2D from '../components/ChessBoard2D';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { MatchStatus } from '../types';

export default function ChessGame() {
  const navigate = useNavigate();
  const { setMatchState } = useApp();
  const [timer, setTimer] = useState(600);

  useEffect(() => {
      const interval = setInterval(() => {
          setTimer(prev => {
              if (prev <= 1) {
                  clearInterval(interval);
                  // End game simulation
                  setMatchState(s => ({ ...s, status: MatchStatus.REVEALING, winner: 'local' }));
                  navigate('/results');
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
      return () => clearInterval(interval);
  }, [navigate, setMatchState]);

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full gap-8 py-4">
        {/* Header - Player Info */}
        <div className="w-full max-w-[500px] flex justify-between items-end px-2">
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700 rounded-full border-2 border-slate-500 overflow-hidden">
                    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Felix" alt="Opponent" />
                </div>
                <div className="text-left">
                    <div className="font-bold text-slate-200">Opponent</div>
                    <div className="text-xs text-slate-400 font-mono">Rating: 1200</div>
                </div>
            </div>
            <div className="text-4xl font-mono font-black text-red-500">
                {minutes < 10 ? `0${minutes}` : minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </div>
        </div>

        {/* The Board */}
        <div className="p-4 bg-slate-200 dark:bg-[#0f172a] rounded-lg shadow-2xl">
            <ChessBoard2D />
        </div>

        {/* Footer - Player Info */}
        <div className="w-full max-w-[500px] flex justify-between items-start px-2">
             <div className="text-left">
                 <div className="font-bold text-emerald-400">You</div>
                 <div className="text-xs text-slate-400 font-mono">Rating: 1250</div>
             </div>
             <div className="flex items-center gap-3">
                 <div className="text-right">
                    <div className="font-bold text-white">You</div>
                 </div>
                 <div className="w-12 h-12 bg-indigo-600 rounded-full border-2 border-indigo-400 overflow-hidden">
                    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=You" alt="You" />
                 </div>
             </div>
        </div>

        <div className="glass-panel px-6 py-2 rounded-full text-center text-xs text-slate-400 mt-4">
            Standard 1v1 • 10 min
        </div>
    </div>
  );
}