// src/0g/client.js — 0G.ai API client for signal analysis
// Line1: Import axios for HTTP requests
const axios = require('axios');
// Line2: Load 0G config
const config = require('../../0g.config.js');

// Line4: Create axios client with 0G API key
const client = axios.create({
  baseURL: 'https://api.0g.ai/v1',
  headers: { 'Authorization': `Bearer ${config.compute.apiKey}` }
});

// Line10: Analyze a signal using 0G agent
async function analyzeSignal(signal) {
  try {
    // Line13: Send signal to 0G for analysis
    const response = await client.post('/chat/completions', {
      model: config.compute.model,  // '0g-lite'
      messages: [{
        role: 'user',
        content: `Analyze this trading signal: ${JSON.stringify(signal)}. 
                   Return JSON with: confidence (0-1), action (BUY/SELL/HOLD), reason.`
      }],
      max_tokens: config.compute.maxTokens,
      temperature: config.compute.temperature,
    });

    // Line25: Parse 0G response
    const text = response.data.choices[0].message.content;
    const analysis = JSON.parse(text);

    // Line29: Apply 0G rules (min confidence check)
    if (analysis.confidence < config.rules.minConfidence) {
      return { execute: false, reason: 'Confidence too low', analysis };
    }

    return { execute: true, analysis };
  } catch (err) {
    // Line35: Return error if 0G call fails
    return { execute: false, reason: `0G error: ${err.message}`, analysis: null };
  }
}

// Line39: Export for use in queue processing
module.exports = { analyzeSignal };
