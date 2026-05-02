// src/pair-agent/storage.js — Store pair analysis results in Redis
const redis = require('ioredis');
const client = new redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  lazyConnect: true,
});

const PAIR_KEY_PREFIX = 'signalforge:pair:';
const PAIR_HISTORY_KEY = 'signalforge:pairs:history';

async function storePairResult(result) {
  if (!result || !result.pair) {
    throw new Error('Valid pair result required');
  }

  const key = `${PAIR_KEY_PREFIX}${result.pair}`;

  // Store latest result
  await client.set(key, JSON.stringify(result));

  // Add to history list (keep last 100)
  await client.lpush(PAIR_HISTORY_KEY, JSON.stringify(result));
  await client.ltrim(PAIR_HISTORY_KEY, 0, 99);

  return { stored: true, key };
}

async function getPairResult(pairSymbol) {
  if (!pairSymbol) {
    throw new Error('Pair symbol required');
  }

  const key = `${PAIR_KEY_PREFIX}${pairSymbol}`;
  const data = await client.get(key);

  return data ? JSON.parse(data) : null;
}

async function getPairHistory(limit = 10) {
  const results = await client.lrange(PAIR_HISTORY_KEY, 0, limit - 1);
  return results.map(r => JSON.parse(r));
}

module.exports = { storePairResult, getPairResult, getPairHistory };
