import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { MatchStatus } from '../types';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

// A small subset of valid words for demo purposes
const WORDS = [
    "ARENA", "BLOCK", "CHAIN", "DRAFT", "EAGLE", "FLAME", "GHOST", "HOUSE",
    "IMAGE", "JOKER", "KNIFE", "LEMON", "MAGIC", "NIGHT", "OCEAN", "PIANO",
    "QUEEN", "RADIO", "SNAKE", "TIGER", "UNITY", "VOICE", "WATER", "YOUTH", "ZEBRA"
];

export default function WordleGame() {
    const navigate = useNavigate();
    const { matchState, updateStatus, setMatchState } = useApp();

    const [targetWord, setTargetWord] = useState("ARENA");
    const [guesses, setGuesses] = useState<string[]>([]);
    const [currentGuess, setCurrentGuess] = useState('');
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [shakeRow, setShakeRow] = useState<number | null>(null);

    // Opponent Simulation
    const [opponentGuesses, setOpponentGuesses] = useState<string[]>([]); // Track opponent's "guesses" (just colors)

    // Initialize Game
    useEffect(() => {
        // Pick a random word
        const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        setTargetWord(randomWord);
    }, []);

    // AI Opponent Logic
    useEffect(() => {
        if (!gameOver && !matchState.isSpectator) {
            const interval = setInterval(() => {
                setOpponentGuesses(prev => {
                    if (prev.length < MAX_GUESSES && Math.random() > 0.6) {
                        // Simulate a guess result (G=Green, Y=Yellow, X=Gray)
                        // As game progresses, AI gets better
                        const turn = prev.length;
                        let result = "";

                        if (turn >= 4 && Math.random() > 0.7) {
                            result = "GGGGG"; // Win
                            // AI Wins
                            endGame(false);
                            setGameOver(true);
                        } else {
                            // Random pattern based on turn
                            for (let i = 0; i < 5; i++) {
                                const r = Math.random();
                                if (r > 0.8 - (turn * 0.1)) result += "G";
                                else if (r > 0.5) result += "Y";
                                else result += "X";
                            }
                            if (result === "GGGGG") result = "GGGGX"; // Prevent accidental early win
                        }
                        return [...prev, result];
                    }
                    return prev;
                });
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [gameOver]);

    const handleKey = (key: string) => {
        if (gameOver) return;

        if (key === 'ENTER') {
            if (currentGuess.length !== WORD_LENGTH) {
                triggerShake();
                return;
            }

            // Validate word (simple check if in our list, or just allow it for fun if list is small)
            // For this demo, we'll accept any 5 letter string to avoid frustration with small dictionary

            const newGuesses = [...guesses, currentGuess];
            setGuesses(newGuesses);
            setCurrentGuess('');

            if (currentGuess === targetWord) {
                setWon(true);
                setGameOver(true);
                endGame(true);
            } else if (newGuesses.length >= MAX_GUESSES) {
                setGameOver(true);
                endGame(false);
            }
        } else if (key === 'BACKSPACE') {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else {
            if (currentGuess.length < WORD_LENGTH) {
                setCurrentGuess(prev => prev + key);
            }
        }
    };

    const triggerShake = () => {
        setShakeRow(guesses.length);
        setTimeout(() => setShakeRow(null), 500);
    };

    // Listen for physical keyboard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameOver) return;
            const key = e.key.toUpperCase();
            if (key === 'ENTER' || key === 'BACKSPACE') {
                handleKey(key);
            } else if (/^[A-Z]$/.test(key)) {
                handleKey(key);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentGuess, guesses, gameOver]);

    const endGame = (isWin: boolean) => {
        // Prevent multiple calls
        if (matchState.status === MatchStatus.COMPLETED) return;

        setTimeout(() => {
            updateStatus(MatchStatus.COMPLETED);
            setMatchState(prev => ({
                ...prev,
                winner: isWin ? 'local' : 'opponent',
                players: {
                    ...prev.players,
                    local: { ...prev.players.local, score: isWin ? 1 : 0 },
                    opponent: { ...prev.players.opponent, score: isWin ? 1 : 0 } // Fix: Opponent gets point if they win
                }
            }));
            navigate('/results');
        }, 3000);
    };

    const getLetterStatus = (letter: string, index: number, word: string) => {
        if (word[index] === letter) return 'bg-emerald-500 border-emerald-500 text-white';
        if (targetWord.includes(letter)) return 'bg-yellow-500 border-yellow-500 text-white';
        return 'bg-slate-700 border-slate-700 text-slate-300';
    };

    const getKeyStatus = (key: string) => {
        let status = 'bg-slate-700 hover:bg-slate-600 text-slate-200';

        // Check if key has been used and what its best status is
        for (const guess of guesses) {
            for (let i = 0; i < WORD_LENGTH; i++) {
                if (guess[i] === key) {
                    if (targetWord[i] === key) return 'bg-emerald-500 text-white';
                    if (targetWord.includes(key) && status !== 'bg-emerald-500 text-white') status = 'bg-yellow-500 text-white';
                    if (!targetWord.includes(key) && status !== 'bg-emerald-500 text-white' && status !== 'bg-yellow-500 text-white') status = 'bg-slate-800 opacity-40 text-slate-500';
                }
            }
        }
        return status;
    };

    const keys = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-4xl mx-auto p-4">

            <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start justify-center w-full">

                {/* Main Game Area */}
                <div className="flex flex-col items-center w-full max-w-sm">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold text-white mb-1 tracking-widest">WORDLE DUEL</h2>
                        <p className="text-xs text-slate-400 font-mono">GUESS THE WORD BEFORE YOUR OPPONENT</p>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-rows-6 gap-2 mb-8">
                        {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => {
                            const guess = guesses[rowIndex] || (rowIndex === guesses.length ? currentGuess : '');
                            const isSubmitted = rowIndex < guesses.length;
                            const isShake = shakeRow === rowIndex;

                            return (
                                <div key={rowIndex} className={`grid grid-cols-5 gap-2 ${isShake ? 'animate-shake' : ''}`}>
                                    {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
                                        const letter = guess[colIndex] || '';
                                        const statusClass = isSubmitted
                                            ? getLetterStatus(letter, colIndex, guess)
                                            : letter ? 'border-slate-400 bg-slate-800/50 text-white' : 'border-slate-800 bg-slate-900/30';

                                        // Staggered flip animation
                                        const animationDelay = isSubmitted ? `${colIndex * 150}ms` : '0ms';
                                        const animationClass = isSubmitted ? 'animate-flip' : letter ? 'animate-pop' : '';

                                        return (
                                            <div
                                                key={colIndex}
                                                style={{ animationDelay }}
                                                className={`w-12 h-12 sm:w-14 sm:h-14 border-2 flex items-center justify-center text-2xl font-bold rounded uppercase select-none transition-colors duration-500 ${statusClass} ${animationClass}`}
                                            >
                                                {letter}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {/* Keyboard */}
                    <div className="w-full flex flex-col gap-2">
                        {keys.map((row, i) => (
                            <div key={i} className="flex justify-center gap-1">
                                {row.map(key => (
                                    <button
                                        key={key}
                                        onClick={() => handleKey(key)}
                                        className={`h-12 rounded font-bold text-sm transition-all active:scale-95 ${key === 'ENTER' || key === 'BACKSPACE' ? 'px-3 text-xs' : 'flex-1'
                                            } ${getKeyStatus(key)}`}
                                    >
                                        {key === 'BACKSPACE' ? '⌫' : key}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Opponent View (Mini Grid) */}
                <div className="hidden md:flex flex-col items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="mb-4 text-center">
                        <div className="text-sm font-bold text-slate-400 mb-1">OPPONENT</div>
                        <div className="text-xs text-slate-600 font-mono">PLAYER_239</div>
                    </div>

                    <div className="grid grid-rows-6 gap-1.5 opacity-80">
                        {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => {
                            const guessPattern = opponentGuesses[rowIndex] || "";

                            return (
                                <div key={rowIndex} className="grid grid-cols-5 gap-1.5">
                                    {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
                                        let colorClass = "bg-slate-800 border border-slate-700";
                                        if (guessPattern) {
                                            const char = guessPattern[colIndex];
                                            if (char === 'G') colorClass = "bg-emerald-500 border-emerald-500";
                                            else if (char === 'Y') colorClass = "bg-yellow-500 border-yellow-500";
                                            else if (char === 'X') colorClass = "bg-slate-700 border-slate-600";
                                        }

                                        return (
                                            <div
                                                key={colIndex}
                                                className={`w-6 h-6 rounded-sm transition-colors duration-300 ${colorClass}`}
                                            ></div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            <style>{`
                @keyframes flip {
                    0% { transform: rotateX(0); }
                    50% { transform: rotateX(90deg); }
                    100% { transform: rotateX(0); }
                }
                .animate-flip {
                    animation: flip 0.6s ease-in-out backwards;
                }
                @keyframes pop {
                    0% { transform: scale(0.8); opacity: 0; }
                    40% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-pop {
                    animation: pop 0.1s ease-in-out forwards;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
}
