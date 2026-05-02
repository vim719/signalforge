// src/api/server.js — Phase3: Implementation (TDD)
// Line1: Import express for HTTP server
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Line2: Import queue functions for enqueue and health checks
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
    // Line32: Enqueue the signal
    const result = await enqueue(signal);
    // Line34: Return success response
    res.status(200).json(result);
  } catch (err) {
    // Line37: Return error if enqueue fails
    res.status(500).json({ error: err.message });
  }
});

// Line41: GET /health — return queue health status
app.get('/health', async (req, res) => {
  try {
    // Line44: Fetch health from queue module
    const health = await getQueueHealth();
    // Line46: Return health object
    res.status(200).json(health);
  } catch (err) {
    // Line49: Return error if health check fails
    res.status(500).json({ error: err.message });
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

// Line65: Export app for testing and server start
module.exports = { app };
