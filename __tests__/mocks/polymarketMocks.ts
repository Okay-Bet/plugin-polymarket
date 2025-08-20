/**
 * Mock implementations for Polymarket testing
 * Since Polymarket has no testnet, we need comprehensive mocks
 */

import { vi } from 'vitest';
import type { ClobClient } from '@polymarket/clob-client';

/**
 * Mock CLOB Client for testing
 */
export class MockClobClient {
  wallet = {
    address: '0xMockWalletAddress123456789',
  };

  // Mock market data
  private mockMarkets = [
    {
      condition_id: '0xmock123',
      question: 'Will Bitcoin reach $100k by 2025?',
      market_slug: 'bitcoin-100k-2025',
      active: true,
      closed: false,
      tokens: [
        { token_id: 'yes_token_123', outcome: 'Yes', price: 0.65 },
        { token_id: 'no_token_123', outcome: 'No', price: 0.35 },
      ],
    },
  ];

  // Mock order responses
  async createMarketBuyOrder(params: any) {
    return {
      success: true,
      orderID: `mock_order_${Date.now()}`,
      transactionHash: `0xmock_tx_${Date.now()}`,
      ...params,
    };
  }

  async createMarketSellOrder(params: any) {
    return {
      success: true,
      orderID: `mock_sell_${Date.now()}`,
      transactionHash: `0xmock_tx_${Date.now()}`,
      ...params,
    };
  }

  async getMarket(conditionId: string) {
    return this.mockMarkets.find(m => m.condition_id === conditionId) || null;
  }

  async getMarkets(params?: any) {
    return this.mockMarkets;
  }

  async getOrderBook(params: any) {
    return {
      asks: [
        { price: '0.66', size: '100' },
        { price: '0.67', size: '200' },
      ],
      bids: [
        { price: '0.64', size: '150' },
        { price: '0.63', size: '300' },
      ],
    };
  }

  async getPositions(address?: string) {
    return [
      {
        conditionId: '0xmock123',
        outcomeId: 'yes_token_123',
        size: '100',
        averagePrice: '0.60',
        realized: '0',
        unrealized: '5.00',
      },
    ];
  }

  async isApiKeySet() {
    return true;
  }

  async deriveApiKey() {
    return {
      key: 'mock_api_key',
      secret: 'mock_secret',
      passphrase: 'mock_passphrase',
    };
  }

  setApiCreds(creds: any) {
    // Mock implementation
    return true;
  }
}

/**
 * Mock Ethers provider and wallet for blockchain interactions
 */
export class MockEthersProvider {
  async getBlockNumber() {
    return 12345678;
  }

  async getBalance(address: string) {
    // Return 1000 USDC (6 decimals)
    return BigInt('1000000000');
  }

  async estimateGas(tx: any) {
    return BigInt('100000');
  }

  async getGasPrice() {
    return BigInt('30000000000'); // 30 gwei
  }
}

export class MockEthersWallet {
  address = '0xMockWalletAddress123456789';
  
  constructor(private privateKey: string, public provider?: any) {}

  async signTransaction(tx: any) {
    return `0xsigned_${JSON.stringify(tx)}`;
  }

  async sendTransaction(tx: any) {
    return {
      hash: `0xmock_tx_${Date.now()}`,
      wait: async () => ({
        status: 1,
        blockNumber: 12345679,
        transactionHash: `0xmock_tx_${Date.now()}`,
      }),
    };
  }
}

/**
 * Mock USDC contract for approval testing
 */
export class MockUSDCContract {
  async approve(spender: string, amount: any) {
    return {
      hash: `0xapproval_tx_${Date.now()}`,
      wait: async () => ({
        status: 1,
        blockNumber: 12345680,
      }),
    };
  }

  async allowance(owner: string, spender: string) {
    // Return max uint256 to indicate approval
    return BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  }

  async balanceOf(address: string) {
    // Return 1000 USDC
    return BigInt('1000000000');
  }

  async decimals() {
    return 6;
  }
}

/**
 * Create a fully mocked runtime for testing
 */
export function createMockPolymarketRuntime() {
  const mockClobClient = new MockClobClient();
  
  return {
    getSetting: vi.fn((key: string) => {
      const settings: Record<string, any> = {
        WALLET_PRIVATE_KEY: '0xmockprivatekey123456789',
        POLYMARKET_PRIVATE_KEY: '0xmockprivatekey123456789',
        CLOB_API_URL: 'https://mock.clob.polymarket.com',
        CLOB_API_KEY: 'mock_api_key',
      };
      return settings[key];
    }),
    getService: vi.fn((name: string) => {
      if (name === 'polymarket-sync') {
        return {
          syncMarkets: vi.fn().mockResolvedValue({ success: true, count: 10 }),
        };
      }
      return null;
    }),
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue({ rowCount: 1 }),
    },
  };
}

/**
 * Test data fixtures
 */
export const testFixtures = {
  markets: [
    {
      conditionId: '0x1234567890abcdef',
      question: 'Will BTC hit $100k?',
      active: true,
      closed: false,
      endDate: '2025-12-31',
      yesTokenId: 'yes_123',
      noTokenId: 'no_123',
    },
  ],
  
  orders: [
    {
      id: 'order_123',
      side: 'BUY',
      outcome: 'Yes',
      size: '100',
      price: '0.65',
      status: 'FILLED',
    },
  ],
  
  positions: [
    {
      market: 'BTC $100k',
      outcome: 'Yes',
      size: '100',
      avgPrice: '0.60',
      currentPrice: '0.65',
      pnl: '+$5.00',
    },
  ],
};