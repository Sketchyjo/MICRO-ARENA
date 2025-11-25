import { Pool, QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

let pool: Pool | null = null;
let isInitialized = false;

export async function initializeDatabase(): Promise<void> {
    if (isInitialized) return;
    
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.warn('⚠️  DATABASE_URL not set, using in-memory storage');
        isInitialized = true;
        return;
    }

    pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Test connection
    try {
        const client = await pool.connect();
        console.log('✅ Database connection established');
        client.release();

        // Run migrations
        await runMigrations();
        isInitialized = true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}

async function runMigrations(): Promise<void> {
    if (!pool) return;

    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        await pool.query(schema);
        console.log('✅ Database migrations completed');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

export async function query(text: string, params?: any[]): Promise<QueryResult> {
    if (!pool) {
        throw new Error('Database not initialized');
    }

    try {
        const result = await pool.query(text, params);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// User operations
export async function createUser(address: string, username?: string): Promise<void> {
    await query(
        'INSERT INTO users (address, username) VALUES ($1, $2) ON CONFLICT (address) DO NOTHING',
        [address, username || `Player_${address.slice(0, 6)}`]
    );
}

export async function getUserStats(address: string): Promise<any> {
    const result = await query(
        'SELECT * FROM users WHERE address = $1',
        [address]
    );
    return result.rows[0];
}

export async function updateUserStats(
    address: string,
    wins: number,
    losses: number,
    draws: number,
    earnings: string
): Promise<void> {
    await query(
        `UPDATE users 
     SET wins = wins + $2, 
         losses = losses + $3, 
         draws = draws + $4,
         total_matches = total_matches + 1,
         total_earnings = total_earnings + $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE address = $1`,
        [address, wins, losses, draws, earnings]
    );
}

// Match operations
export async function createMatch(
    matchId: string,
    gameType: string,
    player1: string,
    player2: string,
    stake: string
): Promise<void> {
    await query(
        `INSERT INTO matches (match_id, game_type, player1_address, player2_address, stake, status)
     VALUES ($1, $2, $3, $4, $5, 'active')`,
        [matchId, gameType, player1, player2, stake]
    );
}

export async function completeMatch(
    matchId: string,
    winner: string | null,
    player1Score: number,
    player2Score: number
): Promise<void> {
    await query(
        `UPDATE matches 
     SET winner_address = $2, 
         player1_score = $3, 
         player2_score = $4,
         status = 'completed',
         completed_at = CURRENT_TIMESTAMP
     WHERE match_id = $1`,
        [matchId, winner, player1Score, player2Score]
    );
}

export async function getMatchHistory(address: string, limit: number = 10): Promise<any[]> {
    const result = await query(
        `SELECT * FROM matches 
     WHERE player1_address = $1 OR player2_address = $1
     ORDER BY created_at DESC
     LIMIT $2`,
        [address, limit]
    );
    return result.rows;
}

// Leaderboard
export async function getLeaderboard(limit: number = 100): Promise<any[]> {
    const result = await query(
        'SELECT * FROM leaderboard LIMIT $1',
        [limit]
    );
    return result.rows;
}

// Game state operations
export async function saveGameState(matchId: string, gameState: any): Promise<void> {
    if (!pool) return;
    
    await query(
        `INSERT INTO game_states (match_id, state_json, last_updated)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (match_id) 
         DO UPDATE SET state_json = $2, last_updated = CURRENT_TIMESTAMP`,
        [matchId, JSON.stringify(gameState)]
    );
}

export async function loadGameState(matchId: string): Promise<any | null> {
    if (!pool) return null;
    
    const result = await query(
        'SELECT state_json FROM game_states WHERE match_id = $1',
        [matchId]
    );
    
    return result.rows[0] ? JSON.parse(result.rows[0].state_json) : null;
}

export async function deleteGameState(matchId: string): Promise<void> {
    if (!pool) return;
    
    await query('DELETE FROM game_states WHERE match_id = $1', [matchId]);
}

// Transaction tracking
export async function recordTransaction(
    txHash: string,
    matchId: string | null,
    txType: string,
    fromAddress: string,
    amount?: string
): Promise<void> {
    if (!pool) return;
    
    await query(
        `INSERT INTO transactions (tx_hash, match_id, tx_type, from_address, amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [txHash, matchId, txType, fromAddress, amount]
    );
}

export async function updateTransactionStatus(
    txHash: string,
    status: string,
    blockNumber?: number
): Promise<void> {
    if (!pool) return;
    
    await query(
        `UPDATE transactions 
         SET status = $2, block_number = $3, confirmed_at = CURRENT_TIMESTAMP
         WHERE tx_hash = $1`,
        [txHash, status, blockNumber]
    );
}

// Cleanup
export async function closeDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        console.log('Database connection closed');
        isInitialized = false;
    }
}
