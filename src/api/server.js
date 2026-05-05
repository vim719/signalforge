// src/api/server.js — Phase3: Implementation (TDD)
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import queue functions for enqueue and health checks
const { enqueue, getQueueHealth, getQueueLength } = require('../queue/redis-client');

// Line5: Create express app instance
const app = express();

// Line7: Security middleware — helmet for security headers
app.use(helmet());
// Line8: CORS configuration — restrict origins in production
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
// Line9: Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// Line10: Middleware to parse JSON bodies in requests
app.use(express.json());

// Line12: Valid sources for signal ingestion
const VALID_SOURCES = ['jupiter', 'birdeye', 'helius'];
// Line13: API key for webhook authentication
const API_KEY = process.env.WEBHOOK_API_KEY || 'mock-api-key';

// Line15: Auth middleware — require API key for webhook
function authMiddleware(req, res, next) {
  const providedKey = req.headers['x-api-key'] || req.query.api_key;
  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Line20: POST /webhook — accept incoming signals from sources
app.post('/webhook', authMiddleware, async (req, res) => {
  // Line22: Extract signal from request body
  const signal = req.body;

  // Line17: Validate required fields: token, action, price
  if (!signal || typeof signal !== 'object') {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const { token, action, price, source } = signal;
  if (!token || !action || price === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Line27: Validate source if provided
  if (source && !VALID_SOURCES.includes(source)) {
    return res.status(400).json({ error: 'Invalid source' });
  }

  try {
    const result = await enqueue(signal);
    // Notify Telegram subscribers
    notifySignalReceived(signal).catch((err) => console.error('Telegram notify error:', err.message));
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /health — return queue health status (always 200 so Railway doesn't kill us)
app.get('/health', async (req, res) => {
  try {
    const health = await getQueueHealth();
    res.status(200).json(health);
  } catch (err) {
    res.status(200).json({
      status: 'degraded',
      redisConnected: false,
      redisError: err.message,
      length: 0,
      totalEnqueued: 0,
      totalProcessed: 0,
      lastEnqueueAt: null
    });
  }
});

// Line53: GET /queue/length — return current queue depth
app.get('/queue/length', async (req, res) => {
  try {
    // Line56: Fetch queue length from queue module
    const length = await getQueueLength();
    // Line58: Return length in JSON
    res.status(200).json({ length });
  } catch (err) {
    // Line61: Return error if length check fails
    res.status(500).json({ error: err.message });
  }
});

// Line63: Debug endpoint — check env vars (remove after debugging)
app.get('/debug/env', (req, res) => {
  res.json({
    redis_url: process.env.REDIS_URL ? 'set' : 'missing',
    redis_host: process.env.REDIS_HOST || 'missing',
    redis_port: process.env.REDIS_PORT || 'missing',
    redis_password: process.env.REDIS_PASSWORD ? 'set' : 'missing',
    redis_tls: process.env.REDIS_TLS || 'missing',
  });
});

// Import bot for telegram webhook and notifications
const bot = require('../telegram/bot');
const { notifySignalReceived, notifyTradeExecuted } = require('../telegram/bot');

// Telegram webhook endpoint for Railway deployment
app.post('/telegram-webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.status(200).send('OK'); // Always return 200 to Telegram
  }
});

// Serve static frontend files
const path = require('path');
app.use(express.static(path.join(__dirname, '../../public')));

// Fallback to index.html for SPA routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

// Export app for testing and Vercel serverless
module.exports = app;

// Start server for Railway deployment
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  console.log('Starting SignalForge server on port', PORT);
  console.log('Redis Host:', process.env.REDIS_HOST ? 'set' : 'missing');
  console.log('Redis Port:', process.env.REDIS_PORT || 'default');
  console.log('Redis Password:', process.env.REDIS_PASSWORD ? 'set' : 'missing');
  console.log('Redis TLS:', process.env.REDIS_TLS || 'false (default)');

  const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on ${PORT}`);
    console.log('Server started successfully');
    
    // Set Telegram webhook if URL is configured
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    if (webhookUrl && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        await bot.telegram.setWebhook(webhookUrl);
        console.log('Telegram webhook set to:', webhookUrl);
      } catch (err) {
        console.error('Failed to set Telegram webhook:', err.message);
      }
    } else {
      console.log('TELEGRAM_WEBHOOK_URL not set, skipping webhook registration');
    }
  });
}
