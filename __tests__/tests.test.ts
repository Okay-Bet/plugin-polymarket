import { describe, expect, it, vi, beforeEach, assert } from 'vitest';
import { PolyMarketTestSuite } from '../src/tests';
import { buySharesAction } from '../src/actions/trading/buyShares';
import { redeemSharesAction } from '../src/actions/trading/redeemShares';
import { redeemWinningsAction } from '../src/actions/trading/redeemWinnings';
import { sellSharesAction } from '../src/actions/trading/sellShares';
import { readMarketAction } from '../src/actions/utilites/readMarket';
import { readMarketsAction } from '../src/actions/utilites/readMarkets';
import { getUsernameAction, setUserAction } from '../src/actions/utilites/user';
import { connectWalletAction } from '../src/actions/wallet/connectWallet';
import { getWalletInfoAction } from '../src/actions/wallet/getWalletInfo';

// Mock runtime
const createMockRuntime = () => {
  return {
    registerPlugin: vi.fn().mockResolvedValue(undefined),
    actions: [
      connectWalletAction,
      getUsernameAction,
      setUserAction,
      getWalletInfoAction,
      readMarketsAction,
      readMarketAction,
      buySharesAction,
      sellSharesAction,
      redeemSharesAction,
      redeemWinningsAction
    ],
    providers: [
      {
        name: 'POLY_MARKET_PROVIDER',
        get: vi.fn().mockResolvedValue({
          text: 'I am a provider',
          values: {},
          data: {},
        }),
      },
    ],
    getService: vi.fn().mockReturnValue({
      capabilityDescription:
        'This is a ClobService which is attached to the agent through the PolyMarket plugin.',
      stop: vi.fn(),
    }),
    processActions: vi.fn(),
  };
};

vi.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
}));

describe('PolyMarketTestSuite', () => {
  let testSuite: PolyMarketTestSuite;

  beforeEach(() => {
    testSuite = new PolyMarketTestSuite();
  });

  it('should have name and description', () => {
    expect(testSuite.name).toBe('PolyMarket');
    expect(testSuite.description).toBe('Tests for the PolyMarket project');
  });

  it('should have at least one test', () => {
    expect(testSuite.tests.length).toBeGreaterThan(0);
  });

  it('should run character configuration test successfully', async () => {
    const mockRuntime = createMockRuntime();
    const characterConfigTest = testSuite.tests.find(
      (test) => test.name === 'Character configuration test'
    );

    if (characterConfigTest) {
      // This test should pass without throwing an error
      await expect(characterConfigTest.fn(mockRuntime as any)).resolves.not.toThrow();
    } else {
      assert.fail('Character configuration test not found');
    }
  });

  it('should run plugin initialization test successfully', async () => {
    const mockRuntime = createMockRuntime();
    const pluginInitTest = testSuite.tests.find(
      (test) => test.name === 'Plugin initialization test'
    );

    if (pluginInitTest) {
      await expect(pluginInitTest.fn(mockRuntime as any)).resolves.not.toThrow();
      expect(mockRuntime.registerPlugin).toHaveBeenCalled();
    } else {
      assert.fail('Plugin initialization test not found');
    }
  });
  
  it('should run clob service test successfully', async () => {
    const mockRuntime = createMockRuntime();
    const serviceTest = testSuite.tests.find((test) => test.name === 'ClobService test');
    if (serviceTest) {
      await expect(serviceTest.fn(mockRuntime as any)).resolves.not.toThrow();
      expect(mockRuntime.getService).toHaveBeenCalledWith('ClobService');
    } else {
      assert.fail('ClobService test not found');
    }
  });
});
