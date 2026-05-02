// tests/queue.test.js — TDD Phase 2: Test Generation for redis-client.js
// Line 1: jest.mock auto-mocks ioredis module referenced in tests
jest.mock('ioredis', () => {
  // Line 3: Shared storage accessible to both mock and tests
  const mockStorage = {
    list: [],      // Redis list for queue (FIFO: LPUSH=unshift, RPOP=pop)
    health: {},    // Redis hash for health stats
    dlq: [],       // Dead letter queue
  };

  // Line 9: Mock Redis client factory — returns same storage across calls
  const MockRedis = function () {
    return {
      // Line 12: LPUSH — add to head of list (left side) for FIFO
      lpush: jest.fn(async (key, value) => {
        mockStorage.list.unshift(value); // unshift = add to beginning
        return mockStorage.list.length;
      }),

      // Line 17: RPOP — remove from tail of list (right side) for FIFO
      rpop: jest.fn(async (key) => {
        if (mockStorage.list.length === 0) return null;
        return mockStorage.list.pop(); // pop = remove from end
      }),

      // Line 23: LLEN — return length of list
      llen: jest.fn(async (key) => {
        return mockStorage.list.length;
      }),

      // Line 28: HSET — set hash field(s), supports both formats
      hset: jest.fn(async (key, ...args) => {
        // Line 31: Format: hset(key, field, value) or hset(key, {field: value})
        if (args.length === 1 && typeof args[0] === 'object') {
          Object.assign(mockStorage.health, args[0]);
        } else {
          for (let i = 0; i < args.length; i += 2) {
            mockStorage.health[args[i]] = args[i + 1];
          }
        }
        return 'OK';
      }),

      // Line 41: HGETALL — return all hash fields
      hgetall: jest.fn(async (key) => {
        return { ...mockStorage.health };
      }),

      // Line 46: HINCRBY — increment hash field by integer
      hincrby: jest.fn(async (key, field, increment) => {
        const current = parseInt(mockStorage.health[field] || '0', 10);
        const updated = current + increment;
        mockStorage.health[field] = updated.toString();
        return mockStorage.health[field];
      }),

      // Line 54: Connection stubs
      connect: jest.fn(async () => 'OK'),
      quit: jest.fn(async () => 'OK'),
      disconnect: jest.fn(async () => 'OK'),
    };
  };

  // Line 61: Attach storage to constructor for test access
  MockRedis.__mockStorage = mockStorage;
  return MockRedis;
});

// Line 65: Import functions to test AFTER mock is set up
const { enqueue, dequeue, getQueueLength, getQueueHealth } = require('../src/queue/redis-client');
const Redis = require('ioredis');

// Line 69: Clear storage and mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Line 72: Reset the shared storage
  const storage = Redis.__mockStorage;
  storage.list = [];
  storage.health = {};
  storage.dlq = [];
});

// Line 78: Test Suite 1: enqueue — valid signal
describe('enqueue', () => {
  // Line 80: Test 1: should enqueue a valid signal and return success
  test('should enqueue a valid signal', async () => {
    // Line 82: Create a valid signal object with required fields
    const signal = { token: 'BONK', action: 'BUY', price: 0.001 };

    // Line 84: Call enqueue (async) and await result
    const result = await enqueue(signal);

    // Line 86: Assert: result should have queued=true
    expect(result.queued).toBe(true);
    // Line 88: Assert: token should match input
    expect(result.token).toBe('BONK');
    // Line 90: Assert: enriched signal has ts field
    expect(result.ts).toBeDefined();
    // Line 92: Assert: enriched signal has queuedAt timestamp
    expect(result.queuedAt).toBeDefined();
  });

  // Line 96: Test 2: should throw error for missing fields
  test('should throw on missing fields', async () => {
    // Line 98: Signal missing 'action' field
    const signal = { token: 'BONK', price: 0.001 };

    // Line 100: Assert: enqueue should throw Error
    await expect(enqueue(signal)).rejects.toThrow('Missing required fields');
  });

  // Line 104: Test 3: should add retryScheduled flag when retry option set
  test('should handle retry option', async () => {
    // Line 106: Signal with retries less than maxRetries (default 3)
    const signal = { token: 'BONK', action: 'BUY', price: 0.001, retries: 1 };

    // Line 108: Call enqueue with retry option
    const result = await enqueue(signal, { retry: true });

    // Line 110: Assert: retryScheduled should be true
    expect(result.retryScheduled).toBe(true);
  });

  // Line 114: Test 4: should add deadLettered flag when retries exceeded
  test('should handle dead letter when retries exceeded', async () => {
    // Line 116: Signal with retries >= maxRetries (3)
    const signal = { token: 'BONK', action: 'BUY', price: 0.001, retries: 3 };

    // Line 118: Call enqueue (retries=3, maxRetries=3, triggers deadLettered)
    const result = await enqueue(signal, { retry: true, maxRetries: 3 });

    // Line 120: Assert: deadLettered should be true
    expect(result.deadLettered).toBe(true);
  });
});

// Line 125: Test Suite 2: dequeue — FIFO order
describe('dequeue', () => {
  // Line 127: Test 5: should return null for empty queue
  test('should return null for empty queue', async () => {
    // Line 129: Call dequeue on empty queue
    const result = await dequeue();

    // Line 131: Assert: result should be null
    expect(result).toBeNull();
  });

  // Line 135: Test 6: should dequeue in FIFO order
  test('should dequeue in FIFO order', async () => {
    // Line 137: Enqueue two signals (first one should come out first)
    await enqueue({ token: 'BONK', action: 'BUY', price: 0.001 });
    await enqueue({ token: 'WIF', action: 'SELL', price: 0.002 });

    // Line 141: Dequeue first item — should be BONK (first in)
    const first = await dequeue();

    // Line 143: Assert: first dequeued should be BONK
    expect(first.token).toBe('BONK');

    // Line 145: Dequeue second item — should be WIF (second in)
    const second = await dequeue();

    // Line 147: Assert: second dequeued should be WIF
    expect(second.token).toBe('WIF');
  });

  // Line 151: Test 7: should return null when queue becomes empty after dequeue
  test('should return null after dequeuing all items', async () => {
    // Line 153: Enqueue one item
    await enqueue({ token: 'BONK', action: 'BUY', price: 0.001 });

    // Line 155: Dequeue the item
    await dequeue();

    // Line 157: Try to dequeue again — should be null
    const result = await dequeue();

    // Line 159: Assert: result should be null
    expect(result).toBeNull();
  });
});

// Line 164: Test Suite 3: getQueueLength & getQueueHealth
describe('getQueueLength', () => {
  // Line 166: Test 8: should return correct queue length
  test('should return correct queue length', async () => {
    // Line 168: Enqueue 3 items
    await enqueue({ token: 'BONK', action: 'BUY', price: 0.001 });
    await enqueue({ token: 'WIF', action: 'SELL', price: 0.002 });
    await enqueue({ token: 'PEPE', action: 'BUY', price: 0.0001 });

    // Line 172: Get queue length
    const length = await getQueueLength();

    // Line 174: Assert: length should be 3
    expect(length).toBe(3);
  });
});

describe('getQueueHealth', () => {
  // Line 180: Test 9: should return health status based on queue length
  test('should return healthy status for short queue', async () => {
    // Line 182: Enqueue 2 items (length < 100 = healthy)
    await enqueue({ token: 'BONK', action: 'BUY', price: 0.001 });
    await enqueue({ token: 'WIF', action: 'SELL', price: 0.002 });

    // Line 186: Get health status
    const health = await getQueueHealth();

    // Line 188: Assert: status should be 'healthy'
    expect(health.status).toBe('healthy');
    // Line 190: Assert: length should be 2
    expect(health.length).toBe(2);
    // Line 192: Assert: totalEnqueued should be a number >= 0
    expect(health.totalEnqueued).toBeGreaterThanOrEqual(0);
  });

  // Line 196: Test 10: should return degraded status for 100 < length <= 1000
  test('should return degraded status for medium queue', async () => {
    // Line 198: Enqueue 101 items to trigger 'degraded'
    for (let i = 0; i < 101; i++) {
      await enqueue({ token: `TKN${i}`, action: 'BUY', price: 0.001 });
    }

    // Line 202: Get health status
    const health = await getQueueHealth();

    // Line 204: Assert: status should be 'degraded'
    expect(health.status).toBe('degraded');
  });
});
