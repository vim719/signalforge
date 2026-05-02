// api/index.js — Vercel serverless entry point
const path = require('path');
const app = require(path.join(__dirname, 'src/api/server.js'));
module.exports = app;
