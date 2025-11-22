import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import { gameEngine } from '../services/gameEngine';
import { WhotCard, MatchStatus } from '../types';
import { useNavigate } from 'react-router-dom';

// --- Assets & Icons ---

// Authentic Nigerian Whot Colors
const getShapeColor = (shape: string) => {
  switch (shape) {
    case 'circle': return 'text-red-600'; // Circle is Red
    case 'triangle': return 'text-green-600'; // Triangle is Green
    case 'star': return 'text-red-500'; // Star is usually Red
    case 'square': return 'text-orange-600'; // Square is Orange/Brown
    case 'cross': return 'text-slate-800'; // Cross is Black/Grey
    default: return 'text-gray-800';
  }
};

const ShapeIcon = ({ shape, className }: { shape: string, className?: string }) => {
  switch (shape) {
    case 'circle':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="42" fill="currentColor" />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <polygon points="50,10 90,85 10,85" fill="currentColor" />
        </svg>
      );
    case 'square':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <rect x="15" y="15" width="70" height="70" rx="4" fill="currentColor" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <polygon points="50,5 63,38 98,38 70,59 81,92 50,72 19,92 30,59 2,38 37,38" fill="currentColor" />
        </svg>
      );
    case 'cross':
      return (
        <svg viewBox="0 0 100 100" className={className}>
           <path d="M38,15 L62,15 L62,38 L85,38 L85,62 L62,62 L62,85 L38,85 L38,62 L15,62 L15,38 L38,38 Z" fill="currentColor"/>
        </svg>
      );
    default:
      return null;
  }
};

// --- Card Component ---
interface CardProps {
  card: WhotCard;
  onClick?: () => void;
  isPlayable?: boolean;
  isHidden?: boolean;
  isSelected?: boolean;
}

const PlayingCard: React.FC<CardProps> = ({ card, onClick, isPlayable, isHidden, isSelected }) => {
  if (isHidden) {
    return (
      <div 
        className="w-20 h-32 md:w-24 md:h-36 bg-[#8B0000] rounded-lg border-2 border-white/50 shadow-xl relative overflow-hidden transform transition-all duration-300"
      >
         {/* Authentic Card Back Pattern */}
         <div className="absolute inset-1 border border-[#D4AF37]/40 rounded opacity-60 flex flex-col items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+CjxjaXJjbGUgY3g9IjUiIGN5PSI1IiByPSIxIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvc3ZnPg==')]">
            <div className="w-12 h-12 border-4 border-white/20 rounded-full flex items-center justify-center transform rotate-45">
                <div className="w-8 h-8 border-2 border-white/20 rounded-full"></div>
            </div>
         </div>
      </div>
    );
  }

  const colorClass = getShapeColor(card.shape);

  return (
    <button
      onClick={onClick}
      disabled={!isPlayable && !onClick} // Allow clicking if onClick is provided
      className={`relative w-20 h-32 md:w-24 md:h-36 bg-white rounded-lg shadow-md border border-slate-300 flex flex-col justify-between p-1.5 select-none transition-all duration-200 
      ${isSelected ? 'ring-4 ring-yellow-400 -translate-y-6 shadow-2xl z-20' : ''}
      ${isPlayable ? 'hover:-translate-y-4 hover:shadow-xl cursor-pointer' : 'opacity-100 cursor-default'}
      `}
    >
      {/* Top Left */}
      <div className={`flex flex-col items-center leading-none ${colorClass}`}>
        <span className="text-lg md:text-xl font-bold font-mono tracking-tighter">{card.number}</span>
        <ShapeIcon shape={card.shape} className="w-3 h-3 md:w-4 md:h-4" />
      </div>

      {/* Center Big Icon */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${colorClass}`}>
         <ShapeIcon shape={card.shape} className="w-10 h-10 md:w-14 md:h-14" />
      </div>

      {/* Bottom Right (Rotated) */}
      <div className={`flex flex-col items-center leading-none rotate-180 ${colorClass}`}>
        <span className="text-lg md:text-xl font-bold font-mono tracking-tighter">{card.number}</span>
        <ShapeIcon shape={card.shape} className="w-3 h-3 md:w-4 md:h-4" />
      </div>
      
      {/* Special Crown for 20 */}
      {card.number === 20 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-500/30 text-5xl">
              👑
          </div>
      )}
    </button>
  );
};

// --- Main Game Component ---

export default function WhotGame() {
  const { matchState, setMatchState } = useApp();
  const navigate = useNavigate();
  
  // Game State
  const [deck, setDeck] = useState<WhotCard[]>([]);
  const [localHand, setLocalHand] = useState<WhotCard[]>([]);
  const [opponentHand, setOpponentHand] = useState<WhotCard[]>([]); // Simulation
  const [discardPile, setDiscardPile] = useState<WhotCard[]>([]);
  
  const [turn, setTurn] = useState<'local' | 'opponent'>('local');
  const [message, setMessage] = useState("Game Start!");
  const [isAnimating, setIsAnimating] = useState(false);

  // Initialize Game
  useEffect(() => {
    // Generate full deck
    const fullDeck = gameEngine.generateWhotDeck();
    
    // Distribute
    const p1 = fullDeck.slice(0, 5);
    const p2 = fullDeck.slice(5, 10);
    const startCard = fullDeck[10];
    const remainingDeck = fullDeck.slice(11);

    setLocalHand(p1);
    setOpponentHand(p2);
    setDiscardPile([startCard]);
    setDeck(remainingDeck);
  }, []);

  // Bot Logic
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (turn === 'opponent') {
        timeout = setTimeout(playOpponentTurn, 1500);
    }
    return () => clearTimeout(timeout);
  }, [turn, deck, discardPile, opponentHand]);

  // --- Actions ---

  const getTopCard = () => discardPile[discardPile.length - 1];

  const reshuffleDeck = () => {
      if (discardPile.length <= 1) return; // Cannot reshuffle if only 1 card
      
      const top = discardPile[discardPile.length - 1];
      const toShuffle = discardPile.slice(0, -1);
      
      // Fisher-Yates shuffle
      for (let i = toShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
      }

      setDiscardPile([top]);
      setDeck(prev => [...prev, ...toShuffle]);
      setMessage("Deck Reshuffled!");
  };

  const handleDrawClick = () => {
      if (turn !== 'local') return;
      drawCard('local');
  };

  const drawCard = (player: 'local' | 'opponent') => {
      if (deck.length === 0) {
          if (discardPile.length > 1) {
              reshuffleDeck();
              setMessage("Deck Empty! Shuffling...");
              return; 
          } else {
              setMessage("General Market is Empty!");
              return;
          }
      }

      const newDeck = [...deck];
      const card = newDeck.pop();
      setDeck(newDeck);

      if (player === 'local' && card) {
          setLocalHand(prev => [...prev, card]);
          setMessage("You went to market!");
      } else if (player === 'opponent' && card) {
          setOpponentHand(prev => [...prev, card]);
          setMessage("Opponent went to market!");
      }
  };

  const playCard = (card: WhotCard) => {
    if (turn !== 'local' || isAnimating) return;
    
    const topCard = getTopCard();
    
    // Whot Rules: Match Shape OR Match Number OR Card is 20 (Whot)
    const isValid = card.shape === topCard.shape || card.number === topCard.number || card.number === 20;

    if (!isValid) {
        setMessage("⚠️ Invalid Card!");
        setTimeout(() => setMessage(prev => prev === "⚠️ Invalid Card!" ? "Your Turn" : prev), 1500);
        return;
    }

    // Play Logic
    setLocalHand(prev => prev.filter(c => c.id !== card.id));
    setDiscardPile(prev => [...prev, card]);
    
    // Check Win
    if (localHand.length === 1) { // 1 because filtering happens on state update
        finishGame('local');
        return;
    }

    setTurn('opponent');
    setMessage("Opponent's Turn");
  };

  const playOpponentTurn = () => {
      const topCard = getTopCard();
      const hand = [...opponentHand];
      
      // Find playable card
      const playableIndex = hand.findIndex(c => c.shape === topCard.shape || c.number === topCard.number || c.number === 20);

      if (playableIndex >= 0) {
          // Play
          const card = hand[playableIndex];
          const newHand = hand.filter((_, i) => i !== playableIndex);
          setOpponentHand(newHand);
          setDiscardPile(prev => [...prev, card]);

          if (newHand.length === 0) {
              finishGame('opponent');
          } else {
              setTurn('local');
              setMessage("Your Turn");
          }
      } else {
          // Draw logic
          if (deck.length > 0 || discardPile.length > 1) {
              drawCard('opponent');
              setTurn('local'); // Bot passes after drawing
              setMessage("Your Turn");
          } else {
              // Stuck, just pass
              setTurn('local');
              setMessage("Your Turn");
          }
      }
  };

  const finishGame = (winner: 'local' | 'opponent') => {
      setMatchState(prev => ({
          ...prev,
          status: MatchStatus.REVEALING,
          winner
      }));
      navigate('/results');
  };

  return (
    <div className="flex-1 flex flex-col w-full h-[85vh] relative rounded-xl overflow-hidden shadow-2xl border-4 border-[#3e2723]">
      {/* Wood Texture Background */}
      <div className="absolute inset-0 z-0 bg-[url('https://img.freepik.com/free-photo/wood-texture-background_1154-855.jpg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/20"></div> {/* Tint */}
      </div>

      {/* --- Opponent Area (Top) --- */}
      <div className="relative z-10 py-4 flex flex-col items-center justify-start h-[25%]">
        <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full border-2 border-white/30 bg-indigo-900 flex items-center justify-center overflow-hidden shadow-lg">
                <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=Felix`} alt="Opponent" />
            </div>
            <div className="bg-black/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/10">
                <div className="text-white font-bold text-sm">Opponent</div>
                <div className="text-white/60 text-xs font-mono">{opponentHand.length} Cards</div>
            </div>
        </div>
        
        {/* Opponent Hand (Hidden) */}
        <div className="flex justify-center -space-x-8 md:-space-x-10">
            {opponentHand.map((_, i) => (
                <div key={i} style={{ transform: `rotate(${(i - opponentHand.length/2) * 5}deg) translateY(${Math.abs(i - opponentHand.length/2) * 2}px)` }}>
                    <PlayingCard 
                        card={{id: 'x', shape: 'circle', number: 1, isSpecial: false}} 
                        isHidden={true} 
                    />
                </div>
            ))}
        </div>
      </div>

      {/* --- Center Table (Discard & Deck) --- */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center gap-6">
        
        {/* Toast Message */}
        <div className={`px-8 py-3 rounded-full font-bold backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-300 border-2 transform mb-4 ${
            message.includes("Invalid") ? "bg-red-600/90 border-red-400 text-white animate-shake" :
            message.includes("market") ? "bg-orange-500/90 border-orange-300 text-white scale-105" :
            turn === 'local' ? "bg-emerald-600/90 border-emerald-400 text-white scale-110" : 
            "bg-slate-800/80 border-slate-600 text-slate-300"
        }`}>
            {message}
        </div>

        <div className="flex items-center gap-8 md:gap-12">
            {/* Draw Pile (Market) */}
            <div className="relative group">
                 {deck.length > 0 ? (
                     <>
                        <div onClick={handleDrawClick} className="absolute top-0 left-0 w-full h-full z-20 cursor-pointer"></div>
                        {/* Stack Effect */}
                        <div className="absolute top-[-4px] left-[-4px] z-0 opacity-80">
                            <PlayingCard card={{id: 'd1', shape: 'circle', number: 1, isSpecial: false}} isHidden={true} />
                        </div>
                        <div className="absolute top-[-2px] left-[-2px] z-0 opacity-90">
                            <PlayingCard card={{id: 'd2', shape: 'circle', number: 1, isSpecial: false}} isHidden={true} />
                        </div>
                        <PlayingCard card={{id: 'd3', shape: 'circle', number: 1, isSpecial: false}} isHidden={true} />
                        
                        <div className="absolute -bottom-8 w-full text-center text-white/80 font-bold text-sm bg-black/30 rounded-full px-2">
                            MARKET
                        </div>
                     </>
                 ) : (
                     <div 
                        onClick={reshuffleDeck}
                        className="w-20 h-32 md:w-24 md:h-36 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10"
                     >
                         <span className="text-white/50 text-xs text-center font-bold px-1">RESHUFFLE</span>
                     </div>
                 )}
            </div>

            {/* Discard Pile */}
            <div className="relative">
                {discardPile.map((card, i) => {
                    // Only render top few cards to save DOM
                    if (i < discardPile.length - 3) return null;
                    const isTop = i === discardPile.length - 1;
                    return (
                        <div 
                            key={card.id} 
                            className={`absolute top-0 left-0 transition-all duration-300 ${isTop ? 'relative z-10' : 'z-0'}`}
                            style={{ 
                                transform: isTop ? 'none' : `rotate(${(i * 123) % 15 - 7}deg) translate(${(i * 3) % 5}px, ${(i * 2) % 5}px)` 
                            }}
                        >
                            <PlayingCard card={card} />
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* --- Player Hand (Bottom) --- */}
      <div className="relative z-20 h-[35%] bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end pb-4">
        
        {/* Player Info */}
        <div className="absolute bottom-4 left-4 flex items-center gap-3 z-30">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-400 bg-indigo-900 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                 <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=You`} alt="You" />
            </div>
            <div>
                <div className="text-white font-bold text-shadow">You</div>
                <div className="text-emerald-400 text-xs font-mono">Wins: 0</div>
            </div>
        </div>

        {/* Scrollable Hand */}
        <div className="flex justify-center items-end px-4 pb-2 overflow-x-auto no-scrollbar mask-linear-fade">
             <div className="flex -space-x-4 md:-space-x-6 min-w-max px-10 pb-4 pt-10">
                {localHand.map((card, i) => {
                    const topCard = getTopCard();
                    const isPlayable = turn === 'local' && (card.shape === topCard.shape || card.number === topCard.number || card.number === 20);
                    
                    return (
                        <div 
                            key={card.id} 
                            style={{ 
                                transformOrigin: 'bottom center',
                                transform: `rotate(${(i - (localHand.length - 1) / 2) * 3}deg) translateY(${Math.abs(i - (localHand.length - 1) / 2) * 5}px)` 
                            }}
                            className="transition-transform duration-300 hover:z-50 hover:scale-110 hover:-translate-y-8"
                        >
                            <PlayingCard 
                                card={card} 
                                onClick={() => playCard(card)} 
                                isPlayable={isPlayable}
                            />
                        </div>
                    );
                })}
             </div>
        </div>
      </div>
    </div>
  );
}