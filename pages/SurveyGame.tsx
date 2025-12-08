import React, { useState, useEffect } from 'react';
import { GameType } from '../types';
import { useApp } from '../App';
import { useNavigate, useLocation } from 'react-router-dom';
import RulesModal from '../components/RulesModal';
import { audioService } from '../services/audioService';
import { useGameFlow } from '../hooks/useGameFlow';
import MatchmakingModal from '../components/MatchmakingModal';
import GameHUD from '../components/GameHUD';
import ScoreSubmissionModal from '../components/ScoreSubmissionModal';
import { websocketClient } from '../services/websocketClient';

interface Answer {
    text: string;
    points: number;
}

interface Question {
    question: string;
    answers: Answer[];
}

export default function SurveyGame() {
    const { wallet } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const isSpectator = location.state?.isSpectator || false;

    // Production-ready game flow
    const { gameState, sendMove, resignGame: handleResignGame } = useGameFlow();
    const [showMatchmaking, setShowMatchmaking] = useState(!isSpectator);
    const [showScoreSubmission, setShowScoreSubmission] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [gameStarted, setGameStarted] = useState(isSpectator);

    // Game State
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [revealedAnswers, setRevealedAnswers] = useState<string[]>([]);
    const [input, setInput] = useState("");
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [myStrikes, setMyStrikes] = useState(0);
    const [opponentStrikes, setOpponentStrikes] = useState(0);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [timer, setTimer] = useState(60);
    const [showRules, setShowRules] = useState(false);

    // Redirect if no wallet
    useEffect(() => {
        if (!wallet) navigate('/');
    }, [wallet, navigate]);

    // Handle match found
    useEffect(() => {
        if (gameState?.status === 'MATCHED' && !gameStarted) {
            console.log('🎮 Survey match found, starting game');
            setShowMatchmaking(false);
            setGameStarted(true);
            setTimeout(() => initializeFromServer(), 100);
        }
    }, [gameState?.status, gameStarted]);

    // Listen for game:start event
    useEffect(() => {
        if (!gameState?.matchId) return;

        const handleGameStart = (data: any) => {
            console.log('🎮 Survey game start:', data);
            if (data.gameState) {
                (window as any).__serverGameState = data.gameState;
                (window as any).__isPlayer1 = gameState?.isPlayer1;
                if (!gameStarted) {
                    setGameStarted(true);
                    setTimeout(() => initializeFromServer(), 100);
                }
            }
        };

        websocketClient.socket?.on('game:start', handleGameStart);
        return () => { websocketClient.socket?.off('game:start', handleGameStart); };
    }, [gameState?.matchId, gameStarted]);

    // Initialize from server state
    const initializeFromServer = () => {
        const serverState = (window as any).__serverGameState;
        const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;

        if (serverState?.currentQuestion) {
            console.log('🎮 Using server survey state:', serverState);
            setCurrentQuestion(serverState.currentQuestion);
            setRevealedAnswers(serverState.revealedAnswers || []);
            setMyScore(isPlayer1 ? serverState.player1Score : serverState.player2Score);
            setOpponentScore(isPlayer1 ? serverState.player2Score : serverState.player1Score);
            setMyStrikes(isPlayer1 ? serverState.player1Strikes : serverState.player2Strikes);
            setOpponentStrikes(isPlayer1 ? serverState.player2Strikes : serverState.player1Strikes);
            setIsMyTurn(serverState.currentPlayer === (isPlayer1 ? 1 : 2));
            
            audioService.speak("Survey Clash! " + serverState.currentQuestion.question);
            delete (window as any).__serverGameState;
        }
    };

    // Listen for opponent moves and state updates
    useEffect(() => {
        if (!gameState?.matchId) return;

        const handleStateUpdate = (data: any) => {
            console.log('📥 Survey state update:', data);
            if (!data.gameState) return;

            const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;
            const state = data.gameState;
            
            // Update all state from server
            setRevealedAnswers(state.revealedAnswers || []);
            setMyScore(isPlayer1 ? state.player1Score : state.player2Score);
            setOpponentScore(isPlayer1 ? state.player2Score : state.player1Score);
            setMyStrikes(isPlayer1 ? state.player1Strikes : state.player2Strikes);
            setOpponentStrikes(isPlayer1 ? state.player2Strikes : state.player1Strikes);
            setIsMyTurn(state.currentPlayer === (isPlayer1 ? 1 : 2));

            // Show feedback for last guess
            if (state.lastGuess) {
                const wasMyGuess = state.currentPlayer !== (isPlayer1 ? 1 : 2); // Turn switched, so it was previous player
                
                if (state.lastGuess.correct) {
                    audioService.playBuzzCorrect();
                    audioService.speak("Survey says... " + state.lastGuess.answer);
                    setNotification(`${wasMyGuess ? 'You' : 'Opponent'} revealed: "${state.lastGuess.answer}" (+${state.lastGuess.points})`);
                } else {
                    audioService.playBuzzWrong();
                    setNotification(`${wasMyGuess ? 'You' : 'Opponent'} guessed: "${state.lastGuess.guess}" ❌`);
                }
                setTimeout(() => setNotification(null), 3000);
            }
        };

        const handleGameComplete = (data: any) => {
            console.log('🏆 Survey game complete:', data);
            const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;
            const score = isPlayer1 ? data.scores?.player1 : data.scores?.player2;
            const opponentScore = isPlayer1 ? data.scores?.player2 : data.scores?.player1;
            
            setFinalScore(score || myScore);
            audioService.speak(score > opponentScore ? "You win!" : "Game over!");
            setShowScoreSubmission(true);
        };

        websocketClient.socket?.on('game:state_update', handleStateUpdate);
        websocketClient.socket?.on('game:complete', handleGameComplete);

        return () => {
            websocketClient.socket?.off('game:state_update', handleStateUpdate);
            websocketClient.socket?.off('game:complete', handleGameComplete);
        };
    }, [gameState?.matchId, gameState?.isPlayer1, myScore]);

    // Timer countdown
    useEffect(() => {
        if (!gameStarted || timer <= 0) return;
        const t = setInterval(() => setTimer(p => p - 1), 1000);
        return () => clearInterval(t);
    }, [gameStarted, timer]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !isMyTurn || !gameState?.matchId) return;

        console.log('📤 Sending survey guess:', input);
        sendMove({ guess: input.trim() });
        setInput("");
    };

    return (
        <>
            <MatchmakingModal
                gameType={GameType.SURVEY}
                isOpen={showMatchmaking}
                onClose={() => navigate('/select')}
                onMatchFound={(matchId) => {
                    console.log('Match found:', matchId);
                    setShowMatchmaking(false);
                }}
            />

            {gameState?.status === 'ACTIVE' && (
                <GameHUD
                    gameState={gameState}
                    timeLeft={timer}
                    onResign={handleResignGame}
                />
            )}

            <ScoreSubmissionModal
                isOpen={showScoreSubmission}
                score={finalScore}
                onClose={() => setShowScoreSubmission(false)}
                onComplete={() => navigate('/results')}
            />

            <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full py-8 relative">
                <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} gameType={GameType.SURVEY} />

                <button
                    onClick={() => setShowRules(true)}
                    className="absolute top-0 right-0 w-8 h-8 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-500 flex items-center justify-center transition-all z-20"
                >?</button>

                <div className="text-center mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <div className={`text-sm font-bold ${isMyTurn ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {isMyTurn ? '🟢 YOUR TURN' : '⏳ OPPONENT\'S TURN'}
                        </div>
                        <div className={`text-2xl font-black font-mono ${timer < 10 ? 'text-red-500 animate-ping' : 'text-white'}`}>
                            {timer}s
                        </div>
                    </div>

                    {notification && (
                        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-slate-800/90 border border-indigo-500 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-[slideIn_0.3s_ease-out] flex items-center gap-3">
                            <span className="text-2xl">🤖</span>
                            <span className="font-bold">{notification}</span>
                        </div>
                    )}

                    <div className="glass-panel p-6 rounded-xl border-2 border-indigo-500/50 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
                        <h1 className="text-3xl font-bold">{currentQuestion?.question || "Waiting for question..."}</h1>
                        {currentQuestion && (
                            <button
                                onClick={() => audioService.speak(currentQuestion.question)}
                                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 uppercase font-bold tracking-widest"
                            >🔊 Replay Question</button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-8">
                    {currentQuestion?.answers.map((ans, idx) => (
                        <div key={idx} className="h-16 bg-slate-800 border border-slate-700 rounded-lg flex overflow-hidden relative transition-all duration-300 transform hover:scale-[1.01]">
                            {revealedAnswers.includes(ans.text) ? (
                                <>
                                    <div className="flex-1 flex items-center px-6 text-xl font-bold bg-indigo-900/50 text-white animate-[slideIn_0.3s_ease-out]">
                                        {ans.text}
                                    </div>
                                    <div className="w-20 flex items-center justify-center bg-indigo-600 text-white font-mono font-bold text-xl">
                                        {ans.points}
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
                        <div className="text-3xl font-mono text-emerald-400 font-black">{myScore}</div>
                        <div className="text-red-400 text-xs">❌ {myStrikes}/3</div>
                    </div>
                    <div className="h-10 w-px bg-slate-600"></div>
                    <div className="text-center">
                        <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Opponent</div>
                        <div className="text-3xl font-mono text-red-400 font-black">{opponentScore}</div>
                        <div className="text-red-400 text-xs">❌ {opponentStrikes}/3</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex gap-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isMyTurn ? "Type your answer..." : "Wait for your turn..."}
                        disabled={!isMyTurn}
                        className={`flex-1 bg-slate-800 border rounded-lg px-4 py-4 text-xl text-white focus:outline-none shadow-inner ${
                            isMyTurn ? 'border-emerald-500 focus:border-emerald-400' : 'border-slate-600 opacity-50'
                        }`}
                        autoFocus
                    />
                    <button 
                        type="submit" 
                        disabled={!isMyTurn}
                        className={`px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all ${
                            isMyTurn 
                                ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/50' 
                                : 'bg-slate-600 cursor-not-allowed'
                        }`}
                    >BUZZ!</button>
                </form>
            </div>
        </>
    );
}
