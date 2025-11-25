import { jest } from '@jest/globals';

// Mock winston logger to prevent console spam during tests
jest.mock('../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  gameLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  matchmakingLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  websocketLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  dbLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock authentication functions
jest.mock('../src/utils/auth', () => ({
  verifySignature: jest.fn().mockResolvedValue(true),
  generateAuthMessage: jest.fn().mockReturnValue('test-message'),
  isValidAddress: jest.fn().mockReturnValue(true),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';