import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { IAgentRuntime, Memory, State, Content } from '@elizaos/core';

// Mock modules first
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock ethers
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    Wallet: vi.fn(),
    JsonRpcProvider: vi.fn(),
    Contract: vi.fn(),
    parseUnits: vi.fn((value: string, decimals: number) => value + '0'.repeat(decimals)),
    ZeroHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  };
});

// Mock fetch globally
global.fetch = vi.fn();

// Import after mocking
import { redeemWinningsAction } from '../../../../src/actions/redeemWinnings';

describe('redeemWinningsAction', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let mockCallback: any;

  const mockPositionsData = [
    {
      conditionId: '0x1234567890abcdef',
      tokenId: '123456789',
      outcome: 'Yes',
      size: '10.5',
      quantity: '10.5',
      currentPrice: '1.0',
      market: {
        question: 'Will Bitcoin reach $100k?',
        conditionId: '0x1234567890abcdef',
      },
    },
    {
      conditionId: '0x9876543210fedcba',
      tokenId: '987654321',
      outcome: 'No', 
      size: '5.25',
      quantity: '5.25',
      currentPrice: '0.0',
      market: {
        question: 'Will ETH reach $10k?',
        conditionId: '0x9876543210fedcba',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockRuntime = {
      getSetting: vi.fn((key: string) => {
        const settings: Record<string, string> = {
          WALLET_PRIVATE_KEY: '0x' + '0'.repeat(64),
          PRIVATE_KEY: '0x' + '0'.repeat(64),
          POLYMARKET_PRIVATE_KEY: '0x' + '0'.repeat(64),
        };
        return settings[key];
      }),
    } as any;

    mockMessage = {
      content: {
        text: 'redeem my winnings',
      },
    } as Memory;

    mockState = {} as State;
    mockCallback = vi.fn();

    // Default mocks
    mockContract.redeemPositions.mockResolvedValue(mockTransaction);
    mockContract['redeemPositions(address,bytes32,bytes32,uint256[])'].mockResolvedValue(mockTransaction);
    mockTransaction.wait.mockResolvedValue({ status: 1 });
  });

  afterEach(() => {
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();
    mockWallet.signTransaction.mockReset();
    mockProvider.getBalance.mockReset();
    mockContract.redeemPositions.mockReset();
    mockContract['redeemPositions(address,bytes32,bytes32,uint256[])'].mockReset();
    mockTransaction.wait.mockReset();
    global.fetch.mockReset();
  });

  describe('Action Properties', () => {
    it('should have correct name and similes', () => {
      expect(redeemWinningsAction.name).toBe('REDEEM_WINNINGS');
      expect(redeemWinningsAction.similes).toContain('REDEEM_POSITIONS');
      expect(redeemWinningsAction.similes).toContain('CLAIM_WINNINGS');
      expect(redeemWinningsAction.similes).toContain('COLLECT_WINNINGS');
      expect(redeemWinningsAction.similes).toContain('REDEEM');
      expect(redeemWinningsAction.similes).toContain('CLAIM');
      expect(redeemWinningsAction.similes).toContain('WITHDRAW_WINNINGS');
      expect(redeemWinningsAction.similes).toContain('GET_PAYOUTS');
    });

    it('should have proper description', () => {
      expect(redeemWinningsAction.description).toBe('Redeem winnings from resolved Polymarket markets');
    });

    it('should have examples', () => {
      expect(redeemWinningsAction.examples).toBeDefined();
      expect(redeemWinningsAction.examples?.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should validate with redeem keyword', async () => {
      mockMessage.content.text = 'redeem my positions';
      const result = await redeemWinningsAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);
    });

    it('should validate with claim keyword', async () => {
      mockMessage.content.text = 'claim all winnings';
      const result = await redeemWinningsAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);
    });

    it('should validate with collect keyword', async () => {
      mockMessage.content.text = 'collect my payouts';
      const result = await redeemWinningsAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);
    });

    it('should validate with withdraw keyword', async () => {
      mockMessage.content.text = 'withdraw all winnings from resolved markets';
      const result = await redeemWinningsAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);
    });

    it('should validate with get + context keywords', async () => {
      mockMessage.content.text = 'get my resolved positions';
      const result = await redeemWinningsAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);
    });

    it('should fail validation without redeem keywords', async () => {
      mockMessage.content.text = 'show me markets';
      const result = await redeemWinningsAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);
    });

    it('should fail validation without private key', async () => {
      mockRuntime.getSetting = vi.fn(() => undefined);
      mockMessage.content.text = 'redeem my winnings';
      const result = await redeemWinningsAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);
    });

    it('should validate with alternative private key settings', async () => {
      mockRuntime.getSetting = vi.fn((key: string) => {
        if (key === 'POLYMARKET_PRIVATE_KEY') return '0x' + '1'.repeat(64);
        return undefined;
      });
      mockMessage.content.text = 'redeem winnings';
      const result = await redeemWinningsAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);
    });
  });

  describe('Successful Redemption', () => {
    beforeEach(() => {
      // Mock successful positions API response
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockPositionsData }),
      });
      
      // Mock successful market API responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockPositionsData }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            question: 'Will Bitcoin reach $100k?',
            closed: true,
            resolved: true,
            outcome: 'Yes',
            endDate: '2024-12-31T23:59:59Z',
            negRisk: false,
          }),
        });
    });

    it('should successfully redeem winnings from resolved markets', async () => {
      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result).toBeDefined();
      expect(result.text).toContain('Redemption Complete');
      expect(result.data?.status).toBe('completed');
      expect(result.data?.successCount).toBeGreaterThanOrEqual(0);
      expect(result.data?.failedCount).toBeGreaterThanOrEqual(0);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle standard ConditionalTokens redemption', async () => {
      // Mock market as non-neg-risk
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockPositionsData }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            question: 'Standard market',
            closed: true,
            resolved: true,
            outcome: 'Yes',
            negRisk: false,
          }),
        });

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(mockContract.redeemPositions).toHaveBeenCalled();
      expect(result.text).toContain('Redemption Complete');
    });

    it('should handle NegRiskAdapter redemption for neg risk markets', async () => {
      const negRiskPositions = [{
        ...mockPositionsData[0],
        negRisk: true,
        negative_risk: true,
      }];

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: negRiskPositions }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            question: 'Neg risk market',
            closed: true,
            resolved: true,
            outcome: 'Yes',
            negRisk: true,
          }),
        });

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(mockContract.redeemPositions).toHaveBeenCalled();
      expect(result.text).toContain('Redemption Complete');
    });

    it('should filter out positions below size threshold', async () => {
      const smallPositions = [{
        ...mockPositionsData[0],
        size: '0.005', // Below 0.01 threshold
        quantity: '0.005',
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: smallPositions }),
      });

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.text).toContain('No Redeemable Positions Found');
      expect(result.data?.status).toBe('no_positions');
    });

    it('should handle multiple resolved markets', async () => {
      // Mock multiple market API responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockPositionsData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            question: 'Market 1',
            closed: true,
            resolved: true,
            outcome: 'Yes',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            question: 'Market 2', 
            closed: true,
            resolved: true,
            outcome: 'No',
          }),
        });

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.text).toContain('Successfully redeemed');
      expect(result.data?.results).toBeDefined();
    });

    it('should estimate total redeemed amount', async () => {
      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.text).toMatch(/Estimated total redeemed: ~\$[\d.]+/);
      expect(result.data?.totalRedeemed).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing private key', async () => {
      mockRuntime.getSetting = vi.fn(() => undefined);

      await expect(
        redeemWinningsAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback)
      ).rejects.toThrow('No private key configured for redemption');
    });

    it('should handle positions API failure', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Redemption Failed'),
        })
      );
    });

    it('should handle positions API non-200 response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch positions: 500');
    });

    it('should handle market API failures gracefully', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockPositionsData }),
        })
        .mockRejectedValue(new Error('Market API error'));

      // Should still check for likely resolved positions
      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle contract transaction failures', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockPositionsData }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            question: 'Test market',
            closed: true,
            resolved: true,
            outcome: 'Yes',
          }),
        });

      mockContract.redeemPositions.mockRejectedValue(new Error('Transaction failed'));

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.data?.results).toBeDefined();
      expect(result.data?.results[0]?.status).toBe('failed');
      expect(result.data?.results[0]?.error).toContain('Transaction failed');
    });

    it('should handle transaction reverts', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockPositionsData }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            question: 'Test market',
            closed: true,
            resolved: true,
            outcome: 'Yes',
          }),
        });

      // Mock transaction that reverts
      mockTransaction.wait.mockResolvedValue({ status: 0 });

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.data?.results[0]?.status).toBe('failed');
      expect(result.data?.results[0]?.error).toBe('Transaction reverted on chain');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty positions array', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.text).toContain('No Redeemable Positions Found');
      expect(result.data?.status).toBe('no_positions');
      expect(result.data?.checkedPositions).toBe(0);
    });

    it('should handle positions without condition IDs', async () => {
      const invalidPositions = [{
        tokenId: '123456789',
        outcome: 'Yes',
        size: '10.5',
        // Missing conditionId
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: invalidPositions }),
      });

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.text).toContain('No Redeemable Positions Found');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No condition ID for position')
      );
    });

    it('should handle positions with various field formats', async () => {
      const variantPositions = [{
        condition_id: '0x1234567890abcdef', // underscore format
        token_id: '123456789',
        outcome: 'Yes',
        quantity: '10.5', // quantity instead of size
        current_price: '1.0', // underscore format
      }];

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: variantPositions }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            question: 'Variant market',
            closed: true,
            resolved: true,
            outcome: 'Yes',
          }),
        });

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result).toBeDefined();
      expect(result.text).toContain('Redemption Complete');
    });

    it('should handle old markets filtering', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockPositionsData }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            question: 'Old market',
            closed: true,
            resolved: true,
            outcome: 'Yes',
            endDate: '2020-01-01T00:00:00Z', // Old market
            end_date_iso: '2020-01-01T00:00:00Z',
          }),
        });

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.text).toContain('No Redeemable Positions Found');
    });

    it('should handle price-based resolution detection', async () => {
      const priceResolvedPositions = [{
        conditionId: '0x1234567890abcdef',
        tokenId: '123456789',
        outcome: 'Yes',
        size: '10.5',
        currentPrice: '1.0', // Indicates resolution
      }];

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: priceResolvedPositions }),
        })
        .mockRejectedValue(new Error('Market API unavailable')); // Force fallback to price detection

      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result).toBeDefined();
      // Should still attempt redemption based on price
    });
  });

  describe('Callback Functionality', () => {
    beforeEach(() => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockPositionsData }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            question: 'Test market',
            closed: true,
            resolved: true,
            outcome: 'Yes',
          }),
        });
    });

    it('should call callback during different phases', async () => {
      await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      const callbackCalls = mockCallback.mock.calls.map(call => call[0].text);
      
      // Should have multiple callback calls for different phases
      expect(callbackCalls.some(text => text.includes('Checking for Resolved Markets'))).toBe(true);
      expect(callbackCalls.some(text => text.includes('Found') && text.includes('Resolved Markets'))).toBe(true);
      expect(callbackCalls.some(text => text.includes('Redemption Complete'))).toBe(true);
    });

    it('should include transaction details in final callback', async () => {
      await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      const finalCall = mockCallback.mock.calls[mockCallback.mock.calls.length - 1][0];
      expect(finalCall.text).toContain('Transaction Details');
      expect(finalCall.data).toBeDefined();
      expect(finalCall.data?.status).toBe('completed');
    });
  });

  describe('Response Formatting', () => {
    beforeEach(() => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockPositionsData }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            question: 'Test market with a very long question that should be truncated in the response',
            closed: true,
            resolved: true,
            outcome: 'Yes',
          }),
        });
    });

    it('should format successful responses with proper structure', async () => {
      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.text).toContain('🎉 **Redemption Complete**');
      expect(result.text).toMatch(/✅ Successfully redeemed: \d+ market\(s\)/);
      expect(result.text).toMatch(/💰 Estimated total redeemed: ~\$[\d.]+/);
      expect(result.text).toContain('**Transaction Details:**');
      expect(result.actions).toContain('REDEEM_WINNINGS');
    });

    it('should truncate long market names in response', async () => {
      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.text).toMatch(/Test market with a very long question th\.\.\./);
    });

    it('should include proper data structure', async () => {
      const result = await redeemWinningsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      ) as Content;

      expect(result.data).toEqual({
        status: 'completed',
        successCount: expect.any(Number),
        failedCount: expect.any(Number),
        totalRedeemed: expect.any(Number),
        results: expect.any(Array),
      });
    });
  });
});