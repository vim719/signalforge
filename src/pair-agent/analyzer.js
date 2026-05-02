// src/pair-agent/analyzer.js — Analyze token pairs
const { getTokenPrice } = require('../scraper/jupiter');
const { getTokenMetadata } = require('../scraper/birdeye');
const { getTokenActivity } = require('../scraper/helius');
const { calculateCorrelation } = require('./correlation');

async function analyzePair(tokenA, tokenB) {
  if (!tokenA || !tokenB) {
    throw new Error('Both token symbols required');
  }

  try {
    // Fetch prices for both tokens
    const [priceA, priceB] = await Promise.all([
      getTokenPrice(tokenA),
      getTokenPrice(tokenB),
    ]);

    // Fetch metadata for primary token
    const metadata = await getTokenMetadata(tokenA);

    // Fetch activity for primary token
    const activity = await getTokenActivity(tokenA);

    // Calculate price ratio (tokenA relative to tokenB)
    const priceRatio = priceA.price / priceB.price;

    // Calculate a simple strength score (0-100)
    // Based on: volume, liquidity, correlation (mocked for now)
    let strength = 50; // base score

    if (metadata.volume24h > 1000000) strength += 20;
    if (metadata.liquidity > 500000) strength += 20;
    if (activity.holders > 10000) strength += 10;

    // Ensure within bounds
    strength = Math.min(100, Math.max(0, strength));

    return {
      pair: `${tokenA}/${tokenB}`,
      tokenA: {
        symbol: tokenA,
        price: priceA.price,
        volume24h: metadata.volume24h,
        liquidity: metadata.liquidity,
      },
      tokenB: {
        symbol: tokenB,
        price: priceB.price,
      },
      priceRatio: priceRatio.toFixed(6),
      strength,
      correlation: 0.85, // Would calculate from historical data
      timestamp: Date.now(),
    };
  } catch (err) {
    throw new Error(`Pair analysis failed: ${err.message}`);
  }
}

module.exports = { analyzePair };
