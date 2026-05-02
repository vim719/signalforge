// redis-client.js — Phase 3: Implementation (TDD)
require('dotenv').config();
// Line 1: Import ioredis for Redis client functionality
const Redis = require('ioredis');

// Line 2: Create Redis client using env vars (defaults: localhost:6379)
const client = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  lazyConnect: true
});

// Line 3: Queue key prefix for namespace isolation
const QUEUE_KEY = 'signalforge:queue';

// Line 4: Dead letter queue key for failed signals after max retries
const DLQ_KEY = 'signalforge:dlq';

// Line 5: Health key in Redis hash for queue statistics
const HEALTH_KEY = 'signalforge:health';

// Line 6: enqueue — add a signal to the queue with timestamp for FIFO ordering
async function enqueue(signal, options = {}) {
  // Line 7: Validate required fields: token, action, price must all be present
  if (!signal || typeof signal !== 'object') {
    throw new Error('Missing required fields');
  }
  const { token, action, price } = signal;
  if (!token || !action || price === undefined) {
    throw new Error('Missing required fields');
  }

  // Line 16: Add timestamp for ordering if not provided
  const enrichedSignal = {
    ...signal,
    ts: signal.ts || Date.now(),
    retries: signal.retries || 0,
    queuedAt: new Date().toISOString(),
  };

  // Line 23: Push to Redis list (FIFO queue)
  // LPUSH adds to head (left), RPOP removes from tail (right) = FIFO
  await client.lpush(QUEUE_KEY, JSON.stringify(enrichedSignal));

  // Line 27: Update health stats: increment total enqueued count
  await client.hset(HEALTH_KEY, 'totalEnqueued', '1', 'lastEnqueueAt', Date.now().toString());

  // Line 30: Return success with signal data
  const result = { queued: true, token: enrichedSignal.token, ...enrichedSignal };

  // Line 33: If retry option set, add retryScheduled flag
  if (options.retry && signal.retries < (options.maxRetries || 3)) {
    result.retryScheduled = true;
  }

  // Line 37: If retries exceeded, add deadLettered flag
  if (signal.retries >= (options.maxRetries || 3)) {
    result.deadLettered = true;
  }

  return result;
}

// Line 42: dequeue — pull next signal from queue in FIFO order
async function dequeue() {
  // Line 43: Use rpop to remove and return the tail element (FIFO)
  const raw = await client.rpop(QUEUE_KEY);
  if (!raw) {
    return null; // Line 46: queue is empty
  }

  try {
    // Line 49: Parse the JSON string back to object
    const signal = JSON.parse(raw);
    // Line 51: Update health stats: increment total processed count
    await client.hincrby(HEALTH_KEY, 'totalProcessed', 1);
    return signal;
  } catch (err) {
    // Line 55: JSON parse failed — treat as dead letter
    await client.lpush(DLQ_KEY, raw);
    return null;
  }
}

// Line 61: getQueueLength — return the current queue depth
async function getQueueLength() {
  // Line 62: LLEN returns the length of the list
  return await client.llen(QUEUE_KEY);
}

// Line 65: getQueueHealth — return health status based on queue metrics
async function getQueueHealth() {
  // Line 66: Fetch all health fields from Redis hash
  const raw = await client.hgetall(HEALTH_KEY);
  const length = await getQueueLength();

  // Line 69: Determine status based on queue length
  let status = 'healthy';
  if (length > 100) {
    status = 'degraded'; // Line 72: >100 items = degraded performance
  }
  if (length > 1000) {
    status = 'critical'; // Line 75: >1000 items = critical
  }

  // Line 77: Return health object with computed fields
  // Handle null from hgetall (when key doesn't exist yet)
  const healthData = raw || {};
  return {
    length,
    status,
    totalEnqueued: parseInt(healthData.totalEnqueued || '0', 10),
    totalProcessed: parseInt(healthData.totalProcessed || '0', 10),
    lastEnqueueAt: healthData.lastEnqueueAt ? new Date(parseInt(healthData.lastEnqueueAt, 10)).toISOString() : null,
  };
}

// Line 88: Export all queue functions for use in other modules
module.exports = { enqueue, dequeue, getQueueLength, getQueueHealth };
