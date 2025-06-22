import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import pluginPolymarket from '../src/plugin';
import type { IAgentRuntime, Memory, State, Provider } from '@elizaos/core/v2';
import { logger } from '@elizaos/core/v2';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { buySharesAction } from '../src/actions/trading/buyShares';
import { redeemSharesAction } from '../src/actions/trading/redeemShares';
import { sellSharesAction } from '../src/actions/trading/sellShares';
import { readMarketAction } from '../src/actions/utilites/readMarket';
import { readMarketsAction } from '../src/actions/utilites/readMarkets';
import { getUsernameAction, setUserAction } from '../src/actions/utilites/user';
import { connectWalletAction } from '../src/actions/wallet/connectWallet';
import { getWalletInfoAction } from '../src/actions/wallet/getWalletInfo';
import plugin from '../src/plugin';

// Setup environment variables
dotenv.config();

// Set up logging to capture issues
beforeAll(() => {
 vi.spyOn(logger, 'info');
  vi.spyOn(logger, 'error');
  vi.spyOn(logger, 'warn');
  vi.spyOn(logger, 'debug');
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Helper function to document test results
function documentTestResult(testName: string, result: any, error: Error | null = null) {
  logger.info(`TEST: ${testName}`);
  if (result) {
    if (typeof result === 'string') {
      logger.info(`RESULT: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);
    } else {
      try {
        logger.info(`RESULT: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
      } catch (e) {
        logger.info(`RESULT: [Complex object that couldn't be stringified]`);
      }
    }
  }
  if (error) {
    logger.error(`ERROR: ${error.message}`);
    if (error.stack) {
      logger.error(`STACK: ${error.stack}`);
    }
  }
}

// Create a realistic runtime for testing

// Create realistic memory object

describe('Provider Tests', () => {
  // Find the POLY_MARKET_PROVIDER from the providers array
  beforeAll(() => {});

  describe('Provider Registration', () => {
   it('should include providers in the plugin definition', () => {
   expect(plugin).toHaveProperty('providers');
   expect(Array.isArray(plugin.providers)).toBe(true);

   documentTestResult('Plugin providers check', {
   hasProviders: !!plugin.providers,
   providersCount: plugin.providers?.length || 0,
   });
   });

   /*it('should correctly initialize providers array', () => {
    // Providers should be an array with at least one provider
    if (plugin.providers) {
      expect(plugin.providers.length).toBeGreaterThan(0);

      let allValid = true;
      const invalidProviders: string[] = [];

      // Each provider should have the required structure
      plugin.providers.forEach((provider: Provider) => {
        const isValid =
          provider.name !== undefined &&
          provider.description !== undefined &&
          typeof provider.get === 'function';

        if (!isValid) {
          allValid = false;
          invalidProviders.push(provider.name || 'unnamed');
        }

        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('description');
        expect(provider).toHaveProperty('get');
        expect(typeof provider.get).toBe('function');
      });

      documentTestResult('Provider initialization check', {
        providersCount: plugin.providers.length,
        allValid,
        invalidProviders,
      });
    }
  });*/

   /*it('should register all providers', () => {
   const runtime = createRealRuntime();
   expect(plugin.providers).toBeTruthy();
   });*/

    it('should have unique provider names', () => {
      if (plugin.providers) {
        const providerNames = plugin.providers.map((provider) => provider.name);
        const uniqueNames = new Set(providerNames);

        const duplicates = providerNames.filter(
          (name, index) => providerNames.indexOf(name) !== index
        );

        // There should be no duplicate provider names
        expect(providerNames.length).toBe(uniqueNames.size);

        documentTestResult('Provider uniqueness check', {
          totalProviders: plugin.providers.length,
          uniqueProviders: uniqueNames.size,
          duplicates,
        });
      }
    });
  });
});
