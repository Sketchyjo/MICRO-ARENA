import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { MatchStatus, GameType } from '../types';
import RulesModal from '../components/RulesModal';
import { audioService } from '../services/audioService';

// Mancala board: [0-5] player pits, [6] player store, [7-12] opponent pits, [13] opponent store
const INITIAL_STONES = 4;
const PLAYER_PITS = [0, 1, 2, 3, 4, 5];
const PLAYER_STORE = 6;
const OPPONENT_PITS = [7, 8, 9, 10, 11, 12];
const OPPONENT_STORE = 13;

// AI Constants
const AI_THINK_MIN = 1000;
const AI_THINK_MAX = 2500;

export default function MancalaGame() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setMatchState } = useApp();
    const isSpectator = location.state?.isSpectator || false;

    // Game State
    const [pits, setPits] = useState<number[]>(Array(14).fill(INITIAL_STONES).map((v, i) => i === 6 || i === 13 ? 0 : v));
    const [currentPlayer, setCurrentPlayer] = useState<'local' | 'opponent'>('local');
    const [isAnimating, setIsAnimating] = useState(false);
    const [message, setMessage] = useState(isSpectator ? "Spectating Match..." : "Your Turn");
    const [showRules, setShowRules] = useState(false);
    const [gameOverModal, setGameOverModal] = useState<{
        isOpen: boolean;
        winner: 'local' | 'opponent' | 'draw' | null;
        localScore: number;
        opponentScore: number;
    }>({ isOpen: false, winner: null, localScore: 0, opponentScore: 0 });

    // Animation states
    const [captureEffect, setCaptureEffect] = useState<number | null>(null);
    const [lastMovePit, setLastMovePit] = useState<number | null>(null);

    // Check if game is over
    const checkGameOver = useCallback((currentPits: number[]) => {
        const playerSideEmpty = PLAYER_PITS.every(i => currentPits[i] === 0);
        const opponentSideEmpty = OPPONENT_PITS.every(i => currentPits[i] === 0);

        if (playerSideEmpty || opponentSideEmpty) {
            // Collect remaining stones
            const newPits = [...currentPits];
            PLAYER_PITS.forEach(i => {
                newPits[PLAYER_STORE] += newPits[i];
                newPits[i] = 0;
            });
            OPPONENT_PITS.forEach(i => {
                newPits[OPPONENT_STORE] += newPits[i];
                newPits[i] = 0;
            });

            const localScore = newPits[PLAYER_STORE];
            const opponentScore = newPits[OPPONENT_STORE];

            let winner: 'local' | 'opponent' | 'draw';
            if (localScore > opponentScore) winner = 'local';
            else if (opponentScore > localScore) winner = 'opponent';
            else winner = 'draw';

            if (winner === 'local') audioService.playWin();
            else if (winner === 'opponent') audioService.playLoss();

            setGameOverModal({ isOpen: true, winner, localScore, opponentScore });
            setPits(newPits);
            return true;
        }
        return false;
    }, []);

    // Make a move
    const makeMove = useCallback((pitIndex: number, currentPits: number[], player: 'local' | 'opponent') => {
        const newPits = [...currentPits];
        let stones = newPits[pitIndex];
        newPits[pitIndex] = 0;
        setLastMovePit(pitIndex);

        let currentIndex = pitIndex;
        const playerStore = player === 'local' ? PLAYER_STORE : OPPONENT_STORE;
        const opponentStore = player === 'local' ? OPPONENT_STORE : PLAYER_STORE;

        // Distribute stones
        const distribute = async () => {
            let tempPits = [...newPits];
            let tempStones = stones;
            let tempIndex = currentIndex;

            // Animation loop for distributing stones
            while (tempStones > 0) {
                tempIndex = (tempIndex + 1) % 14;

                // Skip opponent's store
                if (tempIndex === opponentStore) continue;

                tempPits[tempIndex]++;
                tempStones--;

                // Update state for animation
                setPits([...tempPits]);
                await new Promise(resolve => setTimeout(resolve, 150)); // Faster animation
                audioService.playChessMove();
            }

            // Final state after distribution
            currentIndex = tempIndex;

            // Check for extra turn (landed in own store)
            const extraTurn = currentIndex === playerStore;

            // Check for capture (landed in own empty pit)
            let captured = 0;
            const playerPits = player === 'local' ? PLAYER_PITS : OPPONENT_PITS;

            if (!extraTurn && playerPits.includes(currentIndex) && tempPits[currentIndex] === 1) {
                const oppositeIndex = 12 - currentIndex;
                if (tempPits[oppositeIndex] > 0) {
                    captured = tempPits[oppositeIndex] + 1;
                    tempPits[playerStore] += captured;
                    tempPits[currentIndex] = 0;
                    tempPits[oppositeIndex] = 0;

                    setCaptureEffect(currentIndex);
                    audioService.playCapture();
                    setTimeout(() => setCaptureEffect(null), 800);
                }
            }

            setPits(tempPits);

            // Check game over
            if (checkGameOver(tempPits)) return;

            // Determine next player
            if (extraTurn) {
                setMessage(player === 'local'
                    ? (isSpectator ? "Player 1 gets another turn!" : "Extra turn! Go again!")
                    : "Opponent gets another turn!");
            } else {
                setCurrentPlayer(player === 'local' ? 'opponent' : 'local');
                setMessage(player === 'local'
                    ? (isSpectator ? "Player 2's Turn" : "Opponent's Turn")
                    : (isSpectator ? "Player 1's Turn" : "Your Turn"));
            }

            setIsAnimating(false);
        };

        distribute();

    }, [checkGameOver, isSpectator]);

    // --- AI Logic ---

    const evaluateBoard = (pits: number[], player: 'local' | 'opponent'): number => {
        const playerStore = player === 'local' ? PLAYER_STORE : OPPONENT_STORE;
        const opponentStore = player === 'local' ? OPPONENT_STORE : PLAYER_STORE;
        const playerPits = player === 'local' ? PLAYER_PITS : OPPONENT_PITS;

        // 1. Score Difference (Most important)
        let score = (pits[playerStore] - pits[opponentStore]) * 10;

        // 2. Stones on own side (Defensive/Hoarding - slight bonus)
        const myStones = playerPits.reduce((acc, idx) => acc + pits[idx], 0);
        score += myStones * 0.5;

        // 3. Potential Captures & Extra Turns (Lookahead handled by minimax, but static eval helps)
        // This is a simple static eval, minimax does the heavy lifting for lookahead.

        return score;
    };

    const simulateMove = (pits: number[], pitIndex: number, player: 'local' | 'opponent'): {
        newPits: number[],
        extraTurn: boolean,
        gameOver: boolean,
        captured: number
    } => {
        const newPits = [...pits];
        let stones = newPits[pitIndex];
        newPits[pitIndex] = 0;

        let currentIndex = pitIndex;
        const playerStore = player === 'local' ? PLAYER_STORE : OPPONENT_STORE;
        const opponentStore = player === 'local' ? OPPONENT_STORE : PLAYER_STORE;

        while (stones > 0) {
            currentIndex = (currentIndex + 1) % 14;
            if (currentIndex === opponentStore) continue;
            newPits[currentIndex]++;
            stones--;
        }

        const extraTurn = currentIndex === playerStore;
        let captured = 0;

        // Capture logic
        const playerPits = player === 'local' ? PLAYER_PITS : OPPONENT_PITS;
        if (!extraTurn && playerPits.includes(currentIndex) && newPits[currentIndex] === 1) {
            const oppositeIndex = 12 - currentIndex;
            if (newPits[oppositeIndex] > 0) {
                captured = newPits[oppositeIndex] + 1;
                newPits[playerStore] += captured;
                newPits[currentIndex] = 0;
                newPits[oppositeIndex] = 0;
            }
        }

        // Check game over
        const playerSideEmpty = PLAYER_PITS.every(i => newPits[i] === 0);
        const opponentSideEmpty = OPPONENT_PITS.every(i => newPits[i] === 0);
        const gameOver = playerSideEmpty || opponentSideEmpty;

        return { newPits, extraTurn, gameOver, captured };
    };

    const minimax = (pits: number[], depth: number, alpha: number, beta: number, isMaximizing: boolean, player: 'local' | 'opponent'): number => {
        if (depth === 0) return evaluateBoard(pits, player);

        const currentPitsIndices = isMaximizing
            ? (player === 'local' ? PLAYER_PITS : OPPONENT_PITS)
            : (player === 'local' ? OPPONENT_PITS : PLAYER_PITS);

        const currentPlayer = isMaximizing ? player : (player === 'local' ? 'opponent' : 'local');
        const validMoves = currentPitsIndices.filter(i => pits[i] > 0);

        if (validMoves.length === 0) return evaluateBoard(pits, player);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of validMoves) {
                const { newPits, extraTurn, gameOver } = simulateMove(pits, move, currentPlayer);
                let evalVal;
                if (gameOver) {
                    evalVal = evaluateBoard(newPits, player); // Game over state is final
                } else if (extraTurn) {
                    evalVal = minimax(newPits, depth - 1, alpha, beta, true, player); // Keep turn
                } else {
                    evalVal = minimax(newPits, depth - 1, alpha, beta, false, player); // Switch turn
                }
                maxEval = Math.max(maxEval, evalVal);
                alpha = Math.max(alpha, maxEval);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of validMoves) {
                const { newPits, extraTurn, gameOver } = simulateMove(pits, move, currentPlayer);
                let evalVal;
                if (gameOver) {
                    evalVal = evaluateBoard(newPits, player);
                } else if (extraTurn) {
                    evalVal = minimax(newPits, depth - 1, alpha, beta, false, player); // Keep turn (opponent)
                } else {
                    evalVal = minimax(newPits, depth - 1, alpha, beta, true, player); // Switch turn
                }
                minEval = Math.min(minEval, evalVal);
                beta = Math.min(beta, minEval);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    };

    const findBestMove = useCallback((currentPits: number[], player: 'local' | 'opponent'): number => {
        const playerPits = player === 'local' ? PLAYER_PITS : OPPONENT_PITS;
        const validMoves = playerPits.filter(i => currentPits[i] > 0);

        if (validMoves.length === 0) return -1;

        let bestMove = validMoves[0];
        let bestValue = -Infinity;
        const depth = 4; // Increased depth for smarter AI

        // Randomize order of equal moves to avoid predictable patterns
        const shuffledMoves = validMoves.sort(() => Math.random() - 0.5);

        for (const move of shuffledMoves) {
            const { newPits, extraTurn, gameOver, captured } = simulateMove(currentPits, move, player);
            let value: number;

            // Immediate bonus for captures or extra turns to guide the search
            let immediateBonus = 0;
            if (extraTurn) immediateBonus += 5;
            if (captured > 0) immediateBonus += captured * 2;

            if (gameOver) {
                value = evaluateBoard(newPits, player) + 1000; // Prefer winning
            } else if (extraTurn) {
                value = minimax(newPits, depth, -Infinity, Infinity, true, player);
            } else {
                value = minimax(newPits, depth - 1, -Infinity, Infinity, false, player);
            }

            value += immediateBonus;

            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }

        return bestMove;
    }, []);

    // AI Turn
    useEffect(() => {
        if (currentPlayer === 'opponent' && !gameOverModal.isOpen && !isAnimating) {
            setIsAnimating(true);
            const thinkTime = Math.random() * (AI_THINK_MAX - AI_THINK_MIN) + AI_THINK_MIN;

            setTimeout(() => {
                const bestMove = findBestMove(pits, 'opponent');
                if (bestMove !== -1) {
                    makeMove(bestMove, pits, 'opponent');
                } else {
                    setIsAnimating(false);
                }
            }, thinkTime);
        }
    }, [currentPlayer, pits, gameOverModal.isOpen, isAnimating, findBestMove, makeMove]);

    // Spectator Mode
    useEffect(() => {
        if (isSpectator && !gameOverModal.isOpen && !isAnimating) {
            setIsAnimating(true);
            const thinkTime = Math.random() * (AI_THINK_MAX - AI_THINK_MIN) + AI_THINK_MIN;

            setTimeout(() => {
                const bestMove = findBestMove(pits, currentPlayer);
                if (bestMove !== -1) {
                    makeMove(bestMove, pits, currentPlayer);
                } else {
                    setIsAnimating(false);
                }
            }, thinkTime);
        }
    }, [isSpectator, currentPlayer, pits, gameOverModal.isOpen, isAnimating, findBestMove, makeMove]);

    // Handle pit click
    const handlePitClick = (pitIndex: number) => {
        if (isSpectator || gameOverModal.isOpen || isAnimating) return;
        if (currentPlayer !== 'local') {
            audioService.playError();
            return;
        }
        if (!PLAYER_PITS.includes(pitIndex) || pits[pitIndex] === 0) {
            audioService.playError();
            return;
        }

        setIsAnimating(true);
        makeMove(pitIndex, pits, 'local');
    };

    const restartGame = () => {
        setPits(Array(14).fill(INITIAL_STONES).map((v, i) => i === 6 || i === 13 ? 0 : v));
        setCurrentPlayer('local');
        setMessage(isSpectator ? "Spectating Match..." : "Your Turn");
        setGameOverModal({ isOpen: false, winner: null, localScore: 0, opponentScore: 0 });
        setIsAnimating(false);
        setLastMovePit(null);
    };

    // Helper to render stones in a pit
    const renderStones = (count: number) => {
        return Array.from({ length: count }).map((_, i) => {
            // Deterministic pseudo-random positions based on index to keep them stable during re-renders unless count changes
            const seed = i * 1337;
            const r1 = (Math.sin(seed) + 1) / 2;
            const r2 = (Math.cos(seed) + 1) / 2;
            const r3 = (Math.sin(seed * 2) + 1) / 2;

            const left = 50 + (r1 * 50 - 25);
            const top = 50 + (r2 * 50 - 25);
            const rotate = r3 * 360;

            // Marble colors
            const colors = [
                'radial-gradient(circle at 30% 30%, #ff9a9e, #fecfef)', // Pinkish
                'radial-gradient(circle at 30% 30%, #a18cd1, #fbc2eb)', // Purple
                'radial-gradient(circle at 30% 30%, #84fab0, #8fd3f4)', // Teal
                'radial-gradient(circle at 30% 30%, #fccb90, #d57eeb)', // Orange/Purple
                'radial-gradient(circle at 30% 30%, #e0c3fc, #8ec5fc)', // Blue
            ];
            const bg = colors[i % colors.length];

            return (
                <div
                    key={i}
                    className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full shadow-[1px_1px_2px_rgba(0,0,0,0.4)]"
                    style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                        background: bg,
                        boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.2), 2px 2px 4px rgba(0,0,0,0.3)'
                    }}
                />
            );
        });
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center w-full h-full gap-4 py-4 overflow-hidden bg-[#1a1a1a] relative animate-fade-in font-sans">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} gameType={GameType.MANCALA} />

            {/* Game Over Modal */}
            {gameOverModal.isOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#2a1d15] border-4 border-[#8b6d5d] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl transform scale-100 relative overflow-hidden">
                        {/* Wood grain overlay for modal */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")' }}>
                        </div>

                        <div className="relative z-10">
                            <div className="mb-4">
                                {gameOverModal.winner === 'local' && <div className="text-6xl animate-bounce">🏆</div>}
                                {gameOverModal.winner === 'opponent' && <div className="text-6xl animate-pulse">💀</div>}
                                {gameOverModal.winner === 'draw' && <div className="text-6xl">🤝</div>}
                            </div>

                            <h2 className={`text-3xl font-black mb-2 uppercase tracking-wider ${gameOverModal.winner === 'local' ? 'text-amber-400' :
                                gameOverModal.winner === 'opponent' ? 'text-red-400' : 'text-slate-300'
                                }`}>
                                {isSpectator
                                    ? (gameOverModal.winner === 'local' ? 'Player 1 Wins!' : gameOverModal.winner === 'opponent' ? 'Player 2 Wins!' : 'Draw!')
                                    : (gameOverModal.winner === 'local' ? 'You Won!' : gameOverModal.winner === 'opponent' ? 'You Lost' : 'Draw!')
                                }
                            </h2>

                            <div className="flex justify-center gap-8 mb-6">
                                <div className="text-center">
                                    <div className="text-4xl font-black text-amber-400 drop-shadow-md">{gameOverModal.localScore}</div>
                                    <div className="text-xs text-amber-200/60 uppercase tracking-widest">{isSpectator ? 'Player 1' : 'You'}</div>
                                </div>
                                <div className="text-amber-600/50 text-4xl font-light">/</div>
                                <div className="text-center">
                                    <div className="text-4xl font-black text-red-400 drop-shadow-md">{gameOverModal.opponentScore}</div>
                                    <div className="text-xs text-red-200/60 uppercase tracking-widest">{isSpectator ? 'Player 2' : 'Opponent'}</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={restartGame}
                                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-lg transition-all shadow-lg border border-amber-400/30"
                                >
                                    {isSpectator ? "WATCH AGAIN" : "PLAY AGAIN"}
                                </button>
                                <button
                                    onClick={() => navigate('/select')}
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all border border-slate-600"
                                >
                                    GO TO MENU
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header / HUD */}
            <div className="w-full max-w-5xl px-6 flex justify-between items-center z-10">
                {/* Local Player HUD */}
                <div className={`flex items-center gap-4 transition-all duration-300 ${currentPlayer === 'local' ? 'opacity-100 scale-105' : 'opacity-70 scale-100'}`}>
                    <div className={`w-14 h-14 rounded-full border-4 ${currentPlayer === 'local' ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]' : 'border-slate-600'} bg-slate-800 overflow-hidden relative`}>
                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${isSpectator ? "Player1" : "You"}`} alt="You" className="w-full h-full" />
                    </div>
                    <div>
                        <div className={`font-bold text-lg ${currentPlayer === 'local' ? 'text-amber-400' : 'text-slate-400'}`}>{isSpectator ? "Player 1" : "You"}</div>
                        <div className="text-xs text-slate-500 font-mono tracking-wider">TURN: {currentPlayer === 'local' ? 'ACTIVE' : 'WAITING'}</div>
                    </div>
                </div>

                {/* Game Info */}
                <div className="flex flex-col items-center">
                    <div className="text-2xl font-black text-slate-200 tracking-widest uppercase drop-shadow-lg">Mancala</div>
                    <div className={`px-6 py-1 rounded-full text-sm font-bold mt-1 transition-colors duration-300 ${currentPlayer === 'local' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                        {message}
                    </div>
                </div>

                {/* Opponent HUD */}
                <div className={`flex items-center gap-4 transition-all duration-300 ${currentPlayer === 'opponent' ? 'opacity-100 scale-105' : 'opacity-70 scale-100'}`}>
                    <div className="text-right">
                        <div className={`font-bold text-lg ${currentPlayer === 'opponent' ? 'text-red-400' : 'text-slate-400'}`}>{isSpectator ? "Player 2" : "Opponent"}</div>
                        <div className="text-xs text-slate-500 font-mono tracking-wider">TURN: {currentPlayer === 'opponent' ? 'ACTIVE' : 'WAITING'}</div>
                    </div>
                    <div className={`w-14 h-14 rounded-full border-4 ${currentPlayer === 'opponent' ? 'border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.4)]' : 'border-slate-600'} bg-slate-800 overflow-hidden relative`}>
                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${isSpectator ? "Player2" : "Bot"}`} alt="Opponent" className="w-full h-full" />
                    </div>
                </div>
            </div>

            {/* Mancala Board Container */}
            <div className="relative w-full max-w-6xl px-4 flex-1 flex items-center justify-center min-h-[400px]">

                {/* The Board */}
                <div className="relative w-full max-w-5xl aspect-[2.5/1] bg-[#5c4033] rounded-[50px] shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_2px_5px_rgba(255,255,255,0.2),inset_0_-10px_20px_rgba(0,0,0,0.4)] border-b-[12px] border-[#3e2b22] flex items-stretch overflow-hidden">

                    {/* Wood Texture */}
                    <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply"
                        style={{
                            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.5\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
                            backgroundSize: '300px 300px'
                        }}>
                    </div>

                    {/* Hinge / Center Fold */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-2 -translate-x-1/2 bg-[#3e2b22] shadow-[inset_2px_0_5px_rgba(0,0,0,0.5),inset_-2px_0_5px_rgba(0,0,0,0.5)] z-10 flex flex-col justify-center gap-8 py-8">
                        <div className="w-full h-8 bg-[#8b6d5d] rounded-sm shadow-sm opacity-50"></div>
                        <div className="w-full h-8 bg-[#8b6d5d] rounded-sm shadow-sm opacity-50"></div>
                    </div>

                    {/* Left Store Area (Player) */}
                    <div className="w-[15%] h-full flex items-center justify-center p-4 relative z-0">
                        <div className="w-full h-[85%] bg-[#3e2b22] rounded-full shadow-[inset_0_10px_20px_rgba(0,0,0,0.8),0_1px_2px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 flex flex-wrap content-center justify-center p-6 gap-1">
                                {renderStones(pits[PLAYER_STORE])}
                            </div>
                            <div className="absolute bottom-4 font-bold text-[#8b6d5d] text-xs tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">YOU</div>
                            <div className="absolute top-4 font-black text-[#2a1d15] text-2xl opacity-30">{pits[PLAYER_STORE]}</div>
                        </div>
                    </div>

                    {/* Playing Area */}
                    <div className="flex-1 flex flex-col py-6 px-2 z-0">

                        {/* Opponent Pits (Top) */}
                        <div className="flex-1 flex items-center justify-around px-4">
                            {[...OPPONENT_PITS].reverse().map((pitIndex) => (
                                <div key={pitIndex} className="relative group w-full aspect-square max-w-[100px] flex items-center justify-center">
                                    <div className={`w-[85%] h-[85%] bg-[#3e2b22] rounded-full shadow-[inset_0_8px_15px_rgba(0,0,0,0.8),0_1px_1px_rgba(255,255,255,0.05)] flex items-center justify-center relative overflow-hidden transition-all duration-300 ${captureEffect === pitIndex ? 'ring-4 ring-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.4)]' : ''
                                        } ${lastMovePit === pitIndex ? 'ring-2 ring-white/10' : ''}`}>
                                        <div className="absolute inset-0 flex flex-wrap content-center justify-center p-3 gap-0.5">
                                            {renderStones(pits[pitIndex])}
                                        </div>
                                        <div className="absolute -top-8 text-[#8b6d5d] font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">{pits[pitIndex]}</div>
                                    </div>
                                    {/* Pit Label */}
                                    <div className="absolute top-0 text-[10px] text-[#5c4033] font-bold opacity-30">{pitIndex}</div>
                                </div>
                            ))}
                        </div>

                        {/* Player Pits (Bottom) */}
                        <div className="flex-1 flex items-center justify-around px-4">
                            {PLAYER_PITS.map((pitIndex) => (
                                <button
                                    key={pitIndex}
                                    onClick={() => handlePitClick(pitIndex)}
                                    disabled={isSpectator || currentPlayer !== 'local' || pits[pitIndex] === 0 || isAnimating}
                                    className={`relative group w-full aspect-square max-w-[100px] flex items-center justify-center focus:outline-none transition-transform duration-200 ${!isSpectator && currentPlayer === 'local' && pits[pitIndex] > 0 && !isAnimating
                                            ? 'hover:scale-105 cursor-pointer'
                                            : 'cursor-default'
                                        }`}
                                >
                                    <div className={`w-[85%] h-[85%] bg-[#3e2b22] rounded-full shadow-[inset_0_8px_15px_rgba(0,0,0,0.8),0_1px_1px_rgba(255,255,255,0.05)] flex items-center justify-center relative overflow-hidden transition-all ${!isSpectator && currentPlayer === 'local' && pits[pitIndex] > 0 && !isAnimating
                                            ? 'ring-4 ring-amber-500/20 group-hover:ring-amber-400/40 group-hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                                            : ''
                                        } ${captureEffect === pitIndex ? 'ring-4 ring-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.4)]' : ''}`}>

                                        <div className="absolute inset-0 flex flex-wrap content-center justify-center p-3 gap-0.5">
                                            {renderStones(pits[pitIndex])}
                                        </div>

                                        {/* Hover Highlight */}
                                        {!isSpectator && currentPlayer === 'local' && pits[pitIndex] > 0 && !isAnimating && (
                                            <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-8 text-[#8b6d5d] font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">{pits[pitIndex]}</div>
                                </button>
                            ))}
                        </div>

                    </div>

                    {/* Right Store Area (Opponent) */}
                    <div className="w-[15%] h-full flex items-center justify-center p-4 relative z-0">
                        <div className="w-full h-[85%] bg-[#3e2b22] rounded-full shadow-[inset_0_10px_20px_rgba(0,0,0,0.8),0_1px_2px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 flex flex-wrap content-center justify-center p-6 gap-1">
                                {renderStones(pits[OPPONENT_STORE])}
                            </div>
                            <div className="absolute bottom-4 font-bold text-[#8b6d5d] text-xs tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">OPPONENT</div>
                            <div className="absolute top-4 font-black text-[#2a1d15] text-2xl opacity-30">{pits[OPPONENT_STORE]}</div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Rules Button */}
            <button
                onClick={() => setShowRules(true)}
                className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 flex items-center justify-center transition-all backdrop-blur-sm"
            >
                ?
            </button>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in;
        }
      `}</style>
        </div>
    );
}
