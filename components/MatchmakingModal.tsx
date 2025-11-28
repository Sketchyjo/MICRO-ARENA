import React, { useState, useEffect } from 'react';
import { gameIntegration, GameState } from '../services/gameIntegration';
import { contractService } from '../services/contractService';
import { GameType } from '../types';


interface MatchmakingModalProps {
    gameType: GameType;
    isOpen: boolean;
    onClose: () => void;
    onMatchFound: (matchId: bigint) => void;
}

const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
    gameType,
    isOpen,
    onClose,
    onMatchFound,
}) => {
    const [stake, setStake] = useState('1');
    const [balance, setBalance] = useState('0');
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadBalance();
            const unsubscribe = gameIntegration.onStateChange(setGameState);
            return unsubscribe;
        }
    }, [isOpen]);

    useEffect(() => {
        if (gameState?.matchId && gameState.status === 'MATCHED') {
            onMatchFound(gameState.matchId);
        }
    }, [gameState, onMatchFound]);

    const loadBalance = async () => {
        try {
            const bal = await contractService.getCUSDBalance();
            setBalance(parseFloat(bal).toFixed(2));
        } catch (err: any) {
            console.error('Failed to load balance:', err);
            setBalance('0');
            setError('Failed to fetch cUSD balance. Please ensure you are on Celo Sepolia testnet.');
        }
    };

    const handleStartSearch = async () => {
        setLoading(true);
        setError(null);

        try {
            await gameIntegration.startMatchmaking(gameType, stake);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleCancelSearch = async () => {
        try {
            await gameIntegration.cancelMatchmaking();
            setLoading(false);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleClose = () => {
        if (gameState?.status === 'SEARCHING') {
            handleCancelSearch();
        }
        onClose();
    };

    if (!isOpen) return null;

    const isSearching = gameState?.status === 'SEARCHING';
    const isCreatingMatch = gameState?.status === 'CREATING_MATCH';

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🎮 Find Match</h2>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="balance-display">
                        <span>Your cUSD Balance:</span>
                        <strong>{balance} cUSD</strong>
                    </div>

                    {!isSearching && !isCreatingMatch && (
                        <>
                            <div className="stake-input-group">
                                <label htmlFor="stake">Stake Amount (cUSD)</label>
                                <input
                                    id="stake"
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={stake}
                                    onChange={(e) => setStake(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            <button
                                className="primary-btn"
                                onClick={handleStartSearch}
                                disabled={loading || parseFloat(stake) <= 0 || parseFloat(stake) > parseFloat(balance)}
                            >
                                {loading ? '⏳ Starting...' : '🔍 Search for Match'}
                            </button>
                        </>
                    )}

                    {isCreatingMatch && (
                        <div className="searching-state">
                            <div className="spinner"></div>
                            <p>Creating match on blockchain...</p>
                            <small>Please confirm the transactions in your wallet</small>
                        </div>
                    )}

                    {isSearching && (
                        <div className="searching-state">
                            <div className="spinner"></div>
                            <p>Searching for opponent...</p>
                            <p className="stake-info">Stake: {gameState?.stake} cUSD</p>
                            <button className="secondary-btn" onClick={handleCancelSearch}>
                                Cancel Search
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }

                .modal-content {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 20px;
                    padding: 0;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 24px;
                    color: #fff;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 32px;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }

                .close-btn:hover {
                    opacity: 1;
                }

                .modal-body {
                    padding: 24px;
                }

                .error-message {
                    background: rgba(255, 59, 48, 0.1);
                    border: 1px solid rgba(255, 59, 48, 0.3);
                    color: #ff3b30;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 16px;
                }

                .balance-display {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 16px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    color: #fff;
                }

                .balance-display strong {
                    color: #4ade80;
                    font-size: 18px;
                }

                .stake-input-group {
                    margin-bottom: 24px;
                }

                .stake-input-group label {
                    display: block;
                    color: #fff;
                    margin-bottom: 8px;
                    font-weight: 500;
                }

                .stake-input-group input {
                    width: 100%;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                    font-size: 16px;
                    transition: border-color 0.2s;
                }

                .stake-input-group input:focus {
                    outline: none;
                    border-color: #4ade80;
                }

                .primary-btn {
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                    color: #000;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .primary-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(74, 222, 128, 0.3);
                }

                .primary-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .secondary-btn {
                    width: 100%;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    margin-top: 12px;
                    transition: background 0.2s;
                }

                .secondary-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                }

                .searching-state {
                    text-align: center;
                    padding: 32px 0;
                }

                .searching-state p {
                    color: #fff;
                    margin: 12px 0;
                    font-size: 16px;
                }

                .searching-state small {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 14px;
                }

                .stake-info {
                    color: #4ade80 !important;
                    font-weight: 600;
                }

                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(255, 255, 255, 0.1);
                    border-top-color: #4ade80;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default MatchmakingModal;
