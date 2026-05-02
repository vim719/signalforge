// src/scraper/birdeye.js — Birdeye API client for token metadata
const axios = require('axios');

const BIRDEYE_BASE = 'https://public-api.birdeye.so';

async function getTokenMetadata(tokenSymbol) {
  if (!tokenSymbol) {
    throw new Error('Token symbol required');
  }

  try {
    const response = await axios.get(`${BIRDEYE_BASE}/public/price`, {
      params: { symbol: tokenSymbol },
      headers: {
        'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
      },
    });

    const data = response.data?.data || {};
    return {
      symbol: tokenSymbol,
      price: data.value || 0,
      volume24h: data.volume24h || 0,
      liquidity: data.liquidity || 0,
      timestamp: Date.now(),
    };
  } catch (err) {
    return { error: `Birdeye API error: ${err.message}` };
  }
}

module.exports = { getTokenMetadata };
