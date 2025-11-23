import React, { useState, useEffect } from 'react';
import { gameEngine } from '../services/gameEngine';
import { SurveyQuestion, MatchStatus, GameType } from '../types';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import RulesModal from '../components/RulesModal';

export default function SurveyGame() {
  const { setMatchState } = useApp();
  const navigate = useNavigate();
  const [questions] = useState(gameEngine.getSurveyQuestions());
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timer, setTimer] = useState(60);
  
  // Rules Modal
  const [showRules, setShowRules] = useState(false);

  const currentQ = questions[currentQIndex];

  // Global Timer
  useEffect(() => {
      if (timer <= 0) {
          handleGameOver();
          return;
      }
      const t = setInterval(() => setTimer(p => p - 1), 1000);
      return () => clearInterval(t);
  }, [timer]);

  // Hard Mode Bot - Aggressive Scoring
  useEffect(() => {
      const interval = setInterval(() => {
          // Hard Mode: Bot scores consistently
          // Chance to score every 2 seconds
          if (Math.random() > 0.3) {
              const points = Math.floor(Math.random() * 20) + 10;
              setOpponentScore(prev => prev + points);
          }
      }, 2000); // Faster checks
      return () => clearInterval(interval);
  }, []);

  const handleGameOver = () => {
      const winner = score > opponentScore ? 'local' : (score < opponentScore ? 'opponent' : 'draw');
      setMatchState(s => ({ ...s, status: MatchStatus.REVEALING, winner }));
      navigate('/results');
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const matchIndex = currentQ.answers.findIndex(
          a => a.text.toLowerCase().includes(input.toLowerCase())
      );

      if (matchIndex >= 0 && !revealedAnswers.includes(matchIndex)) {
          setRevealedAnswers(prev => [...prev, matchIndex]);
          setScore(s => s + currentQ.answers[matchIndex].score);
          setInput("");
      } else {
          // Visual feedback for wrong answer?
          setInput("");
      }

      // Check if round complete (all revealed)
      if (revealedAnswers.length + 1 >= currentQ.answers.length) {
          setTimeout(() => {
            if (currentQIndex + 1 < questions.length) {
                setCurrentQIndex(prev => prev + 1);
                setRevealedAnswers([]);
            } else {
                handleGameOver();
            }
          }, 1500);
      }
  };

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full py-8 relative">
        <RulesModal 
          isOpen={showRules} 
          onClose={() => setShowRules(false)} 
          gameType={GameType.SURVEY} 
        />
        
        {/* Rules Button */}
        <button 
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 w-8 h-8 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-500 flex items-center justify-center transition-all z-20"
        >
            ?
        </button>

        <div className="text-center mb-8">
            <div className="flex justify-between items-center mb-4">
                 <div className="text-sm font-bold text-slate-400">ROUND {currentQIndex + 1}/{questions.length}</div>
                 <div className={`text-2xl font-black font-mono ${timer < 10 ? 'text-red-500 animate-ping' : 'text-white'}`}>{timer}s</div>
            </div>
            
            <div className="glass-panel p-6 rounded-xl border-2 border-indigo-500/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
                <h1 className="text-3xl font-bold">{currentQ.text}</h1>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
            {currentQ.answers.map((ans, idx) => (
                <div key={idx} className="h-16 bg-slate-800 border border-slate-700 rounded-lg flex overflow-hidden relative transition-all duration-300 transform hover:scale-[1.01]">
                    {revealedAnswers.includes(idx) ? (
                        <>
                            <div className="flex-1 flex items-center px-6 text-xl font-bold bg-indigo-900/50 text-white animate-[slideIn_0.3s_ease-out]">
                                {ans.text}
                            </div>
                            <div className="w-20 flex items-center justify-center bg-indigo-600 text-white font-mono font-bold text-xl">
                                {ans.score}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-slate-900/50">
                            <div className="w-full h-full flex items-center justify-center text-slate-700 font-black text-4xl select-none">
                                {idx + 1}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>

        <div className="flex items-center justify-between mb-6 px-4 py-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="text-center">
                 <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Your Score</div>
                 <div className="text-3xl font-mono text-emerald-400 font-black">{score}</div>
            </div>
            <div className="h-10 w-px bg-slate-600"></div>
            <div className="text-center">
                 <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Opponent (Hard)</div>
                 <div className="text-3xl font-mono text-red-400 font-black">{opponentScore}</div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-4">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..." 
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-4 text-xl text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                autoFocus
            />
            <button type="submit" className="bg-indigo-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/50 transition-all">
                BUZZ!
            </button>
        </form>
    </div>
  );
}
