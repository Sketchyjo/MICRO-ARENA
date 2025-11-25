import winston from 'winston';

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'micro-arena-server' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

export default logger;

// Specific loggers for different components
export const gameLogger = logger.child({ component: 'game' });
export const matchmakingLogger = logger.child({ component: 'matchmaking' });
export const websocketLogger = logger.child({ component: 'websocket' });
export const dbLogger = logger.child({ component: 'database' });
export const contractLogger = logger.child({ component: 'contract' });