// src/telegram/bot.js — Phase3: Implementation (TDD)
// Line1: Import telegraf for Telegram Bot API
const { Telegraf } = require('telegraf');

// Line3: Import queue functions for signal handling
const { enqueue, dequeue, getQueueLength } = require('../queue/redis-client');

// Line6: Bot token from environment variable
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'mock-token';

// Line9: Create bot instance
const bot = new Telegraf(BOT_TOKEN);

// Line12: /signal command — submit signal via Telegram
bot.command('signal', async (ctx) => {
  // Line14: Parse command arguments: /signal <token> <action> <price>
  const messageText = ctx.message.text || '';
  const parts = messageText.split(' ').filter((p) => p);

  // Line18: Validate format: need at least 4 parts (/signal, token, action, price)
  if (parts.length < 4) {
    return ctx.reply('Invalid format. Use: /signal <token> <action> <price>');
  }

  const [, token, action, priceStr] = parts;
  const price = parseFloat(priceStr);

  // Line26: Validate inputs
  if (!token || !action || isNaN(price)) {
    return ctx.reply('Invalid format. Use: /signal <token> <action> <price>');
  }

  // Line30: Create signal object
  const signal = { token, action: action.toUpperCase(), price };

  try {
    // Line33: Enqueue the signal
    const result = await enqueue(signal);
    // Line35: Reply with success
    ctx.reply(`Signal queued! Token: ${result.token}, Action: ${signal.action}`);
  } catch (err) {
    // Line38: Reply with error
    ctx.reply(`Error: ${err.message}`);
  }
});

// Line42: /alert command — send alert with next signal from queue
bot.command('alert', async (ctx) => {
  try {
    // Line45: Dequeue next signal
    const signal = await dequeue();

    // Line47: If no signal, reply accordingly
    if (!signal) {
      return ctx.reply('Queue is empty. No signals to alert.');
    }

    // Line51: Send alert with signal data
    ctx.reply(
      `🚨 Signal Alert!\nToken: ${signal.token}\nAction: ${signal.action}\nPrice: ${signal.price}`
    );
  } catch (err) {
    // Line56: Reply with error
    ctx.reply(`Error: ${err.message}`);
  }
});

// Line60: /queue command — show current queue status
bot.command('queue', async (ctx) => {
  try {
    // Line63: Get queue length
    const length = await getQueueLength();
    // Line65: Reply with queue length
    ctx.reply(`Current queue length: ${length}`);
  } catch (err) {
    // Line67: Reply with error
    ctx.reply(`Error: ${err.message}`);
  }
});

// Line71: Inline keyboard action — handle BUY/SELL actions
bot.action(/BUY:(.+):(.+)/, async (ctx) => {
  // Line73: Parse action data: BUY:<token>:<price>
  const match = ctx.match;
  const token = match[1];
  const price = parseFloat(match[2]);

  // Line77: Create signal and enqueue
  const signal = { token, action: 'BUY', price };
  await enqueue(signal);

  // Line80: Answer callback query
  await ctx.answerCbQuery('BUY signal sent!');
  // Line82: Reply with confirmation
  await ctx.reply(`BUY signal for ${token} sent!`);
});

// Line86: Inline keyboard action — handle SELL actions
bot.action(/SELL:(.+):(.+)/, async (ctx) => {
  // Line88: Parse action data: SELL:<token>:<price>
  const match = ctx.match;
  const token = match[1];
  const price = parseFloat(match[2]);

  // Line92: Create signal and enqueue
  const signal = { token, action: 'SELL', price };
  await enqueue(signal);

  // Line95: Answer callback query
  await ctx.answerCbQuery('SELL signal sent!');
  // Line97: Reply with confirmation
  await ctx.reply(`SELL signal for ${token} sent!`);
});

// Line101: Export bot for testing and launching
module.exports = bot;
