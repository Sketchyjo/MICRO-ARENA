-- Users table
CREATE TABLE IF NOT EXISTS users (
    address VARCHAR(42) PRIMARY KEY,
    username VARCHAR(50),
    elo_rating INTEGER DEFAULT 1200,
    total_matches INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    total_earnings DECIMAL(20, 18) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    match_id VARCHAR(100) PRIMARY KEY,
    game_type VARCHAR(20) NOT NULL,
    player1_address VARCHAR(42) NOT NULL,
    player2_address VARCHAR(42) NOT NULL,
    stake DECIMAL(20, 18) NOT NULL,
    winner_address VARCHAR(42),
    player1_score INTEGER,
    player2_score INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (player1_address) REFERENCES users(address),
    FOREIGN KEY (player2_address) REFERENCES users(address)
);

-- Game states table (for active matches)
CREATE TABLE IF NOT EXISTS game_states (
    match_id VARCHAR(100) PRIMARY KEY,
    state_json TEXT NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(match_id)
);

-- Transactions table (for tracking on-chain transactions)
CREATE TABLE IF NOT EXISTS transactions (
    tx_hash VARCHAR(66) PRIMARY KEY,
    match_id VARCHAR(100),
    tx_type VARCHAR(20) NOT NULL, -- 'create', 'join', 'commit', 'reveal', 'payout'
    from_address VARCHAR(42) NOT NULL,
    amount DECIMAL(20, 18),
    status VARCHAR(20) DEFAULT 'pending',
    block_number INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(match_id)
);

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    address,
    username,
    elo_rating,
    total_matches,
    wins,
    losses,
    draws,
    CASE 
        WHEN total_matches > 0 THEN ROUND((wins::DECIMAL / total_matches) * 100, 2)
        ELSE 0
    END as win_rate,
    total_earnings
FROM users
WHERE total_matches > 0
ORDER BY elo_rating DESC, wins DESC
LIMIT 100;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_address);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_address);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);
CREATE INDEX IF NOT EXISTS idx_users_elo ON users(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_match ON transactions(match_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
