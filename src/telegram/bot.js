// src/telegram/bot.js — SignalForge Telegram Bot
const { Telegraf } = require('telegraf');
const { enqueue, dequeue, getQueueLength, getQueueHealth } = require('../queue/redis-client');
const { getStatus } = require('../keeperhub/client');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot will not function');
}

const bot = new Telegraf(BOT_TOKEN || 'dummy-token');

// In-memory store for active chat IDs (for broadcasting notifications)
const activeChats = new Set();

// Helper: safely reply with error handling
async function safeReply(ctx, text, extra) {
  try {
    if (extra) return await ctx.reply(text, extra);
    return await ctx.reply(text);
  } catch (err) {
    console.error('Telegram reply error:', err.message);
  }
}

// /start — welcome message
bot.command('start', async (ctx) => {
  if (ctx.chat) activeChats.add(ctx.chat.id);
  const welcome = [
    '👋 Welcome to SignalForge!',
    '',
    'Autonomous Execution Layer for Crypto Signals',
    '',
    'Commands:',
    '/signal <token> <action> <price> — Submit a trading signal',
    '/status — Check system status',
    '/queue — Show queue depth',
    '/alert — Peek next signal in queue',
    '/positions — View mock positions',
    '/lasttrade — View last trade',
    '/help — Show this help',
  ].join('\n');
  await safeReply(ctx, welcome);
});

// /help — help message
bot.command('help', async (ctx) => {
  if (ctx.chat) activeChats.add(ctx.chat.id);
  const help = [
    '🛠 SignalForge Commands:',
    '',
    '/signal <token> <action> <price> — Submit a trading signal',
    '/status — Check system & Redis health',
    '/queue — Show current queue depth',
    '/alert — Peek next signal from queue',
    '/positions — View mock positions',
    '/lasttrade — View last trade info',
    '/start — Welcome & register chat',
  ].join('\n');
  await safeReply(ctx, help);
});

// /status — system health
bot.command('status', async (ctx) => {
  if (ctx.chat) activeChats.add(ctx.chat.id);
  try {
    const health = await getQueueHealth();
    const keeper = await getStatus();
    const statusText = [
      '📊 SignalForge Status',
      '',
      `Redis: ${health.redisConnected ? '✅ Connected' : '⚠️ Disconnected'}`,
      health.redisError ? `Redis Error: ${health.redisError}` : '',
      `Queue Length: ${health.length}`,
      `Queue Status: ${health.status}`,
      `Total Enqueued: ${health.totalEnqueued}`,
      `Total Processed: ${health.totalProcessed}`,
      '',
      `KeeperHub: ${keeper.status || 'unknown'}`,
    ].join('\n');
    await safeReply(ctx, statusText);
  } catch (err) {
    await safeReply(ctx, `⚠️ Status check failed: ${err.message}`);
  }
});

// /signal — submit signal
bot.command('signal', async (ctx) => {
  if (ctx.chat) activeChats.add(ctx.chat.id);
  const messageText = ctx.message.text || '';
  const parts = messageText.split(' ').filter((p) => p);

  if (parts.length < 4) {
    return safeReply(ctx, 'Invalid format. Use: /signal <token> <action> <price>');
  }

  const [, token, action, priceStr] = parts;
  const price = parseFloat(priceStr);

  if (!token || !action || isNaN(price)) {
    return safeReply(ctx, 'Invalid format. Use: /signal <token> <action> <price>');
  }

  const signal = { token, action: action.toUpperCase(), price };

  try {
    const result = await enqueue(signal);
    await safeReply(ctx, `✅ Signal queued!\nToken: ${result.token}\nAction: ${signal.action}\nPrice: ${signal.price}`);
  } catch (err) {
    await safeReply(ctx, `❌ Error: ${err.message}`);
  }
});

// /alert — peek next signal
bot.command('alert', async (ctx) => {
  if (ctx.chat) activeChats.add(ctx.chat.id);
  try {
    const signal = await dequeue();
    if (!signal) {
      return safeReply(ctx, 'Queue is empty. No signals to alert.');
    }
    await safeReply(ctx, `🚨 Signal Alert!\nToken: ${signal.token}\nAction: ${signal.action}\nPrice: ${signal.price}`);
  } catch (err) {
    await safeReply(ctx, `❌ Error: ${err.message}`);
  }
});

// /queue — queue depth
bot.command('queue', async (ctx) => {
  if (ctx.chat) activeChats.add(ctx.chat.id);
  try {
    const length = await getQueueLength();
    await safeReply(ctx, `📦 Current queue length: ${length}`);
  } catch (err) {
    await safeReply(ctx, `❌ Error: ${err.message}`);
  }
});

// /positions — mock positions
bot.command('positions', async (ctx) => {
  if (ctx.chat) activeChats.add(ctx.chat.id);
  const positions = [
    { token: 'PEPE', action: 'BUY', entry: 0.00001, size: 1000000, pnl: '+12.5%' },
    { token: 'BONK', action: 'BUY', entry: 0.00002, size: 500000, pnl: '-3.2%' },
  ];
  const text = [
    '📈 Mock Positions',
    '',
    ...positions.map(p => `• ${p.token} | ${p.action} | ${p.size} | ${p.pnl}`),
    '',
    '(This is demo data — real positions require onchain wallet integration)',
  ].join('\n');
  await safeReply(ctx, text);
});

// /lasttrade — last trade
bot.command('lasttrade', async (ctx) => {
  if (ctx.chat) activeChats.add(ctx.chat.id);
  const text = [
    '🔄 Last Trade',
    '',
    'Token: PEPE',
    'Action: BUY',
    'Price: 0.00001',
    'Size: 1,000,000',
    'Tx Hash: 0xabc123...',
    'Status: ✅ Executed',
    'Time: 2026-05-04T19:30:00Z',
    '',
    '(This is demo data)',
  ].join('\n');
  await safeReply(ctx, text);
});

// Inline keyboard actions
bot.action(/BUY:(.+):(.+)/, async (ctx) => {
  const match = ctx.match;
  const token = match[1];
  const price = parseFloat(match[2]);
  const signal = { token, action: 'BUY', price };
  await enqueue(signal);
  await ctx.answerCbQuery('BUY signal sent!');
  await safeReply(ctx, `✅ BUY signal for ${token} sent!`);
});

bot.action(/SELL:(.+):(.+)/, async (ctx) => {
  const match = ctx.match;
  const token = match[1];
  const price = parseFloat(match[2]);
  const signal = { token, action: 'SELL', price };
  await enqueue(signal);
  await ctx.answerCbQuery('SELL signal sent!');
  await safeReply(ctx, `✅ SELL signal for ${token} sent!`);
});

// Notification helpers called by server
async function notifySignalReceived(signal) {
  const text = `📡 Signal Received\nToken: ${signal.token}\nAction: ${signal.action}\nPrice: ${signal.price}`;
  for (const chatId of activeChats) {
    try {
      await bot.telegram.sendMessage(chatId, text);
    } catch (err) {
      console.error(`Failed to notify chat ${chatId}:`, err.message);
    }
  }
}

async function notifyTradeExecuted(result) {
  const text = [
    '✅ Trade Executed',
    `Token: ${result.token}`,
    `Action: ${result.action}`,
    `Tx Hash: ${result.txId || 'N/A'}`,
  ].join('\n');
  for (const chatId of activeChats) {
    try {
      await bot.telegram.sendMessage(chatId, text);
    } catch (err) {
      console.error(`Failed to notify chat ${chatId}:`, err.message);
    }
  }
}

module.exports = bot;
module.exports.notifySignalReceived = notifySignalReceived;
module.exports.notifyTradeExecuted = notifyTradeExecuted;
module.exports.activeChats = activeChats;
