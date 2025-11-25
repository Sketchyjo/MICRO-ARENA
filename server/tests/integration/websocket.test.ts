import { Server } from 'socket.io';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { initializeWebSocket } from '../../src/services/websocket';

// Jest globals
declare global {
    var describe: any;
    var it: any;
    var expect: any;
    var beforeAll: any;
    var afterAll: any;
    var beforeEach: any;
    var afterEach: any;
}

describe('WebSocket Integration', () => {
    let httpServer: any;
    let io: Server;
    let clientSocket: ClientSocket;
    let serverSocket: any;
    let port: number;

    beforeAll((done) => {
        httpServer = createServer();
        io = new Server(httpServer);
        
        initializeWebSocket(io);
        
        httpServer.listen(() => {
            port = (httpServer.address() as AddressInfo).port;
            done();
        });
    });

    afterAll(() => {
        io.close();
        httpServer.close();
    });

    beforeEach((done) => {
        clientSocket = Client(`http://localhost:${port}`, {
            auth: { token: 'test-token' }
        });
        
        io.on('connection', (socket) => {
            serverSocket = socket;
        });
        
        clientSocket.on('connect', done);
    });

    afterEach(() => {
        if (clientSocket.connected) {
            clientSocket.disconnect();
        }
    });

    describe('Authentication', () => {
        it('should authenticate valid users', (done) => {
            clientSocket.emit('auth:connect', {
                address: '0x1234567890123456789012345678901234567890',
                signature: 'valid-signature',
                message: 'test-message'
            });

            clientSocket.on('auth:success', (data) => {
                expect(data.address).toBe('0x1234567890123456789012345678901234567890');
                done();
            });
        });

        it('should reject invalid authentication', (done) => {
            clientSocket.emit('auth:connect', {
                address: 'invalid-address',
                signature: 'invalid-signature',
                message: 'test-message'
            });

            clientSocket.on('auth:error', (data) => {
                expect(data.error).toBeDefined();
                done();
            });
        });
    });

    describe('Matchmaking', () => {
        beforeEach((done) => {
            // Authenticate first
            clientSocket.emit('auth:connect', {
                address: '0x1234567890123456789012345678901234567890',
                signature: 'valid-signature',
                message: 'test-message'
            });

            clientSocket.on('auth:success', () => done());
        });

        it('should handle matchmaking search', (done) => {
            clientSocket.emit('matchmaking:search', {
                gameType: 'CHESS',
                stake: '1.0',
                playerAddress: '0x1234567890123456789012345678901234567890'
            });

            clientSocket.on('matchmaking:searching', (data) => {
                expect(data.message).toBe('Searching for opponent...');
                done();
            });
        });

        it('should handle matchmaking cancellation', (done) => {
            clientSocket.emit('matchmaking:cancel');

            clientSocket.on('matchmaking:cancelled', () => {
                done();
            });
        });
    });

    describe('Game Events', () => {
        beforeEach((done) => {
            // Authenticate first
            clientSocket.emit('auth:connect', {
                address: '0x1234567890123456789012345678901234567890',
                signature: 'valid-signature',
                message: 'test-message'
            });

            clientSocket.on('auth:success', () => done());
        });

        it('should handle game moves', (done) => {
            clientSocket.emit('game:move', {
                matchId: 'test-match',
                move: 'e4',
                playerAddress: '0x1234567890123456789012345678901234567890'
            });

            // Should receive either invalid_move or opponent_move
            clientSocket.on('game:invalid_move', () => done());
            clientSocket.on('game:opponent_move', () => done());
        });

        it('should handle game resignation', (done) => {
            clientSocket.emit('game:resign', {
                matchId: 'test-match',
                playerAddress: '0x1234567890123456789012345678901234567890'
            });

            clientSocket.on('game:resigned', (data) => {
                expect(data.matchId).toBe('test-match');
                expect(data.resignedPlayer).toBe('0x1234567890123456789012345678901234567890');
                done();
            });
        });
    });

    describe('Rate Limiting', () => {
        beforeEach((done) => {
            // Authenticate first
            clientSocket.emit('auth:connect', {
                address: '0x1234567890123456789012345678901234567890',
                signature: 'valid-signature',
                message: 'test-message'
            });

            clientSocket.on('auth:success', () => done());
        });

        it('should rate limit excessive requests', (done) => {
            let errorReceived = false;

            // Send many requests quickly
            for (let i = 0; i < 20; i++) {
                clientSocket.emit('matchmaking:search', {
                    gameType: 'CHESS',
                    stake: '1.0',
                    playerAddress: '0x1234567890123456789012345678901234567890'
                });
            }

            clientSocket.on('matchmaking:error', (data) => {
                if (data.error === 'Rate limit exceeded' && !errorReceived) {
                    errorReceived = true;
                    done();
                }
            });

            // Fallback timeout
            setTimeout(() => {
                if (!errorReceived) {
                    done(new Error('Rate limiting not working'));
                }
            }, 1000);
        });
    });
});