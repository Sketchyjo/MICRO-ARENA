import React, { useState, useEffect } from 'react';

// --- VISUAL ASSETS ---

const commonPieceStyle = {
  className: "w-full h-full drop-shadow-md transition-transform duration-200 hover:scale-105 active:scale-95 origin-center"
};

// Standard Chess Piece Paths (Cburnett style) - Clean and Solid
export const Pieces: Record<string, (props: any) => React.ReactNode> = {
  // WHITE PIECES
  P: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62C26.21 14.71 26.5 13.89 26.5 13c0-2.21-1.79-4-4-4z" stroke="#000" strokeWidth="1.5" fill="#ffffff" strokeLinecap="round" />
    </svg>
  ),
  R: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <g fill="#ffffff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt" />
        <path d="M34 14l-3 3H14l-3-3" />
        <path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
        <path d="M11 14h23" fill="none" stroke="#000" strokeLinejoin="miter" />
      </g>
    </svg>
  ),
  N: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <g fill="#ffffff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19-2.94 1.5-4 9.5 1 4-8 4-8" />
        <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#000" stroke="#000" />
        <path d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0z" transform="matrix(.866 .5 -.5 .866 9.693 -5.173)" fill="#000" stroke="#000" />
      </g>
    </svg>
  ),
  B: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <g fill="#ffffff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#ffffff" stroke="#000" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 9.11-1.45 13.5-1.45 4.38 0 10.11.48 13.5 1.45V32H9v4z" />
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2H15s-.5.5 0 2z" />
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        </g>
        <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" strokeLinejoin="miter" />
        <path d="M20 15.5l5 .5a5.5 5.5 0 1 1-10 0l5-.5z" fill="#000" stroke="#000" />
        <path d="M32 35.5H13" fill="none" stroke="#000" strokeWidth="1.5" />
      </g>
    </svg>
  ),
  Q: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <g fill="#ffffff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#ffffff" stroke="#000" strokeLinecap="butt">
          <path d="M9 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" transform="translate(-1 -1)" />
          <path d="M9 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" transform="translate(15.5 -5.5)" />
          <path d="M9 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" transform="translate(32 -1)" />
          <path d="M9 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" transform="translate(7 -4.5)" />
          <path d="M9 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" transform="translate(24 -4)" />
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25l-7-11z" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 2.5 12.5 2.5 13.5 0 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
          <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke="#000" />
        </g>
        <path d="M9 39h27v-3H9v3zM11 36v-4h23v4H11z" strokeLinecap="butt" />
        <path d="M12 32h21M11.5 36h22" fill="none" stroke="#000" strokeWidth="1.5" />
      </g>
    </svg>
  ),
  K: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <g fill="#ffffff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#ffffff" stroke="#000" strokeLinecap="butt" />
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-5 2-8 2s-4-3-8-3-5 2-8 2-2-2-2-6c-4 1-5 5-5 5s-4 2.5 6 10.5v7z" fill="#ffffff" stroke="#000" />
        <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" fill="none" stroke="#000" />
      </g>
    </svg>
  ),

  // BLACK PIECES
  p: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62C26.21 14.71 26.5 13.89 26.5 13c0-2.21-1.79-4-4-4z" stroke="#fff" strokeWidth="1.5" fill="#1e293b" strokeLinecap="round" />
    </svg>
  ),
  r: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <g fill="#1e293b" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt" />
        <path d="M34 14l-3 3H14l-3-3" />
        <path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
        <path d="M11 14h23" fill="none" stroke="#fff" strokeLinejoin="miter" />
      </g>
    </svg>
  ),
  n: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <g fill="#1e293b" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19-2.94 1.5-4 9.5 1 4-8 4-8" />
        <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#fff" stroke="#fff" />
        <path d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0z" transform="matrix(.866 .5 -.5 .866 9.693 -5.173)" fill="#fff" stroke="#fff" />
      </g>
    </svg>
  ),
  b: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <g fill="#1e293b" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#1e293b" stroke="#fff" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 9.11-1.45 13.5-1.45 4.38 0 10.11.48 13.5 1.45V32H9v4z" />
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2H15s-.5.5 0 2z" />
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        </g>
        <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" strokeLinejoin="miter" />
        <path d="M20 15.5l5 .5a5.5 5.5 0 1 1-10 0l5-.5z" fill="#fff" stroke="#fff" />
        <path d="M32 35.5H13" fill="none" stroke="#fff" strokeWidth="1.5" />
      </g>
    </svg>
  ),
  q: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <g fill="#1e293b" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#1e293b" stroke="#fff" strokeLinecap="butt">
          <path d="M9 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" transform="translate(-1 -1)" />
          <path d="M9 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" transform="translate(15.5 -5.5)" />
          <path d="M9 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" transform="translate(32 -1)" />
          <path d="M9 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" transform="translate(7 -4.5)" />
          <path d="M9 13a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" transform="translate(24 -4)" />
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25l-7-11z" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 2.5 12.5 2.5 13.5 0 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
          <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke="#fff" />
        </g>
        <path d="M9 39h27v-3H9v3zM11 36v-4h23v4H11z" strokeLinecap="butt" />
        <path d="M12 32h21M11.5 36h22" fill="none" stroke="#fff" strokeWidth="1.5" />
      </g>
    </svg>
  ),
  k: (props) => (
    <svg viewBox="0 0 45 45" {...props} {...commonPieceStyle}>
      <g fill="#1e293b" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#1e293b" stroke="#fff" strokeLinecap="butt" />
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-5 2-8 2s-4-3-8-3-5 2-8 2-2-2-2-6c-4 1-5 5-5 5s-4 2.5 6 10.5v7z" fill="#1e293b" stroke="#fff" />
        <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" fill="none" stroke="#fff" />
      </g>
    </svg>
  ),
};

interface ChessBoardProps {
    fen: string;
    onMove: (from: string, to: string) => boolean;
    getLegalMoves?: (square: string) => string[];
    orientation?: 'white' | 'black';
    checkSquare?: string | null;
}

export default function ChessBoard2D({ fen, onMove, getLegalMoves, orientation = 'white', checkSquare }: ChessBoardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);

  const board = parseFEN(fen);
  
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  
  // Clear selection if FEN changes (external move)
  useEffect(() => {
    setSelected(null);
    setValidMoves([]);
  }, [fen]);

  const handleSquareClick = (rIndex: number, cIndex: number) => {
      const file = files[cIndex];
      const rank = ranks[rIndex];
      const square = `${file}${rank}`;
      
      const piece = board[rIndex][cIndex];
      const isMyPiece = piece && (piece === piece.toUpperCase() ? orientation === 'white' : orientation === 'black');

      if (selected) {
          if (selected === square) {
              // Deselect
              setSelected(null);
              setValidMoves([]);
          } else if (isMyPiece) {
              // Switch selection
              setSelected(square);
              if (getLegalMoves) {
                  setValidMoves(getLegalMoves(square));
              }
          } else {
              // Attempt move
              const success = onMove(selected, square);
              if (!success) {
                  // If clicking another piece after failed move attempt
                  if (isMyPiece) {
                      setSelected(square);
                      if (getLegalMoves) setValidMoves(getLegalMoves(square));
                  } else {
                      setSelected(null);
                      setValidMoves([]);
                  }
              }
          }
      } else {
          if (isMyPiece) {
              setSelected(square);
              if (getLegalMoves) {
                  setValidMoves(getLegalMoves(square));
              }
          }
      }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="relative">
        {/* Ranks Labels */}
        <div className="absolute -left-6 md:-left-10 top-0 bottom-0 flex flex-col justify-around text-base md:text-2xl font-sans text-slate-400 font-bold select-none">
          {ranks.map(rank => (
            <div key={rank} className="h-[12.5%] flex items-center justify-center">{rank}</div>
          ))}
        </div>

        {/* Board Container */}
        <div className="border-[12px] border-slate-800 bg-slate-900 rounded-lg shadow-2xl">
            <div className="grid grid-cols-8 grid-rows-8 w-[90vw] h-[90vw] max-w-[75vh] max-h-[75vh] aspect-square">
            {board.map((row, rIndex) => (
                row.map((piece, cIndex) => {
                const isDark = (rIndex + cIndex) % 2 === 1;
                const file = files[cIndex];
                const rank = ranks[rIndex];
                const square = `${file}${rank}`;
                const isSelected = selected === square;
                const isLegalMove = validMoves.includes(square);
                const isCheck = checkSquare === square;
                
                // Professional Board Colors
                const bgColor = isDark ? 'bg-[#779954]' : 'bg-[#e9edcc]';

                return (
                    <div
                    key={`${rIndex}-${cIndex}`}
                    onClick={() => handleSquareClick(rIndex, cIndex)}
                    className={`${bgColor} relative flex items-center justify-center cursor-pointer overflow-hidden
                        ${isSelected ? 'ring-inset ring-4 ring-yellow-400 shadow-[inset_0_0_20px_rgba(250,204,21,0.5)]' : ''}
                    `}
                    >
                        {/* Legal Move Indicators - Enhanced Visuals */}
                        {isLegalMove && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                {piece ? (
                                    // Capture: Animated Radial Gradient Ring
                                    <div className="w-full h-full bg-[radial-gradient(circle,rgba(239,68,68,0)_30%,rgba(239,68,68,0.5)_100%)] animate-pulse border-4 border-red-500/50 rounded-full scale-90"></div>
                                ) : (
                                    // Move: Soft Glowing Dot
                                    <div className="w-[30%] h-[30%] bg-[#000000]/20 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)]"></div>
                                )}
                            </div>
                        )}
                        
                        {/* Selected Square subtle overlay */}
                        {isSelected && (
                            <div className="absolute inset-0 bg-yellow-400/10 pointer-events-none z-0"></div>
                        )}

                        {/* Check Indicator (Intense Red Glow) */}
                        {isCheck && (
                             <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(220,38,38,0.8)_0%,transparent_70%)] animate-pulse z-0"></div>
                        )}

                        {/* Piece Render */}
                        {piece && (
                            <div className={`w-[90%] h-[90%] z-20 ${isSelected ? '-translate-y-1 drop-shadow-2xl' : ''}`}>
                                {Pieces[piece]({ className: `w-full h-full drop-shadow-lg filter transition-all duration-300 ${isSelected ? 'scale-110' : 'hover:scale-105'}` })}
                            </div>
                        )}
                    </div>
                );
                })
            ))}
            </div>
        </div>

        {/* Files Labels */}
        <div className="flex justify-around w-full mt-2 text-base md:text-2xl font-sans text-slate-400 font-bold select-none">
          {files.map(file => (
            <div key={file} className="flex-1 text-center">{file}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function parseFEN(fen: string) {
    const rows = fen.split(' ')[0].split('/');
    const board: (string | null)[][] = [];
    
    for (const row of rows) {
        const boardRow: (string | null)[] = [];
        for (const char of row) {
            if (isNaN(Number(char))) {
                boardRow.push(char);
            } else {
                for (let i = 0; i < Number(char); i++) {
                    boardRow.push(null);
                }
            }
        }
        board.push(boardRow);
    }
    return board;
}