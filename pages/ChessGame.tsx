import React, { useState, useEffect } from 'react';
import ChessBoard from '../components/3d/ChessBoard';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { MatchStatus } from '../types';

export default function ChessGame() {
  const navigate = useNavigate();
  const { setMatchState } = useApp();
  const [timer, setTimer] = useState(60);

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

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full gap-6">
        <div className="flex justify-between items-center glass-panel p-4 rounded-xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                <div>
                    <div className="font-bold">Opponent</div>
                    <div className="text-xs text-slate-400">Rating: 1200</div>
                </div>
            </div>
            <div className="text-4xl font-mono font-black text-red-500 animate-pulse">
                00:{timer < 10 ? `0${timer}` : timer}
            </div>
            <div className="flex items-center gap-3 text-right">
                <div>
                    <div className="font-bold">You</div>
                    <div className="text-xs text-slate-400">Rating: 1250</div>
                </div>
                <div className="w-10 h-10 bg-indigo-600 rounded-full"></div>
            </div>
        </div>

        <ChessBoard />

        <div className="glass-panel p-4 rounded-xl text-center text-sm text-slate-400">
            Drag to rotate camera • Click piece to move (Demo Mode: Visual Only)
        </div>
    </div>
  );
}
