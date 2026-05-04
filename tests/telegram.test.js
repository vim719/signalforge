// tests/telegram.test.js — TDD Phase2: Test Generation for Telegram bot
// Line1: Mock telegraf with singleton pattern so bot.js and tests share same instance
jest.mock('telegraf', () => {
  // Line3: Shared handlers storage (persists across constructor calls)
  const handlers = {};

  // Line5: Create the single shared bot instance
  const mockBot = {
    // Line7: command() stores handler in shared storage
    command: jest.fn((cmd, handler) => {
      handlers[`command:${cmd}`] = handler;
      return mockBot;
    }),
    // Line12: action() stores handler in shared storage
    action: jest.fn((pattern, handler) => {
      const key = typeof pattern === 'string' ? pattern : pattern.toString();
      handlers[`action:${key}`] = handler;
      return mockBot;
    }),
    launch: jest.fn().mockResolvedValue(true),
    stop: jest.fn(),
    reply: jest.fn().mockResolvedValue({}),
    answerCbQuery: jest.fn().mockResolvedValue(true),
  };

  // Line26: Add test helpers to the shared instance
  mockBot._simulateCommand = function (cmd, ctx) {
    const handler = handlers[`command:${cmd}`];
    if (handler) return handler(ctx);
    return null;
  };

  mockBot._simulateAction = function (actionData, ctx) {
    const keys = Object.keys(handlers).filter(k => k.startsWith('action:'));
    for (const key of keys) {
      const pattern = key.replace('action:', '');
      if (actionData.match(pattern)) {
        const handler = handlers[key];
        if (handler) return handler(ctx);
      }
    }
    return null;
  };

  // Line42: Telegraf constructor returns the SAME instance every time
  const Telegraf = jest.fn(() => mockBot);

  // Line45: Return { Telegraf } to match actual export structure
  return { Telegraf, __mockBot: mockBot };
});

// Line 49: Mock the queue module
jest.mock('../src/queue/redis-client', () => ({
  enqueue: jest.fn(),
  dequeue: jest.fn(),
  getQueueLength: jest.fn(),
  getQueueHealth: jest.fn(),
  isRedisConnected: false,
  client: {},
}));

// Mock keeperhub client
jest.mock('../src/keeperhub/client', () => ({
  getStatus: jest.fn().mockResolvedValue({ status: 'healthy', latency: 50 }),
  executeSignal: jest.fn().mockResolvedValue({ success: true, txId: '0xabc123' }),
  getBalance: jest.fn().mockResolvedValue({ balance: 1000, currency: 'USDC' }),
}));

// Line57: Import modules after mocks are set up
const { enqueue, dequeue, getQueueLength } = require('../src/queue/redis-client');
const { Telegraf, __mockBot } = require('telegraf');

// Line61: Import telegram bot module (registers handlers on __mockBot)
let botModule;

// Line64: Setup before each test
beforeEach(() => {
  jest.clearAllMocks();
  delete require.cache[require.resolve('../src/telegram/bot')];
  botModule = require('../src/telegram/bot');
});

// Line71: Test Suite1: /signal command
describe('/signal command', () => {
  test('should accept valid signal and reply success', async () => {
    enqueue.mockResolvedValue({ queued: true, token: 'BONK' });

    const ctx = {
      message: { text: '/signal BONK BUY 0.001', from: { id: 12345 } },
      reply: jest.fn().mockResolvedValue({}),
    };

    await __mockBot._simulateCommand('signal', ctx);

    expect(enqueue).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('queued'));
  });

  test('should reject invalid signal format', async () => {
    const ctx = {
      message: { text: '/signal INVALID', from: { id: 12345 } },
      reply: jest.fn().mockResolvedValue({}),
    };

    await __mockBot._simulateCommand('signal', ctx);

    expect(enqueue).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Invalid'));
  });
});

// Line104: Test Suite2: /alert command
describe('/alert command', () => {
  test('should send alert with signal data', async () => {
    dequeue.mockResolvedValue({ token: 'BONK', action: 'BUY', price: 0.001 });

    const ctx = {
      message: { text: '/alert' },
      reply: jest.fn().mockResolvedValue({}),
    };

    await __mockBot._simulateCommand('alert', ctx);

    expect(dequeue).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('BONK'));
  });
});

// Line126: Test Suite3: /queue command
describe('/queue command', () => {
  test('should show queue length', async () => {
    getQueueLength.mockResolvedValue(5);

    const ctx = {
      message: { text: '/queue' },
      reply: jest.fn().mockResolvedValue({}),
    };

    await __mockBot._simulateCommand('queue', ctx);

    expect(getQueueLength).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('5'));
  });
});
