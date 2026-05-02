// src/keeperhub/service.js — Phase3: Implementation (TDD)
// Line1: Import KeeperHub client for execution
const { executeSignal, getStatus } = require('./client');

// Line4: Import queue functions for dequeue
const { dequeue } = require('../queue/redis-client');

// Line7: executeSignal — send signal to KeeperHub for execution
async function executeSignalService(signal) {
  // Line9: Validate signal
  if (!signal || typeof signal !== 'object') {
    return { success: false, error: 'Invalid signal' };
  }

  try {
    // Line14: Call KeeperHub client to execute signal
    const result = await executeSignal(signal);
    // Line16: Return success with result
    return { success: true, ...result };
  } catch (err) {
    // Line19: Return failure with error
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

// Line37: processQueue — dequeue signals and execute them (with limit to prevent infinite loop)
async function processQueue(maxItems = 10) {
  let processed = 0;
  let errors = 0;

  // Line42: Process up to maxItems to prevent infinite loop in tests
  for (let i = 0; i < maxItems; i++) {
    // Line44: Dequeue next signal
    const signal = await dequeue();
    if (!signal) break; // Queue is empty

    try {
      // Line48: Execute signal via KeeperHub
      await executeSignal(signal);
      processed++;
    } catch (err) {
      // Line52: Count errors but continue processing
      errors++;
    }
  }

  // Line56: Return processing summary
  return { processed, errors };
}

// Line59: Export service functions
module.exports = {
  executeSignal: executeSignalService,
  getStatus: getStatusService,
  processQueue,
};
