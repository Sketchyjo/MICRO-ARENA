import logger from './logger';

interface HealthMetrics {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    activeConnections: number;
    totalRequests: number;
    errorRate: number;
    responseTime: number;
}

class MonitoringService {
    private metrics: HealthMetrics;
    private requestCount = 0;
    private errorCount = 0;
    private responseTimes: number[] = [];
    private activeConnections = 0;
    private startTime = Date.now();

    constructor() {
        this.metrics = {
            uptime: 0,
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            activeConnections: 0,
            totalRequests: 0,
            errorRate: 0,
            responseTime: 0
        };

        // Update metrics every 30 seconds
        setInterval(() => {
            this.updateMetrics();
        }, 30000);
    }

    private updateMetrics() {
        this.metrics = {
            uptime: Date.now() - this.startTime,
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            activeConnections: this.activeConnections,
            totalRequests: this.requestCount,
            errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
            responseTime: this.getAverageResponseTime()
        };

        // Log critical metrics
        if (this.metrics.memory.heapUsed > 500 * 1024 * 1024) { // 500MB
            logger.warn('High memory usage detected', { 
                heapUsed: this.metrics.memory.heapUsed,
                heapTotal: this.metrics.memory.heapTotal 
            });
        }

        if (this.metrics.errorRate > 5) { // 5% error rate
            logger.warn('High error rate detected', { 
                errorRate: this.metrics.errorRate,
                totalRequests: this.requestCount,
                errors: this.errorCount 
            });
        }
    }

    recordRequest(responseTime: number, isError: boolean = false) {
        this.requestCount++;
        if (isError) this.errorCount++;
        
        this.responseTimes.push(responseTime);
        
        // Keep only last 1000 response times
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
    }

    recordConnection(increment: boolean = true) {
        if (increment) {
            this.activeConnections++;
        } else {
            this.activeConnections = Math.max(0, this.activeConnections - 1);
        }
    }

    private getAverageResponseTime(): number {
        if (this.responseTimes.length === 0) return 0;
        
        const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
        return sum / this.responseTimes.length;
    }

    getMetrics(): HealthMetrics {
        return { ...this.metrics };
    }

    getHealthStatus(): 'healthy' | 'warning' | 'critical' {
        const memoryUsagePercent = (this.metrics.memory.heapUsed / this.metrics.memory.heapTotal) * 100;
        
        if (memoryUsagePercent > 90 || this.metrics.errorRate > 10) {
            return 'critical';
        }
        
        if (memoryUsagePercent > 70 || this.metrics.errorRate > 5 || this.metrics.responseTime > 1000) {
            return 'warning';
        }
        
        return 'healthy';
    }

    // Middleware for Express
    requestMiddleware() {
        return (req: any, res: any, next: any) => {
            const startTime = Date.now();
            
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                const isError = res.statusCode >= 400;
                this.recordRequest(responseTime, isError);
            });
            
            next();
        };
    }
}

export const monitoring = new MonitoringService();

// Graceful shutdown handler
export function setupGracefulShutdown(server: any, cleanup?: () => Promise<void>) {
    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        
        server.close(async () => {
            try {
                if (cleanup) {
                    await cleanup();
                }
                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        });
        
        // Force shutdown after 30 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}