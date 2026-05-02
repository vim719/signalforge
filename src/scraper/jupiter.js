// src/scraper/jupiter.js — Jupiter API client for token prices
const axios = require('axios');

const JUPITER_BASE = 'https://price.jup.ag/v6';

async function getTokenPrice(tokenSymbol) {
  if (!tokenSymbol) {
    throw new Error('Token symbol required');
  }

  try {
    const response = await axios.get(`${JUPITER_BASE}/price`, {
      params: { ids: tokenSymbol },
    });

    if (!response.data?.data?.[tokenSymbol]) {
      return { error: `No price data for ${tokenSymbol}` };
    }

    const tokenData = response.data.data[tokenSymbol];
    return {
      symbol: tokenSymbol,
      price: tokenData.price || 0,
      timestamp: Date.now(),
    };
  } catch (err) {
    return { error: `Jupiter API error: ${err.message}` };
  }
}

module.exports = { getTokenPrice };
