// src/supabase/decisions.js — Agent decisions table operations
const { getSupabaseClient } = require('./client');

async function saveDecision(decision) {
  if (!decision || !decision.signalId) {
    throw new Error('Valid decision with signalId required');
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('agent_decisions')
    .insert([
      {
        signal_id: decision.signalId,
        agent: decision.agent || '0g-lite',
        decision: decision.decision || 'HOLD',
        confidence: decision.confidence || 0,
        reasoning: decision.reasoning || null,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return data[0];
}

async function getDecisions(limit = 100) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('agent_decisions')
    .select('*, signals(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  return data;
}

module.exports = { saveDecision, getDecisions };
