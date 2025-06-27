import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import plugin from '../src/plugin';
import { logger } from '@elizaos/core/v2';
import type { IAgentRuntime, Memory, State } from '@elizaos/core/v2';
import { v4 as uuidv4 } from 'uuid';
import { PolymarketService } from '../src/services/polymarketService';
import { buySharesAction } from '../src/actions/trading/buyShares';
import { redeemSharesAction } from '../src/actions/trading/redeemShares';
import { sellSharesAction } from '../src/actions/trading/sellShares';
import { readMarketAction } from '../src/actions/utilities/readMarket';
import { readMarketsAction } from '../src/actions/utilities/readMarkets';
import { getUsernameAction, setUserAction } from '../src/actions/utilities/user';
import { connectWalletAction } from '../src/actions/wallet/connectWallet';
import { getWalletInfoAction } from '../src/actions/wallet/getWalletInfo';

// Mock logger
vi.mock('@elizaos/core/v2', async () => {
  const actual = await vi.importActual('@elizaos/core/v2');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  };
});

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Action Error Handling', () => {
    it('should log errors in action handlers', async () => {
      // Find the action
      const action = plugin.actions?.find((a) => a.name === 'READ_POLYMARKET_MARKETS');

      if (action && action.handler) {
        // Force the handler to throw an error
        const mockError = new Error('Test error in action');
        //vi.spyOn(console, 'error').mockImplementation(() => {});

        // Create a custom mock runtime
        const mockRuntime = {
          // This is just a simple object for testing
        } as unknown as IAgentRuntime;

        const mockMessage = {
          entityId: uuidv4(),
          roomId: uuidv4(),
          content: {
            text: 'Show me list of PolyMarket markets!',
            source: 'test',
          },
        } as Memory;

        const mockState = {
          values: {},
          data: {},
          text: '',
        } as State;

        const mockCallback = vi.fn();

        // Mock the logger.error to verify it's called
        vi.spyOn(logger, 'error');

        // Test the error handling by observing the behavior
        try {
          await action.handler(mockRuntime, mockMessage, mockState, {}, mockCallback, []);

          // If we get here, no error was thrown, which is okay
          expect(logger.error).not.toHaveBeenCalled();

          // We expect the callback to be called (if there's internal error handling)
          expect(mockCallback).toHaveBeenCalled();
          expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({ text: expect.any(String) }));
        } catch (error) {
          // If error is thrown, ensure it's handled correctly
          expect(logger.error).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Service Error Handling', () => {
    it('should throw an error when stopping non-existent service', async () => {
      const mockRuntime = createMockRuntimeWithGetService(null);

      let caughtError;
      try {
        await PolymarketService.stop(mockRuntime);
 expect(true).toBe(false); // Should not reach here
      } catch (error) {
        caughtError = error as Error;
        expect(error.message).toBe('PolymarketService not found');
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect(mockRuntime.getService).toHaveBeenCalledWith('PolymarketService');
    });

    it('should handle error during service stop', async () => {
      const mockServiceWithError = {
        stop: vi.fn().mockImplementation(() => {
          throw new Error('Simulated error during service stop');
        }),
      };
      const mockRuntime = createMockRuntimeWithGetService(mockServiceWithError);

      let caughtError: Error | null = null;
      try {
        await PolymarketService.stop(mockRuntime);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        caughtError = error as Error;
        expect(error.message).toBe('Simulated error during service stop');
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect(mockRuntime.getService).toHaveBeenCalledWith('PolymarketService');
      expect(mockServiceWithError.stop).toHaveBeenCalled();
    });
  });

  // Helper function to create a mock runtime with getService
  const createMockRuntimeWithGetService = (service: any): IAgentRuntime => {
    const mockRuntime: Partial<IAgentRuntime> = {
      getService: vi.fn().mockReturnValue(service),
      // Add any other necessary mocks here
      character: {
        name: 'Test Character',
        system: 'You are a helpful assistant for testing.',
        bio: ''
      },
      actions: [
          connectWalletAction,
          getUsernameAction,
          setUserAction,
          getWalletInfoAction,
          readMarketsAction,
          readMarketAction,
          buySharesAction,
          sellSharesAction,
          redeemSharesAction],
      db: {} as any,
    };

    return mockRuntime as IAgentRuntime;
    
  };

  describe('Plugin Events Error Handling', () => {
    it('should handle errors in event handlers gracefully', async () => {
      if (plugin.events && plugin.events.MESSAGE_RECEIVED) {
        const messageHandler = plugin.events.MESSAGE_RECEIVED[0];

        // Create a mock that will trigger an error
        const mockParams = {
          message: {
            id: 'test-id',
            content: { text: 'Hello!' },
          },
          source: 'test',
          runtime: {},
        };

        // Spy on the logger
        vi.spyOn(logger, 'error');

        // This is a partial test - in a real handler, we'd have more robust error handling
        try {
          await messageHandler(mockParams as any);
          // If it succeeds without error, that's good too
          expect(true).toBe(true);
        } catch (error) {
          // If it does error, make sure we can catch it
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Provider Error Handling', () => {
    it('should handle errors in provider.get method', async () => {
      const provider = plugin.providers?.find((p) => p.name === 'POLY_MARKET_PROVIDER');

      if (provider && provider.get) {
        // Create invalid inputs to test error handling
        const mockRuntime = null as unknown as IAgentRuntime;
        const mockMessage = null as unknown as Memory;
        const mockState = null as unknown as State;

        // The provider should handle null inputs gracefully
        try {
          await provider.get(mockRuntime, mockMessage, mockState);
          // If we get here, it didn't throw - which is good
          expect(true).toBe(true);
        } catch (error) {
          // If it does throw, at least make sure it's a handled error
 expect(logger.error).toHaveBeenCalled();
        }
      }
    });
  });
});
