import React, { useState, useEffect } from 'react';
import { gameEngine } from '../services/gameEngine';
import { SurveyQuestion, MatchStatus, GameType } from '../types';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import RulesModal from '../components/RulesModal';
import { audioService } from '../services/audioService';

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
    const [botGuessedIndices, setBotGuessedIndices] = useState<number[]>([]);
    const [notification, setNotification] = useState<string | null>(null);

    // Rules Modal
    const [showRules, setShowRules] = useState(false);

    const currentQ = questions[currentQIndex];

    // Game Intro Speech
    useEffect(() => {
        // Small delay to allow voices to load
        const t = setTimeout(() => {
            audioService.speak("Welcome to Survey Clash! I'm your host. Let's play! First Question.");
        }, 500);
        return () => clearTimeout(t);
    }, []);

    // Speak Question when it changes
    useEffect(() => {
        // Delay slightly so it doesn't overlap with the "Welcome" message on first load if timing is tight,
        // or provides a breath between rounds.
        const timeout = setTimeout(() => {
            audioService.speak(currentQ.text);
        }, 1500);

        return () => {
            clearTimeout(timeout);
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        }
    }, [currentQ]);

    // Global Timer
    useEffect(() => {
        if (timer <= 0) {
            handleGameOver();
            return;
        }
        const t = setInterval(() => setTimer(p => p - 1), 1000);
        return () => clearInterval(t);
    }, [timer]);

    // Realistic Bot - Simulates Human Guessing
    useEffect(() => {
        if (timer <= 0) return;

        // Random thinking time between 3-8 seconds
        const thinkTime = Math.random() * 5000 + 3000;

        const timeout = setTimeout(() => {
            // Check available answers (that neither player nor bot has found yet)
            // actually, bot should be able to guess things player hasn't found.
            // And we don't want bot to guess things it already guessed.
            const unrevealed = currentQ.answers
                .map((a, i) => ({ ...a, index: i }))
                .filter(a => !revealedAnswers.includes(a.index) && !botGuessedIndices.includes(a.index));

            if (unrevealed.length > 0) {
                // Probability Logic:
                // Calculate total score of remaining answers to weight probability
                const totalScore = unrevealed.reduce((acc, a) => acc + a.score, 0);

                // Roll for a target answer based on popularity
                // Popular answers (higher score) are more likely to be guessed
                const roll = Math.random() * totalScore;
                let current = 0;
                let selected = unrevealed[0];

                for (const ans of unrevealed) {
                    current += ans.score;
                    if (roll <= current) {
                        selected = ans;
                        break;
                    }
                }

                // Accuracy Check: 70% chance to get it right if selected
                // This simulates "knowing" the answer vs just thinking
                if (Math.random() < 0.7) {
                    // Bot Guesses Correctly
                    // audioService.playBuzzCorrect(); // Don't play main buzz to avoid confusion
                    setBotGuessedIndices(prev => [...prev, selected.index]);
                    setOpponentScore(prev => prev + selected.score);
                    setNotification(`Opponent guessed: ${selected.text}!`);

                    // Clear notification after 2s
                    setTimeout(() => setNotification(null), 2000);
                } else {
                    // Bot Guesses Wrong (or doesn't guess)
                    // 30% chance to buzz wrong to show activity
                    if (Math.random() < 0.5) {
                        audioService.playBuzzWrong();
                        setNotification("Opponent guessed wrong!");
                        setTimeout(() => setNotification(null), 2000);
                    }
                }
            }
        }, thinkTime);

        return () => clearTimeout(timeout);
    }, [timer, revealedAnswers, currentQIndex, botGuessedIndices]); // Re-run after every state change to schedule next think

    const handleGameOver = () => {
        const winner = score > opponentScore ? 'local' : (score < opponentScore ? 'opponent' : 'draw');

        if (winner === 'local') audioService.speak("Game Over! You are the champion!");
        else audioService.speak("Game Over! The opponent takes it this time.");

        setMatchState(s => ({ ...s, status: MatchStatus.REVEALING, winner }));
        navigate('/results');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const matchIndex = currentQ.answers.findIndex(
            a => a.text.toLowerCase().includes(input.toLowerCase())
        );

        if (matchIndex >= 0 && !revealedAnswers.includes(matchIndex)) {
            // Correct Answer
            audioService.playBuzzCorrect();
            audioService.speak("Survey says... " + currentQ.answers[matchIndex].text + "!");
            setRevealedAnswers(prev => [...prev, matchIndex]);
            setScore(s => s + currentQ.answers[matchIndex].score);
            setInput("");
        } else {
            // Wrong Answer
            audioService.playBuzzWrong();
            setInput("");
        }

        // Check if round complete (all revealed)
        if (revealedAnswers.length + 1 >= currentQ.answers.length) {
            setTimeout(() => {
                if (currentQIndex + 1 < questions.length) {
                    audioService.speak("Clear the board! Next Question!");
                    setCurrentQIndex(prev => prev + 1);
                    setRevealedAnswers([]);
                    setBotGuessedIndices([]);
                } else {
                    handleGameOver();
                }
            }, 3000); // Longer delay to allow "Survey says" speech to finish
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

                {/* Notification Toast */}
                {notification && (
                    <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-slate-800/90 border border-indigo-500 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-[slideIn_0.3s_ease-out] flex items-center gap-3">
                        <span className="text-2xl">🤖</span>
                        <span className="font-bold">{notification}</span>
                    </div>
                )}

                <div className="glass-panel p-6 rounded-xl border-2 border-indigo-500/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
                    <h1 className="text-3xl font-bold">{currentQ.text}</h1>
                    <button
                        onClick={() => audioService.speak(currentQ.text)}
                        className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 uppercase font-bold tracking-widest"
                    >
                        🔊 Replay Question
                    </button>
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