import React, { useState } from 'react';

// --- SVG PIECES ---
const Pieces: Record<string, (props: any) => React.ReactNode> = {
  // White Pieces
  P: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <path d="M22.5,9c-2.21,0-4,1.79-4,4 0,0.89,0.29,1.71,0.78,2.38C17.33,16.5,16,18.59,16,21c0,2.03,0.94,3.84,2.41,5.03-3,1.06-7.41,5.55-7.41,13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19,2.41-3,2.41-5.03 0-2.41-1.33-4.5-3.28-5.62C26.21,14.71,26.5,13.89,26.5,13c0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" strokeWidth="1.5" />
    </svg>
  ),
  R: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9,39h27v-3H9v3zM12,36v-4h21v4H12zM11,14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt" />
        <path d="M34,14l-3,3H14l-3-3" />
        <path d="M31,17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M31,29.5l1.5,2.5h-20l1.5-2.5" />
        <path d="M11,14h23" fill="none" stroke="#000" strokeLinejoin="miter" />
      </g>
    </svg>
  ),
  N: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
        <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,25.06 12.5,24 C 22,25 16.5,16 16.5,16" />
        <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill="#000" stroke="#000" />
        <path d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill="#000" stroke="#000" />
      </g>
    </svg>
  ),
  B: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#fff" stroke="#000" strokeLinecap="butt">
          <path d="M9,36c3.39-.97,9.11-1.45,13.5-1.45,4.38,0,10.11,.48,13.5,1.45V32H9v4z" />
          <path d="M15,32c2.5,2.5,12.5,2.5,15,0,.5-1.5,0-2,0-2H15s-.5,.5,0,2z" />
          <path d="M25,8a2.5,2.5,0,1,1-5,0,2.5,2.5,0,1,1,5,0z" />
        </g>
        <path d="M17.5,26h10M15,30h15m-7.5-14.5v5M20,18h5" strokeLinejoin="miter" />
        <path d="M20,15.5l5,.5a5.5,5.5,0,1,1-10,0l5-.5z" fill="#fff" stroke="#000" />
        <path d="M32,35.5H13" fill="none" stroke="#000" strokeWidth="1.5" />
      </g>
    </svg>
  ),
  Q: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#fff" stroke="#000" strokeLinecap="butt">
          <path d="M9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z" transform="translate(-1,-1)" />
          <path d="M9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z" transform="translate(15.5,-5.5)" />
          <path d="M9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z" transform="translate(32,-1)" />
          <path d="M9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z" transform="translate(7,-4.5)" />
          <path d="M9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z" transform="translate(24,-4)" />
          <path d="M9,26c8.5-1.5,21-1.5,27,0l2-12-7,11V11l-5.5,13.5-3-15-3,15-5.5-13.5V25l-7-11z" />
          <path d="M9,26c0,2,1.5,2,2.5,4 1,2.5,12.5,2.5,13.5,0 1-2,2.5-2,2.5-4-8.5-1.5-18.5-1.5-27,0z" />
          <path d="M11.5,30c3.5-1,18.5-1,22,0M12,33.5c6-1,15-1,21,0" fill="none" stroke="#000" />
        </g>
        <path d="M9,39h27v-3H9v3zM11,36v-4h23v4H11z" strokeLinecap="butt" />
        <path d="M12,32h21M11.5,36h22" fill="none" stroke="#000" strokeWidth="1.5" />
      </g>
    </svg>
  ),
  K: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5,11.63V6M20,8h5" strokeLinejoin="miter" />
        <path d="M22.5,25s4.5-7.5,3-10.5c0,0-1-2.5-3-2.5s-3,2.5-3,2.5c-1.5,3,3,10.5,3,10.5" fill="#fff" stroke="#000" strokeLinecap="butt" />
        <path d="M11.5,37c5.5,3.5,15.5,3.5,21,0v-7s9-4.5,6-10.5c-4-1-5,2-8,2s-4-3-8-3-5,2-8,2-2-2-2-6c-4,1-5,5-5,5s-4,2.5,6,10.5v7z" fill="#fff" stroke="#000" />
        <path d="M11.5,30c5.5-3,15.5-3,21,0m-21,3.5c5.5-3,15.5-3,21,0m-21,3.5c5.5-3,15.5-3,21,0" fill="none" stroke="#000" />
      </g>
    </svg>
  ),
  // Black Pieces
  p: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <path d="M22.5,9c-2.21,0-4,1.79-4,4 0,0.89,0.29,1.71,0.78,2.38C17.33,16.5,16,18.59,16,21c0,2.03,0.94,3.84,2.41,5.03-3,1.06-7.41,5.55-7.41,13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19,2.41-3,2.41-5.03 0-2.41-1.33-4.5-3.28-5.62C26.21,14.71,26.5,13.89,26.5,13c0-2.21-1.79-4-4-4z" fill="#000" stroke="#fff" strokeWidth="1.5" />
    </svg>
  ),
  r: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <g fill="#000" fillRule="evenodd" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9,39h27v-3H9v3zM12,36v-4h21v4H12zM11,14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt" />
        <path d="M34,14l-3,3H14l-3-3" />
        <path d="M31,17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M31,29.5l1.5,2.5h-20l1.5-2.5" />
        <path d="M11,14h23" fill="none" stroke="#fff" strokeLinejoin="miter" />
      </g>
    </svg>
  ),
  n: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <g fill="#000" fillRule="evenodd" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
        <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,25.06 12.5,24 C 22,25 16.5,16 16.5,16" />
        <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill="#fff" stroke="#fff" />
        <path d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill="#fff" stroke="#fff" />
      </g>
    </svg>
  ),
  b: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <g fill="#000" fillRule="evenodd" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#000" stroke="#fff" strokeLinecap="butt">
          <path d="M9,36c3.39-.97,9.11-1.45,13.5-1.45,4.38,0,10.11,.48,13.5,1.45V32H9v4z" />
          <path d="M15,32c2.5,2.5,12.5,2.5,15,0,.5-1.5,0-2,0-2H15s-.5,.5,0,2z" />
          <path d="M25,8a2.5,2.5,0,1,1-5,0,2.5,2.5,0,1,1,5,0z" />
        </g>
        <path d="M17.5,26h10M15,30h15m-7.5-14.5v5M20,18h5" strokeLinejoin="miter" />
        <path d="M20,15.5l5,.5a5.5,5.5,0,1,1-10,0l5-.5z" fill="#000" stroke="#fff" />
        <path d="M32,35.5H13" fill="none" stroke="#fff" strokeWidth="1.5" />
      </g>
    </svg>
  ),
  q: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <g fill="#000" fillRule="evenodd" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#000" stroke="#fff" strokeLinecap="butt">
          <path d="M9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z" transform="translate(-1,-1)" />
          <path d="M9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z" transform="translate(15.5,-5.5)" />
          <path d="M9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z" transform="translate(32,-1)" />
          <path d="M9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z" transform="translate(7,-4.5)" />
          <path d="M9 13 A 2 2 0 1 1  5,13 A 2 2 0 1 1  9 13 z" transform="translate(24,-4)" />
          <path d="M9,26c8.5-1.5,21-1.5,27,0l2-12-7,11V11l-5.5,13.5-3-15-3,15-5.5-13.5V25l-7-11z" />
          <path d="M9,26c0,2,1.5,2,2.5,4 1,2.5,12.5,2.5,13.5,0 1-2,2.5-2,2.5-4-8.5-1.5-18.5-1.5-27,0z" />
          <path d="M11.5,30c3.5-1,18.5-1,22,0M12,33.5c6-1,15-1,21,0" fill="none" stroke="#fff" />
        </g>
        <path d="M9,39h27v-3H9v3zM11,36v-4h23v4H11z" strokeLinecap="butt" />
        <path d="M12,32h21M11.5,36h22" fill="none" stroke="#fff" strokeWidth="1.5" />
      </g>
    </svg>
  ),
  k: (props) => (
    <svg viewBox="0 0 45 45" {...props}>
      <g fill="#000" fillRule="evenodd" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5,11.63V6M20,8h5" strokeLinejoin="miter" />
        <path d="M22.5,25s4.5-7.5,3-10.5c0,0-1-2.5-3-2.5s-3,2.5-3,2.5c-1.5,3,3,10.5,3,10.5" fill="#000" stroke="#fff" strokeLinecap="butt" />
        <path d="M11.5,37c5.5,3.5,15.5,3.5,21,0v-7s9-4.5,6-10.5c-4-1-5,2-8,2s-4-3-8-3-5,2-8,2-2-2-2-6c-4,1-5,5-5,5s-4,2.5,6,10.5v7z" fill="#000" stroke="#fff" />
        <path d="M11.5,30c5.5-3,15.5-3,21,0m-21,3.5c5.5-3,15.5-3,21,0m-21,3.5c5.5-3,15.5-3,21,0" fill="none" stroke="#fff" />
      </g>
    </svg>
  ),
};

const initialBoard = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

export default function ChessBoard2D() {
  const [board, setBoard] = useState(initialBoard);
  const [selected, setSelected] = useState<[number, number] | null>(null);

  const handleSquareClick = (row: number, col: number) => {
    // Simple move logic for visual effect
    if (selected) {
      const [sRow, sCol] = selected;
      const piece = board[sRow][sCol];
      
      if (piece) {
          // Create new board state
          const newBoard = [...board.map(r => [...r])];
          newBoard[row][col] = piece;
          newBoard[sRow][sCol] = null;
          setBoard(newBoard);
          setSelected(null);
      } else {
          setSelected(null);
      }
    } else {
      if (board[row][col]) {
        setSelected([row, col]);
      }
    }
  };

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Rank Coordinates (Left) */}
        <div className="absolute -left-8 top-0 bottom-6 flex flex-col justify-around text-xl font-sans text-slate-800 dark:text-slate-200">
          {ranks.map(rank => (
            <div key={rank} className="h-[12.5%] flex items-center">{rank}</div>
          ))}
        </div>

        {/* Board Container */}
        <div className="border-2 border-slate-900 bg-slate-900">
            <div className="grid grid-cols-8 grid-rows-8 w-[320px] h-[320px] md:w-[480px] md:h-[480px]">
            {board.map((row, rIndex) => (
                row.map((piece, cIndex) => {
                const isDark = (rIndex + cIndex) % 2 === 1;
                const isSelected = selected && selected[0] === rIndex && selected[1] === cIndex;
                
                // Colors based on screenshot: Light Blue & Dark Blue
                const bgColor = isDark ? 'bg-[#006699]' : 'bg-[#99CCFF]';

                return (
                    <div
                    key={`${rIndex}-${cIndex}`}
                    onClick={() => handleSquareClick(rIndex, cIndex)}
                    className={`${bgColor} relative flex items-center justify-center cursor-pointer select-none ${isSelected ? 'ring-4 ring-yellow-400 inset-0 z-10' : ''}`}
                    >
                    {piece && (
                        <div className="w-[85%] h-[85%] transition-transform duration-200 hover:scale-110">
                            {Pieces[piece]({ className: "w-full h-full drop-shadow-md" })}
                        </div>
                    )}
                    </div>
                );
                })
            ))}
            </div>
        </div>

        {/* File Coordinates (Bottom) */}
        <div className="flex justify-around w-[320px] md:w-[480px] mt-1 text-xl font-sans text-slate-800 dark:text-slate-200">
          {files.map(file => (
            <div key={file} className="flex-1 text-center">{file}</div>
          ))}
        </div>
      </div>
      
      <div className="text-[10px] text-slate-500 mt-4 font-serif">
         © Encyclopædia Britannica, Inc.
      </div>
    </div>
  );
}