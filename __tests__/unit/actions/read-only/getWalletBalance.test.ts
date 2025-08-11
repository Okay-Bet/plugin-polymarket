import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getWalletBalanceAction } from '../../../../src/actions/getWalletBalance';
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

// Mock balance checker
vi.mock('../../../../src/utils/balanceChecker', () => ({
  checkUSDCBalance: vi.fn().mockResolvedValue({
    onChainBalance: '1000.50',
    formattedBalance: '1,000.50',
    hasBalance: true
  }),
  checkPolymarketBalance: vi.fn().mockResolvedValue({
    hasEnoughBalance: true,
    currentBalance: '500.25',
    requiredAmount: '0',
    shortfall: '0'
  }),
  formatBalanceInfo: vi.fn().mockReturnValue('Mock balance info')
}));

describe('getWalletBalanceAction', () => {
  let mockRuntime: IAgentRuntime;
  let mockCallback: HandlerCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRuntime = {
      getSetting: vi.fn((key: string) => {
        if (key === 'WALLET_PRIVATE_KEY') return '0xTestPrivateKey';
        if (key === 'POLYGON_RPC_URL') return 'https://polygon-rpc.com';
        return undefined;
      }),
      character: { name: 'TestAgent' },
    } as any;

    mockCallback = vi.fn();
  });

  describe('metadata', () => {
    it('should have correct action name', () => {
      expect(getWalletBalanceAction.name).toBe('GET_WALLET_BALANCE');
    });

    it('should have appropriate similes', () => {
      expect(getWalletBalanceAction.similes).toContain('CHECK_BALANCE');
      expect(getWalletBalanceAction.similes).toContain('WALLET_BALANCE');
      expect(getWalletBalanceAction.similes).toContain('SHOW_BALANCE');
      expect(getWalletBalanceAction.similes).toContain('USDC_BALANCE');
    });

    it('should have a description', () => {
      expect(getWalletBalanceAction.description).toBeDefined();
      expect(getWalletBalanceAction.description).toContain('wallet');
      expect(getWalletBalanceAction.description).toContain('balance');
    });
  });

  describe('validate', () => {
    it('should return true when wallet and RPC are configured', async () => {
      const memory: Memory = {
        content: { text: 'check my balance' },
      } as any;

      const result = await getWalletBalanceAction.validate(mockRuntime, memory);
      expect(result).toBe(true);
    });

    it('should return false when wallet key is missing', async () => {
      mockRuntime.getSetting = vi.fn((key: string) => {
        if (key === 'WALLET_PRIVATE_KEY') return undefined;
        if (key === 'POLYGON_RPC_URL') return 'https://polygon-rpc.com';
        return undefined;
      });

      const memory: Memory = {
        content: { text: 'check balance' },
      } as any;

      const result = await getWalletBalanceAction.validate(mockRuntime, memory);
      expect(result).toBe(false);
    });

    it('should return false when RPC URL is missing', async () => {
      mockRuntime.getSetting = vi.fn((key: string) => {
        if (key === 'WALLET_PRIVATE_KEY') return '0xTestKey';
        if (key === 'POLYGON_RPC_URL') return undefined;
        return undefined;
      });

      const memory: Memory = {
        content: { text: 'balance check' },
      } as any;

      const result = await getWalletBalanceAction.validate(mockRuntime, memory);
      expect(result).toBe(false);
    });
  });

  describe('handler', () => {
    it('should return wallet balance successfully', async () => {
      const { checkUSDCBalance } = await import('../../../../src/utils/balanceChecker');
      (checkUSDCBalance as any).mockResolvedValueOnce({
        onChainBalance: '2500.75',
        formattedBalance: '2,500.75',
        hasBalance: true
      });

      const memory: Memory = {
        content: { text: 'show my wallet balance' },
      } as any;

      const result = await getWalletBalanceAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(true);
      expect(checkUSDCBalance).toHaveBeenCalledWith(mockRuntime);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle zero balance', async () => {
      const { checkUSDCBalance } = await import('../../../../src/utils/balanceChecker');
      (checkUSDCBalance as any).mockResolvedValueOnce({
        onChainBalance: '0',
        formattedBalance: '0.00',
        hasBalance: false
      });

      const memory: Memory = {
        content: { text: 'check USDC' },
      } as any;

      const result = await getWalletBalanceAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(true);
      expect(checkUSDCBalance).toHaveBeenCalled();
    });

    it('should handle balance check errors', async () => {
      const { checkUSDCBalance } = await import('../../../../src/utils/balanceChecker');
      (checkUSDCBalance as any).mockRejectedValueOnce(new Error('RPC error'));

      const memory: Memory = {
        content: { text: 'balance' },
      } as any;

      const result = await getWalletBalanceAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to check wallet balance');
    });

    it('should check Polymarket trading balance when requested', async () => {
      const { checkPolymarketBalance } = await import('../../../../src/utils/balanceChecker');

      const memory: Memory = {
        content: { text: 'check trading balance' },
      } as any;

      await getWalletBalanceAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(checkPolymarketBalance).toHaveBeenCalled();
    });

    it('should format balance information correctly', async () => {
      const { formatBalanceInfo } = await import('../../../../src/utils/balanceChecker');
      (formatBalanceInfo as any).mockReturnValueOnce('Formatted: $1,234.56 USDC');

      const memory: Memory = {
        content: { text: 'wallet status' },
      } as any;

      await getWalletBalanceAction.handler(
        mockRuntime,
        memory,
        {} as State,
        {},
        mockCallback
      );

      expect(formatBalanceInfo).toHaveBeenCalled();
    });
  });

  describe('examples', () => {
    it('should have valid example structure', () => {
      expect(getWalletBalanceAction.examples).toBeDefined();
      expect(Array.isArray(getWalletBalanceAction.examples)).toBe(true);
      
      if (getWalletBalanceAction.examples && getWalletBalanceAction.examples.length > 0) {
        const example = getWalletBalanceAction.examples[0];
        expect(Array.isArray(example)).toBe(true);
        expect(example.length).toBe(2);
        
        // Check structure
        expect(example[0].content.text).toBeDefined();
        expect(example[1].content.action).toBe('GET_WALLET_BALANCE');
      }
    });
  });
});