// api/index.js — Vercel serverless entry point
// Line1: Import the Express app from src/api/server.js
const { app } = require('../src/api/server.js');

// Line3: Export the Express app directly for Vercel serverless
module.exports = app;
