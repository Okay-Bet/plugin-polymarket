import { describe, it, expect, beforeEach } from 'bun:test';
import { placeOrderAction } from '../src/actions/placeOrder';
import { searchMarketsAction } from '../src/actions/searchMarkets';
import { getWalletBalanceAction } from '../src/actions/getWalletBalance';
import { getPortfolioPositionsAction } from '../src/actions/getPortfolioPositions';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

/**
 * Core action tests - testing the most important actions
 */
describe('Core Actions', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    mockRuntime = {
      getSetting: (key: string) => {
        const settings: Record<string, string> = {
          CLOB_API_URL: 'https://clob.polymarket.com',
          WALLET_PRIVATE_KEY: '0x' + '0'.repeat(64),
        };
        return settings[key];
      },
    } as any;

    mockMessage = {
      content: { text: 'Place order for market' }, // Default message for order actions
      userId: 'test-user',
      roomId: 'test-room',
    } as any;

    mockState = {} as State;
  });

  describe('Action Metadata', () => {
    it('placeOrderAction should have correct properties', () => {
      expect(placeOrderAction.name).toBe('PLACE_ORDER');
      expect(placeOrderAction.description).toBeDefined();
      expect(placeOrderAction.similes).toBeDefined();
      expect(Array.isArray(placeOrderAction.similes)).toBe(true);
      expect(placeOrderAction.examples).toBeDefined();
    });

    it('searchMarketsAction should have correct properties', () => {
      expect(searchMarketsAction.name).toBe('SEARCH_POLYMARKET_MARKETS');
      expect(searchMarketsAction.description).toBeDefined();
      expect(searchMarketsAction.examples).toBeDefined();
      expect(Array.isArray(searchMarketsAction.examples)).toBe(true);
    });

    it('getWalletBalanceAction should have correct properties', () => {
      expect(getWalletBalanceAction.name).toBe('GET_WALLET_BALANCE');
      expect(getWalletBalanceAction.description).toBeDefined();
      expect(getWalletBalanceAction.similes).toBeDefined();
      expect(getWalletBalanceAction.examples).toBeDefined();
    });

    it('getPortfolioPositionsAction should have correct properties', () => {
      expect(getPortfolioPositionsAction.name).toBe('GET_PORTFOLIO_POSITIONS');
      expect(getPortfolioPositionsAction.description).toBeDefined();
      expect(getPortfolioPositionsAction.similes).toBeDefined();
      expect(getPortfolioPositionsAction.examples).toBeDefined();
    });
  });

  describe('Action Validation', () => {
    it('placeOrderAction should validate with CLOB_API_URL', async () => {
      const isValid = await placeOrderAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });

    it('placeOrderAction should fail validation without CLOB_API_URL', async () => {
      mockRuntime.getSetting = () => undefined;
      const isValid = await placeOrderAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
    });

    it('searchMarketsAction should validate with market keywords', async () => {
      mockMessage.content.text = 'Search for election markets'; // Include market keyword
      const isValid = await searchMarketsAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });

    it('getWalletBalanceAction should validate with balance keywords', async () => {
      mockMessage.content.text = 'What is my wallet balance?'; // Include balance keyword
      const isValid = await getWalletBalanceAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });
    
    it('getWalletBalanceAction should fail validation without private key', async () => {
      mockRuntime.getSetting = (key: string) => {
        if (key === 'CLOB_API_URL') return 'https://clob.polymarket.com';
        return undefined; // No private key
      };
      const isValid = await getWalletBalanceAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
    });
  });
});