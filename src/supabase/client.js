// src/supabase/client.js — Supabase client setup
const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
  }

  return createClient(url, key);
}

module.exports = { getSupabaseClient };
