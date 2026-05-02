// src/supabase/migration.js — Migrate Redis queue data to Supabase
const { createClient } = require('@supabase/supabase-js');
const redis = require('ioredis');

const REDIS_KEY = 'signalforge:queue';
const DLQ_KEY = 'signalforge:dlq';

async function migrateFromRedis() {
  // Connect to Redis
  const redisClient = new redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  });

  // Connect to Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let migrated = 0;
  let failed = 0;

  try {
    // Get all items from Redis queue
    const queueLength = await redisClient.llen(REDIS_KEY);
    console.log(`Found ${queueLength} items in Redis queue`);

    // Process each item
    for (let i = 0; i < queueLength; i++) {
      const raw = await redisClient.rpop(REDIS_KEY);
      if (!raw) break;

      try {
        const signal = JSON.parse(raw);

        // Insert into Supabase
        const { data, error } = await supabase
          .from('signals')
          .insert([{
            token: signal.token,
            action: signal.action || 'HOLD',
            price: signal.price || 0,
            volume_24h: signal.volume24h || 0,
            liquidity: signal.liquidity || 0,
            holders: signal.holders || 0,
            confidence: signal.ogAnalysis?.confidence || 0,
            og_analysis: signal.ogAnalysis || null,
            created_at: new Date(signal.timestamp || Date.now()).toISOString(),
          }])
          .select();

        if (error) {
          console.error(`Failed to insert signal:`, error);
          failed++;
          // Push back to DLQ
          await redisClient.lpush(DLQ_KEY, raw);
        } else {
          migrated++;
          console.log(`Migrated signal ${signal.token}: ID ${data[0].id}`);
        }
      } catch (err) {
        console.error(`Failed to process item:`, err);
        failed++;
        await redisClient.lpush(DLQ_KEY, raw);
      }
    }

    return { migrated, failed, total: queueLength };
  } finally {
    redisClient.disconnect();
  }
}

module.exports = { migrateFromRedis };
