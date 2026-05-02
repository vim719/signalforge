const axios = require('axios');
const { getTokenPrice } = require('../src/scraper/jupiter');
const { getTokenMetadata } = require('../src/scraper/birdeye');
const { getTokenActivity } = require('../src/scraper/helius');

jest.mock('axios');

describe('Token Scraper APIs', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('Jupiter API should fetch token price', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: { BONK: { price: 0.00001234 } } } });
    const result = await getTokenPrice('BONK');
    expect(result.price).toBe(0.00001234);
  });

  test('Birdeye API should fetch token metadata', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: { value: 1.23, volume24h: 5000000 } } });
    const result = await getTokenMetadata('WIF');
    expect(result.price).toBe(1.23);
    expect(result.volume24h).toBe(5000000);
  });

  test('Helius API should fetch token activity', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ symbol: 'BONK', holderCount: 15000, transferCount24h: 3200 }] });
    const result = await getTokenActivity('BONK');
    expect(result.holders).toBe(15000);
    expect(result.transfers24h).toBe(3200);
  });
});
