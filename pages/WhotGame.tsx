import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../App';
import { gameEngine } from '../services/gameEngine';
import { WhotCard, MatchStatus, GameType } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import RulesModal from '../components/RulesModal';
import { audioService } from '../services/audioService';
import { useGameFlow } from '../hooks/useGameFlow';
import MatchmakingModal from '../components/MatchmakingModal';
import GameHUD from '../components/GameHUD';
import ScoreSubmissionModal from '../components/ScoreSubmissionModal';
import { websocketClient } from '../services/websocketClient';

// --- VISUAL HELPERS ---
const getShapeColor = (shape: string) => {
    switch (shape) {
        case 'circle': return 'text-rose-600';
        case 'triangle': return 'text-emerald-600';
        case 'star': return 'text-amber-500';
        case 'square': return 'text-orange-600';
        case 'cross': return 'text-slate-800';
        default: return 'text-slate-800';
    }
};

const ShapeIcon = ({ shape, className }: { shape: string, className?: string }) => {
    switch (shape) {
        case 'circle': return <svg viewBox="0 0 100 100" className={className}><circle cx="50" cy="50" r="40" fill="currentColor" /></svg>;
        case 'triangle': return <svg viewBox="0 0 100 100" className={className}><path d="M50 15 L85 80 L15 80 Z" fill="currentColor" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" /></svg>;
        case 'square': return <svg viewBox="0 0 100 100" className={className}><rect x="20" y="20" width="60" height="60" rx="8" fill="currentColor" /></svg>;
        case 'star': return <svg viewBox="0 0 100 100" className={className}><path d="M50 10 L61 38 L91 38 L67 56 L76 84 L50 68 L24 84 L33 56 L9 38 L39 38 Z" fill="currentColor" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /></svg>;
        case 'cross': return <svg viewBox="0 0 100 100" className={className}><path d="M35 15 L65 15 L65 35 L85 35 L85 65 L65 65 L65 85 L35 85 L35 65 L15 65 L15 35 L35 35 Z" fill="currentColor" /></svg>;
        default: return null;
    }
};

interface CardProps {
    card: WhotCard;
    onClick?: () => void;
    isPlayable?: boolean;
    isHidden?: boolean;
    isSelected?: boolean;
    style?: React.CSSProperties;
}

const PlayingCard: React.FC<CardProps> = ({ card, onClick, isPlayable, isHidden, isSelected, style }) => {
    // Hidden Card (Card Back)
    if (isHidden) {
        return (
            <div
                style={style}
                className="w-24 h-36 md:w-32 md:h-48 rounded-xl relative overflow-hidden transform transition-all duration-300 shadow-xl border border-white/10"
            >
                {/* Card Back Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-900 to-red-800">
                    <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)',
                        backgroundSize: '10px 10px'
                    }}></div>
                    <div className="absolute inset-2 border-2 border-yellow-500/30 rounded-lg flex items-center justify-center">
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <span className="text-yellow-200 font-brand font-bold text-xl">W</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const colorClass = getShapeColor(card.shape);

    return (
        <div
            onClick={onClick}
            style={style}
            className={`
        relative w-24 h-36 md:w-32 md:h-48 bg-white rounded-xl shadow-2xl flex flex-col justify-between p-2 select-none transition-all duration-300 transform-gpu
        ${isSelected ? 'ring-4 ring-yellow-400 z-50 scale-110 -translate-y-10' : ''}
        ${isPlayable
                    ? 'cursor-pointer hover:-translate-y-8 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:z-40'
                    : 'cursor-default brightness-95'
                }
      `}
        >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none rounded-xl z-10"></div>

            {/* Top Left */}
            <div className={`flex flex-col items-center leading-none ${colorClass}`}>
                <span className="text-2xl font-black font-mono tracking-tighter">{card.number}</span>
                <ShapeIcon shape={card.shape} className="w-4 h-4" />
            </div>

            {/* Center Art */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${colorClass} flex flex-col items-center justify-center w-full`}>
                <div className="relative">
                    <ShapeIcon shape={card.shape} className="w-14 h-14 md:w-20 md:h-20 drop-shadow-md" />
                    {/* Special Card Badge */}
                    {card.isSpecial && (
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase rounded-full shadow-sm tracking-wider">
                            {card.number === 20 ? 'WHOT' : card.number === 1 ? 'HOLD' : card.number === 2 ? 'PICK 2' : card.number === 5 ? 'PICK 3' : card.number === 8 ? 'SKIP' : 'MARKET'}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Right (Inverted) */}
            <div className={`flex flex-col items-center leading-none rotate-180 ${colorClass}`}>
                <span className="text-2xl font-black font-mono tracking-tighter">{card.number}</span>
                <ShapeIcon shape={card.shape} className="w-4 h-4" />
            </div>

            {/* Whot Crown */}
            {card.number === 20 && (
                <div className="absolute top-2 right-2 text-yellow-500 animate-pulse">👑</div>
            )}
        </div>
    );
};

export default function WhotGame() {
    const { wallet, setMatchState } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const isSpectator = location.state?.isSpectator || false;

    // Production-ready game flow
    const { gameState, sendMove, submitScore, resignGame: handleResignGame } = useGameFlow();
    const [showMatchmaking, setShowMatchmaking] = useState(!isSpectator);
    const [showScoreSubmission, setShowScoreSubmission] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
    const [gameStarted, setGameStarted] = useState(isSpectator);

    // Redirect to home if wallet is not connected
    useEffect(() => {
        if (!wallet) {
            navigate('/');
        }
    }, [wallet, navigate]);

    // Game State
    const [deck, setDeck] = useState<WhotCard[]>([]);
    const [localHand, setLocalHand] = useState<WhotCard[]>([]);
    const [opponentHand, setOpponentHand] = useState<WhotCard[]>([]);
    const [discardPile, setDiscardPile] = useState<WhotCard[]>([]);

    const [turn, setTurn] = useState<'local' | 'opponent'>('local');
    const [message, setMessage] = useState(isSpectator ? "Spectating Match..." : "Waiting for match...");
    const [isAnimating, setIsAnimating] = useState(false);
    const [pendingPickup, setPendingPickup] = useState(0);
    const [requiredShape, setRequiredShape] = useState<string | null>(null);
    const [showRules, setShowRules] = useState(false);

    // Animation State for "Popups"
    const [effectPopup, setEffectPopup] = useState<{ text: string, color: string } | null>(null);

    // Handle match found - start game immediately
    useEffect(() => {
        if (gameState?.status === 'MATCHED' && !gameStarted) {
            console.log('🎮 Match found, starting game immediately');
            setShowMatchmaking(false);
            setGameStarted(true);

            // Small delay to ensure server state is received
            setTimeout(() => {
                initializeGame();
                setMessage(gameState?.isPlayer1 ? "Your turn!" : "Opponent's turn");
                audioService.playShuffle();
            }, 100);
        }
    }, [gameState?.status, gameStarted]);

    // Timer countdown - start when game starts
    useEffect(() => {
        if (gameStarted && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        // handleGameEnd('opponent', 0); // Timeout loss
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameStarted, timeLeft]);

    // Listen for game:start event from server
    useEffect(() => {
        if (!gameState?.matchId) return;

        const handleGameStart = (data: any) => {
            console.log('🎮 Game start event received:', data);
            if (data.gameState) {
                // Store server state for initialization
                (window as any).__serverGameState = data.gameState;
                // Initialize the game if not already started
                if (!gameStarted) {
                    setGameStarted(true);
                    setTimeout(() => {
                        initializeGame();
                        audioService.playShuffle();
                    }, 100);
                }
            }
        };

        websocketClient.socket?.on('game:start', handleGameStart);

        return () => {
            websocketClient.socket?.off('game:start', handleGameStart);
        };
    }, [gameState?.matchId, gameStarted]);

    // Listen for opponent moves via WebSocket
    useEffect(() => {
        if (!gameState?.matchId) return;

        const handleOpponentMove = (data: any) => {
            console.log('📥 Received opponent move:', data);
            const { move, gameState: serverGameState } = data;

            if (move.type === 'PLAY_CARD') {
                const card = move.card as WhotCard;
                audioService.playCardFlip();
                
                // Update discard pile with the played card
                setDiscardPile(prev => [...prev, card]);
                
                // Remove one card from opponent's hand
                setOpponentHand(prev => prev.slice(0, -1));

                // Handle WHOT card shape selection
                if (move.requiredShape) {
                    setRequiredShape(move.requiredShape);
                    triggerEffectPopup(`NEED ${move.requiredShape.toUpperCase()}`, "bg-yellow-500 text-black");
                } else {
                    setRequiredShape(null);
                }

                // Show special card effects (UI only)
                if (card.number === 1) {
                    audioService.playSpecialCard();
                    triggerEffectPopup("HOLD ON", "bg-indigo-500");
                } else if (card.number === 2) {
                    audioService.playSpecialCard();
                    triggerEffectPopup("PICK 2", "bg-rose-500");
                } else if (card.number === 5) {
                    audioService.playSpecialCard();
                    triggerEffectPopup("PICK 3", "bg-rose-600");
                } else if (card.number === 8) {
                    audioService.playSpecialCard();
                    triggerEffectPopup("SKIP", "bg-amber-500");
                } else if (card.number === 14) {
                    audioService.playSpecialCard();
                    triggerEffectPopup("MARKET", "bg-purple-500");
                }

                // Server will send game:complete event if game ended
            } else if (move.type === 'DRAW_CARD') {
                // Opponent drew cards - add placeholder cards to their hand
                const count = move.count || 1;
                setOpponentHand(prev => [
                    ...prev,
                    ...Array(count).fill(null).map((_, i) => ({
                        id: `drawn-${Date.now()}-${i}`,
                        shape: 'circle',
                        number: 1,
                        isSpecial: false
                    }))
                ]);
            }
            
            // Turn will be synced via game:state_update event
        };

        websocketClient.onOpponentMove(handleOpponentMove);

        // Listen for full state updates
        const handleStateUpdate = (data: any) => {
            console.log('📥 Received state update:', data);
            if (data.gameState) {
                const isPlayer1 = (window as any).__isPlayer1 ?? (gameState?.isPlayer1);
                const serverTurn = data.currentTurn === 'player1' ? (isPlayer1 ? 'local' : 'opponent') : (isPlayer1 ? 'opponent' : 'local');

                // Sync turn
                if (turn !== serverTurn) {
                    console.log('🔄 Syncing turn with server:', serverTurn);
                    setTurn(serverTurn);
                    setMessage(serverTurn === 'local' ? "Your turn!" : "Opponent's turn");
                }

                // Sync local hand from server (for drawn cards)
                const myServerHand = isPlayer1 ? data.gameState.player1Hand : data.gameState.player2Hand;
                if (myServerHand && myServerHand.length > localHand.length) {
                    console.log('🔄 Syncing local hand - new cards drawn');
                    const convertCard = (card: any, index: number) => ({
                        id: `${card.shape}-${card.number}-${Date.now()}-${index}`,
                        shape: card.shape,
                        number: card.number,
                        isSpecial: [1, 2, 5, 8, 14, 20].includes(card.number)
                    });
                    setLocalHand(myServerHand.map(convertCard));
                }

                // Sync opponent hand count from server state
                if (data.gameState.player1Hand && data.gameState.player2Hand) {
                    const opponentHandCount = isPlayer1 ? data.gameState.player2Hand.length : data.gameState.player1Hand.length;
                    if (opponentHand.length !== opponentHandCount) {
                        console.log('🔄 Syncing opponent hand count:', opponentHandCount);
                        setOpponentHand(prev => {
                            const diff = opponentHandCount - prev.length;
                            if (diff > 0) {
                                return [...prev, ...Array(diff).fill(null).map((_, i) => ({ 
                                    id: `placeholder-${Date.now()}-${i}`, 
                                    shape: 'circle', 
                                    number: 1, 
                                    isSpecial: false 
                                }))];
                            } else if (diff < 0) {
                                return prev.slice(0, opponentHandCount);
                            }
                            return prev;
                        });
                    }
                }

                // Sync discard pile top card
                if (data.gameState.discardPile?.length > 0) {
                    const serverTopCard = data.gameState.discardPile[data.gameState.discardPile.length - 1];
                    const localTopCard = discardPile[discardPile.length - 1];
                    if (!localTopCard || serverTopCard.shape !== localTopCard.shape || serverTopCard.number !== localTopCard.number) {
                        console.log('🔄 Syncing discard pile');
                        const convertCard = (card: any, index: number) => ({
                            id: `discard-${card.shape}-${card.number}-${index}`,
                            shape: card.shape,
                            number: card.number,
                            isSpecial: [1, 2, 5, 8, 14, 20].includes(card.number)
                        });
                        setDiscardPile(data.gameState.discardPile.map(convertCard));
                    }
                }

                // Sync pending pickup if available
                if (data.gameState.pendingPickup !== undefined && data.gameState.pendingPickup !== pendingPickup) {
                    console.log('🔄 Syncing pending pickup:', data.gameState.pendingPickup);
                    setPendingPickup(data.gameState.pendingPickup);
                }

                // Sync required shape if available
                if (data.gameState.requiredShape !== undefined && data.gameState.requiredShape !== requiredShape) {
                    console.log('🔄 Syncing required shape:', data.gameState.requiredShape);
                    setRequiredShape(data.gameState.requiredShape);
                }
            }
        };

        websocketClient.socket?.on('game:state_update', handleStateUpdate);

        return () => {
            websocketClient.off('game:opponent_move');
            websocketClient.socket?.off('game:state_update', handleStateUpdate);
        };
    }, [gameState?.matchId, gameState?.isPlayer1, turn, localHand.length, opponentHand.length, pendingPickup, requiredShape]);

    // Listen for game completion event from server
    useEffect(() => {
        if (!gameState?.matchId) return;

        const handleGameComplete = (data: any) => {
            console.log('🏆 Game complete event received:', data);
            
            // Determine if local player won based on scores
            const isPlayer1 = (window as any).__isPlayer1 ?? gameState?.isPlayer1;
            const myScore = isPlayer1 ? data.scores?.player1 : data.scores?.player2;
            const opponentScore = isPlayer1 ? data.scores?.player2 : data.scores?.player1;
            
            const winner = myScore > opponentScore ? 'local' : 'opponent';
            
            // Calculate final score for submission
            const score = myScore || calculateScore(winner);
            setFinalScore(score);
            setMessage(winner === 'local' ? "🎉 You Won!" : "😔 You Lost");
            
            if (winner === 'local') {
                audioService.playWin();
            } else {
                audioService.playLoss();
            }
            
            // Show score submission modal
            setShowScoreSubmission(true);
        };

        websocketClient.socket?.on('game:complete', handleGameComplete);

        return () => {
            websocketClient.socket?.off('game:complete', handleGameComplete);
        };
    }, [gameState?.matchId, gameState?.isPlayer1]);

    // Initialization
    const initializeGame = () => {
        // Check if we have server-generated game state
        const serverState = (window as any).__serverGameState;
        const isPlayer1 = (window as any).__isPlayer1;

        if (serverState) {
            console.log('🎮 Using server game state:', serverState);
            console.log('🎮 Is Player 1:', isPlayer1);
            console.log('🎮 Player 1 hand:', serverState.player1Hand);
            console.log('🎮 Player 2 hand:', serverState.player2Hand);
            console.log('🎮 Discard pile:', serverState.discardPile);
            console.log('🎮 Deck remaining:', serverState.deck.length, 'cards');

            // Use the server's deck and hands
            const myHand = isPlayer1 ? serverState.player1Hand : serverState.player2Hand;
            const opponentHandCards = isPlayer1 ? serverState.player2Hand : serverState.player1Hand;

            // Convert server cards to client format
            const convertCard = (card: any, index: number) => ({
                id: `${card.shape}-${card.number}-${index}`,
                shape: card.shape,
                number: card.number,
                isSpecial: card.special !== undefined || [1, 2, 5, 8, 14, 20].includes(card.number)
            });

            setLocalHand(myHand.map(convertCard));
            setOpponentHand(opponentHandCards.map((c: any, i: number) => convertCard(c, i + 100)));

            // Set the discard pile from server state
            if (serverState.discardPile && serverState.discardPile.length > 0) {
                console.log('✅ Using server discard pile with', serverState.discardPile.length, 'cards');
                setDiscardPile(serverState.discardPile.map((c: any, i: number) => convertCard(c, i + 200)));
            } else {
                console.warn('⚠️ Server discard pile is empty, this should not happen!');
                // Fallback: take first card from deck (should not happen with fixed server)
                if (serverState.deck && serverState.deck.length > 0) {
                    const firstCard = serverState.deck[0];
                    setDiscardPile([convertCard(firstCard, 200)]);
                    setDeck(serverState.deck.slice(1).map((c: any, i: number) => convertCard(c, i + 300)));
                }
            }

            // Set the remaining deck
            if (serverState.deck && serverState.deck.length > 0) {
                setDeck(serverState.deck.map((c: any, i: number) => convertCard(c, i + 300)));
            }

            setTurn(isPlayer1 ? 'local' : 'opponent');
            setMessage(isPlayer1 ? "Your turn!" : "Opponent's turn");

            console.log('✅ Game initialized successfully');
            console.log('   - My hand:', myHand.length, 'cards');
            console.log('   - Opponent hand:', opponentHandCards.length, 'cards');
            console.log('   - Discard pile:', serverState.discardPile?.length || 0, 'cards');
            console.log('   - Deck:', serverState.deck?.length || 0, 'cards');

            // Clear the server state from window
            delete (window as any).__serverGameState;
            delete (window as any).__isPlayer1;
        } else {
            // Fallback to local generation (for testing/spectator mode)
            console.warn('⚠️ No server state found! Using local deck generation (NOT recommended for multiplayer)');
            const fullDeck = gameEngine.generateWhotDeck();
            const p1 = fullDeck.slice(0, 6);
            const p2 = fullDeck.slice(6, 12);
            const startCard = fullDeck[12];
            const remainingDeck = fullDeck.slice(13);

            setLocalHand(p1);
            setOpponentHand(p2);
            setDiscardPile([startCard]);
            setDeck(remainingDeck);
            setTurn(gameState?.isPlayer1 ? 'local' : 'opponent');
            setMessage(gameState?.isPlayer1 ? "Your turn!" : "Opponent's turn");
        }
    };

    // Bot & Spectator Logic (for testing/spectator mode only)
    useEffect(() => {
        // Don't use bot in multiplayer mode - check both matchId and status
        if (gameState?.matchId || gameState?.status === 'MATCHED' || gameState?.status === 'ACTIVE') return;

        let timeout: ReturnType<typeof setTimeout>;
        if (turn === 'opponent') {
            const think = Math.random() * 1000 + 1500;
            timeout = setTimeout(() => playBotTurn('opponent'), think);
        }
        return () => clearTimeout(timeout);
    }, [turn, deck, discardPile, opponentHand, pendingPickup, requiredShape, gameState?.matchId, gameState?.status]);

    useEffect(() => {
        if (!isSpectator || gameState?.matchId || gameState?.status === 'MATCHED') return;

        let timeout: ReturnType<typeof setTimeout>;
        if (turn === 'local') {
            const think = Math.random() * 1000 + 1500;
            timeout = setTimeout(() => playBotTurn('local'), think);
        }
        return () => clearTimeout(timeout);
    }, [turn, isSpectator, deck, discardPile, localHand, pendingPickup, requiredShape, gameState?.matchId, gameState?.status]);

    // --- Helpers ---
    const getTopCard = () => discardPile[discardPile.length - 1];

    const triggerEffectPopup = (text: string, color: string) => {
        setEffectPopup({ text, color });
        setTimeout(() => setEffectPopup(null), 1500);
    };

    const reshuffleDeck = () => {
        if (discardPile.length <= 1) return;
        audioService.playShuffle();
        const top = discardPile[discardPile.length - 1];
        const toShuffle = discardPile.slice(0, -1);
        // Modern Fisher-Yates shuffle
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

        audioService.playCardFlip();

        for (let i = 0; i < count; i++) {
            if (currentDeck.length === 0) {
                if (currentDiscard.length > 1) {
                    const top = currentDiscard.pop()!;
                    const toShuffle = currentDiscard.sort(() => Math.random() - 0.5);
                    currentDeck = toShuffle;
                    currentDiscard = [top];
                } else {
                    setMessage("Market Empty!");
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

    const handleDrawClick = () => {
        if (turn !== 'local' || isSpectator) return;

        const count = pendingPickup > 0 ? pendingPickup : 1;

        // In multiplayer mode, send to server and wait for state sync
        if (gameState?.matchId || gameState?.status === 'MATCHED') {
            console.log('📤 Sending draw request to server:', count);
            sendMove({
                type: 'DRAW_CARD',
                count: count
            });
            
            // Show feedback immediately
            if (pendingPickup > 0) {
                triggerEffectPopup(`Picking ${count}...`, 'bg-red-500');
            } else {
                setMessage("Going to market...");
            }
            // State will be synced via game:state_update
            return;
        }

        // Single player / bot mode - draw locally
        drawCard('local', count);

        if (pendingPickup > 0) {
            triggerEffectPopup(`Picked ${count}`, 'bg-red-500');
            setMessage(`Penalty Cleared.`);
            setPendingPickup(0);
            setTurn('opponent');
        } else {
            setMessage("You went to market.");
            setTurn('opponent');
        }
    };

    const checkMoveValidity = (card: WhotCard): boolean => {
        const topCard = getTopCard();
        if (pendingPickup > 0) return card.number === topCard.number || card.number === 20;
        if (requiredShape) return card.shape === requiredShape || card.number === 20;
        return card.shape === topCard.shape || card.number === topCard.number || card.number === 20;
    };

    const executeCardEffect = (card: WhotCard, player: 'local' | 'opponent') => {
        let nextTurn = player === 'local' ? 'opponent' : 'local';
        let msg = "";

        if (card.isSpecial) audioService.playSpecialCard();

        if (card.number === 1) {
            nextTurn = player;
            msg = "Hold On! Play again.";
            triggerEffectPopup("HOLD ON", "bg-indigo-500");
        }
        else if (card.number === 2) {
            setPendingPickup(prev => prev + 2);
            msg = "Pick Two!";
            triggerEffectPopup("PICK 2", "bg-rose-500");
        }
        else if (card.number === 5) {
            setPendingPickup(prev => prev + 3);
            msg = "Pick Three!";
            triggerEffectPopup("PICK 3", "bg-rose-600");
        }
        else if (card.number === 8) {
            nextTurn = player;
            msg = "Suspension! Play again.";
            triggerEffectPopup("SKIP", "bg-amber-500");
        }
        else if (card.number === 14) {
            drawCard(player === 'local' ? 'opponent' : 'local', 1);
            msg = "General Market! Opponent draws 1.";
            triggerEffectPopup("MARKET", "bg-purple-500");
        }

        if (card.number !== 20) {
            setRequiredShape(null);
        }

        setMessage(msg || (nextTurn === 'local' ? (isSpectator ? "P1 Turn" : "Your Turn") : "Opponent's Turn"));
        setTurn(nextTurn as any);
    };

    const playCard = (card: WhotCard) => {
        // Validate it's the player's turn
        if (turn !== 'local') {
            audioService.playError();
            triggerEffectPopup("NOT YOUR TURN", "bg-red-600");
            setMessage("Wait for your turn!");
            return;
        }

        // Prevent moves while animating or in spectator mode
        if (isAnimating || isSpectator) return;

        // Validate move is legal
        if (!checkMoveValidity(card)) {
            audioService.playError();
            triggerEffectPopup("INVALID", "bg-slate-700");
            return;
        }

        // Validate penalty defense
        if (pendingPickup > 0 && card.number !== getTopCard().number) {
            audioService.playError();
            setMessage("Must play matching number!");
            return;
        }

        audioService.playCardFlip();
        setLocalHand(prev => prev.filter(c => c.id !== card.id));
        setDiscardPile(prev => [...prev, card]);

        // WHOT card - wait for shape selection before sending to server
        if (card.number === 20) {
            audioService.playSpecialCard();
            setIsAnimating(true);
            return;
        }

        // Send move via WebSocket in multiplayer mode
        if (gameState?.matchId || gameState?.status === 'MATCHED') {
            sendMove({
                type: 'PLAY_CARD',
                card: { shape: card.shape, number: card.number },
                requiredShape: null
            });
            
            // If this was the last card, server will send game:complete event
            // Don't call handleGameEnd locally - wait for server confirmation
            if (localHand.length === 1) {
                setMessage("🎉 You Won! Waiting for confirmation...");
                audioService.playWin();
                return;
            }
        } else {
            // Single player mode - handle locally
            if (localHand.length === 1) {
                handleGameEnd('local');
                return;
            }
        }

        executeCardEffect(card, 'local');
    };

    const handleShapeSelection = (shape: string) => {
        setRequiredShape(shape);
        triggerEffectPopup(`I NEED ${shape.toUpperCase()}`, "bg-yellow-500 text-black");
        setTurn('opponent');
        setIsAnimating(false);

        // Send WHOT card with shape selection via WebSocket
        if (gameState?.matchId || gameState?.status === 'MATCHED') {
            const lastCard = discardPile[discardPile.length - 1];
            sendMove({
                type: 'PLAY_CARD',
                card: { shape: lastCard.shape, number: lastCard.number },
                requiredShape: shape
            });
        }
    };

    // --- GENERIC BOT LOGIC ---
    const playBotTurn = (player: 'local' | 'opponent') => {
        const hand = player === 'local' ? [...localHand] : [...opponentHand];
        const topCard = getTopCard();
        const setHand = player === 'local' ? setLocalHand : setOpponentHand;

        // 1. Defend
        if (pendingPickup > 0) {
            const defenseCard = hand.find(c => c.number === topCard.number);
            if (defenseCard) {
                audioService.playCardFlip();
                setHand(hand.filter(c => c.id !== defenseCard.id));
                setDiscardPile(prev => [...prev, defenseCard]);
                executeCardEffect(defenseCard, player);
                return;
            } else {
                drawCard(player, pendingPickup);
                triggerEffectPopup(`PICKED ${pendingPickup}`, "bg-red-500");
                setPendingPickup(0);
                setTurn(player === 'local' ? 'opponent' : 'local');
                return;
            }
        }

        // 2. Strategy
        const validCards = hand.filter(c => {
            if (requiredShape) return c.shape === requiredShape || c.number === 20;
            return c.shape === topCard.shape || c.number === topCard.number || c.number === 20;
        });

        if (validCards.length > 0) {
            let bestCard = validCards.find(c => [1, 8].includes(c.number));
            if (!bestCard) bestCard = validCards.find(c => [2, 5].includes(c.number));
            if (!bestCard) bestCard = validCards.find(c => c.number === 20 && hand.length > 1);
            if (!bestCard) bestCard = validCards.find(c => c.shape === (requiredShape || topCard.shape));
            if (!bestCard) bestCard = validCards[0];

            audioService.playCardFlip();
            setHand(hand.filter(c => c.id !== bestCard.id));
            setDiscardPile(prev => [...prev, bestCard]);

            if (hand.length === 1) {
                handleGameEnd(player);
                return;
            }

            if (bestCard.number === 20) {
                const counts: Record<string, number> = {};
                hand.forEach(c => counts[c.shape] = (counts[c.shape] || 0) + 1);
                const bestShape = Object.keys(counts).length > 0
                    ? Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b)
                    : 'circle';

                setRequiredShape(bestShape);
                triggerEffectPopup(`NEED ${bestShape.toUpperCase()}`, "bg-yellow-500 text-black");
                setTurn(player === 'local' ? 'opponent' : 'local');
                return;
            }
            executeCardEffect(bestCard, player);
        } else {
            drawCard(player, 1);
            setMessage(`${player === 'local' ? 'P1' : 'Opponent'} went to market.`);
            setTurn(player === 'local' ? 'opponent' : 'local');
        }
    };

    // Calculate WHOT score (0-1000 points)
    const calculateScore = (winner: 'local' | 'opponent'): number => {
        if (winner === 'local') {
            // Winner: 1000 - (cards remaining × 50)
            const cardsRemaining = localHand.length;
            return Math.max(0, 1000 - (cardsRemaining * 50));
        } else {
            // Loser: cards remaining × 10
            const cardsRemaining = localHand.length;
            return Math.min(1000, cardsRemaining * 10);
        }
    };

    const handleGameEnd = (winner: 'local' | 'opponent') => {
        const score = calculateScore(winner);
        setFinalScore(score);
        setMessage(winner === 'local' ? "🎉 You Won!" : "😔 You Lost");

        // Show score submission modal in production mode
        if (gameState?.matchId) {
            setShowScoreSubmission(true);
        } else {
            // Legacy mode - navigate to results
            setMatchState(prev => ({ ...prev, status: MatchStatus.REVEALING, winner }));
            navigate('/results');
        }
    };

    return (
        <>
            {/* Matchmaking Modal */}
            <MatchmakingModal
                gameType={GameType.WHOT}
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
                    timeLeft={timeLeft}
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

            <div className="flex-1 flex flex-col w-full h-[85vh] relative rounded-3xl overflow-hidden shadow-2xl border-8 border-[#2d1b14] bg-[#1a3c34]">
                {/* Table Felt Texture */}
                <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_#2d5b4e_0%,_#0f2923_100%)] opacity-100"></div>
                <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>

                {/* Vignette */}
                <div className="absolute inset-0 z-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>

                <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} gameType={GameType.WHOT} />

                {/* Rules Button */}
                <button onClick={() => setShowRules(true)} className="absolute top-6 right-6 z-50 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white border border-white/20 backdrop-blur-md transition-all">?</button>

                {/* --- OPPONENT AREA --- */}
                <div className="relative z-10 flex flex-col items-center justify-start pt-6 h-[25%]">
                    <div className="flex flex-col items-center gap-2 mb-4">
                        {/* Avatar with Glow */}
                        <div className={`relative w-16 h-16 rounded-full border-4 ${turn === 'opponent' ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]' : 'border-white/10'} bg-slate-900 overflow-hidden transition-all duration-500`}>
                            <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=Felix`} alt="Opponent" className="w-full h-full" />
                            {turn === 'opponent' && <div className="absolute inset-0 bg-yellow-400/20 animate-pulse"></div>}
                        </div>

                        {/* Status Badge */}
                        <div className="bg-black/40 backdrop-blur px-4 py-1 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-white/90 text-xs font-bold tracking-widest uppercase">Opponent</span>
                            <span className="text-white/50 text-xs font-mono border-l border-white/20 pl-2">{opponentHand.length} Cards</span>
                        </div>
                    </div>

                    {/* Opponent Hand (Fan) */}
                    <div className="flex justify-center -space-x-8 md:-space-x-12 transform scale-75 md:scale-90 origin-top">
                        {opponentHand.map((_, i) => (
                            <div key={i} style={{
                                transform: `rotate(${(i - (opponentHand.length - 1) / 2) * 5}deg) translateY(${Math.abs(i - (opponentHand.length - 1) / 2) * 4}px)`,
                                zIndex: i
                            }}>
                                <PlayingCard card={{ id: 'x', shape: 'circle', number: 1, isSpecial: false }} isHidden={true} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- CENTER TABLE (Deck & Discard) --- */}
                <div className="flex-1 relative z-10 flex flex-col items-center justify-center perspective-[1000px]">

                    {/* Game Message Banner */}
                    <div className={`
            absolute top-4 px-8 py-3 rounded-xl font-bold backdrop-blur-md shadow-2xl transition-all duration-500 transform
            flex items-center gap-3 border
            ${pendingPickup > 0 ? 'bg-red-600/90 border-red-400 text-white scale-110 shadow-red-900/50' :
                            turn === 'local' ? 'bg-emerald-600/90 border-emerald-400 text-white scale-105 shadow-emerald-900/50' :
                                'bg-slate-800/80 border-slate-600 text-slate-300'}
        `}>
                        {turn === 'local' ? '🟢' : '⏳'}
                        <span className="uppercase tracking-wide text-sm md:text-base">{message}</span>
                        {pendingPickup > 0 && <span className="bg-white/20 px-2 py-0.5 rounded text-xs">PENALTY: {pendingPickup}</span>}
                        {requiredShape && <span className="bg-yellow-400/90 text-black px-2 py-0.5 rounded text-xs flex items-center gap-1">TARGET: <ShapeIcon shape={requiredShape} className="w-3 h-3" /></span>}
                    </div>

                    {/* Floating Effect Popup */}
                    {effectPopup && (
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-24 z-50 px-6 py-2 rounded-full font-black text-2xl tracking-widest shadow-2xl animate-bounce ${effectPopup.color} text-white border-2 border-white`}>
                            {effectPopup.text}
                        </div>
                    )}

                    <div className="flex items-center gap-8 md:gap-16 mt-8 transform rotate-x-10">
                        {/* Draw Pile */}
                        <div className="relative group w-32 h-48">
                            {deck.length > 0 ? (
                                <div className="relative w-full h-full transition-transform duration-200 group-hover:scale-105 cursor-pointer" onClick={handleDrawClick}>
                                    <div className="absolute top-0 left-0 z-20"><PlayingCard card={{ id: 'd1', shape: 'circle', number: 1, isSpecial: false }} isHidden={true} /></div>
                                    {/* Stack effect */}
                                    <div className="absolute top-1 left-1 z-10"><PlayingCard card={{ id: 'd2', shape: 'circle', number: 1, isSpecial: false }} isHidden={true} /></div>
                                    <div className="absolute top-2 left-2 z-0"><PlayingCard card={{ id: 'd3', shape: 'circle', number: 1, isSpecial: false }} isHidden={true} /></div>

                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-white/60 font-bold text-xs bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
                                        MARKET ({deck.length})
                                    </div>
                                </div>
                            ) : (
                                <div onClick={reshuffleDeck} className="w-32 h-48 border-4 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-white/40 transition-all">
                                    <span className="text-4xl mb-2">🔄</span>
                                    <span className="text-white/50 text-xs font-bold tracking-widest">SHUFFLE</span>
                                </div>
                            )}
                        </div>

                        {/* Discard Pile */}
                        <div className="relative w-32 h-48">
                            {/* Placeholder ghost slot */}
                            <div className="absolute inset-0 border-4 border-white/10 rounded-xl bg-black/10"></div>

                            {discardPile.map((card, i) => {
                                // Only render top few cards for performance
                                if (i < discardPile.length - 4) return null;
                                const isTop = i === discardPile.length - 1;

                                // Random rotation for realism, seeded by ID (or index if simpler)
                                const rotation = (i * 37) % 20 - 10;

                                return (
                                    <div key={card.id}
                                        className={`absolute top-0 left-0 transition-all duration-500 ease-out shadow-lg
                                ${isTop ? 'scale-100 z-10 animate-scale-in' : 'scale-100 z-0 brightness-90'}
                             `}
                                        style={{
                                            transform: `rotate(${rotation}deg) translate(${rotation / 2}px, ${rotation / 3}px)`,
                                        }}
                                    >
                                        <PlayingCard card={card} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* --- PLAYER HAND --- */}
                <div className="relative z-30 h-[35%] w-full flex flex-col justify-end pb-2">
                    {/* Player Info */}
                    <div className="absolute bottom-6 left-6 flex items-center gap-3 z-0 pointer-events-none opacity-80">
                        <div className={`w-14 h-14 rounded-full border-4 ${turn === 'local' ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]' : 'border-white/20'} bg-indigo-900 flex items-center justify-center overflow-hidden`}>
                            <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${isSpectator ? "ProGamer" : "You"}`} alt="You" />
                        </div>
                        <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                            <div className="text-white font-bold text-shadow">{isSpectator ? "Pro_Gamer_1" : "You"}</div>
                            <div className={`text-xs font-mono font-bold ${turn === 'local' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {turn === 'local' ? 'YOUR TURN' : 'WAITING...'}
                            </div>
                        </div>
                    </div>

                    {/* Hand Cards */}
                    <div className="flex justify-center items-end w-full px-4 perspective-[800px] overflow-visible">
                        <div className="flex -space-x-8 md:-space-x-12 min-w-max pb-6 transition-all duration-500">
                            {localHand.map((card, i) => {
                                const isPlayable = turn === 'local' && checkMoveValidity(card) && !isSpectator;
                                const centerIndex = (localHand.length - 1) / 2;
                                const rotation = (i - centerIndex) * 4;
                                const yOffset = Math.abs(i - centerIndex) * 8;

                                return (
                                    <div key={card.id}
                                        style={{
                                            transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                                            transformOrigin: 'bottom center',
                                            zIndex: i
                                        }}
                                        className="transition-all duration-300 hover:z-50"
                                    >
                                        <PlayingCard card={card} onClick={() => playCard(card)} isPlayable={isPlayable} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* --- SHAPE SELECTOR MODAL --- */}
                {isAnimating && turn === 'local' && !isSpectator && (
                    <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center animate-fadeIn">
                        <div className="bg-slate-900/90 p-8 rounded-3xl border-2 border-yellow-400/50 shadow-[0_0_50px_rgba(250,204,21,0.3)] text-center max-w-md w-full transform scale-100 animate-scale-in">
                            <h3 className="text-3xl font-black mb-8 text-white tracking-tight">I NEED...</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {['circle', 'triangle', 'square', 'cross', 'star'].map(s => (
                                    <button key={s} onClick={() => handleShapeSelection(s)}
                                        className={`
                                group p-4 rounded-2xl bg-slate-800 border-2 border-slate-700 
                                hover:border-white hover:bg-slate-700 hover:-translate-y-1 
                                transition-all duration-200 flex flex-col items-center justify-center gap-2
                                ${getShapeColor(s)}
                            `}>
                                        <div className="transform group-hover:scale-125 transition-transform duration-300">
                                            <ShapeIcon shape={s} className="w-12 h-12" />
                                        </div>
                                        <span className="uppercase font-bold text-[10px] tracking-widest text-slate-400 group-hover:text-white transition-colors">{s}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}