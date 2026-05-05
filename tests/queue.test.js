// tests/queue.test.js — Updated for redis v4+
jest.mock('redis', () => {
  const mockStorage = {
    list: [],
    health: {},
    dlq: []
  };

  const MockRedis = {
    createClient: jest.fn(() => {
      return {
        lPush: jest.fn(async (key, value) => {
          mockStorage.list.unshift(value);
          return mockStorage.list.length;
        }),
        rPop: jest.fn(async (key) => {
          if (mockStorage.list.length === 0) return null;
          return mockStorage.list.pop();
        }),
        lLen: jest.fn(async (key) => {
          return mockStorage.list.length;
        }),
        hSet: jest.fn(async (key, ...args) => {
          if (args.length === 1 && typeof args[0] === 'object') {
            Object.assign(mockStorage.health, args[0]);
          } else {
            for (let i = 0; i < args.length; i += 2) {
              mockStorage.health[args[i]] = args[i + 1];
            }
          }
          return 'OK';
        }),
        hGetAll: jest.fn(async (key) => {
          return { ...mockStorage.health };
        }),
        hIncrBy: jest.fn(async (key, field, increment) => {
          const current = parseInt(mockStorage.health[field] || '0', 10);
          const updated = current + increment;
          mockStorage.health[field] = updated.toString();
          return mockStorage.health[field];
        }),
        connect: jest.fn(async () => 'OK'),
        disconnect: jest.fn(async () => 'OK'),
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
      };
    }),
    __mockStorage: mockStorage
  };

  return MockRedis;
});

const { enqueue, dequeue, getQueueLength, getQueueHealth } = require('../src/queue/redis-client');
const redis = require('redis');

beforeEach(() => {
  jest.clearAllMocks();
  const storage = redis.__mockStorage;
  storage.list = [];
  storage.health = {};
  storage.dlq = [];
});

describe('enqueue', () => {
  test('should enqueue a valid signal', async () => {
    const signal = { token: 'BONK', action: 'BUY', price: 0.001 };
    const result = await enqueue(signal);
    
    expect(result.queued).toBe(true);
    expect(result.token).toBe('BONK');
    expect(result.ts).toBeDefined();
    expect(result.queuedAt).toBeDefined();
  });

  test('should throw on missing fields', async () => {
    await expect(enqueue({})).rejects.toThrow('Missing required fields');
  });
});

describe('dequeue', () => {
  test('should dequeue a signal', async () => {
    await enqueue({ token: 'PEPE', action: 'SELL', price: 0.002 });
    const result = await dequeue();
    expect(result.token).toBe('PEPE');
  });

  test('should return null when queue empty', async () => {
    const result = await dequeue();
    expect(result).toBeNull();
  });
});

describe('getQueueLength', () => {
  test('should return queue length', async () => {
    await enqueue({ token: 'BONK', action: 'BUY', price: 0.001 });
    const length = await getQueueLength();
    expect(length).toBe(1);
  });
});

describe('getQueueHealth', () => {
  test('should return health data', async () => {
    const health = await getQueueHealth();
    expect(health).toHaveProperty('length');
    expect(health).toHaveProperty('status');
  });
});
