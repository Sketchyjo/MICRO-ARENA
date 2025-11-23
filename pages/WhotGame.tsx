import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../App';
import { gameEngine } from '../services/gameEngine';
import { WhotCard, MatchStatus, GameType } from '../types';
import { useNavigate } from 'react-router-dom';
import RulesModal from '../components/RulesModal';

// --- Assets & Icons ---
const getShapeColor = (shape: string) => {
  switch (shape) {
    case 'circle': return 'text-red-600'; 
    case 'triangle': return 'text-green-600'; 
    case 'star': return 'text-red-500'; 
    case 'square': return 'text-orange-600'; 
    case 'cross': return 'text-slate-800'; 
    default: return 'text-gray-800';
  }
};

const ShapeIcon = ({ shape, className }: { shape: string, className?: string }) => {
  switch (shape) {
    case 'circle': return <svg viewBox="0 0 100 100" className={className}><circle cx="50" cy="50" r="42" fill="currentColor" /></svg>;
    case 'triangle': return <svg viewBox="0 0 100 100" className={className}><polygon points="50,10 90,85 10,85" fill="currentColor" /></svg>;
    case 'square': return <svg viewBox="0 0 100 100" className={className}><rect x="15" y="15" width="70" height="70" rx="4" fill="currentColor" /></svg>;
    case 'star': return <svg viewBox="0 0 100 100" className={className}><polygon points="50,5 63,38 98,38 70,59 81,92 50,72 19,92 30,59 2,38 37,38" fill="currentColor" /></svg>;
    case 'cross': return <svg viewBox="0 0 100 100" className={className}><path d="M38,15 L62,15 L62,38 L85,38 L85,62 L62,62 L62,85 L38,85 L38,62 L15,62 L15,38 L38,38 Z" fill="currentColor"/></svg>;
    default: return null;
  }
};

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
      <div className="w-20 h-32 md:w-24 md:h-36 bg-[#8B0000] rounded-lg border-2 border-white/50 shadow-xl relative overflow-hidden transform transition-all duration-300">
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
      disabled={!isPlayable && !onClick}
      className={`relative w-20 h-32 md:w-24 md:h-36 bg-white rounded-lg shadow-md border border-slate-300 flex flex-col justify-between p-1.5 select-none transition-all duration-200 
      ${isSelected ? 'ring-4 ring-yellow-400 -translate-y-6 shadow-2xl z-20' : ''}
      ${isPlayable ? 'hover:-translate-y-4 hover:shadow-xl cursor-pointer ring-2 ring-emerald-400' : 'opacity-100 cursor-default'}
      `}
    >
      <div className={`flex flex-col items-center leading-none ${colorClass}`}>
        <span className="text-lg md:text-xl font-bold font-mono tracking-tighter">{card.number}</span>
        <ShapeIcon shape={card.shape} className="w-3 h-3 md:w-4 md:h-4" />
      </div>
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${colorClass}`}>
         <ShapeIcon shape={card.shape} className="w-10 h-10 md:w-14 md:h-14" />
      </div>
      <div className={`flex flex-col items-center leading-none rotate-180 ${colorClass}`}>
        <span className="text-lg md:text-xl font-bold font-mono tracking-tighter">{card.number}</span>
        <ShapeIcon shape={card.shape} className="w-3 h-3 md:w-4 md:h-4" />
      </div>
      {card.number === 20 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-500/30 text-5xl">👑</div>
      )}
    </button>
  );
};

export default function WhotGame() {
  const { setMatchState } = useApp();
  const navigate = useNavigate();
  
  // Game State
  const [deck, setDeck] = useState<WhotCard[]>([]);
  const [localHand, setLocalHand] = useState<WhotCard[]>([]);
  const [opponentHand, setOpponentHand] = useState<WhotCard[]>([]);
  const [discardPile, setDiscardPile] = useState<WhotCard[]>([]);
  
  const [turn, setTurn] = useState<'local' | 'opponent'>('local');
  const [message, setMessage] = useState("Game Start! Rules: 1 (Hold), 2/5 (Pick), 8 (Skip), 14 (Market), 20 (Whot)");
  const [isAnimating, setIsAnimating] = useState(false);
  const [pendingPickup, setPendingPickup] = useState(0); // For Pick 2/Pick 3
  const [requiredShape, setRequiredShape] = useState<string | null>(null); // For Whot(20)
  
  // Hard Mode State
  const [thinkingTime, setThinkingTime] = useState(0);
  
  // Rules Modal
  const [showRules, setShowRules] = useState(false);

  // Initialization
  useEffect(() => {
    const fullDeck = gameEngine.generateWhotDeck();
    const p1 = fullDeck.slice(0, 6);
    const p2 = fullDeck.slice(6, 12);
    const startCard = fullDeck[12];
    const remainingDeck = fullDeck.slice(13);

    setLocalHand(p1);
    setOpponentHand(p2);
    setDiscardPile([startCard]);
    setDeck(remainingDeck);
    
    // Auto-show rules on first load could be added here if desired
    // setShowRules(true);
  }, []);

  // Bot Turn Logic
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (turn === 'opponent') {
        const think = Math.random() * 1000 + 1000; // 1-2s
        setThinkingTime(think);
        timeout = setTimeout(playOpponentTurn, think);
    }
    return () => clearTimeout(timeout);
  }, [turn, deck, discardPile, opponentHand, pendingPickup, requiredShape]);

  // --- Helpers ---
  const getTopCard = () => discardPile[discardPile.length - 1];

  const reshuffleDeck = () => {
      if (discardPile.length <= 1) return;
      const top = discardPile[discardPile.length - 1];
      const toShuffle = discardPile.slice(0, -1);
      // Fisher-Yates
      for (let i = toShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
      }
      setDiscardPile([top]);
      setDeck(prev => [...prev, ...toShuffle]);
      setMessage("Deck Reshuffled!");
  };

  const drawCard = (player: 'local' | 'opponent', count: number = 1) => {
      let currentDeck = [...deck];
      let currentDiscard = [...discardPile];
      const drawnCards: WhotCard[] = [];

      for(let i=0; i<count; i++) {
        if (currentDeck.length === 0) {
            if (currentDiscard.length > 1) {
                const top = currentDiscard.pop()!;
                const toShuffle = currentDiscard;
                // Shuffle
                for (let k = toShuffle.length - 1; k > 0; k--) {
                    const j = Math.floor(Math.random() * (k + 1));
                    [toShuffle[k], toShuffle[j]] = [toShuffle[j], toShuffle[k]];
                }
                currentDeck = toShuffle;
                currentDiscard = [top];
            } else {
                setMessage("Market Empty! Cannot draw.");
                break;
            }
        }
        drawnCards.push(currentDeck.pop()!);
      }

      setDeck(currentDeck);
      setDiscardPile(currentDiscard);

      if (player === 'local') {
          setLocalHand(prev => [...prev, ...drawnCards]);
      } else {
          setOpponentHand(prev => [...prev, ...drawnCards]);
      }
      return drawnCards.length;
  };

  // --- Core Game Logic ---

  const handleDrawClick = () => {
      if (turn !== 'local') return;
      
      const count = pendingPickup > 0 ? pendingPickup : 1;
      
      drawCard('local', count);
      
      if (pendingPickup > 0) {
          setMessage(`You picked ${count} cards! Penalty Cleared.`);
          setPendingPickup(0);
          setTurn('opponent');
      } else {
          setMessage("You went to market.");
          setTurn('opponent');
      }
  };

  const checkMoveValidity = (card: WhotCard): boolean => {
      const topCard = getTopCard();
      
      // If pending penalty (Pick 2 or Pick 3), must play a card that matches number to defend/stack
      if (pendingPickup > 0) {
          return card.number === topCard.number || card.number === 20; // Allow 20 to defend? Rules vary. Lets say NO for 20, YES for same number. 
          // Actually, standard rule is you must play a 2 on a 2, or 5 on a 5.
          // We will implement simpler rule: You must play exact matching number to stack penalty.
      }

      // If Whot played previously, must match requested shape
      if (requiredShape) {
          return card.shape === requiredShape || card.number === 20;
      }

      return card.shape === topCard.shape || card.number === topCard.number || card.number === 20;
  };

  const executeCardEffect = (card: WhotCard, player: 'local' | 'opponent') => {
      let nextTurn = player === 'local' ? 'opponent' : 'local';
      let msg = "";

      // 1 (Hold On): Play again
      if (card.number === 1) {
          nextTurn = player;
          msg = "Hold On! Play again.";
      }
      // 2 (Pick Two)
      else if (card.number === 2) {
          setPendingPickup(prev => prev + 2);
          msg = "Pick Two!";
          // Next player must defend or pick. Turn passes to them.
      }
      // 5 (Pick Three)
      else if (card.number === 5) {
          setPendingPickup(prev => prev + 3);
          msg = "Pick Three!";
      }
      // 8 (Suspension): Skip next player
      else if (card.number === 8) {
          nextTurn = player; // In 2 player, skipping opponent means play again
          msg = "Suspension! Play again.";
      }
      // 14 (General Market)
      else if (card.number === 14) {
          // General Market: Opponent picks 1 immediately, but turn still passes normally? 
          // Usually in 1v1: Opponent picks 1, then it's their turn.
          drawCard(player === 'local' ? 'opponent' : 'local', 1);
          msg = "General Market! Opponent draws 1.";
      }
      // 20 (Whot): Request Shape
      else if (card.number === 20) {
           // Handled before calling this for player, handled inside AI for bot
      }

      // If we are not waiting for a shape selection (handled elsewhere for local), set requiredShape to null
      // unless it was a 20 which sets it.
      if (card.number !== 20) {
          setRequiredShape(null);
      }

      setMessage(msg || (nextTurn === 'local' ? "Your Turn" : "Opponent's Turn"));
      setTurn(nextTurn as any);
  };

  // Shape selection for Local Player
  const handleShapeSelection = (shape: string) => {
     setRequiredShape(shape);
     setMessage(`You called for ${shape.toUpperCase()}!`);
     // Now turn ends
     setTurn('opponent');
     setIsAnimating(false); // Hide modal
  };

  const playCard = (card: WhotCard) => {
    if (turn !== 'local' || isAnimating) return;
    
    if (!checkMoveValidity(card)) {
        setMessage("⚠️ Invalid Move!");
        setTimeout(() => setMessage(pendingPickup > 0 ? `Defend against Pick ${pendingPickup}!` : "Your Turn"), 1000);
        return;
    }

    // Stack defense check
    if (pendingPickup > 0) {
        if (card.number !== getTopCard().number) {
             setMessage("Must play matching number to defend!");
             return;
        }
    }

    setLocalHand(prev => prev.filter(c => c.id !== card.id));
    setDiscardPile(prev => [...prev, card]);

    if (localHand.length === 1) { // Will be 0 after update
        finishGame('local');
        return;
    }

    if (card.number === 20) {
        // Show Shape Selector Modal
        setIsAnimating(true); // Re-using this flag to block interaction and show modal
        return; 
    }

    executeCardEffect(card, 'local');
  };

  // --- AI LOGIC (Hard Mode) ---
  const playOpponentTurn = () => {
      const topCard = getTopCard();
      let hand = [...opponentHand];
      
      // 1. DEFENSE: Check for defense if pending pickup
      if (pendingPickup > 0) {
          const defenseCard = hand.find(c => c.number === topCard.number);
          if (defenseCard) {
              setOpponentHand(hand.filter(c => c.id !== defenseCard.id));
              setDiscardPile(prev => [...prev, defenseCard]);
              executeCardEffect(defenseCard, 'opponent');
              return;
          } else {
              // Failed to defend
              drawCard('opponent', pendingPickup);
              setPendingPickup(0);
              setMessage(`Opponent picked ${pendingPickup} cards!`);
              setTurn('local');
              return;
          }
      }

      // 2. OFFENSE / STRATEGY
      // Filter valid cards
      const validCards = hand.filter(c => {
         if (requiredShape) return c.shape === requiredShape || c.number === 20;
         return c.shape === topCard.shape || c.number === topCard.number || c.number === 20;
      });

      if (validCards.length > 0) {
          // AI Strategy: 
          // 1. If can finish, finish.
          // 2. If can play 1 or 8 (Extra turn), do it.
          // 3. If can attack with 2 or 5, do it.
          // 4. If can change shape to beneficial suit with 20, do it.
          // 5. Else play matching number to save shape for later? Or play matching shape.
          
          let bestCard = validCards.find(c => [1, 8].includes(c.number)); // Extra turns first
          if (!bestCard) bestCard = validCards.find(c => [2, 5].includes(c.number)); // Attack
          if (!bestCard) bestCard = validCards.find(c => c.number === 20 && hand.length > 1); // Use 20 to shift if not last card
          
          // Heuristic: Play the card that leaves us with the most options (keeping shapes we have multiples of)
          if (!bestCard) {
              // Count remaining shapes
              const counts: Record<string, number> = {};
              hand.forEach(c => counts[c.shape] = (counts[c.shape] || 0) + 1);
              
              // Prefer keeping the shape we have the MOST of, so discard others? 
              // Actually, in Whot, you want to discard what you have most of to ensure you don't get stuck?
              // Or change to what you have most of.
              // Let's simple play: Play card that matches current shape if possible, to save number matches for switching?
              bestCard = validCards.find(c => c.shape === (requiredShape || topCard.shape));
          }

          if (!bestCard) bestCard = validCards[0]; // Fallback

          setOpponentHand(hand.filter(c => c.id !== bestCard.id));
          setDiscardPile(prev => [...prev, bestCard]);

          if (hand.length === 1) {
              finishGame('opponent');
              return;
          }

          if (bestCard.number === 20) {
              const counts: Record<string, number> = {};
              hand.forEach(c => counts[c.shape] = (counts[c.shape] || 0) + 1);
              // Choose shape we have most of
              const bestShape = Object.keys(counts).length > 0 
                    ? Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) 
                    : 'circle';
              
              setRequiredShape(bestShape);
              setMessage(`Opponent calls for ${bestShape.toUpperCase()}!`);
              setTurn('local'); // Turn ends after 20
              return;
          }

          executeCardEffect(bestCard, 'opponent');
      } else {
          drawCard('opponent', 1);
          setMessage("Opponent went to market.");
          setTurn('local');
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
      <div className="absolute inset-0 z-0 bg-[url('https://img.freepik.com/free-photo/wood-texture-background_1154-855.jpg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <RulesModal 
        isOpen={showRules} 
        onClose={() => setShowRules(false)} 
        gameType={GameType.WHOT} 
      />

      {/* Header Area / Opponent */}
      <div className="relative z-10 py-4 flex flex-col items-center justify-start h-[25%]">
         {/* Rules Button */}
        <button 
            onClick={() => setShowRules(true)}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white border border-white/20 z-50 backdrop-blur-md"
            title="How to Play"
        >
            <span className="font-bold font-mono text-lg">?</span>
        </button>

        <div className="flex items-center gap-4 mb-2">
            <div className={`w-12 h-12 rounded-full border-2 ${turn === 'opponent' ? 'border-yellow-400 animate-pulse' : 'border-white/30'} bg-indigo-900 flex items-center justify-center overflow-hidden shadow-lg transition-all`}>
                <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=Felix`} alt="Opponent" />
            </div>
            <div className="bg-black/60 backdrop-blur-md px-4 py-1 rounded-full border border-white/10">
                <div className="text-white font-bold text-sm">Opponent {turn === 'opponent' && "🤔"}</div>
                <div className="text-white/60 text-xs font-mono">{opponentHand.length} Cards</div>
            </div>
        </div>
        <div className="flex justify-center -space-x-8 md:-space-x-10 transform scale-75 md:scale-90">
            {opponentHand.map((_, i) => (
                <div key={i} style={{ transform: `rotate(${(i - opponentHand.length/2) * 5}deg) translateY(${Math.abs(i - opponentHand.length/2) * 2}px)` }}>
                    <PlayingCard card={{id: 'x', shape: 'circle', number: 1, isSpecial: false}} isHidden={true} />
                </div>
            ))}
        </div>
      </div>

      {/* Center Table */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center gap-6">
        <div className={`px-8 py-3 rounded-full font-bold backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-300 border-2 transform mb-4 text-center max-w-sm ${
            message.includes("Invalid") ? "bg-red-600/90 border-red-400 text-white animate-shake" :
            message.includes("Pick") ? "bg-purple-600/90 border-purple-400 text-white scale-110" :
            turn === 'local' ? "bg-emerald-600/90 border-emerald-400 text-white scale-105" : 
            "bg-slate-800/80 border-slate-600 text-slate-300"
        }`}>
            {message}
            {pendingPickup > 0 && <div className="text-xs uppercase mt-1 text-yellow-300 font-black">Penalty: Pick {pendingPickup}</div>}
            {requiredShape && <div className="text-xs uppercase mt-1 text-yellow-300 font-black">Target: {requiredShape}</div>}
        </div>

        <div className="flex items-center gap-8 md:gap-12">
            {/* Draw Pile */}
            <div className="relative group">
                 {deck.length > 0 ? (
                     <>
                        <div onClick={handleDrawClick} className={`absolute top-0 left-0 w-full h-full z-20 cursor-pointer ${turn === 'local' ? 'hover:scale-105 transition-transform' : ''}`}></div>
                        <div className="absolute top-[-4px] left-[-4px] z-0 opacity-80"><PlayingCard card={{id: 'd1', shape: 'circle', number: 1, isSpecial: false}} isHidden={true} /></div>
                        <div className="absolute top-[-2px] left-[-2px] z-0 opacity-90"><PlayingCard card={{id: 'd2', shape: 'circle', number: 1, isSpecial: false}} isHidden={true} /></div>
                        <PlayingCard card={{id: 'd3', shape: 'circle', number: 1, isSpecial: false}} isHidden={true} />
                        <div className="absolute -bottom-8 w-full text-center text-white/80 font-bold text-sm bg-black/30 rounded-full px-2 pointer-events-none">
                            MARKET ({deck.length})
                        </div>
                     </>
                 ) : (
                     <div onClick={reshuffleDeck} className="w-20 h-32 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10">
                         <span className="text-white/50 text-xs font-bold">SHUFFLE</span>
                     </div>
                 )}
            </div>

            {/* Discard Pile */}
            <div className="relative">
                {discardPile.map((card, i) => {
                    if (i < discardPile.length - 4) return null; // optimize
                    const isTop = i === discardPile.length - 1;
                    return (
                        <div key={card.id} className={`absolute top-0 left-0 transition-all duration-300 ${isTop ? 'relative z-10' : 'z-0'}`}
                             style={{ transform: isTop ? 'none' : `rotate(${(i * 57) % 15 - 7}deg) translate(${(i * 3) % 5}px, ${(i * 2) % 5}px)` }}>
                            <PlayingCard card={card} />
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Player Hand */}
      <div className="relative z-20 h-[35%] bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end pb-4">
        <div className="absolute bottom-4 left-4 flex items-center gap-3 z-30 pointer-events-none">
            <div className={`w-12 h-12 rounded-full border-2 ${turn === 'local' ? 'border-emerald-400' : 'border-gray-500'} bg-indigo-900 flex items-center justify-center overflow-hidden shadow-lg`}>
                 <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=You`} alt="You" />
            </div>
            <div>
                <div className="text-white font-bold text-shadow">You</div>
                <div className="text-emerald-400 text-xs font-mono">My Turn: {turn === 'local' ? 'YES' : 'NO'}</div>
            </div>
        </div>

        <div className="flex justify-center items-end px-4 pb-2 overflow-x-auto no-scrollbar">
             <div className="flex -space-x-4 md:-space-x-8 min-w-max px-10 pb-4 pt-10">
                {localHand.map((card, i) => {
                    const isPlayable = turn === 'local' && checkMoveValidity(card);
                    return (
                        <div key={card.id} 
                            style={{ 
                                transformOrigin: 'bottom center',
                                transform: `rotate(${(i - (localHand.length - 1) / 2) * 5}deg) translateY(${Math.abs(i - (localHand.length - 1) / 2) * 5}px)` 
                            }}
                            className="transition-transform duration-300 hover:z-50 hover:scale-110 hover:-translate-y-8"
                        >
                            <PlayingCard card={card} onClick={() => playCard(card)} isPlayable={isPlayable} />
                        </div>
                    );
                })}
             </div>
        </div>
      </div>

      {/* Shape Selector Modal */}
      {isAnimating && turn === 'local' && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
              <div className="bg-slate-800 p-8 rounded-2xl border-2 border-yellow-400/50 shadow-2xl text-center">
                  <h3 className="text-2xl font-bold mb-6 text-white">Select a Shape (I NEED...)</h3>
                  <div className="grid grid-cols-3 gap-4">
                      {['circle', 'triangle', 'square', 'cross', 'star'].map(s => (
                          <button key={s} onClick={() => handleShapeSelection(s)} 
                            className={`p-4 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-white transition-all ${getShapeColor(s)}`}>
                              <div className="flex flex-col items-center">
                                  <ShapeIcon shape={s} className="w-12 h-12 mb-2" />
                                  <span className="uppercase font-bold text-xs">{s}</span>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
