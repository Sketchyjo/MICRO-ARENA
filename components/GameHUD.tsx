import React from 'react';
import { GameState } from '../services/gameIntegration';

interface GameHUDProps {
    gameState: GameState;
    timeLeft: number;
    onResign: () => void;
    onSendChat?: (message: string) => void;
    chatMessages?: Array<{ sender: string; message: string; timestamp: number }>;
}

const GameHUD: React.FC<GameHUDProps> = ({
    gameState,
    timeLeft,
    onResign,
    onSendChat,
    chatMessages = [],
}) => {
    const [chatInput, setChatInput] = React.useState('');
    const [showChat, setShowChat] = React.useState(false);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatAddress = (address: string): string => {
        if (!address) return 'Unknown';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleSendChat = () => {
        if (chatInput.trim() && onSendChat) {
            onSendChat(chatInput.trim());
            setChatInput('');
        }
    };

    const handleResign = () => {
        if (window.confirm('Are you sure you want to resign? You will lose this match.')) {
            onResign();
        }
    };

    return (
        <div className="game-hud">
            {/* Player Cards */}
            <div className="players-container">
                <div className="player-card local">
                    <div className="player-avatar">👤</div>
                    <div className="player-info">
                        <div className="player-name">You</div>
                        <div className="player-address">{formatAddress(gameState.playerAddress)}</div>
                    </div>
                    {gameState.localScore !== null && (
                        <div className="player-score">{gameState.localScore}</div>
                    )}
                </div>

                <div className="vs-indicator">VS</div>

                <div className="player-card opponent">
                    <div className="player-avatar">🎮</div>
                    <div className="player-info">
                        <div className="player-name">Opponent</div>
                        <div className="player-address">{formatAddress(gameState.opponentAddress)}</div>
                    </div>
                    {gameState.opponentScore !== null && (
                        <div className="player-score">{gameState.opponentScore}</div>
                    )}
                </div>
            </div>

            {/* Game Info Bar */}
            <div className="info-bar">
                <div className="info-item">
                    <span className="info-label">Stake</span>
                    <span className="info-value">{gameState.stake} cUSD</span>
                </div>

                <div className="info-item timer">
                    <span className="info-label">Time</span>
                    <span className={`info-value ${timeLeft < 60 ? 'warning' : ''}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>

                <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className="info-value status">{gameState.status}</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
                <button className="action-btn resign-btn" onClick={handleResign}>
                    🏳️ Resign
                </button>

                {onSendChat && (
                    <button
                        className="action-btn chat-btn"
                        onClick={() => setShowChat(!showChat)}
                    >
                        💬 Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
                    </button>
                )}
            </div>

            {/* Chat Panel */}
            {showChat && onSendChat && (
                <div className="chat-panel">
                    <div className="chat-header">
                        <h3>Chat</h3>
                        <button onClick={() => setShowChat(false)}>×</button>
                    </div>

                    <div className="chat-messages">
                        {chatMessages.length === 0 ? (
                            <div className="no-messages">No messages yet</div>
                        ) : (
                            chatMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`chat-message ${msg.sender === gameState.playerAddress ? 'local' : 'opponent'}`}
                                >
                                    <div className="message-sender">
                                        {msg.sender === gameState.playerAddress ? 'You' : 'Opponent'}
                                    </div>
                                    <div className="message-text">{msg.message}</div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="chat-input-container">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                            placeholder="Type a message..."
                            maxLength={200}
                        />
                        <button onClick={handleSendChat} disabled={!chatInput.trim()}>
                            Send
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .game-hud {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 320px;
                    z-index: 100;
                }

                .players-container {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 16px;
                    padding: 16px;
                    margin-bottom: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .player-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    margin-bottom: 8px;
                }

                .player-card:last-of-type {
                    margin-bottom: 0;
                }

                .player-avatar {
                    font-size: 32px;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                }

                .player-info {
                    flex: 1;
                }

                .player-name {
                    color: #fff;
                    font-weight: 600;
                    font-size: 16px;
                }

                .player-address {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 12px;
                    font-family: monospace;
                }

                .player-score {
                    color: #4ade80;
                    font-size: 24px;
                    font-weight: 700;
                }

                .vs-indicator {
                    text-align: center;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 700;
                    font-size: 14px;
                    margin: 8px 0;
                }

                .info-bar {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 12px;
                    padding: 12px;
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .info-item {
                    flex: 1;
                    text-align: center;
                }

                .info-label {
                    display: block;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }

                .info-value {
                    display: block;
                    color: #fff;
                    font-weight: 600;
                    font-size: 14px;
                }

                .info-value.warning {
                    color: #ff3b30;
                    animation: pulse 1s infinite;
                }

                .info-value.status {
                    color: #4ade80;
                    text-transform: uppercase;
                    font-size: 11px;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }

                .action-buttons {
                    display: flex;
                    gap: 8px;
                }

                .action-btn {
                    flex: 1;
                    padding: 10px;
                    border-radius: 10px;
                    border: none;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .action-btn:hover {
                    transform: translateY(-2px);
                }

                .resign-btn {
                    background: linear-gradient(135deg, #ff3b30 0%, #dc2626 100%);
                    color: #fff;
                }

                .resign-btn:hover {
                    box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
                }

                .chat-btn {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: #fff;
                }

                .chat-btn:hover {
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }

                .chat-panel {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 16px;
                    margin-top: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    overflow: hidden;
                }

                .chat-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .chat-header h3 {
                    margin: 0;
                    color: #fff;
                    font-size: 16px;
                }

                .chat-header button {
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    opacity: 0.7;
                }

                .chat-header button:hover {
                    opacity: 1;
                }

                .chat-messages {
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 12px;
                }

                .no-messages {
                    text-align: center;
                    color: rgba(255, 255, 255, 0.4);
                    padding: 20px;
                    font-size: 14px;
                }

                .chat-message {
                    margin-bottom: 8px;
                    padding: 8px 12px;
                    border-radius: 8px;
                    max-width: 80%;
                }

                .chat-message.local {
                    background: rgba(74, 222, 128, 0.2);
                    margin-left: auto;
                }

                .chat-message.opponent {
                    background: rgba(59, 130, 246, 0.2);
                }

                .message-sender {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                    margin-bottom: 4px;
                }

                .message-text {
                    color: #fff;
                    font-size: 14px;
                }

                .chat-input-container {
                    display: flex;
                    gap: 8px;
                    padding: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .chat-input-container input {
                    flex: 1;
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                    font-size: 14px;
                }

                .chat-input-container input:focus {
                    outline: none;
                    border-color: #4ade80;
                }

                .chat-input-container button {
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: none;
                    background: #4ade80;
                    color: #000;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                }

                .chat-input-container button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                @media (max-width: 768px) {
                    .game-hud {
                        position: static;
                        width: 100%;
                        margin-bottom: 20px;
                    }
                }
            `}</style>
        </div>
    );
};

export default GameHUD;
