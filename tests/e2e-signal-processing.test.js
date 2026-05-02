// tests/e2e-signal-processing.test.js — End-to-end test with real 0G API
// This test requires 0G_API_KEY in .env

// Line1: Import 0G client for signal analysis
const { analyzeSignal } = require('../src/0g/client');

// Line4: Import KeeperHub service for execution
const { executeSignal: executeSignalService } = require('../src/keeperhub/service');

// Line7: Import Redis client for queue operations
const { enqueue, dequeue, getQueueHealth } = require('../src/queue/redis-client');

// Line10: Check if 0G API key is available (Vercel uses ZERO_G_AI_API_KEY, local uses 0G_AI_API_KEY)
const zeroGKey = process.env.ZERO_G_AI_API_KEY || process.env.0G_AI_API_KEY;
const has0GApiKey = zeroGKey && zeroGKey.length > 20;

// Line14: Skip tests if no real API key
const describeOrSkip = has0GApiKey ? describe : describe.skip;

describeOrSkip('End-to-End Signal Processing with 0G', () => {
  // Line18: Test1: should analyze signal with real 0G API
  test('should analyze signal with real 0G API', async () => {
    // Line20: Create a test signal
    const signal = {
      token: 'BONK',
      action: 'BUY',
      price: 0.00001234,
      source: 'jupiter',
    };

    // Line26: Call real 0G API for analysis
    const analysis = await analyzeSignal(signal);

    // Line29: Assert: analysis should have execute flag
    expect(analysis.execute).toBeDefined();
    // Line31: Assert: analysis should have analysis object
    expect(analysis.analysis).toBeDefined();
    // Line33: Log the analysis for inspection
    console.log('0G Analysis:', JSON.stringify(analysis, null, 2));
  }, 30000); // 30s timeout for API call

  // Line37: Test2: should process signal end-to-end (0G → KeeperHub)
  test('should process signal end-to-end', async () => {
    // Line39: Create a test signal
    const signal = {
      token: 'WIF',
      action: 'BUY',
      price: 0.001500,
      source: 'telegram',
    };

    // Line45: Enqueue the signal first
    const enqueueResult = await enqueue(signal);
    expect(enqueueResult.success).toBe(true);

    // Line49: Process the queue (this will call 0G then KeeperHub)
    const processResult = await require('../src/keeperhub/service').processQueue(1);

    // Line52: Assert: signal was processed or skipped by 0G
    expect(processResult.processed + processResult.skipped).toBe(1);
    // Line54: Log the result
    console.log('Process Result:', JSON.stringify(processResult, null, 2));
  }, 30000);

  // Line58: Test3: should check Redis health before processing
  test('should verify Redis health before processing', async () => {
    // Line60: Check Redis health
    const health = await getQueueHealth();

    // Line63: Assert: Redis should be connected
    expect(health.redis).toBe('connected');
    // Line65: Assert: status should be healthy
    expect(health.status).toBe('healthy');
    // Line67: Log health status
    console.log('Redis Health:', JSON.stringify(health, null, 2));
  });
});
