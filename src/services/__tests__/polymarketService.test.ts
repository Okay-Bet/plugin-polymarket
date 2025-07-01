import { describe, it, expect, beforeEach, vi } from 'vitest';
import { polymarketService, initializePolymarketConfig } from '../polymarketService';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('polymarketService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    initializePolymarketConfig({ apiUrl: "https://gamma-api.polymarket.com/markets" });
  });

  it('should fetch markets with default options and transform the response', async () => {
    const mockApiResponse = [
      {
        id: 'market1',
        question: 'Test Question 1?',
        description: 'Desc 1',
        volume: 10000,
        liquidity: 6000,
        slug: 'test-question-1',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        active: true,
        outcomes: JSON.stringify(['Yes']),
        outcomePrices: JSON.stringify(['0.6']),
        clobTokenIds: JSON.stringify(['market1-outcome-0']),
        acceptingOrders: true,
        closed: false,
        new: false,
        orderMinSize: 5,
        orderPriceMinTickSize: 0.001,
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await polymarketService.fetchMarkets();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCallArgs = mockFetch.mock.calls[0][0] as string;
    expect(fetchCallArgs).toContain('active=true');
    expect(fetchCallArgs).toContain('liquidity_num_min=5000');
    expect(fetchCallArgs).toContain('volume_num_min=20000');

    expect(result.success).toBe(true);
    expect(result.markets).toHaveLength(1);
    expect(result.markets?.[0]).toEqual({
      id: 'market1',
      slug: 'test-question-1',
      question: 'Test Question 1?',
      description: 'Desc 1',
      active: true,
      closed: false, 
      acceptingOrders: true, 
      new: false, 
      volume: 10000,
      liquidity: 6000,
      url: 'https://polymarket.com/market/test-question-1',
      startDate: '2025-01-01', 
      endDate: '2025-12-31',
      outcomes: [
        {
          clobTokenId: 'market1-outcome-0', 
          name: 'Yes',
          price: 0.6,
        },
      ],
      orderMinSize: 5,
      orderPriceMinTickSize: 0.001,
      volume24hr: undefined,
      volume1wk: undefined,
      volume1mo: undefined,
      volume1yr: undefined,
      oneDayPriceChange: undefined,
      oneHourPriceChange: undefined,
      oneWeekPriceChange: undefined,
      oneMonthPriceChange: undefined,
      lastTradePrice: undefined,
      bestBid: undefined,
      bestAsk: undefined,
    });
  });

  it('should fetch markets with custom options (query, limit, activeOnly=false)', async () => {
    const mockApiResponse: any[] = [];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    const options = { limit: 5, query: 'Bitcoin', activeOnly: false };
    await polymarketService.fetchMarkets(options);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCallArgs = mockFetch.mock.calls[0][0] as string;
    expect(fetchCallArgs).toContain('active=false');
  });

  it('should use custom apiUrl if initialized', async () => {
    const customApiUrl = "https://test-api.polymarket.com/v1/markets";
    initializePolymarketConfig({ apiUrl: customApiUrl });
     mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await polymarketService.fetchMarkets();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain(customApiUrl);
  });

  it('should handle API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await polymarketService.fetchMarkets();

    expect(result.success).toBe(false);
    expect(result.error).toBe('API request failed with status 500');
    expect(result.markets).toBeUndefined();
  });

   it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const result = await polymarketService.fetchMarkets();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network failure");
    expect(result.markets).toBeUndefined();
  });
});