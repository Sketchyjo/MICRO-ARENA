import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

interface PieceProps {
    position: [number, number, number];
    color: string;
    type: string;
}

// Simple geometric representation of pieces
const Piece: React.FC<PieceProps> = ({ position, color, type }) => {
    const ref = useRef<any>(null);
    
    // Animate selection or idle
    useFrame((state) => {
        if(ref.current) {
            ref.current.rotation.y += 0.01;
        }
    });

    return (
        <mesh position={position} ref={ref}>
            <boxGeometry args={[0.6, type === 'k' ? 1.5 : 0.8, 0.6]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
};

interface BoardSquareProps {
    position: [number, number, number];
    color: string;
}

const BoardSquare: React.FC<BoardSquareProps> = ({ position, color }) => {
    return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
};

// Mock Board State - 8x8
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

export default function ChessBoard() {
  return (
    <div className="w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden shadow-2xl border border-slate-700">
      <Canvas camera={{ position: [0, 8, 10], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <Stars />
        
        <group position={[-3.5, 0, -3.5]}>
            {/* Render Board */}
            {Array.from({ length: 8 }).map((_, row) => 
                Array.from({ length: 8 }).map((_, col) => (
                    <BoardSquare 
                        key={`${row}-${col}`} 
                        position={[col, 0, row]} 
                        color={(row + col) % 2 === 0 ? '#cbd5e1' : '#475569'} 
                    />
                ))
            )}

            {/* Render Pieces (Mock placement) */}
            {initialBoard.map((row, rIndex) => 
                row.map((piece, cIndex) => {
                    if (!piece) return null;
                    const isWhite = piece === piece.toUpperCase();
                    return (
                        <Piece 
                            key={`piece-${rIndex}-${cIndex}`}
                            position={[cIndex, 0.5, rIndex]}
                            color={isWhite ? '#ffffff' : '#1e293b'}
                            type={piece.toLowerCase()}
                        />
                    )
                })
            )}
        </group>
        
        <OrbitControls enableZoom={false} minPolarAngle={0} maxPolarAngle={Math.PI / 2.5} />
      </Canvas>
    </div>
  );
}