import React, { useState, useEffect } from 'react';
import { gameEngine } from '../services/gameEngine';
import { SurveyQuestion, MatchStatus } from '../types';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';

export default function SurveyGame() {
  const { setMatchState } = useApp();
  const navigate = useNavigate();
  const [questions] = useState(gameEngine.getSurveyQuestions());
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);

  const currentQ = questions[currentQIndex];

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const matchIndex = currentQ.answers.findIndex(
          a => a.text.toLowerCase().includes(input.toLowerCase())
      );

      if (matchIndex >= 0 && !revealedAnswers.includes(matchIndex)) {
          setRevealedAnswers(prev => [...prev, matchIndex]);
          setScore(s => s + currentQ.answers[matchIndex].score);
      }
      setInput("");

      // Check if round complete
      if (revealedAnswers.length + 1 === currentQ.answers.length) {
          setTimeout(() => {
            if (currentQIndex + 1 < questions.length) {
                setCurrentQIndex(prev => prev + 1);
                setRevealedAnswers([]);
            } else {
                setMatchState(s => ({ ...s, status: MatchStatus.REVEALING, winner: 'local' }));
                navigate('/results');
            }
          }, 1000);
      }
  };

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full py-8">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-indigo-400 mb-2">ROUND {currentQIndex + 1}</h2>
            <div className="glass-panel p-6 rounded-xl border-2 border-indigo-500/50">
                <h1 className="text-3xl font-bold">{currentQ.text}</h1>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
            {currentQ.answers.map((ans, idx) => (
                <div key={idx} className="h-16 bg-slate-800 border border-slate-700 rounded-lg flex overflow-hidden relative">
                    {revealedAnswers.includes(idx) ? (
                        <>
                            <div className="flex-1 flex items-center px-6 text-xl font-bold bg-indigo-900/50 text-white">
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

        <div className="flex items-center justify-between mb-4">
            <div className="text-xl font-mono text-emerald-400">SCORE: {score}</div>
            <div className="text-xl font-mono text-red-400">OPPONENT: {Math.floor(score * 0.8)}</div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-4">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..." 
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                autoFocus
            />
            <button type="submit" className="bg-indigo-600 px-8 py-3 rounded-lg font-bold hover:bg-indigo-700">
                BUZZ
            </button>
        </form>
    </div>
  );
}
