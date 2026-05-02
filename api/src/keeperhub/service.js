// src/keeperhub/service.js — Phase3: Implementation (TDD)
// Line1: Import KeeperHub client for execution
const { executeSignal, getStatus } = require('./client');

// Line4: Import queue functions for dequeue
const { dequeue } = require('../queue/redis-client');

// Line5: Import 0G client for signal analysis
const { analyzeSignal } = require('../0g/client');

// Line6: Import 0G config for rules
const config = require('../../0g.config.js');

// Line7: executeSignalService — analyze with 0G then execute via KeeperHub
async function executeSignalService(signal) {
  // Line9: Validate signal
  if (!signal || typeof signal !== 'object') {
    return { success: false, error: 'Invalid signal' };
  }

  try {
    // Line14: Analyze signal with 0G agent first
    const analysis = await analyzeSignal(signal);

    // Line17: Check if 0G says execute
    if (!analysis.execute) {
      return { success: false, error: analysis.reason, analysis: analysis.analysis };
    }

    // Line21: Execute signal via KeeperHub
    const result = await executeSignal(signal);
    // Line23: Return success with result and analysis
    return { success: true, ...result, analysis: analysis.analysis };
  } catch (err) {
    // Line26: Return failure with error
    return { success: false, error: err.message };
  }
}

// Line23: getStatus — check KeeperHub and queue health
async function getStatusService() {
  try {
    // Line26: Get KeeperHub status
    const keeperStatus = await getStatus();
    // Line28: Return combined status
    return {
      keeperhub: keeperStatus,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Line33: Return error status
    return { success: false, error: err.message };
  }
}

// Line37: processQueue — dequeue signals, analyze with 0G, execute via KeeperHub
async function processQueue(maxItems = 10) {
  let processed = 0;
  let errors = 0;
  let skipped = 0;

  // Line42: Process up to maxItems to prevent infinite loop in tests
  for (let i = 0; i < maxItems; i++) {
    // Line44: Dequeue next signal
    const signal = await dequeue();
    if (!signal) break; // Queue is empty

    try {
      // Line48: Analyze with 0G first, then execute if approved
      const result = await executeSignalService(signal);
      if (result.success) {
        processed++;
      } else {
        skipped++; // 0G rejected the signal
      }
    } catch (err) {
      // Line52: Count errors but continue processing
      errors++;
    }
  }

  // Line56: Return processing summary
  return { processed, errors, skipped };
}

// Line59: Export service functions
module.exports = {
  executeSignal: executeSignalService,
  getStatus: getStatusService,
  processQueue,
};
