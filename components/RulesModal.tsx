import React from 'react';
import { GameType } from '../types';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: GameType;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, gameType }) => {
  if (!isOpen) return null;

  const renderContent = () => {
    switch (gameType) {
      case GameType.WHOT:
        return (
          <div className="space-y-4 text-slate-300">
            <h3 className="text-xl font-bold text-white mb-2">Objective</h3>
            <p>Be the first player to empty your hand of cards.</p>
            
            <h3 className="text-xl font-bold text-white mb-2">How to Play</h3>
            <p>Match the active card on the pile by <strong>Shape</strong> (Circle, Triangle, Cross, Square, Star) or by <strong>Number</strong>.</p>
            
            <h3 className="text-xl font-bold text-white mb-2">Special Cards</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-yellow-400">1 (Hold On):</strong> You play again immediately.</li>
              <li><strong className="text-yellow-400">2 (Pick Two):</strong> Next player must draw 2 cards or defend with another 2.</li>
              <li><strong className="text-yellow-400">5 (Pick Three):</strong> Next player must draw 3 cards or defend with another 5.</li>
              <li><strong className="text-yellow-400">8 (Suspension):</strong> Skips the opponent's turn.</li>
              <li><strong className="text-yellow-400">14 (General Market):</strong> Opponent draws 1 card.</li>
              <li><strong className="text-yellow-400">20 (Whot):</strong> Wildcard. Can be played on anything. Allows you to request a specific shape.</li>
            </ul>
          </div>
        );
      case GameType.CHESS:
        return (
          <div className="space-y-4 text-slate-300">
            <h3 className="text-xl font-bold text-white mb-2">Objective</h3>
            <p>Checkmate the opponent's King. The King is under attack and cannot escape.</p>

            <h3 className="text-xl font-bold text-white mb-2">Movement</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <li><strong>King:</strong> 1 square any direction.</li>
              <li><strong>Queen:</strong> Any distance straight/diagonal.</li>
              <li><strong>Rook:</strong> Any distance straight.</li>
              <li><strong>Bishop:</strong> Any distance diagonal.</li>
              <li><strong>Knight:</strong> L-shape (jumps pieces).</li>
              <li><strong>Pawn:</strong> Forward 1 (2 on first move), capture diagonal.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mb-2">Special Moves</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Castling:</strong> Move King 2 squares towards a Rook (click King then Rook). Neither must have moved.</li>
              <li><strong>En Passant:</strong> Capture a pawn that moved 2 squares past yours.</li>
              <li><strong>Promotion:</strong> Pawn reaching end becomes Queen.</li>
            </ul>
             <p className="text-xs text-slate-400 mt-2">Touch-move rule applies: If you select a piece, move it if able.</p>
          </div>
        );
      case GameType.SURVEY:
        return (
          <div className="space-y-4 text-slate-300">
            <h3 className="text-xl font-bold text-white mb-2">Objective</h3>
            <p>Guess the most popular answers to survey questions before time runs out.</p>

            <h3 className="text-xl font-bold text-white mb-2">Scoring</h3>
            <p>Each answer is worth points based on popularity. The player with the highest total score after 5 rounds wins.</p>

            <h3 className="text-xl font-bold text-white mb-2">Hard Mode</h3>
            <p>The opponent (Bot) is aggressive and will accumulate points over time. You must be fast to outscore them!</p>
            
            <div className="bg-slate-800 p-3 rounded border border-slate-600">
                <strong>Tip:</strong> Type your answer and press Enter or click BUZZ. Partial matches often work (e.g., "Phone" for "Cell Phone").
            </div>
          </div>
        );
      default:
        return <p>No rules available.</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/50">
          <h2 className="text-2xl font-brand font-bold text-white tracking-wide">
             HOW TO PLAY
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-800/30">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;
