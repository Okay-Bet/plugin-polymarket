import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPortfolioPositionsAction } from '../../../../src/actions/getPortfolioPositions';
import type { IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';

// Mock the elizaos/core module
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
});

// Mock the clobClient utils
vi.mock('../../../../src/utils/clobClient', () => ({
  initializeClobClient: vi.fn().mockResolvedValue({
    wallet: { address: '0xTestWalletAddress' }
  })
}));

describe('getPortfolioPositionsAction', () => {
  let mockRuntime: IAgentRuntime;
  let mockCallback: HandlerCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRuntime = {
      getSetting: vi.fn().mockReturnValue('https://clob.polymarket.com'),
      character: { name: 'TestAgent' },
    } as any;

    mockCallback = vi.fn();
  });

  describe('metadata', () => {
    it('should have correct action name', () => {
      expect(getPortfolioPositionsAction.name).toBe('GET_PORTFOLIO_POSITIONS');
    });

    it('should have appropriate similes', () => {
      expect(getPortfolioPositionsAction.similes).toContain('GET_POSITIONS');
      expect(getPortfolioPositionsAction.similes).toContain('SHOW_PORTFOLIO');
      expect(getPortfolioPositionsAction.similes).toContain('MY_POSITIONS');
      expect(getPortfolioPositionsAction.similes).toContain('HOLDINGS');
    });

    it('should have a description', () => {
      expect(getPortfolioPositionsAction.description).toBeDefined();
      expect(getPortfolioPositionsAction.description).toContain('portfolio');
    });
  });

  describe('validate', () => {
    it('should return true when CLOB_API_URL is set', async () => {
      const memory: Memory = {
        content: { text: 'show my positions' },
      } as any;

      const result = await getPortfolioPositionsAction.validate(mockRuntime, memory);
      expect(result).toBe(true);
    });

    it('should return false when CLOB_API_URL is not set', async () => {
      mockRuntime.getSetting = vi.fn().mockReturnValue(undefined);
      const memory: Memory = {
        content: { text: 'show my positions' },
      } as any;

      const result = await getPortfolioPositionsAction.validate(mockRuntime, memory);
      expect(result).toBe(false);
    });
  });

  describe('handler', () => {
    it('should handle portfolio with positions', async () => {
      const memory: Memory = {
        content: { text: 'show my portfolio' },
      } as any;

      // Mock fetch for positions data
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            asset: 'token123',
            outcome: 'YES',
            size: '100',
            currentValue: '75.50',
            avgPrice: '0.65',
            curPrice: '0.755',
            cashPnl: '10.50',
            title: 'Will BTC reach $100k?'
          },
          {
            asset: 'token456',
            outcome: 'NO',
            size: '50',
            currentValue: '25.00',
            avgPrice: '0.50',
            curPrice: '0.50',
            cashPnl: '0',
            title: 'Will ETH flip BTC?'
          }
        ]
      });

      const result = await getPortfolioPositionsAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalled();
      
      // Check callback was called with portfolio data
      const callbackCall = mockCallback.mock.calls[mockCallback.mock.calls.length - 1];
      const content = callbackCall[0];
      expect(content.text).toContain('Portfolio Positions');
      expect(content.text).toContain('2 position');
    });

    it('should handle empty portfolio', async () => {
      const memory: Memory = {
        content: { text: 'show my positions' },
      } as any;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const result = await getPortfolioPositionsAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(true);
      
      const callbackCall = mockCallback.mock.calls[mockCallback.mock.calls.length - 1];
      const content = callbackCall[0];
      expect(content.text).toContain('No active positions');
    });

    it('should handle API errors gracefully', async () => {
      const memory: Memory = {
        content: { text: 'get my positions' },
      } as any;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await getPortfolioPositionsAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(true); // Still succeeds but with fallback
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should calculate total portfolio value', async () => {
      const memory: Memory = {
        content: { text: 'portfolio value' },
      } as any;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            asset: 'token1',
            size: '100',
            currentValue: '100.00',
            outcome: 'YES'
          },
          {
            asset: 'token2',
            size: '200',
            currentValue: '150.00',
            outcome: 'NO'
          }
        ]
      });

      const result = await getPortfolioPositionsAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      const callbackCall = mockCallback.mock.calls[mockCallback.mock.calls.length - 1];
      const content = callbackCall[0];
      expect(content.text).toContain('$250.00'); // Total value
    });

    it('should handle network errors', async () => {
      const memory: Memory = {
        content: { text: 'check positions' },
      } as any;

      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network timeout'));

      const result = await getPortfolioPositionsAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error getting positions');
    });

    it('should display P&L information when available', async () => {
      const memory: Memory = {
        content: { text: 'show profits' },
      } as any;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            asset: 'token999',
            outcome: 'YES',
            size: '100',
            currentValue: '110.00',
            avgPrice: '0.90',
            curPrice: '1.10',
            cashPnl: '20.00',
            unrealizedPnl: '20.00',
            percentPnl: 22.22,
            title: 'Profitable Position'
          }
        ]
      });

      const result = await getPortfolioPositionsAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      const callbackCall = mockCallback.mock.calls[mockCallback.mock.calls.length - 1];
      const content = callbackCall[0];
      expect(content.text).toContain('Unrealized P&L');
      expect(content.text).toContain('+$20.00');
    });
  });

  describe('examples', () => {
    it('should have valid example structure', () => {
      expect(getPortfolioPositionsAction.examples).toBeDefined();
      expect(Array.isArray(getPortfolioPositionsAction.examples)).toBe(true);
      
      if (getPortfolioPositionsAction.examples && getPortfolioPositionsAction.examples.length > 0) {
        const example = getPortfolioPositionsAction.examples[0];
        expect(Array.isArray(example)).toBe(true);
        expect(example.length).toBe(2);
        
        // Check user message
        expect(example[0].name).toContain('user');
        expect(example[0].content.text).toBeDefined();
        
        // Check agent response
        expect(example[1].name).toContain('user');
        expect(example[1].content.action).toBe('GET_PORTFOLIO_POSITIONS');
      }
    });
  });
});