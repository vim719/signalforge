const { calculateCorrelation } = require('../src/pair-agent/correlation');
const axios = require('axios');
const { analyzePair } = require('../src/pair-agent/analyzer');

jest.mock('axios');

describe('Pair-Agent', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('should calculate correlation', () => {
    const a = [0.00001, 0.000012, 0.000011, 0.000013, 0.000014];
    const b = [1.20, 1.23, 1.22, 1.25, 1.28];
    const c = calculateCorrelation(a, b);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThanOrEqual(1);
  });

  test('should analyze BONK/WIF pair', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { data: { BONK: { price: 0.00001234 } } })
      .mockResolvedValueOnce({ data: { data: { WIF: { price: 1.23 } } })
      .mockResolvedValueOnce({ data: { data: { value: 5000000, volume24h: 1000000 } } })
      .mockResolvedValueOnce({ data: [{ holderCount: 15000 }] });

    const result = await analyzePair('BONK', 'WIF');
    expect(result.pair).toBe('BONK/WIF');
    expect(result.strength).toBeGreaterThanOrEqual(0);
  });
});
