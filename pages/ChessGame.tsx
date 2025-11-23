import React, { useState, useEffect, useCallback } from 'react';
import ChessBoard2D, { Pieces } from '../components/ChessBoard2D';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { MatchStatus, GameType } from '../types';
import { Chess } from 'chess.js';
import RulesModal from '../components/RulesModal';

export default function ChessGame() {
  const navigate = useNavigate();
  const { setMatchState } = useApp();
  const [timer, setTimer] = useState(600);
  
  // Game State
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [status, setStatus] = useState("Your Turn");
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  
  // Promotion State
  const [pendingPromotion, setPendingPromotion] = useState<{from: string, to: string} | null>(null);
  
  // Rules Modal
  const [showRules, setShowRules] = useState(false);

  // Timer
  useEffect(() => {
      const interval = setInterval(() => {
          setTimer(prev => {
              if (prev <= 1) {
                  clearInterval(interval);
                  handleGameOver('opponent'); // Time run out = lose
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  const handleGameOver = (winner: 'local' | 'opponent' | 'draw') => {
      setMatchState(s => ({ ...s, status: MatchStatus.REVEALING, winner }));
      navigate('/results');
  };

  const handleResign = () => {
    if (window.confirm("Are you sure you want to resign? You will forfeit this match.")) {
      handleGameOver('opponent');
    }
  };

  // --- AI ENGINE (Hard Mode - Minimax) ---
  const getPieceValue = (piece: any, square: string, endgame: boolean) => {
      if (!piece) return 0;
      const values: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
      let val = values[piece.type] || 0;
      
      // Basic Position Tables (Simplified)
      // Encourages center control and pawn advancement
      const isWhite = piece.color === 'w';
      
      // Center bonus
      if ((piece.type === 'n' || piece.type === 'p') && ['d4','d5','e4','e5'].includes(square)) {
          val += 10;
      }
      
      // Pawn progression bonus
      if (piece.type === 'p') {
          const rank = parseInt(square[1]);
          val += (isWhite ? rank : (9-rank)) * 5; 
      }

      return isWhite ? val : -val;
  };

  const evaluateBoard = (chess: Chess) => {
      let totalEvaluation = 0;
      const board = chess.board();
      const files = ['a','b','c','d','e','f','g','h'];
      const endgame = chess.history().length > 40; // rough endgame heuristic
      
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
      if (depth === 0 || chess.isGameOver()) {
          return -evaluateBoard(chess); 
      }

      const possibleMoves = chess.moves();
      // Order moves: captures first to improve pruning
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

  const makeBestMove = useCallback(() => {
      // Hard Mode: Depth 3 is significant for JS in browser
      const depth = 3;
      const possibleMoves = game.moves();
      if (possibleMoves.length === 0) return;

      let bestMoveValue = -Infinity;
      let bestMoveFound = possibleMoves[0];

      // Shuffle initial moves for variety if values are equal
      possibleMoves.sort(() => Math.random() - 0.5);

      for(let i = 0; i < possibleMoves.length; i++) {
          const move = possibleMoves[i];
          game.move(move);
          const value = minimax(game, depth, -Infinity, Infinity, false); 
          game.undo();
          
          if(value >= bestMoveValue) {
              bestMoveValue = value;
              bestMoveFound = move;
          }
      }
      
      game.move(bestMoveFound);
      setFen(game.fen());
      checkGameStatus();
      setIsAiThinking(false);
      setStatus("Your Turn");
  }, [game]);

  const checkGameStatus = () => {
      if (game.isCheckmate()) {
          handleGameOver(game.turn() === 'w' ? 'opponent' : 'local');
      } else if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
          handleGameOver('draw');
      } else if (game.inCheck()) {
          setStatus(game.turn() === 'w' ? "Check! (Escape!)" : "Check! (Bot)");
          
          // Find King's Square for visual feedback
          const turn = game.turn();
          const board = game.board();
          const files = ['a','b','c','d','e','f','g','h'];
          
          let kSquare = null;
          // Simple scan
          for(let r=0; r<8; r++) {
              for(let c=0; c<8; c++) {
                  const p = board[r][c];
                  if (p && p.type === 'k' && p.color === turn) {
                      kSquare = `${files[c]}${8-r}`;
                      break;
                  }
              }
              if (kSquare) break;
          }
          setCheckSquare(kSquare);

      } else {
          setStatus(game.turn() === 'w' ? "Your Turn" : "Opponent Thinking...");
          setCheckSquare(null);
      }
  };

  useEffect(() => {
      if (game.turn() === 'b' && !game.isGameOver()) {
          setIsAiThinking(true);
          setStatus("Opponent Thinking...");
          setTimeout(() => {
              makeBestMove();
          }, 100);
      }
  }, [fen, game, makeBestMove]);

  const onDrop = (sourceSquare: string, targetSquare: string) => {
      if (game.turn() !== 'w' || isAiThinking) return false;

      // Check for promotion move availability first
      const moves = game.moves({ verbose: true });
      const isPromotion = moves.some(m => m.from === sourceSquare && m.to === targetSquare && m.promotion);

      if (isPromotion) {
          setPendingPromotion({ from: sourceSquare, to: targetSquare });
          return false; // Pause move for UI selection
      }

      let moveConfig = {
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q' // default fallthrough
      };

      // UX Handling: Support "Click King then Rook" to castle
      const piece = game.get(sourceSquare);
      const targetPiece = game.get(targetSquare);
      
      // If user drags King to Rook, interpret as castling
      if (piece?.type === 'k' && targetPiece?.type === 'r' && piece.color === targetPiece.color) {
          // White Castling
          if (piece.color === 'w') {
             if (sourceSquare === 'e1') {
                 if (targetSquare === 'h1') moveConfig.to = 'g1'; // King-side
                 if (targetSquare === 'a1') moveConfig.to = 'c1'; // Queen-side
             }
          }
      }

      try {
          // chess.js validates:
          // 1. Piece moved?
          // 2. Path clear?
          // 3. King in check?
          // 4. Square attacked?
          const move = game.move(moveConfig);

          if (move === null) return false;
          
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
          game.move({
              from,
              to,
              promotion: pieceChar
          });
          setFen(game.fen());
          checkGameStatus();
      } catch (e) {
          console.error("Promotion failed", e);
      }
      setPendingPromotion(null);
  };
  
  // Callback to get legal moves for UI highlighting
  const getLegalMoves = (square: string) => {
      const moves = game.moves({ square, verbose: true });
      const moveSquares = moves.map(m => m.to);
      
      // UX Enhancement: Highlight Rooks if castling is possible to indicate click-to-castle
      const piece = game.get(square);
      if (piece && piece.type === 'k') {
          moves.forEach(m => {
              if (m.flags.includes('k')) moveSquares.push(piece.color === 'w' ? 'h1' : 'h8'); // Kingside rook
              if (m.flags.includes('q')) moveSquares.push(piece.color === 'w' ? 'a1' : 'a8'); // Queenside rook
          });
      }
      return moveSquares;
  };

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full h-full gap-2 py-2 overflow-hidden bg-slate-900 relative">
        <RulesModal 
          isOpen={showRules} 
          onClose={() => setShowRules(false)} 
          gameType={GameType.CHESS} 
        />

        {/* Info Button */}
        <button 
            onClick={() => setShowRules(true)}
            className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-500 flex items-center justify-center transition-all"
        >
            ?
        </button>

        <div className="w-full max-w-[75vh] flex justify-between items-end px-2">
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-slate-700 rounded-full border-2 ${isAiThinking ? 'border-yellow-400' : 'border-slate-500'} overflow-hidden`}>
                    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Felix" alt="Opponent" />
                </div>
                <div className="text-left">
                    <div className="font-bold text-slate-200 text-sm">Opponent (Bot)</div>
                    <div className="text-[10px] text-slate-400 font-mono">Hard Mode (Depth 3)</div>
                </div>
            </div>
            <div className={`text-2xl font-bold ${status.includes('Check') ? 'text-red-500 animate-bounce' : 'text-slate-300'}`}>
                {status}
            </div>
            <div className="text-3xl font-mono font-black text-red-500">
                {minutes < 10 ? `0${minutes}` : minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </div>
        </div>

        <div className="rounded-lg shadow-2xl z-10 border-4 border-slate-700 relative">
            <ChessBoard2D 
                fen={fen} 
                onMove={onDrop} 
                getLegalMoves={getLegalMoves}
                orientation="white"
                checkSquare={checkSquare}
            />

            {/* Promotion Modal Overlay */}
            {pendingPromotion && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg animate-fadeIn">
                    <div className="bg-slate-800 p-6 rounded-2xl border-2 border-yellow-400/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] transform scale-110">
                        <h3 className="text-white text-center mb-6 font-bold text-lg uppercase tracking-wider">Promote Pawn</h3>
                        <div className="flex gap-4">
                            {['q', 'r', 'b', 'n'].map(p => (
                                <button 
                                    key={p}
                                    onClick={() => handlePromotionSelect(p)}
                                    className="w-16 h-16 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center border-2 border-slate-600 hover:border-yellow-400 transition-all shadow-xl group"
                                >
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

        <div className="w-full max-w-[75vh] flex justify-between items-start px-2 mt-4">
             <div className="text-left">
                 <div className="font-bold text-emerald-400 text-sm">You</div>
                 <div className="text-[10px] text-slate-400 font-mono">White Pieces</div>
             </div>
             
             <button 
                onClick={handleResign}
                className="px-4 py-1.5 bg-red-900/30 hover:bg-red-900/60 border border-red-500/50 text-red-400 text-xs font-bold rounded flex items-center gap-2 transition-colors uppercase tracking-wider"
             >
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                Resign
             </button>

             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-600 rounded-full border-2 border-indigo-400 overflow-hidden">
                    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=You" alt="You" />
                 </div>
             </div>
        </div>
    </div>
  );
}