import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { MatchStatus, GameType } from '../types';
import { useGameFlow } from '../hooks/useGameFlow';
import MatchmakingModal from '../components/MatchmakingModal';
import GameHUD from '../components/GameHUD';
import ScoreSubmissionModal from '../components/ScoreSubmissionModal';
import { websocketClient } from '../services/websocketClient';
import { audioService } from '../services/audioService';

const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER_1 = 1; // Local
const PLAYER_2 = 2; // Opponent

export default function Connect4Game() {
    const navigate = useNavigate();
    const location = useLocation();
    const { matchState, updateStatus, setMatchState } = useApp();
    const isSpectator = location.state?.isSpectator || false;

    // Production game flow
    const { gameState, sendMove, resignGame: handleResignGame } = useGameFlow();
    const [showMatchmaking, setShowMatchmaking] = useState(!isSpectator);
    const [showScoreSubmission, setShowScoreSubmission] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [gameStarted, setGameStarted] = useState(isSpectator);

    const [board, setBoard] = useState<number[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY)));
    const [currentPlayer, setCurrentPlayer] = useState<number>(PLAYER_1);
    const [winner, setWinner] = useState<number | null>(null);
    const [winningCells, setWinningCells] = useState<[number, number][]>([]);
    const [isDropping, setIsDropping] = useState(false);
    const [animatingCol, setAnimatingCol] = useState<number | null>(null);

    // WebSocket synchronization
    useEffect(() => {
        if (!gameState?.matchId) return;

        const handleStateUpdate = (data: any) => {
            console.log('📥 Connect4 state update:', data);
            if (!data.gameState?.board) return;

            const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;
            
            // Sync board state from server
            setBoard(data.gameState.board);
            
            // Update turn
            const serverTurn = data.gameState.currentPlayer;
            const myPlayer = isPlayer1 ? PLAYER_1 : PLAYER_2;
            setCurrentPlayer(serverTurn);
            
            setIsDropping(false);
            audioService.playChessMove();
            
            // Check for winner
            if (data.gameState.winner !== null) {
                const winnerPlayer = data.gameState.winner;
                setWinner(winnerPlayer);
            }
        };

        const handleGameComplete = (data: any) => {
            console.log('🏆 Connect4 game complete:', data);
            const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;
            const myScore = isPlayer1 ? data.scores?.player1 : data.scores?.player2;
            const opponentScore = isPlayer1 ? data.scores?.player2 : data.scores?.player1;
            
            setFinalScore(myScore);
            if (myScore > opponentScore) audioService.playWin();
            else if (myScore < opponentScore) audioService.playLoss();
            
            setTimeout(() => setShowScoreSubmission(true), 2000);
        };

        websocketClient.socket?.on('game:state_update', handleStateUpdate);
        websocketClient.socket?.on('game:complete', handleGameComplete);

        return () => {
            websocketClient.socket?.off('game:state_update', handleStateUpdate);
            websocketClient.socket?.off('game:complete', handleGameComplete);
        };
    }, [gameState?.matchId, gameState?.isPlayer1]);

    // Handle match found - initialize from server state
    useEffect(() => {
        if (gameState?.status === 'MATCHED' && !gameStarted) {
            setShowMatchmaking(false);
            setGameStarted(true);
            
            const serverState = (window as any).__serverGameState;
            const isPlayer1 = (window as any).__isPlayer1;
            
            if (serverState?.board) {
                setBoard(serverState.board);
                setCurrentPlayer(serverState.currentPlayer);
            }
        }
    }, [gameState?.status, gameStarted]);

    // AI Opponent Logic - only in legacy mode
    useEffect(() => {
        if (gameState?.matchId) return; // Skip AI in production mode
        if (currentPlayer === PLAYER_2 && !winner && !matchState.isSpectator) {
            const timer = setTimeout(() => {
                makeAiMove();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [currentPlayer, winner, gameState?.matchId]);

    const makeAiMove = () => {
        // 1. WIN: Check for winning move
        for (let c = 0; c < COLS; c++) {
            if (canPlay(c)) {
                const tempBoard = JSON.parse(JSON.stringify(board));
                dropPiece(tempBoard, c, PLAYER_2);
                if (checkWin(tempBoard, PLAYER_2)) {
                    handleDrop(c);
                    return;
                }
            }
        }

        // 2. BLOCK: Check for opponent winning move
        for (let c = 0; c < COLS; c++) {
            if (canPlay(c)) {
                const tempBoard = JSON.parse(JSON.stringify(board));
                dropPiece(tempBoard, c, PLAYER_1);
                if (checkWin(tempBoard, PLAYER_1)) {
                    handleDrop(c);
                    return;
                }
            }
        }

        // 3. STRATEGY: Prefer center columns and setting up 3-in-a-row
        const scores = Array(COLS).fill(0);
        for (let c = 0; c < COLS; c++) {
            if (!canPlay(c)) {
                scores[c] = -1000;
                continue;
            }

            // Center preference
            const distFromCenter = Math.abs(c - 3);
            scores[c] += (3 - distFromCenter) * 2;

            // Look ahead (very simple)
            const tempBoard = JSON.parse(JSON.stringify(board));
            const r = dropPiece(tempBoard, c, PLAYER_2);

            // Check for 3-in-a-row connections
            if (checkConnected(tempBoard, r, c, PLAYER_2) >= 3) scores[c] += 5;

            // Avoid giving opponent a win
            if (r > 0) { // If we drop here, can opponent win on top?
                tempBoard[r - 1][c] = PLAYER_1; // Simulate opponent move on top
                if (checkWin(tempBoard, PLAYER_1)) scores[c] -= 50;
            }
        }

        // Pick best move
        let bestCol = 3;
        let maxScore = -10000;
        const validCols = [];

        for (let c = 0; c < COLS; c++) {
            if (scores[c] > maxScore) {
                maxScore = scores[c];
                bestCol = c;
                validCols.length = 0; // Clear ties
                validCols.push(c);
            } else if (scores[c] === maxScore) {
                validCols.push(c);
            }
        }

        // Randomize if ties
        if (validCols.length > 0) {
            bestCol = validCols[Math.floor(Math.random() * validCols.length)];
        }

        handleDrop(bestCol);
    };

    const checkConnected = (boardState: number[][], r: number, c: number, player: number) => {
        // Simplified heuristic: just check max connected in any direction from this point
        // This isn't perfect but helps the AI prefer clustering
        let maxConn = 0;
        // Horizontal
        let count = 0;
        for (let i = Math.max(0, c - 3); i <= Math.min(COLS - 1, c + 3); i++) {
            if (boardState[r][i] === player) count++; else count = 0;
            maxConn = Math.max(maxConn, count);
        }
        // Vertical
        count = 0;
        for (let i = Math.max(0, r - 3); i <= Math.min(ROWS - 1, r + 3); i++) {
            if (boardState[i][c] === player) count++; else count = 0;
            maxConn = Math.max(maxConn, count);
        }
        return maxConn;
    }

    const canPlay = (col: number) => {
        return board[0][col] === EMPTY;
    };

    const dropPiece = (boardState: number[][], col: number, player: number) => {
        for (let r = ROWS - 1; r >= 0; r--) {
            if (boardState[r][col] === EMPTY) {
                boardState[r][col] = player;
                return r;
            }
        }
        return -1;
    };

    const checkWin = (boardState: number[][], player: number): [number, number][] | null => {
        // Horizontal
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c <= COLS - 4; c++) {
                if (
                    boardState[r][c] === player &&
                    boardState[r][c + 1] === player &&
                    boardState[r][c + 2] === player &&
                    boardState[r][c + 3] === player
                ) {
                    return [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]];
                }
            }
        }

        // Vertical
        for (let r = 0; r <= ROWS - 4; r++) {
            for (let c = 0; c < COLS; c++) {
                if (
                    boardState[r][c] === player &&
                    boardState[r + 1][c] === player &&
                    boardState[r + 2][c] === player &&
                    boardState[r + 3][c] === player
                ) {
                    return [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]];
                }
            }
        }

        // Diagonal /
        for (let r = 3; r < ROWS; r++) {
            for (let c = 0; c <= COLS - 4; c++) {
                if (
                    boardState[r][c] === player &&
                    boardState[r - 1][c + 1] === player &&
                    boardState[r - 2][c + 2] === player &&
                    boardState[r - 3][c + 3] === player
                ) {
                    return [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]];
                }
            }
        }

        // Diagonal \
        for (let r = 0; r <= ROWS - 4; r++) {
            for (let c = 0; c <= COLS - 4; c++) {
                if (
                    boardState[r][c] === player &&
                    boardState[r + 1][c + 1] === player &&
                    boardState[r + 2][c + 2] === player &&
                    boardState[r + 3][c + 3] === player
                ) {
                    return [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]];
                }
            }
        }

        return null;
    };

    const handleDrop = (col: number) => {
        if (winner || isDropping || !canPlay(col)) return;
        
        const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;
        const myPlayer = isPlayer1 ? PLAYER_1 : PLAYER_2;
        
        // In production mode, only allow moves on your turn
        if (gameState?.matchId && currentPlayer !== myPlayer) {
            return;
        }
        
        // Legacy mode - prevent player from moving for AI
        if (!gameState?.matchId && currentPlayer === PLAYER_2 && !matchState.isSpectator) {
            return;
        }

        setIsDropping(true);
        setAnimatingCol(col);

        // Production mode - send move via WebSocket
        if (gameState?.matchId) {
            sendMove({ column: col });
            setTimeout(() => {
                setAnimatingCol(null);
                setIsDropping(false);
            }, 400);
            return;
        }

        // Legacy local mode - animate drop
        setTimeout(() => {
            const newBoard = [...board.map(row => [...row])];
            const row = dropPiece(newBoard, col, currentPlayer);

            if (row !== -1) {
                setBoard(newBoard);
                setAnimatingCol(null);

                const win = checkWin(newBoard, currentPlayer);
                if (win) {
                    setWinner(currentPlayer);
                    setWinningCells(win);
                    endGame(currentPlayer);
                } else {
                    if (newBoard.every(row => row.every(cell => cell !== EMPTY))) {
                        setWinner(0); // Draw
                        endGame(0);
                    } else {
                        setCurrentPlayer(currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1);
                    }
                }
            }
            setIsDropping(false);
        }, 400);
    };

    const endGame = (winnerId: number) => {
        const winnerType = winnerId === PLAYER_1 ? 'local' : winnerId === PLAYER_2 ? 'opponent' : 'draw';
        const score = winnerId === PLAYER_1 ? 100 : winnerId === 0 ? 50 : 0;
        setFinalScore(score);

        if (winnerId === PLAYER_1) audioService.playWin();
        else if (winnerId === PLAYER_2) audioService.playLoss();

        // Production mode - notify server and show score submission
        if (gameState?.matchId) {
            const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;
            const wsMatchId = gameState.tempMatchId || gameState.matchId?.toString();
            websocketClient.socket?.emit('game:local_complete', {
                matchId: wsMatchId,
                winner: winnerType,
                reason: winnerId === 0 ? 'Draw' : 'Connect 4',
                scores: {
                    player1: isPlayer1 ? score : (winnerId === 0 ? 50 : 100 - score),
                    player2: isPlayer1 ? (winnerId === 0 ? 50 : 100 - score) : score
                }
            });
            setTimeout(() => setShowScoreSubmission(true), 2000);
        } else {
            setTimeout(() => {
                updateStatus(MatchStatus.COMPLETED);
                setMatchState(prev => ({
                    ...prev,
                    winner: winnerType,
                    players: {
                        ...prev.players,
                        local: { ...prev.players.local, score: winnerId === PLAYER_1 ? 1 : 0 },
                        opponent: { ...prev.players.opponent, score: winnerId === PLAYER_2 ? 1 : 0 }
                    }
                }));
                navigate('/results');
            }, 3000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-2xl mx-auto p-4">
            {/* Matchmaking Modal */}
            <MatchmakingModal
                gameType={GameType.CONNECT4}
                isOpen={showMatchmaking}
                onClose={() => navigate('/select')}
                onMatchFound={() => {
                    setShowMatchmaking(false);
                    setGameStarted(true);
                }}
            />

            {/* Game HUD */}
            {gameState?.status === 'ACTIVE' && (
                <GameHUD
                    gameState={gameState}
                    timeLeft={300}
                    onResign={handleResignGame}
                />
            )}

            {/* Score Submission Modal */}
            <ScoreSubmissionModal
                isOpen={showScoreSubmission}
                score={finalScore}
                onClose={() => setShowScoreSubmission(false)}
                onComplete={() => navigate('/results')}
            />

            {/* Header Info */}
            <div className="flex justify-between w-full mb-8 bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl">
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 ${currentPlayer === PLAYER_1 ? 'bg-red-500/20 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'opacity-60'}`}>
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg"></div>
                    <span className="font-bold text-white tracking-wider">YOU</span>
                </div>
                <div className="font-mono text-slate-500 flex items-center text-sm">VS</div>
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 ${currentPlayer === PLAYER_2 ? 'bg-yellow-400/20 border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'opacity-60'}`}>
                    <span className="font-bold text-white tracking-wider">OPPONENT</span>
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg"></div>
                </div>
            </div>

            {/* Game Board Container */}
            <div className="relative p-3 bg-blue-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-blue-900">
                {/* Top highlight */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-blue-600 rounded-t-xl opacity-50"></div>

                {/* Board Grid */}
                <div className="bg-blue-700 p-3 rounded-xl border-2 border-blue-600 relative overflow-hidden">
                    <div className="grid grid-cols-7 gap-2 md:gap-3 relative z-10">
                        {Array.from({ length: COLS }).map((_, colIndex) => (
                            <div
                                key={colIndex}
                                className="flex flex-col gap-2 md:gap-3 cursor-pointer group"
                                onClick={() => handleDrop(colIndex)}
                            >
                                {/* Hover Indicator */}
                                <div className={`h-2 w-full rounded-full transition-opacity duration-200 ${!winner && !isDropping && canPlay(colIndex) && currentPlayer === PLAYER_1 ? 'bg-white/30 opacity-0 group-hover:opacity-100' : 'opacity-0'}`}></div>

                                {Array.from({ length: ROWS }).map((_, rowIndex) => {
                                    const cellValue = board[rowIndex][colIndex];
                                    const isWinningPiece = winningCells.some(([r, c]) => r === rowIndex && c === colIndex);

                                    // Animation logic: if this is the top empty cell in the animating column
                                    const isAnimating = isDropping && animatingCol === colIndex && rowIndex === 0;

                                    return (
                                        <div
                                            key={`${rowIndex}-${colIndex}`}
                                            className="relative w-10 h-10 md:w-14 md:h-14 rounded-full bg-slate-900/80 shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)] overflow-hidden"
                                        >
                                            {/* Piece */}
                                            <div className={`w-full h-full rounded-full transition-all duration-500 transform ${cellValue === EMPTY
                                                    ? 'scale-0 opacity-0'
                                                    : cellValue === PLAYER_1
                                                        ? 'bg-gradient-to-br from-red-400 to-red-700 scale-100 opacity-100 shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.4)]'
                                                        : 'bg-gradient-to-br from-yellow-300 to-yellow-600 scale-100 opacity-100 shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.4)]'
                                                } ${isWinningPiece ? 'animate-pulse ring-4 ring-white shadow-[0_0_20px_rgba(255,255,255,0.5)]' : ''}`}>
                                                {/* Shine effect */}
                                                {cellValue !== EMPTY && (
                                                    <div className="absolute top-1 left-1 w-1/2 h-1/2 rounded-full bg-gradient-to-br from-white/60 to-transparent"></div>
                                                )}
                                            </div>

                                            {/* Drop Animation Piece (Fake) */}
                                            {isAnimating && (
                                                <div className={`absolute top-0 left-0 w-full h-full rounded-full bg-gradient-to-br ${currentPlayer === PLAYER_1 ? 'from-red-400 to-red-700' : 'from-yellow-300 to-yellow-600'} animate-bounce-in`}></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legs */}
                <div className="absolute -bottom-10 -left-2 w-6 h-32 bg-blue-900 rounded-full transform rotate-12 border-r-4 border-blue-950 -z-10"></div>
                <div className="absolute -bottom-10 -right-2 w-6 h-32 bg-blue-900 rounded-full transform -rotate-12 border-l-4 border-blue-950 -z-10"></div>
            </div>

            {/* Status Text */}
            <div className={`mt-12 text-2xl font-black tracking-widest transition-all duration-500 ${winner ? 'scale-110 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'text-slate-400'}`}>
                {winner
                    ? (winner === PLAYER_1 ? "YOU WIN!" : winner === PLAYER_2 ? "OPPONENT WINS!" : "DRAW!")
                    : (currentPlayer === PLAYER_1 ? "YOUR TURN" : "OPPONENT'S TURN...")}
            </div>

            <style>{`
                @keyframes bounce-in {
                    0% { transform: translateY(-300%); opacity: 0; }
                    60% { transform: translateY(20%); opacity: 1; }
                    80% { transform: translateY(-10%); }
                    100% { transform: translateY(0); }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>
        </div>
    );
}
