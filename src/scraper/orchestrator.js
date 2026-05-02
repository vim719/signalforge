// src/scraper/orchestrator.js — Orchestrate token data collection
const { getTokenPrice } = require('./jupiter');
const { getTokenMetadata } = require('./birdeye');
const { getTokenActivity } = require('./helius');
const { enqueue } = require('../queue/redis-client');
const { analyzeSignal } = require('../0g/client');

async function scrapeToken(tokenSymbol) {
  if (!tokenSymbol) {
    throw new Error('Token symbol required');
  }

  const [priceData, metadata, activity] = await Promise.allSettled([
    getTokenPrice(tokenSymbol),
    getTokenMetadata(tokenSymbol),
    getTokenActivity(tokenSymbol),
  ]);

  const signal = {
    token: tokenSymbol,
    action: 'HOLD',
    price: priceData.value?.price || 0,
    volume24h: metadata.value?.volume24h || 0,
    liquidity: metadata.value?.liquidity || 0,
    holders: activity.value?.holders || 0,
    timestamp: Date.now(),
  };

  const errors = [];
  if (priceData.reason) errors.push(`Price: ${priceData.reason}`);
  if (metadata.reason) errors.push(`Metadata: ${metadata.reason}`);
  if (activity.reason) errors.push(`Activity: ${activity.reason}`);

  if (errors.length > 0) {
    signal.errors = errors;
  }

  return signal;
}

async function scrapeTokens(tokenSymbols) {
  if (!Array.isArray(tokenSymbols) || tokenSymbols.length === 0) {
    throw new Error('Token symbols array required');
  }

  const results = await Promise.allSettled(
    tokenSymbols.map(symbol => scrapeToken(symbol))
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

async function analyzeAndEnqueue(signal) {
  const { execute, analysis } = await analyzeSignal(signal);

  const enrichedSignal = {
    ...signal,
    ogAnalysis: analysis,
    action: analysis?.action || signal.action,
  };

  if (execute) {
    return await enqueue(enrichedSignal);
  }

  return { execute: false, signal: enrichedSignal, reason: '0G rejected' };
}

module.exports = { scrapeToken, scrapeTokens, analyzeAndEnqueue };
