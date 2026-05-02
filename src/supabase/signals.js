// src/supabase/signals.js — Signals table operations
const { getSupabaseClient } = require('./client');

async function saveSignal(signal) {
  if (!signal || !signal.token) {
    throw new Error('Valid signal with token required');
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('signals')
    .insert([
      {
        token: signal.token,
        action: signal.action || 'HOLD',
        price: signal.price,
        volume_24h: signal.volume24h || 0,
        liquidity: signal.liquidity || 0,
        holders: signal.holders || 0,
        confidence: signal.confidence || 0,
        og_analysis: signal.ogAnalysis || null,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return data[0];
}

async function getSignals(limit = 100) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  return data;
}

module.exports = { saveSignal, getSignals };
