// api/index.js — Vercel serverless entry point
// Line1: Import the Express app from src/api/server.js
const { app } = require('../src/api/server');

// Line3: Export for Vercel serverless (no listen call — Vercel handles it)
module.exports = app;
