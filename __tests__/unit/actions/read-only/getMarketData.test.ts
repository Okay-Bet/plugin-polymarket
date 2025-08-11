import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMarketDataAction } from '../../../../src/actions/getMarketData';
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

describe('getMarketDataAction', () => {
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
      expect(getMarketDataAction.name).toBe('GET_MARKET_DATA');
    });

    it('should have appropriate similes', () => {
      expect(getMarketDataAction.similes).toContain('FETCH_MARKET');
      expect(getMarketDataAction.similes).toContain('CHECK_MARKET');
      expect(getMarketDataAction.similes).toContain('MARKET_INFO');
    });

    it('should have a description', () => {
      expect(getMarketDataAction.description).toBeDefined();
      expect(getMarketDataAction.description).toContain('market');
    });
  });

  describe('validate', () => {
    it('should return true when CLOB_API_URL is set', async () => {
      const memory: Memory = {
        content: { text: 'get market data' },
      } as any;

      const result = await getMarketDataAction.validate(mockRuntime, memory);
      expect(result).toBe(true);
    });

    it('should return false when CLOB_API_URL is not set', async () => {
      mockRuntime.getSetting = vi.fn().mockReturnValue(undefined);
      const memory: Memory = {
        content: { text: 'get market data' },
      } as any;

      const result = await getMarketDataAction.validate(mockRuntime, memory);
      expect(result).toBe(false);
    });
  });

  describe('handler', () => {
    it('should handle valid condition ID format', async () => {
      const memory: Memory = {
        content: { 
          text: 'get market data for 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' 
        },
      } as any;

      // Mock fetch for market data
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          condition_id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          question: 'Will this happen?',
          active: true,
          closed: false,
          tokens: [
            { token_id: 'token1', outcome: 'YES' },
            { token_id: 'token2', outcome: 'NO' }
          ]
        })
      });

      const result = await getMarketDataAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle market not found', async () => {
      const memory: Memory = {
        content: { 
          text: 'get market data for invalid_market' 
        },
      } as any;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await getMarketDataAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should extract condition ID from various text formats', async () => {
      const testCases = [
        'Check market 0xabc123',
        'Get data for condition 0xdef456',
        'Market info: 0x789ghi',
        '0xjkl012 market status'
      ];

      for (const text of testCases) {
        const memory: Memory = {
          content: { text },
        } as any;

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            condition_id: 'extracted_id',
            question: 'Test market?',
            active: true
          })
        });

        await getMarketDataAction.handler(
          mockRuntime,
          memory,
          {} as State,
          {},
          mockCallback
        );

        expect(global.fetch).toHaveBeenCalled();
      }
    });

    it('should handle network errors gracefully', async () => {
      const memory: Memory = {
        content: { text: 'get market data for 0x123' },
      } as any;

      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await getMarketDataAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing condition ID', async () => {
      const memory: Memory = {
        content: { text: 'get market data' },
      } as any;

      const result = await getMarketDataAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('condition ID');
    });
  });

  describe('examples', () => {
    it('should have valid example structure', () => {
      expect(getMarketDataAction.examples).toBeDefined();
      expect(Array.isArray(getMarketDataAction.examples)).toBe(true);
      
      if (getMarketDataAction.examples && getMarketDataAction.examples.length > 0) {
        const example = getMarketDataAction.examples[0];
        expect(Array.isArray(example)).toBe(true);
        expect(example.length).toBeGreaterThan(0);
      }
    });
  });
});