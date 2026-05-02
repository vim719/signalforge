// src/scraper/helius.js — Helius API client for token activity
const axios = require('axios');

const HELIUS_BASE = 'https://api.helius.xyz/v0';

async function getTokenActivity(tokenSymbol) {
  if (!tokenSymbol) {
    throw new Error('Token symbol required');
  }

  try {
    const response = await axios.get(`${HELIUS_BASE}/token-metadata`, {
      params: {
        'api-key': process.env.HELIUS_API_KEY || '',
      },
    });

    const tokens = response.data || [];
    const tokenData = tokens.find(t => t.symbol === tokenSymbol) || {};

    return {
      symbol: tokenSymbol,
      holders: tokenData.holderCount || 0,
      transfers24h: tokenData.transferCount24h || 0,
      timestamp: Date.now(),
    };
  } catch (err) {
    return { error: `Helius API error: ${err.message}` };
  }
}

module.exports = { getTokenActivity };
