import { describe, it, expect, beforeEach } from 'bun:test';
import { marketDataProvider } from '../src/providers/marketDataProvider';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

/**
 * Market data provider tests
 */
describe('Market Data Provider', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    mockRuntime = {
      getSetting: (key: string) => {
        if (key === 'CLOB_API_URL') return 'https://clob.polymarket.com';
        return null;
      },
    } as any;

    mockMessage = {
      content: { text: 'What markets are trending?' },
      userId: 'test-user',
      roomId: 'test-room',
    } as any;

    mockState = {
      recentMessages: [],
    } as any;
  });

  describe('Provider Configuration', () => {
    it('should have correct metadata', () => {
      expect(marketDataProvider.name).toBe('POLYMARKET_PROVIDER');
      expect(marketDataProvider.description).toBeDefined();
      expect(marketDataProvider.description).toContain('Polymarket markets');
    });
  });

  describe('Provider Functionality', () => {
    it('should have a get method', () => {
      expect(typeof marketDataProvider.get).toBe('function');
    });

    it('should return provider result when called', async () => {
      // Mock runtime with database
      const mockRuntimeWithDb = {
        ...mockRuntime,
        db: null, // No DB in test environment
      } as any;
      
      const result = await marketDataProvider.get(mockRuntimeWithDb, mockMessage, mockState);
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
    });

    it('should handle missing database gracefully', async () => {
      const result = await marketDataProvider.get(mockRuntime, mockMessage, mockState);
      expect(result).toBeDefined();
      expect(result.text).toContain('No market data available');
    });
  });
});