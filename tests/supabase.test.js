// tests/supabase.test.js — TDD: Supabase integration
const { createClient } = require('@supabase/supabase-js');
const { enqueue } = require('../src/queue/redis-client');

jest.mock('@supabase/supabase-js');
jest.mock('../src/queue/redis-client', () => ({
  enqueue: jest.fn().mockResolvedValue({ queued: true }),
  dequeue: jest.fn().mockResolvedValue(null),
  getQueueLength: jest.fn().mockResolvedValue(0),
  getQueueHealth: jest.fn().mockResolvedValue({ length: 0, status: 'healthy' }),
}));

describe('Supabase Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should set up supabase client with env vars', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';

    const { getSupabaseClient } = require('../src/supabase/client');
    const client = getSupabaseClient();

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'test-anon-key'
    );
  });

  test('should create signals table row', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
    const mockFrom = jest.fn(() => ({ insert: mockInsert }));
    createClient.mockReturnValue({ from: mockFrom });

    const { saveSignal } = require('../src/supabase/signals');
    const signal = {
      token: 'BONK',
      action: 'BUY',
      price: 0.00001234,
      confidence: 0.85,
    };

    const result = await saveSignal(signal);

    expect(mockFrom).toHaveBeenCalledWith('signals');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining(signal));
    expect(result.id).toBe(1);
  });

  test('should create executions table row', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
    const mockFrom = jest.fn(() => ({ insert: mockInsert }));
    createClient.mockReturnValue({ from: mockFrom });

    const { saveExecution } = require('../src/supabase/executions');
    const execution = {
      signalId: 1,
      status: 'success',
      txHash: '0xabc123',
      executedAt: new Date().toISOString(),
    };

    const result = await saveExecution(execution);

    expect(mockFrom).toHaveBeenCalledWith('executions');
    expect(result.id).toBe(1);
  });

  test('should create agent_decisions table row', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
    const mockFrom = jest.fn(() => ({ insert: mockInsert }));
    createClient.mockReturnValue({ from: mockFrom });

    const { saveDecision } = require('../src/supabase/decisions');
    const decision = {
      signalId: 1,
      agent: '0g-lite',
      decision: 'EXECUTE',
      confidence: 0.85,
      reasoning: 'Strong momentum detected',
    };

    const result = await saveDecision(decision);

    expect(mockFrom).toHaveBeenCalledWith('agent_decisions');
    expect(result.id).toBe(1);
  });

  test('should migrate queue data from Redis to Supabase', async () => {
    const mockSignals = [
      { token: 'BONK', action: 'BUY', price: 0.00001234 },
      { token: 'WIF', action: 'SELL', price: 1.23 },
    ];

    // Mock Redis dequeue to return signals
    const { dequeue } = require('../src/queue/redis-client');
    dequeue
      .mockResolvedValueOnce(mockSignals[0])
      .mockResolvedValueOnce(mockSignals[1])
      .mockResolvedValueOnce(null); // Queue empty

    const mockInsert = jest.fn().mockResolvedValue({ data: [{}], error: null });
    const mockFrom = jest.fn(() => ({ insert: mockInsert }));
    createClient.mockReturnValue({ from: mockFrom });

    const { migrateFromRedis } = require('../src/supabase/migration');
    const result = await migrateFromRedis();

    expect(result.migrated).toBe(2);
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  test('should apply RLS policies', async () => {
    const mockRPC = jest.fn().mockResolvedValue({ error: null });
    createClient.mockReturnValue({ rpc: mockRPC });

    const { enableRLS } = require('../src/supabase/rls');
    await enableRLS('signals');

    expect(mockRPC).toHaveBeenCalledWith('enable_rls', { table_name: 'signals' });
  });
});
