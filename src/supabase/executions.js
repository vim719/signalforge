// src/supabase/executions.js — Executions table operations
const { getSupabaseClient } = require('./client');

async function saveExecution(execution) {
  if (!execution || !execution.signalId) {
    throw new Error('Valid execution with signalId required');
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('executions')
    .insert([
      {
        signal_id: execution.signalId,
        status: execution.status || 'pending',
        tx_hash: execution.txHash || null,
        executed_at: execution.executedAt || null,
        error_message: execution.error || null,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return data[0];
}

async function getExecutions(limit = 100) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('executions')
    .select('*, signals(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  return data;
}

module.exports = { saveExecution, getExecutions };
