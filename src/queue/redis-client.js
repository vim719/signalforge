// redis-client.js — Fixed for Redis Cloud (Redis Labs)
const redis = require('redis');

const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    tls: true // 🚨 REQUIRED for RedisLabs
  },
  password: process.env.REDIS_PASSWORD,
});

client.on('error', (err) => {
  console.error('Redis Error:', err.message);
});

client.on('connect', () => {
  console.log('Redis connected');
});

const QUEUE_KEY = 'signalforge:queue';
const DLQ_KEY = 'signalforge:dlq';
const HEALTH_KEY = 'signalforge:health';

async function enqueue(signal, options = {}) {
  if (!signal || typeof signal !== 'object') throw new Error('Missing required fields');
  const { token, action, price } = signal;
  if (!token || !action || price === undefined) throw new Error('Missing required fields');
  
  const enrichedSignal = {
    ...signal,
    ts: signal.ts || Date.now(),
    retries: signal.retries || 0,
    queuedAt: new Date().toISOString()
  };
  
  await client.lPush(QUEUE_KEY, JSON.stringify(enrichedSignal));
  await client.hSet(HEALTH_KEY, 'totalEnqueued', '1', 'lastEnqueueAt', Date.now().toString());
   
  const result = { queued: true, token: enrichedSignal.token, ...enrichedSignal };
  if (options.retry && signal.retries < (options.maxRetries || 3)) result.retryScheduled = true;
  if (signal.retries >= (options.maxRetries || 3)) result.deadLettered = true;
  return result;
}

async function dequeue() {
  const raw = await client.rPop(QUEUE_KEY);
  if (!raw) return null;
     
  try {
    const signal = JSON.parse(raw);
    await client.hIncrBy(HEALTH_KEY, 'totalProcessed', 1);
    return signal;
  } catch (err) {
    await client.lPush(DLQ_KEY, raw);
    return null;
  }
}

async function getQueueLength() {
  return await client.lLen(QUEUE_KEY);
}

async function getQueueHealth() {
  const raw = await client.hGetAll(HEALTH_KEY);
  const length = await getQueueLength();
     
  let status = 'healthy';
  if (length > 100) status = 'degraded';
  if (length > 1000) status = 'critical';
     
  const healthData = raw || {};
  return {
    length,
    status,
    totalEnqueued: parseInt(healthData.totalEnqueued || '0', 10),
    totalProcessed: parseInt(healthData.totalProcessed || '0', 10),
    lastEnqueueAt: healthData.lastEnqueueAt ? new Date(parseInt(healthData.lastEnqueueAt, 10)).toISOString() : null
  };
}

module.exports = { enqueue, dequeue, getQueueLength, getQueueHealth };
