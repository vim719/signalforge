// tests/api.test.js — TDD Phase 2: Test Generation for API (Express webhook receiver)
// Line 1: Import Express testing utilities
const request = require('supertest');
const express = require('express');

// Line 4: Mock the queue module before requiring API
jest.mock('../src/queue/redis-client', () => ({
  enqueue: jest.fn(),
  dequeue: jest.fn(),
  getQueueLength: jest.fn(),
  getQueueHealth: jest.fn(),
}));

// Line 12: Import mocked queue functions
const { enqueue, getQueueHealth } = require('../src/queue/redis-client');

// Line 15: Import API module (will create next)
let app;
let API_KEY;

// Line 18: Setup before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Line 21: Re-require API to get fresh instance
  delete require.cache[require.resolve('../src/api/server')];
  // Line23: Set API key in environment
  process.env.WEBHOOK_API_KEY = 'test-api-key-123';
  API_KEY = 'test-api-key-123';
  const api = require('../src/api/server');
  app = api.app || api; // Handle both exports
});

// Line 28: Test Suite 1: Webhook endpoint POST /webhook
describe('POST /webhook', () => {
  // Line 30: Test 1: should accept valid signal and return 200
  test('should accept valid signal and return 200', async () => {
    // Line 32: Mock enqueue to return success
    enqueue.mockResolvedValue({ queued: true, token: 'BONK' });

    // Line 34: Create valid webhook payload
    const signal = {
      token: 'BONK',
      action: 'BUY',
      price: 0.001,
      source: 'jupiter',
    };

    // Line 40: Send POST request to /webhook with API key
    const response = await request(app)
      .post('/webhook')
      .set('x-api-key', API_KEY)
      .send(signal)
      .expect(200);

    // Line 45: Assert: response should confirm queued
    expect(response.body.queued).toBe(true);
    // Line 47: Assert: enqueue was called with signal
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining(signal));
  });

  // Line 51: Test 2: should reject signal with missing fields (400)
  test('should reject missing fields with 400', async () => {
    // Line 53: Signal missing 'action' field
    const signal = { token: 'BONK', price: 0.001 };

    // Line 55: Send POST request with API key
    const response = await request(app)
      .post('/webhook')
      .set('x-api-key', API_KEY)
      .send(signal)
      .expect(400);

    // Line 59: Assert: error message present
    expect(response.body.error).toBeDefined();
  });

  // Line 63: Test 3: should reject invalid source with 400
  test('should reject invalid source with 400', async () => {
    // Line 65: Signal with invalid source
    const signal = {
      token: 'BONK',
      action: 'BUY',
      price: 0.001,
      source: 'invalidsource',
    };

    // Line 71: Send POST request with API key
    const response = await request(app)
      .post('/webhook')
      .set('x-api-key', API_KEY)
      .send(signal)
      .expect(400);

    // Line 75: Assert: error about source
    expect(response.body.error).toMatch(/source/i);
  });

  // Line 79: Test 4: should accept signals from valid sources
  test('should accept valid sources: jupiter, birdeye, helius', async () => {
    // Line 81: Mock enqueue success
    enqueue.mockResolvedValue({ queued: true });

    // Line 83: Test each valid source
    for (const source of ['jupiter', 'birdeye', 'helius']) {
      const signal = { token: 'BONK', action: 'BUY', price: 0.001, source };

      // Line 86: Send request with API key
      await request(app)
        .post('/webhook')
        .set('x-api-key', API_KEY)
        .send(signal)
        .expect(200);

      // Line 90: Assert: enqueue called
      expect(enqueue).toHaveBeenCalled();
    }
  });
});

// Line 96: Test Suite 2: Health endpoint GET /health
describe('GET /health', () => {
  // Line 98: Test 5: should return health status
  test('should return health status', async () => {
    // Line 100: Mock getQueueHealth to return healthy status
    getQueueHealth.mockResolvedValue({
      status: 'healthy',
      length: 5,
      totalEnqueued: 10,
      totalProcessed: 5,
    });

    // Line 107: Send GET request to /health
    const response = await request(app)
      .get('/health')
      .expect(200);

    // Line 111: Assert: status should be healthy
    expect(response.body.status).toBe('healthy');
    // Line 113: Assert: length should be 5
    expect(response.body.length).toBe(5);
  });

  // Line 117: Test 6: should return degraded status when queue overloaded
  test('should return degraded status', async () => {
    // Line 119: Mock health with degraded status
    getQueueHealth.mockResolvedValue({
      status: 'degraded',
      length: 150,
      totalEnqueued: 200,
      totalProcessed: 50,
    });

    // Line 126: Send GET request
    const response = await request(app)
      .get('/health')
      .expect(200);

    // Line 130: Assert: status should be degraded
    expect(response.body.status).toBe('degraded');
  });
});

// Line 135: Test Suite 3: Queue length endpoint GET /queue/length
describe('GET /queue/length', () => {
  // Line 137: Test 7: should return current queue length
  test('should return queue length', async () => {
    // Line 139: Mock getQueueLength
    const { getQueueLength } = require('../src/queue/redis-client');
    getQueueLength.mockResolvedValue(3);

    // Line 143: Send GET request
    const response = await request(app)
      .get('/queue/length')
      .expect(200);

    // Line 147: Assert: length should be 3
    expect(response.body.length).toBe(3);
  });
});
