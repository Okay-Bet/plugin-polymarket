/**
 * Test setup configuration
 * Determines when to use mocks vs real connections
 */

import { vi } from 'vitest';
import { MockClobClient, MockEthersWallet, MockUSDCContract } from '../mocks/polymarketMocks';

// Environment variable to control test mode
export const TEST_MODE = process.env.TEST_MODE || 'mock'; // 'mock' | 'integration' | 'live'

/**
 * Setup mocks for Polymarket modules
 */
export function setupPolymarketMocks() {
  if (TEST_MODE === 'mock') {
    // Mock the CLOB client module
    vi.mock('../../src/utils/clobClient', () => ({
      initializeClobClient: vi.fn().mockResolvedValue(new MockClobClient()),
      initializeReadOnlyClobClient: vi.fn().mockResolvedValue(new MockClobClient()),
      initializeClobClientWithCreds: vi.fn().mockResolvedValue(new MockClobClient()),
    }));

    // Mock ethers
    vi.mock('ethers', () => ({
      ethers: {
        Wallet: MockEthersWallet,
        JsonRpcProvider: vi.fn().mockImplementation(() => ({
          getBlockNumber: vi.fn().mockResolvedValue(12345678),
          getBalance: vi.fn().mockResolvedValue(BigInt('1000000000')),
        })),
        Contract: vi.fn().mockImplementation(() => new MockUSDCContract()),
        formatUnits: (value: any, decimals: number) => {
          return (Number(value) / Math.pow(10, decimals)).toString();
        },
        parseUnits: (value: string, decimals: number) => {
          return BigInt(Math.floor(parseFloat(value) * Math.pow(10, decimals)));
        },
      },
    }));

    // Mock fetch for API calls
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/markets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              condition_id: '0xmock123',
              question: 'Test market?',
              active: true,
              closed: false,
            },
          ]),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });
  }
}

/**
 * Test environment configuration
 */
export const testConfig = {
  // Use test wallet addresses that won't execute real transactions
  mockWalletAddress: '0x0000000000000000000000000000000000000001',
  mockPrivateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
  
  // Mock transaction hashes
  getMockTxHash: () => `0xmock_tx_${Date.now()}`,
  getMockOrderId: () => `mock_order_${Date.now()}`,
  
  // Mock market data
  mockMarkets: {
    btc100k: {
      conditionId: '0x1234567890abcdef1234567890abcdef12345678901234567890abcdef123456',
      question: 'Will Bitcoin reach $100,000 by end of 2025?',
      yesPrice: 0.65,
      noPrice: 0.35,
    },
  },
};

/**
 * Helper to determine if we should skip live tests
 */
export function shouldSkipLiveTests(): boolean {
  return TEST_MODE !== 'live';
}

/**
 * Helper to get test description based on mode
 */
export function describeTestMode(description: string): string {
  return `[${TEST_MODE.toUpperCase()}] ${description}`;
}