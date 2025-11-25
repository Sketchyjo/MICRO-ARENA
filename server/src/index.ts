import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeWebSocket } from './services/websocket';
import { initializeDatabase, closeDatabase, getUserStats, getMatchHistory, getLeaderboard } from './database/db';
import { globalErrorHandler, notFound, asyncHandler } from './utils/errorHandler';
import logger from './utils/logger';
import { monitoring, setupGracefulShutdown } from './utils/monitoring';
import { MatchmakingService } from './services/matchmaking';
import { GameStateManager } from './services/gameStateManager';

dotenv.config({ path: '../.env.local' });

const matchmaking = new MatchmakingService();
const gameStateManager = new GameStateManager();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging and monitoring
app.use(monitoring.requestMiddleware());
app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        query: req.query
    });
    next();
});

// Health check endpoint
app.get('/health', asyncHandler(async (req: Request, res: Response) => {
    const healthStatus = monitoring.getHealthStatus();
    const metrics = monitoring.getMetrics();
    
    const health = {
        status: healthStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
            database: 'ok',
            websocket: 'ok'
        },
        metrics,
        matchmaking: {
            queueStats: matchmaking.getQueueStats()
        }
    };
    
    const statusCode = healthStatus === 'healthy' ? 200 : healthStatus === 'warning' ? 200 : 503;
    res.status(statusCode).json(health);
}));

// Detailed health check
app.get('/health/detailed', asyncHandler(async (req: Request, res: Response) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
            database: 'ok',
            websocket: 'ok'
        },
        matchmaking: {
            queueStats: matchmaking.getQueueStats()
        }
    };
    
    res.json(health);
}));

// API Routes
app.get('/api/matches/available/:gameType', asyncHandler(async (req: Request, res: Response) => {
    const { gameType } = req.params;
    const { minStake = '0', maxStake = '1000000' } = req.query;
    
    // Get available matches from matchmaking service
    const queueStats = matchmaking.getQueueStats();
    const availableMatches = Object.keys(queueStats)
        .filter(key => key.startsWith(gameType.toUpperCase()))
        .map(key => ({
            gameType: key.split(':')[0],
            stake: key.split(':')[1],
            playersWaiting: queueStats[key]
        }));
    
    res.json({ matches: availableMatches });
}));

app.get('/api/player/:address/stats', asyncHandler(async (req: Request, res: Response) => {
    const { address } = req.params;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: 'Invalid address format' });
    }
    
    const stats = await getUserStats(address);
    
    if (!stats) {
        return res.json({
            address,
            wins: 0,
            losses: 0,
            draws: 0,
            totalMatches: 0,
            eloRating: 1200,
            totalEarnings: '0'
        });
    }
    
    res.json(stats);
}));

app.get('/api/player/:address/history', asyncHandler(async (req: Request, res: Response) => {
    const { address } = req.params;
    const { limit = '10' } = req.query;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: 'Invalid address format' });
    }
    
    const history = await getMatchHistory(address, parseInt(limit as string));
    res.json({ matches: history });
}));

app.get('/api/match/:matchId', asyncHandler(async (req: Request, res: Response) => {
    const { matchId } = req.params;
    
    // Get match from matchmaking service
    const match = matchmaking.getMatch(matchId);
    
    if (!match) {
        return res.status(404).json({ error: 'Match not found' });
    }
    
    // Get game state if available
    const gameState = await gameStateManager.getGameState(matchId);
    
    res.json({
        match,
        gameState: gameState ? {
            isComplete: gameState.isComplete,
            currentTurn: gameState.currentTurn,
            scores: gameState.scores
        } : null
    });
}));

app.get('/api/leaderboard', asyncHandler(async (req: Request, res: Response) => {
    const { limit = '100' } = req.query;
    const leaderboard = await getLeaderboard(parseInt(limit as string));
    res.json({ leaderboard });
}));

// Matchmaking stats endpoint
app.get('/api/matchmaking/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = matchmaking.getQueueStats();
    res.json({ queueStats: stats });
}));

// 404 handler
app.use(notFound);

// Global error handler
app.use(globalErrorHandler);

// Initialize services
async function startServer() {
    try {
        logger.info('Starting Micro Arena server...');
        
        // Initialize database
        await initializeDatabase();
        logger.info('Database connected');

        // Initialize WebSocket handlers
        initializeWebSocket(io);
        logger.info('WebSocket initialized');

        // Start cleanup interval
        setInterval(() => {
            matchmaking.cleanupStaleMatches();
        }, 60000); // Every minute

        // Setup graceful shutdown
        setupGracefulShutdown(httpServer, async () => {
            await closeDatabase();
        });

        // Start server
        httpServer.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`WebSocket server ready`);
            logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Global error handlers
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
