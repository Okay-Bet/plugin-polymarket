import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolymarketService } from '../polymarketService.js';
import { OrderType } from '../../types.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('PolymarketService', () => {
  let service: PolymarketService;
  
  beforeEach(() => {
    mockFetch.mockReset();
    service = new PolymarketService();
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

    const result = await service.fetchMarkets();

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
    await service.fetchMarkets(options);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCallArgs = mockFetch.mock.calls[0][0] as string;
    expect(fetchCallArgs).toContain('active=false');
  });

  it('should use default apiUrl', async () => {
     mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await service.fetchMarkets();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('https://gamma-api.polymarket.com/markets');
  });

  it('should handle API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await service.fetchMarkets();

    expect(result.success).toBe(false);
    expect(result.error).toBe('API request failed with status 500');
    expect(result.markets).toBeUndefined();
  });

   it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const result = await service.fetchMarkets();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network failure");
    expect(result.markets).toBeUndefined();
  });

  describe('Order validation and placement', () => {
    it('should validate buy order parameters correctly', async () => {
      const validParams = {
        tokenId: 'test-token-123',
        price: 0.65,
        size: 10,
        orderType: OrderType.GTC
      };

      const result = await service.validateOrder(validParams);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid order parameters', async () => {
      const invalidParams = {
        tokenId: '',
        price: 1.5, // Invalid: > 1
        size: -1,   // Invalid: < 0
        orderType: OrderType.GTC
      };

      const result = await service.validateOrder(invalidParams);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Token ID is required');
      expect(result.errors).toContain('Price must be between 0 and 1');
      expect(result.errors).toContain('Size must be greater than 0');
    });

    it('should validate GTD orders require expiration', async () => {
      const gtdParams = {
        tokenId: 'test-token-123',
        price: 0.65,
        size: 10,
        orderType: OrderType.GTD
        // Missing expiration
      };

      const result = await service.validateOrder(gtdParams);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Expiration timestamp is required for GTD orders');
    });

    it('should place buy order successfully (simulated)', async () => {
      const orderParams = {
        tokenId: 'test-token-123',
        price: 0.65,
        size: 10,
        orderType: OrderType.GTC
      };

      const result = await service.placeBuyOrder(orderParams);
      
      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.details?.tokenId).toBe('test-token-123');
      expect(result.details?.price).toBe(0.65);
      expect(result.details?.size).toBe(10);
    });

    it('should return wallet status correctly', () => {
      const status = service.getWalletStatus();
      
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('hasPrivateKey');
      expect(status).toHaveProperty('hasApiCredentials');
      expect(typeof status.configured).toBe('boolean');
      expect(typeof status.hasPrivateKey).toBe('boolean');
      expect(typeof status.hasApiCredentials).toBe('boolean');
    });

    it('should check wallet configuration', () => {
      const isConfigured = service.isWalletConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });
  });

  describe('Sell order validation and placement', () => {
    it('should validate sell order parameters correctly', async () => {
      const validParams = {
        tokenId: 'test-token-123',
        price: 0.75,
        size: 20,
        orderType: OrderType.GTC
      };

      const result = await service.validateSellOrder(validParams);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain('Selling will realize your current profit/loss on this position');
    });

    it('should reject invalid sell order parameters', async () => {
      const invalidParams = {
        tokenId: '',
        price: 1.5, // Invalid: > 1
        size: -1,   // Invalid: < 0
        orderType: OrderType.GTC
      };

      const result = await service.validateSellOrder(invalidParams);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Token ID is required');
      expect(result.errors).toContain('Price must be between 0 and 1');
      expect(result.errors).toContain('Size must be greater than 0');
    });

    it('should validate GTD sell orders require expiration', async () => {
      const gtdParams = {
        tokenId: 'test-token-123',
        price: 0.75,
        size: 20,
        orderType: OrderType.GTD
        // Missing expiration
      };

      const result = await service.validateSellOrder(gtdParams);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Expiration timestamp is required for GTD orders');
    });

    it('should warn about very low sell prices', async () => {
      const lowPriceParams = {
        tokenId: 'test-token-123',
        price: 0.005, // Very low price
        size: 20,
        orderType: OrderType.GTC
      };

      const result = await service.validateSellOrder(lowPriceParams);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Very low sell price - you may want to hold longer or set a higher price');
    });

    it('should warn about very high sell prices', async () => {
      const highPriceParams = {
        tokenId: 'test-token-123',
        price: 0.995, // Very high price
        size: 20,
        orderType: OrderType.GTC
      };

      const result = await service.validateSellOrder(highPriceParams);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Very high sell price - ensure this reflects current market conditions');
    });

    it('should place sell order successfully (simulated)', async () => {
      const orderParams = {
        tokenId: 'test-token-123',
        price: 0.75,
        size: 20,
        orderType: OrderType.GTC
      };

      const result = await service.placeSellOrder(orderParams);
      
      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.orderId).toMatch(/^sell_order_/);
      expect(result.details).toBeDefined();
      expect(result.details?.tokenId).toBe('test-token-123');
      expect(result.details?.price).toBe(0.75);
      expect(result.details?.size).toBe(20);
      expect(result.details?.side).toBe('SELL');
    });

    it('should fail to place sell order with invalid parameters', async () => {
      const invalidParams = {
        tokenId: '',
        price: 2.0, // Invalid price
        size: 20,
        orderType: OrderType.GTC
      };

      const result = await service.placeSellOrder(invalidParams);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Sell order validation failed');
      expect(result.error).toContain('Token ID is required');
    });
  });

  describe('Redeem functionality', () => {
    it('should get redeemable positions (test environment)', async () => {
      const positions = await service.getRedeemablePositions();
      
      expect(Array.isArray(positions)).toBe(true);
      expect(positions).toHaveLength(2);
      expect(positions[0]).toHaveProperty('tokenId', 'test-token-123');
      expect(positions[0]).toHaveProperty('marketQuestion', 'Will Bitcoin reach $100k in 2024?');
      expect(positions[0]).toHaveProperty('estimatedPayout', 50.0);
      expect(positions[0].marketResolved).toBe(true);
      expect(positions[0].payoutsReported).toBe(true);
      expect(positions[1].payoutsReported).toBe(false);
    });

    it('should validate redeem parameters correctly', async () => {
      const validParams = {
        positions: [
          {
            tokenId: 'test-token-123',
            marketId: 'test-market-1',
            marketQuestion: 'Will Bitcoin reach $100k in 2024?',
            amount: 50,
            winningOutcome: 'Yes',
            estimatedPayout: 50.0,
            marketResolved: true,
            payoutsReported: true
          }
        ],
        batchRedeem: false
      };

      const result = await service.validateRedeemPositions(validParams);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalPayout).toBe(50.0);
      expect(result.gasEstimate).toContain('ETH');
    });

    it('should reject invalid redeem parameters', async () => {
      const invalidParams = {
        positions: [
          {
            tokenId: '',
            marketId: 'test-market-1',
            marketQuestion: 'Test market',
            amount: -1,
            winningOutcome: 'Yes',
            estimatedPayout: 50.0,
            marketResolved: false,
            payoutsReported: false
          }
        ]
      };

      const result = await service.validateRedeemPositions(invalidParams);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid token ID for position: Test market');
      expect(result.errors).toContain('Invalid token amount for position: Test market');
      expect(result.warnings).toContain('Market not yet resolved: Test market');
      expect(result.warnings).toContain('Payouts not yet reported for: Test market');
    });

    it('should reject empty positions array', async () => {
      const emptyParams = {
        positions: []
      };

      const result = await service.validateRedeemPositions(emptyParams);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one position is required for redemption');
    });

    it('should warn about large batch redemptions', async () => {
      const positions = Array.from({ length: 15 }, (_, i) => ({
        tokenId: `test-token-${i}`,
        marketId: `test-market-${i}`,
        marketQuestion: `Test market ${i}?`,
        amount: 10,
        winningOutcome: 'Yes',
        estimatedPayout: 10.0,
        marketResolved: true,
        payoutsReported: true
      }));

      const batchParams = {
        positions,
        batchRedeem: true
      };

      const result = await service.validateRedeemPositions(batchParams);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Large batch redemption may require higher gas fees');
      expect(result.totalPayout).toBe(150.0);
    });

    it('should redeem positions successfully (simulated)', async () => {
      const redeemParams = {
        positions: [
          {
            tokenId: 'test-token-123',
            marketId: 'test-market-1',
            marketQuestion: 'Will Bitcoin reach $100k in 2024?',
            amount: 50,
            winningOutcome: 'Yes',
            estimatedPayout: 50.0,
            marketResolved: true,
            payoutsReported: true
          },
          {
            tokenId: 'test-token-456',
            marketId: 'test-market-2',
            marketQuestion: 'Will AI achieve AGI by 2025?',
            amount: 25,
            winningOutcome: 'No',
            estimatedPayout: 25.0,
            marketResolved: true,
            payoutsReported: true
          }
        ]
      };

      const result = await service.redeemPositions(redeemParams);
      
      expect(result.success).toBe(true);
      expect(result.transactionHash).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.details?.redeemedPositions).toHaveLength(2);
      expect(result.details?.totalPayout).toBe(75.0);
      expect(result.details?.status).toBe('confirmed');
    });

    it('should filter out non-redeemable positions', async () => {
      const redeemParams = {
        positions: [
          {
            tokenId: 'test-token-123',
            marketId: 'test-market-1',
            marketQuestion: 'Ready market',
            amount: 50,
            winningOutcome: 'Yes',
            estimatedPayout: 50.0,
            marketResolved: true,
            payoutsReported: true
          },
          {
            tokenId: 'test-token-456',
            marketId: 'test-market-2',
            marketQuestion: 'Not ready market',
            amount: 25,
            winningOutcome: 'No',
            estimatedPayout: 25.0,
            marketResolved: false,
            payoutsReported: false
          }
        ]
      };

      const result = await service.redeemPositions(redeemParams);
      
      expect(result.success).toBe(true);
      expect(result.details?.redeemedPositions).toHaveLength(1);
      expect(result.details?.totalPayout).toBe(50.0);
    });

    it('should fail when no positions are ready for redemption', async () => {
      const redeemParams = {
        positions: [
          {
            tokenId: 'test-token-456',
            marketId: 'test-market-2',
            marketQuestion: 'Not ready market',
            amount: 25,
            winningOutcome: 'No',
            estimatedPayout: 25.0,
            marketResolved: false,
            payoutsReported: false
          }
        ]
      };

      const result = await service.redeemPositions(redeemParams);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No positions are currently ready for redemption');
    });

    it('should fail redemption with invalid parameters', async () => {
      const invalidParams = {
        positions: []
      };

      const result = await service.redeemPositions(invalidParams);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Redemption validation failed');
    });

    it('should return correct CTF contract info', () => {
      const contractInfo = service.getCTFContractInfo();
      
      expect(contractInfo).toHaveProperty('address', '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045');
      expect(contractInfo).toHaveProperty('collateralToken', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');
      expect(contractInfo).toHaveProperty('chainId', 137);
    });
  });
});