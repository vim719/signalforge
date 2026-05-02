// 0G.config.js — 0G.ai integration for SignalForge
// This file configures 0G Compute and Storage access

module.exports = {
  // 0G Compute (agent brain)
  compute: {
    apiKey: process.env.OG_AI_API_KEY || 'sk-2fb88b18-c4e6-4a26-8f71-199357a6bb67',
    model: '0g-lite', // or '0g-pro' for complex tasks
    maxTokens: 2000,
    temperature: 0.7,
  },

  // 0G Storage (for signal history, agent memory)
  storage: {
    bucket: 'signalforge-storage',
    endpoint: process.env.OG_STORAGE_ENDPOINT || 'https://storage.0g.ai',
    accessKey: process.env.OG_STORAGE_KEY || '',
  },

  // Agent configuration
  agent: {
    name: 'SignalForgeAgent',
    maxConcurrent: 3,
    retryLimit: 3,
    timeout: 30000, // 30s per task
  },

  // Signal processing rules
  rules: {
    minConfidence: 0.7, // Only act on high-confidence signals
    maxPriceDeviation: 0.15, // 15% max deviation from reference
    cooldownMs: 5000, // 5s between signals for same token
  }
};
