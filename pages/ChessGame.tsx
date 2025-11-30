import React, { useState, useEffect, useCallback } from 'react';
import ChessBoard2D, { Pieces } from '../components/ChessBoard2D';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { MatchStatus, GameType } from '../types';
import { Chess, PieceSymbol, Color } from 'chess.js';
import RulesModal from '../components/RulesModal';
import { audioService } from '../services/audioService';
import { useGameFlow } from '../hooks/useGameFlow';
import MatchmakingModal from '../components/MatchmakingModal';
import GameHUD from '../components/GameHUD';
import ScoreSubmissionModal from '../components/ScoreSubmissionModal';
import { websocketClient } from '../services/websocketClient';

// --- Captured Piece Component ---
const CapturedPiecesDisplay = ({ captured, color }: { captured: string[], color: 'w' | 'b' }) => {
    // Sort logic: Pawn < Knight/Bishop < Rook < Queen
    const valueMap: Record<string, number> = { p: 1, n: 3, b: 3.1, r: 5, q: 9 };
    const sorted = [...captured].sort((a, b) => valueMap[a] - valueMap[b]);

    return (
        <div className="flex flex-wrap gap-1 h-6 items-center">
            {sorted.map((p, i) => (
                <div key={i} className="w-4 h-4 md:w-5 md:h-5 opacity-80 animate-scale-in">
                    {Pieces[color === 'w' ? p.toUpperCase() : p]({ className: "w-full h-full drop-shadow-sm" })}
                </div>
            ))}
        </div>
    );
};

export default function ChessGame() {
    const navigate = useNavigate();
    const location = useLocation();
    const { wallet, setMatchState } = useApp();
    const isSpectator = location.state?.isSpectator || false;

    // Production-ready game flow
    const { gameState, sendMove, submitScore, resignGame: handleResignGame } = useGameFlow();
    const [showMatchmaking, setShowMatchmaking] = useState(!isSpectator);
    const [showScoreSubmission, setShowScoreSubmission] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [gameStarted, setGameStarted] = useState(isSpectator);

    // Redirect to home if wallet is not connected
    useEffect(() => {
        if (!wallet) {
            navigate('/');
        }
    }, [wallet, navigate]);

    const [timer, setTimer] = useState(600);
    const [game, setGame] = useState(new Chess());
    const [fen, setFen] = useState(game.fen());
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [status, setStatus] = useState(isSpectator ? "Spectating Match..." : "Waiting for match...");
    const [checkSquare, setCheckSquare] = useState<string | null>(null);
    const [pendingPromotion, setPendingPromotion] = useState<{ from: string, to: string } | null>(null);
    const [showRules, setShowRules] = useState(false);

    // Game Over Modal State
    const [gameOverModal, setGameOverModal] = useState<{
        isOpen: boolean;
        winner: 'local' | 'opponent' | 'draw' | null;
        reason: string;
    }>({ isOpen: false, winner: null, reason: '' });

    // State for Captured Pieces
    const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
    const [capturedBlack, setCapturedBlack] = useState<string[]>([]);

    // Visual Effects State
    const [boardShake, setBoardShake] = useState(false);

    // Handle match found - start game immediately
    useEffect(() => {
        if (gameState?.status === 'MATCHED' && !gameStarted) {
            console.log('🎮 Chess match found, starting game');
            setShowMatchmaking(false);
            setGameStarted(true);
            
            // Small delay to ensure server state is received
            setTimeout(() => {
                initializeFromServer();
            }, 100);
        }
    }, [gameState?.status, gameStarted]);

    // Listen for game:start event from server
    useEffect(() => {
        if (!gameState?.matchId) return;

        const handleGameStart = (data: any) => {
            console.log('🎮 Chess game start event received:', data);
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

    // Initialize game from server state
    const initializeFromServer = () => {
        const serverState = (window as any).__serverGameState;
        const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;

        if (serverState?.fen) {
            console.log('🎮 Using server chess state:', serverState);
            const newGame = new Chess(serverState.fen);
            setGame(newGame);
            setFen(newGame.fen());
            setStatus(isPlayer1 ? "Your Turn (White)" : "Opponent's Turn");
            delete (window as any).__serverGameState;
        } else {
            console.log('🎮 No server state, using fresh game');
            setStatus(gameState?.isPlayer1 ? "Your Turn (White)" : "Opponent's Turn");
        }
    };

    // Listen for opponent moves via WebSocket
    useEffect(() => {
        if (!gameState?.matchId) return;

        const handleOpponentMove = (data: any) => {
            console.log('📥 Received opponent chess move:', data);
            const { move } = data;

            if (move.from && move.to) {
                try {
                    const result = game.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
                    if (result) {
                        if (result.flags.includes('c') || result.flags.includes('e')) {
                            setBoardShake(true);
                            audioService.playCapture();
                            setTimeout(() => setBoardShake(false), 500);
                        } else {
                            audioService.playChessMove();
                        }
                        setFen(game.fen());
                        checkGameStatus();
                    }
                } catch (e) {
                    console.error('Invalid opponent move:', e);
                }
            }
        };

        const handleStateUpdate = (data: any) => {
            console.log('📥 Chess state update:', data);
            if (data.gameState?.fen) {
                const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;
                const serverTurn = data.currentTurn === 'player1' ? (isPlayer1 ? 'local' : 'opponent') : (isPlayer1 ? 'opponent' : 'local');
                
                // Sync FEN if different
                if (data.gameState.fen !== game.fen()) {
                    console.log('🔄 Syncing chess FEN from server');
                    const newGame = new Chess(data.gameState.fen);
                    setGame(newGame);
                    setFen(newGame.fen());
                }
                
                setStatus(serverTurn === 'local' ? "Your Turn" : "Opponent's Turn");
            }
        };

        const handleGameComplete = (data: any) => {
            console.log('🏆 Chess game complete:', data);
            const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;
            const myScore = isPlayer1 ? data.scores?.player1 : data.scores?.player2;
            const opponentScore = isPlayer1 ? data.scores?.player2 : data.scores?.player1;
            
            const winner = myScore > opponentScore ? 'local' : (myScore < opponentScore ? 'opponent' : 'draw');
            handleGameOver(winner, 'Game Complete');
        };

        websocketClient.onOpponentMove(handleOpponentMove);
        websocketClient.socket?.on('game:state_update', handleStateUpdate);
        websocketClient.socket?.on('game:complete', handleGameComplete);

        return () => {
            websocketClient.off('game:opponent_move');
            websocketClient.socket?.off('game:state_update', handleStateUpdate);
            websocketClient.socket?.off('game:complete', handleGameComplete);
        };
    }, [gameState?.matchId, gameState?.isPlayer1, game]);

    // Update captured pieces whenever FEN changes
    useEffect(() => {
        const board = game.board();
        const currentPieces: Record<string, number> = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } as any, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } as any };

        board.forEach(row => row.forEach(p => {
            if (p) currentPieces[p.color][p.type]++;
        }));

        const initialCounts = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

        const calcCaptured = (color: 'w' | 'b') => {
            const caps: string[] = [];
            Object.keys(initialCounts).forEach(type => {
                const t = type as PieceSymbol;
                const missing = initialCounts[t as keyof typeof initialCounts] - currentPieces[color][t];
                for (let i = 0; i < missing; i++) caps.push(t);
            });
            return caps;
        };

        setCapturedWhite(calcCaptured('w'));
        setCapturedBlack(calcCaptured('b'));

    }, [fen, game]);

    // Timer
    useEffect(() => {
        if (gameOverModal.isOpen) return;
        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleGameOver('opponent', 'Time Out');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [gameOverModal.isOpen]);

    // --- SPECTATOR MODE LOOP ---
    useEffect(() => {
        if (!isSpectator || gameOverModal.isOpen) return;

        const interval = setInterval(() => {
            if (game.isGameOver()) return;
            // Make random/semi-smart move for WHOEVER's turn it is
            makeBestMove(2);
        }, 2000);

        return () => clearInterval(interval);
    }, [isSpectator, game, fen, gameOverModal.isOpen]);

    // Calculate Chess score (0/50/100)
    const calculateScore = (winner: 'local' | 'opponent' | 'draw'): number => {
        if (winner === 'local') return 100;
        if (winner === 'draw') return 50;
        return 0;
    };

    const handleGameOver = (winner: 'local' | 'opponent' | 'draw', reason: string = "Game Over") => {
        if (winner === 'local') audioService.playWin();
        else if (winner === 'opponent') audioService.playLoss();

        const score = calculateScore(winner);
        setFinalScore(score);

        // Show score submission modal in production mode
        if (gameState?.matchId) {
            setShowScoreSubmission(true);
        } else {
            // Legacy mode - show game over modal
            setGameOverModal({
                isOpen: true,
                winner,
                reason
            });
        }
    };

    const restartGame = () => {
        const newGame = new Chess();
        setGame(newGame);
        setFen(newGame.fen());
        setTimer(600);
        setCheckSquare(null);
        setCapturedWhite([]);
        setCapturedBlack([]);
        setGameOverModal({ isOpen: false, winner: null, reason: '' });
        setStatus(isSpectator ? "Spectating Match..." : "Your Turn");
    };

    const handleResign = () => {
        if (isSpectator) {
            navigate('/select');
            return;
        }
        if (window.confirm("Are you sure you want to resign?")) {
            handleGameOver('opponent', 'Resignation');
        }
    };

    // --- AI ENGINE (Minimax) ---
    const getPieceValue = (piece: any, square: string, endgame: boolean) => {
        if (!piece) return 0;
        const values: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
        let val = values[piece.type] || 0;
        const isWhite = piece.color === 'w';
        if ((piece.type === 'n' || piece.type === 'p') && ['d4', 'd5', 'e4', 'e5'].includes(square)) val += 10;
        if (piece.type === 'p') {
            const rank = parseInt(square[1]);
            val += (isWhite ? rank : (9 - rank)) * 5;
        }
        return isWhite ? val : -val;
    };

    const evaluateBoard = (chess: Chess) => {
        let totalEvaluation = 0;
        const board = chess.board();
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const endgame = chess.history().length > 40;

        board.forEach((row, rIdx) => {
            row.forEach((piece, cIdx) => {
                if (piece) {
                    const rank = 8 - rIdx;
                    const square = `${files[cIdx]}${rank}`;
                    totalEvaluation += getPieceValue(piece, square, endgame);
                }
            });
        });
        return totalEvaluation;
    };

    const minimax = (chess: Chess, depth: number, alpha: number, beta: number, isMaximisingPlayer: boolean): number => {
        if (depth === 0 || chess.isGameOver()) return -evaluateBoard(chess);

        const possibleMoves = chess.moves();
        possibleMoves.sort((a, b) => (b.includes('x') ? 1 : 0) - (a.includes('x') ? 1 : 0));

        if (isMaximisingPlayer) {
            let bestMove = -Infinity;
            for (let i = 0; i < possibleMoves.length; i++) {
                chess.move(possibleMoves[i]);
                bestMove = Math.max(bestMove, minimax(chess, depth - 1, alpha, beta, !isMaximisingPlayer));
                chess.undo();
                alpha = Math.max(alpha, bestMove);
                if (beta <= alpha) return bestMove;
            }
            return bestMove;
        } else {
            let bestMove = Infinity;
            for (let i = 0; i < possibleMoves.length; i++) {
                chess.move(possibleMoves[i]);
                bestMove = Math.min(bestMove, minimax(chess, depth - 1, alpha, beta, !isMaximisingPlayer));
                chess.undo();
                beta = Math.min(beta, bestMove);
                if (beta <= alpha) return bestMove;
            }
            return bestMove;
        }
    };

    const makeBestMove = useCallback((depthOverride?: number) => {
        const depth = depthOverride || 3;
        const possibleMoves = game.moves();
        if (possibleMoves.length === 0) return;

        let bestMoveValue = -Infinity;
        let bestMoveFound = possibleMoves[0];
        possibleMoves.sort(() => Math.random() - 0.5);

        const isWhiteTurn = game.turn() === 'w';

        for (let i = 0; i < possibleMoves.length; i++) {
            const move = possibleMoves[i];
            game.move(move);
            const value = minimax(game, depth - 1, -Infinity, Infinity, !isWhiteTurn);
            game.undo();

            if (isWhiteTurn) {
                if (value >= bestMoveValue) {
                    bestMoveValue = value;
                    bestMoveFound = move;
                }
            } else {
                if (i === 0) bestMoveValue = isWhiteTurn ? -Infinity : Infinity;

                if (isWhiteTurn) {
                    if (value > bestMoveValue) { bestMoveValue = value; bestMoveFound = move; }
                } else {
                    if (value < bestMoveValue) { bestMoveValue = value; bestMoveFound = move; }
                }
            }
        }

        const move = game.move(bestMoveFound);
        if (move) {
            if (move.flags.includes('c') || move.flags.includes('e')) {
                setBoardShake(true);
                audioService.playCapture();
                setTimeout(() => setBoardShake(false), 500);
            } else {
                audioService.playChessMove();
            }
        }

        setFen(game.fen());
        checkGameStatus();
        if (!isSpectator) setIsAiThinking(false);
        if (!isSpectator) setStatus("Your Turn");
    }, [game, isSpectator]);

    const checkGameStatus = () => {
        if (game.isCheckmate()) {
            handleGameOver(game.turn() === 'w' ? 'opponent' : 'local', 'Checkmate');
        } else if (game.isDraw()) {
            handleGameOver('draw', 'Draw');
        } else if (game.isStalemate()) {
            handleGameOver('draw', 'Stalemate');
        } else if (game.isThreefoldRepetition()) {
            handleGameOver('draw', 'Repetition');
        } else if (game.isInsufficientMaterial()) {
            handleGameOver('draw', 'Insufficient Material');
        } else if (game.inCheck()) {
            setStatus(game.turn() === 'w' ? "Check! (White)" : "Check! (Black)");
            setBoardShake(true);
            audioService.playCheck();
            setTimeout(() => setBoardShake(false), 500);

            const turn = game.turn();
            const board = game.board();
            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            let kSquare = null;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = board[r][c];
                    if (p && p.type === 'k' && p.color === turn) {
                        kSquare = `${files[c]}${8 - r}`;
                        break;
                    }
                }
                if (kSquare) break;
            }
            setCheckSquare(kSquare);
        } else {
            if (isSpectator) setStatus(`Spectating: ${game.turn() === 'w' ? "White" : "Black"}'s Turn`);
            else setStatus(game.turn() === 'w' ? "Your Turn" : "Opponent Thinking...");
            setCheckSquare(null);
        }
    };

    // Bot Trigger (Non-Spectator) - disabled in production mode
    useEffect(() => {
        // Don't use bot in multiplayer mode
        if (gameState?.matchId || gameState?.status === 'MATCHED' || gameState?.status === 'ACTIVE') return;

        if (!isSpectator && game.turn() === 'b' && !game.isGameOver() && !gameOverModal.isOpen) {
            setIsAiThinking(true);
            setStatus("Opponent Thinking...");
            setTimeout(() => {
                makeBestMove();
            }, 100);
        }
    }, [fen, game, makeBestMove, isSpectator, gameOverModal.isOpen, gameState?.status, gameState?.matchId]);

    const onDrop = (sourceSquare: string, targetSquare: string) => {
        if (isSpectator || gameOverModal.isOpen) return false;
        
        // In multiplayer mode, check if it's our turn based on color assignment
        if (gameState?.matchId) {
            const isPlayer1 = gameState?.isPlayer1;
            const isWhiteTurn = game.turn() === 'w';
            // Player 1 is always white, Player 2 is always black
            if ((isWhiteTurn && !isPlayer1) || (!isWhiteTurn && isPlayer1)) {
                audioService.playError();
                setStatus("Not your turn!");
                return false;
            }
        } else {
            // Bot mode - player is always white
            if (game.turn() !== 'w' || isAiThinking) {
                audioService.playError();
                return false;
            }
        }

        const moves = game.moves({ verbose: true });
        const isPromotion = moves.some(m => m.from === sourceSquare && m.to === targetSquare && m.promotion);

        if (isPromotion) {
            setPendingPromotion({ from: sourceSquare, to: targetSquare });
            return false;
        }

        let moveConfig: any = { from: sourceSquare, to: targetSquare, promotion: 'q' };
        const piece = game.get(sourceSquare);
        const targetPiece = game.get(targetSquare);

        // Handle Castle Click Correction (if user clicks king then rook)
        if (piece?.type === 'k' && targetPiece?.type === 'r' && piece.color === targetPiece.color) {
            if (piece.color === 'w') {
                if (sourceSquare === 'e1') {
                    if (targetSquare === 'h1') moveConfig.to = 'g1';
                    if (targetSquare === 'a1') moveConfig.to = 'c1';
                }
            }
        }

        try {
            const move = game.move(moveConfig);
            if (move === null) {
                audioService.playError();
                return false;
            }

            // Send move via WebSocket in production mode
            if (gameState?.matchId) {
                sendMove({
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion
                });
            }

            // Detect Capture for visual effect
            if (move.flags.includes('c') || move.flags.includes('e')) {
                setBoardShake(true);
                audioService.playCapture();
                setTimeout(() => setBoardShake(false), 500);
            } else {
                audioService.playChessMove();
            }

            setFen(game.fen());
            checkGameStatus();
            return true;
        } catch (e) {
            return false;
        }
    };

    const handlePromotionSelect = (pieceChar: string) => {
        if (!pendingPromotion) return;
        const { from, to } = pendingPromotion;
        try {
            const move = game.move({ from, to, promotion: pieceChar });
            if (move && (move.flags.includes('c') || move.flags.includes('e'))) {
                setBoardShake(true);
                audioService.playCapture();
                setTimeout(() => setBoardShake(false), 500);
            } else {
                audioService.playChessMove();
            }
            setFen(game.fen());
            checkGameStatus();
        } catch (e) {
            console.error("Promotion failed", e);
        }
        setPendingPromotion(null);
    };

    const getLegalMoves = (square: string) => {
        if (isSpectator || gameOverModal.isOpen) return [];
        
        // In multiplayer, only show moves for your pieces on your turn
        if (gameState?.matchId) {
            const isPlayer1 = gameState?.isPlayer1;
            const isWhiteTurn = game.turn() === 'w';
            if ((isWhiteTurn && !isPlayer1) || (!isWhiteTurn && isPlayer1)) {
                return []; // Not your turn
            }
            const piece = game.get(square);
            if (piece) {
                const myColor = isPlayer1 ? 'w' : 'b';
                if (piece.color !== myColor) return []; // Not your piece
            }
        }
        
        const moves = game.moves({ square, verbose: true });
        const moveSquares = moves.map(m => m.to);
        const piece = game.get(square);
        if (piece && piece.type === 'k') {
            moves.forEach(m => {
                if (m.flags.includes('k')) moveSquares.push(piece.color === 'w' ? 'h1' : 'h8');
                if (m.flags.includes('q')) moveSquares.push(piece.color === 'w' ? 'a1' : 'a8');
            });
        }
        return moveSquares;
    };

    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;

    return (
        <>
            {/* Matchmaking Modal */}
            <MatchmakingModal
                gameType={GameType.CHESS}
                isOpen={showMatchmaking}
                onClose={() => navigate('/select')}
                onMatchFound={(matchId) => {
                    console.log('Match found:', matchId);
                    setShowMatchmaking(false);
                }}
            />

            {/* Game HUD */}
            {gameState?.status === 'ACTIVE' && (
                <GameHUD
                    gameState={gameState}
                    timeLeft={timer}
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

            <div className="flex-1 flex flex-col items-center justify-center w-full h-full gap-2 py-2 overflow-hidden bg-slate-900 relative animate-fade-in">
                <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} gameType={GameType.CHESS} />

                {/* --- GAME OVER MODAL --- */}
                {gameOverModal.isOpen && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl transform scale-100">
                            <div className="mb-4">
                                {gameOverModal.winner === 'local' && <div className="text-6xl animate-bounce">🏆</div>}
                                {gameOverModal.winner === 'opponent' && <div className="text-6xl animate-pulse">💀</div>}
                                {gameOverModal.winner === 'draw' && <div className="text-6xl">🤝</div>}
                            </div>

                            <h2 className={`text-3xl font-black mb-2 uppercase ${gameOverModal.winner === 'local' ? 'text-emerald-400' :
                                gameOverModal.winner === 'opponent' ? 'text-red-400' : 'text-slate-300'
                                }`}>
                                {isSpectator
                                    ? (gameOverModal.winner === 'local' ? 'White Wins' : gameOverModal.winner === 'opponent' ? 'Black Wins' : 'Draw')
                                    : (gameOverModal.winner === 'local' ? 'You Won!' : gameOverModal.winner === 'opponent' ? 'You Lost' : 'Draw')
                                }
                            </h2>

                            <p className="text-slate-400 font-mono mb-8">{gameOverModal.reason}</p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={restartGame}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/30"
                                >
                                    {isSpectator ? "WATCH AGAIN" : "PLAY AGAIN"}
                                </button>
                                <button
                                    onClick={() => navigate('/select')}
                                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg transition-all"
                                >
                                    GO TO MENU
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setShowRules(true)}
                    className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-500 flex items-center justify-center transition-all"
                >
                    ?
                </button>

                {/* TOP BAR: Opponent Info + Captured White Pieces (since Opponent is Black, they captured White) */}
                <div className="w-full max-w-[75vh] flex justify-between items-end px-2">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-slate-700 rounded-full border-2 ${isAiThinking || (isSpectator && game.turn() === 'b') ? 'border-yellow-400 shadow-glow' : 'border-slate-500'} overflow-hidden transition-all duration-300`}>
                            <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${isSpectator ? "ChessMaster" : "Felix"}`} alt="Opponent" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                {isSpectator ? "ChessMaster (Black)" : "Opponent (Bot)"}
                                {capturedWhite.length > 0 && (
                                    <CapturedPiecesDisplay captured={capturedWhite} color='w' />
                                )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">Hard Mode (Depth 3)</div>
                        </div>
                    </div>
                    <div className={`text-xl md:text-2xl font-bold ${status.includes('Check') ? 'text-red-500 animate-bounce' : 'text-slate-300'}`}>
                        {status}
                    </div>
                    <div className="text-2xl md:text-3xl font-mono font-black text-red-500 bg-black/20 px-2 rounded">
                        {minutes < 10 ? `0${minutes}` : minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                    </div>
                </div>

                {/* BOARD */}
                <div className={`rounded-lg shadow-2xl z-10 border-4 border-slate-700 relative animate-scale-in transition-transform duration-100 ${boardShake ? 'translate-x-1 translate-y-1' : ''}`}>
                    <div className={boardShake ? 'animate-shake' : ''}>
                        <ChessBoard2D
                            fen={fen}
                            onMove={onDrop}
                            getLegalMoves={getLegalMoves}
                            orientation={gameState?.isPlayer1 === false ? 'black' : 'white'}
                            checkSquare={checkSquare}
                        />
                    </div>

                    {pendingPromotion && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg animate-fadeIn">
                            <div className="bg-slate-800 p-6 rounded-2xl border-2 border-yellow-400/50 shadow-2xl transform scale-110">
                                <h3 className="text-white text-center mb-6 font-bold text-lg uppercase tracking-wider">Promote Pawn</h3>
                                <div className="flex gap-4">
                                    {['q', 'r', 'b', 'n'].map(p => (
                                        <button key={p} onClick={() => handlePromotionSelect(p)} className="w-16 h-16 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center border-2 border-slate-600 hover:border-yellow-400 transition-all shadow-xl group">
                                            <div className="w-12 h-12 transform group-hover:scale-110 transition-transform">
                                                {Pieces[p.toUpperCase()]({ className: "w-full h-full drop-shadow-lg" })}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM BAR: Player Info + Captured Black Pieces */}
                <div className="w-full max-w-[75vh] flex justify-between items-start px-2 mt-4">
                    <div className="text-left">
                        <div className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                            {isSpectator ? "Pro_Gamer_1 (White)" : "You (White)"}
                            {capturedBlack.length > 0 && (
                                <CapturedPiecesDisplay captured={capturedBlack} color='b' />
                            )}
                        </div>
                        <div className="text-left">
                            <div className="text-[10px] text-slate-400 font-mono">White Pieces</div>
                        </div>
                    </div>

                    <button
                        onClick={handleResign}
                        className={`px-4 py-1.5 border text-xs font-bold rounded flex items-center gap-2 transition-colors uppercase tracking-wider ${isSpectator
                            ? 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                            : 'bg-red-900/30 hover:bg-red-900/60 border-red-500/50 text-red-400'
                            }`}
                    >
                        {isSpectator ? "Leave" : (
                            <>
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span> Resign
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-indigo-600 rounded-full border-2 ${game.turn() === 'w' && isSpectator ? 'border-yellow-400 shadow-glow' : 'border-indigo-400'} overflow-hidden transition-all duration-300`}>
                            <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${isSpectator ? "ProGamer" : "You"}`} alt="You" />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                20%, 40%, 60%, 80% { transform: translateX(4px); }
            }
            .animate-shake {
                animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
            }
            `}</style>
        </>
    );
}