// redis-client.js — Fixed for Redis Cloud
require('dotenv').config();
const Redis = require('ioredis');

// Build Redis config for Redis Cloud (redislabs)
function getRedisConfig() {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;
  const password = process.env.REDIS_PASSWORD;
  
  // Redis Cloud (redislabs) — use rediss:// with default username
  if (host && host.includes('redislabs')) {
    const encodedPass = encodeURIComponent(password);
    const url = `rediss://default:${encodedPass}@${host}:${port}`;
    console.log('Redis URL:', url.replace(encodedPass, '***'));
    return url;
  }
  
  // Redis Cloud without redislabs in host — try the same
  if (host && port && password) {
    const encodedPass = encodeURIComponent(password);
    const url = `rediss://default:${encodedPass}@${host}:${port}`;
    console.log('Redis URL:', url.replace(encodedPass, '***'));
    return url;
  }
  
  // Local Redis
  return {
    host: host || 'localhost',
    port: parseInt(port) || 6379,
    password: password || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    lazyConnect: true
  };
}

const client = new Redis(getRedisConfig());

client.on('error', (err) => console.error('Redis Error:', err.message));
client.on('connect', () => console.log('Redis connected'));

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
  return await client.llen(QUEUE_KEY);
}

async function getQueueHealth() {
  const raw = await client.hgetall(HEALTH_KEY);
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
