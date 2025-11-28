import React, { useState, useEffect } from 'react';
import { gameIntegration, GameState } from '../services/gameIntegration';
import { contractService } from '../services/contractService';

interface ScoreSubmissionModalProps {
    isOpen: boolean;
    score: number;
    onClose: () => void;
    onComplete: () => void;
}

const ScoreSubmissionModal: React.FC<ScoreSubmissionModalProps> = ({
    isOpen,
    score,
    onClose,
    onComplete,
}) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const unsubscribe = gameIntegration.onStateChange(setGameState);
            return unsubscribe;
        }
    }, [isOpen]);

    useEffect(() => {
        if (gameState?.status === 'COMPLETED') {
            onComplete();
        }
    }, [gameState, onComplete]);

    const handleCommitScore = async () => {
        setLoading(true);
        setError(null);

        try {
            await gameIntegration.submitScore(score);
            setLoading(false);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleRevealScore = async () => {
        setLoading(true);
        setError(null);

        try {
            const hash = await gameIntegration.revealScore();
            setTxHash(hash);
            setLoading(false);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isCommitting = gameState?.status === 'COMMITTING';
    const isWaitingReveal = gameState?.status === 'WAITING_REVEAL';
    const isRevealing = gameState?.status === 'REVEALING';
    const isWaitingCompletion = gameState?.status === 'WAITING_COMPLETION';
    const isCompleted = gameState?.status === 'COMPLETED';

    const canCommit = !isCommitting && !isWaitingReveal && !isRevealing && !isCompleted;
    const canReveal = isWaitingReveal && !isRevealing;

    const calculatePayout = () => {
        if (!gameState) return '0';
        const stake = parseFloat(gameState.stake);
        const totalPot = stake * 2;
        const platformFee = totalPot * 0.02; // 2% fee
        return (totalPot - platformFee).toFixed(2);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>🏆 Submit Score</h2>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="score-display">
                        <div className="score-label">Your Final Score</div>
                        <div className="score-value">{score}</div>
                    </div>

                    {gameState && (
                        <div className="payout-info">
                            <div className="payout-row">
                                <span>Stake:</span>
                                <strong>{gameState.stake} cUSD</strong>
                            </div>
                            <div className="payout-row">
                                <span>Total Pot:</span>
                                <strong>{(parseFloat(gameState.stake) * 2).toFixed(2)} cUSD</strong>
                            </div>
                            <div className="payout-row">
                                <span>Platform Fee (2%):</span>
                                <strong>{(parseFloat(gameState.stake) * 2 * 0.02).toFixed(2)} cUSD</strong>
                            </div>
                            <div className="payout-row winner">
                                <span>Winner Payout:</span>
                                <strong>{calculatePayout()} cUSD</strong>
                            </div>
                        </div>
                    )}

                    <div className="status-steps">
                        <div className={`step ${isCommitting || isWaitingReveal || isRevealing || isCompleted ? 'completed' : 'active'}`}>
                            <div className="step-number">1</div>
                            <div className="step-label">Commit Score</div>
                        </div>

                        <div className="step-connector"></div>

                        <div className={`step ${isWaitingReveal ? 'active' : isRevealing || isCompleted ? 'completed' : ''}`}>
                            <div className="step-number">2</div>
                            <div className="step-label">Wait for Opponent</div>
                        </div>

                        <div className="step-connector"></div>

                        <div className={`step ${isRevealing ? 'active' : isCompleted ? 'completed' : ''}`}>
                            <div className="step-number">3</div>
                            <div className="step-label">Reveal Score</div>
                        </div>
                    </div>

                    {canCommit && (
                        <button
                            className="primary-btn"
                            onClick={handleCommitScore}
                            disabled={loading}
                        >
                            {loading ? '⏳ Committing...' : '📝 Commit Score'}
                        </button>
                    )}

                    {isCommitting && (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Committing score to blockchain...</p>
                            <small>Please confirm the transaction in your wallet</small>
                        </div>
                    )}

                    {isWaitingReveal && !canReveal && (
                        <div className="waiting-state">
                            <div className="spinner"></div>
                            <p>Waiting for opponent to commit...</p>
                            <small>This may take a few moments</small>
                        </div>
                    )}

                    {canReveal && (
                        <button
                            className="primary-btn"
                            onClick={handleRevealScore}
                            disabled={loading}
                        >
                            {loading ? '⏳ Revealing...' : '🔓 Reveal Score'}
                        </button>
                    )}

                    {isRevealing && (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Revealing score...</p>
                            <small>Please confirm the transaction in your wallet</small>
                        </div>
                    )}

                    {isWaitingCompletion && (
                        <div className="waiting-state">
                            <div className="spinner"></div>
                            <p>Waiting for match completion...</p>
                            <small>Calculating winner and distributing payout</small>
                        </div>
                    )}

                    {isCompleted && gameState && (
                        <div className="completion-state">
                            <div className="completion-icon">
                                {gameState.winner === gameState.playerAddress ? '🎉' : gameState.winner === '0x0000000000000000000000000000000000000000' ? '🤝' : '😔'}
                            </div>
                            <h3>
                                {gameState.winner === gameState.playerAddress
                                    ? 'You Won!'
                                    : gameState.winner === '0x0000000000000000000000000000000000000000'
                                        ? 'Draw!'
                                        : 'You Lost'}
                            </h3>
                            {txHash && (
                                <a
                                    href={contractService.getExplorerUrl(txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="explorer-link"
                                >
                                    View on Block Explorer →
                                </a>
                            )}
                            <button className="primary-btn" onClick={onClose}>
                                Close
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
                    background: rgba(0, 0, 0, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    backdrop-filter: blur(8px);
                }

                .modal-content {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 24px;
                    padding: 0;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .modal-header {
                    padding: 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    text-align: center;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 28px;
                    color: #fff;
                }

                .modal-body {
                    padding: 24px;
                }

                .error-message {
                    background: rgba(255, 59, 48, 0.1);
                    border: 1px solid rgba(255, 59, 48, 0.3);
                    color: #ff3b30;
                    padding: 12px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    text-align: center;
                }

                .score-display {
                    text-align: center;
                    padding: 32px;
                    background: rgba(74, 222, 128, 0.1);
                    border: 2px solid rgba(74, 222, 128, 0.3);
                    border-radius: 16px;
                    margin-bottom: 24px;
                }

                .score-label {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 8px;
                }

                .score-value {
                    color: #4ade80;
                    font-size: 56px;
                    font-weight: 700;
                }

                .payout-info {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 24px;
                }

                .payout-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 14px;
                }

                .payout-row.winner {
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    margin-top: 8px;
                    padding-top: 12px;
                    font-size: 16px;
                }

                .payout-row strong {
                    color: #fff;
                }

                .payout-row.winner strong {
                    color: #4ade80;
                }

                .status-steps {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 32px;
                }

                .step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                }

                .step-number {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255, 255, 255, 0.5);
                    font-weight: 600;
                    transition: all 0.3s;
                }

                .step.active .step-number {
                    background: rgba(74, 222, 128, 0.2);
                    border-color: #4ade80;
                    color: #4ade80;
                }

                .step.completed .step-number {
                    background: #4ade80;
                    border-color: #4ade80;
                    color: #000;
                }

                .step-label {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 12px;
                    text-align: center;
                }

                .step.active .step-label,
                .step.completed .step-label {
                    color: #fff;
                }

                .step-connector {
                    flex: 1;
                    height: 2px;
                    background: rgba(255, 255, 255, 0.2);
                    margin: 0 8px;
                    margin-bottom: 32px;
                }

                .primary-btn {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                    color: #000;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .primary-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(74, 222, 128, 0.4);
                }

                .primary-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .loading-state,
                .waiting-state {
                    text-align: center;
                    padding: 32px 0;
                }

                .loading-state p,
                .waiting-state p {
                    color: #fff;
                    margin: 16px 0 8px;
                    font-size: 16px;
                    font-weight: 500;
                }

                .loading-state small,
                .waiting-state small {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 13px;
                }

                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(255, 255, 255, 0.1);
                    border-top-color: #4ade80;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .completion-state {
                    text-align: center;
                    padding: 32px 0;
                }

                .completion-icon {
                    font-size: 72px;
                    margin-bottom: 16px;
                }

                .completion-state h3 {
                    color: #fff;
                    font-size: 28px;
                    margin: 0 0 16px;
                }

                .explorer-link {
                    display: inline-block;
                    color: #4ade80;
                    text-decoration: none;
                    margin-bottom: 24px;
                    font-size: 14px;
                    transition: opacity 0.2s;
                }

                .explorer-link:hover {
                    opacity: 0.8;
                }
            `}</style>
        </div>
    );
};

export default ScoreSubmissionModal;
