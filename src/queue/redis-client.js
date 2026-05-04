// redis-client.js — Fixed for Redis Cloud
require('dotenv').config();
const Redis = require('ioredis');

let isRedisConnected = false;
let lastRedisError = null;

// Build Redis config for Redis Cloud (redislabs)
function getRedisConfig() {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;
  const password = process.env.REDIS_PASSWORD;
  const useTls = process.env.REDIS_TLS === 'true';
  const protocol = useTls ? 'rediss' : 'redis';

  // Redis Cloud or any remote Redis with credentials
  if (host && port && password) {
    const encodedPass = encodeURIComponent(password);
    const url = `${protocol}://default:${encodedPass}@${host}:${port}`;
    console.log('Redis URL:', url.replace(encodedPass, '***'));
    return { url, lazyConnect: true };
  }

  // Local Redis
  return {
    host: host || 'localhost',
    port: parseInt(port) || 6379,
    password: password || undefined,
    tls: useTls ? {} : undefined,
    lazyConnect: true
  };
}

const client = new Redis(getRedisConfig());

client.on('error', (err) => {
  lastRedisError = err.message;
  isRedisConnected = false;
  console.error('Redis Error:', err.message);
});
client.on('connect', () => {
  isRedisConnected = true;
  lastRedisError = null;
  console.log('Redis connected');
});
client.on('close', () => {
  isRedisConnected = false;
  console.log('Redis connection closed');
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
  
  await client.lpush(QUEUE_KEY, JSON.stringify(enrichedSignal));
  await client.hset(HEALTH_KEY, 'totalEnqueued', '1', 'lastEnqueueAt', Date.now().toString());
  
  const result = { queued: true, token: enrichedSignal.token, ...enrichedSignal };
  if (options.retry && signal.retries < (options.maxRetries || 3)) result.retryScheduled = true;
  if (signal.retries >= (options.maxRetries || 3)) result.deadLettered = true;
  return result;
}

async function dequeue() {
  const raw = await client.rpop(QUEUE_KEY);
  if (!raw) return null;
    
  try {
    const signal = JSON.parse(raw);
    await client.hincrby(HEALTH_KEY, 'totalProcessed', 1);
    return signal;
  } catch (err) {
    await client.lpush(DLQ_KEY, raw);
    return null;
  }
}

async function getQueueLength() {
  try {
    return await client.llen(QUEUE_KEY);
  } catch (err) {
    console.error('Redis getQueueLength error:', err.message);
    return 0;
  }
}

async function getQueueHealth() {
  try {
    const raw = await client.hgetall(HEALTH_KEY);
    const length = await getQueueLength();

    let status = 'healthy';
    if (length > 100) status = 'degraded';
    if (length > 1000) status = 'critical';

    const healthData = raw || {};
    return {
      length,
      status,
      redisConnected: isRedisConnected,
      totalEnqueued: parseInt(healthData.totalEnqueued || '0', 10),
      totalProcessed: parseInt(healthData.totalProcessed || '0', 10),
      lastEnqueueAt: healthData.lastEnqueueAt ? new Date(parseInt(healthData.lastEnqueueAt, 10)).toISOString() : null
    };
  } catch (err) {
    return {
      length: 0,
      status: 'degraded',
      redisConnected: false,
      redisError: err.message,
      totalEnqueued: 0,
      totalProcessed: 0,
      lastEnqueueAt: null
    };
  }
}

module.exports = { enqueue, dequeue, getQueueLength, getQueueHealth, client, isRedisConnected };
