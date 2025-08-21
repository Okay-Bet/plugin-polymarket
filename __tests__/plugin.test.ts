import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import plugin from '../src/plugin';
import { character, PolymarketService } from '../src/index';
import type { IAgentRuntime } from '@elizaos/core';

/**
 * Core plugin tests - just the essentials
 */
describe('Polymarket Plugin', () => {
  describe('Plugin Configuration', () => {
    it('should have correct metadata', () => {
      expect(plugin.name).toBe('polymarket');
      expect(plugin.description).toBe('A plugin for interacting with Polymarket prediction markets');
      expect(plugin.config).toBeDefined();
      expect(plugin.config).toHaveProperty('CLOB_API_URL');
    });

    it('should export required actions', () => {
      expect(plugin.actions).toBeDefined();
      expect(Array.isArray(plugin.actions)).toBe(true);
      expect(plugin.actions.length).toBeGreaterThan(0);
      
      // Check for core actions
      const actionNames = plugin.actions.map(a => a.name);
      expect(actionNames).toContain('PLACE_ORDER');
      expect(actionNames).toContain('SEARCH_POLYMARKET_MARKETS');
      expect(actionNames).toContain('GET_WALLET_BALANCE');
    });

    it('should export market data provider', () => {
      expect(plugin.providers).toBeDefined();
      expect(Array.isArray(plugin.providers)).toBe(true);
      expect(plugin.providers.length).toBeGreaterThan(0);
      expect(plugin.providers[0].name).toBe('POLYMARKET_PROVIDER');
    });
  });

  describe('Character Integration', () => {
    it('should have valid character configuration', () => {
      expect(character).toBeDefined();
      expect(character.name).toBeDefined();
      expect(character.plugins).toBeDefined();
      expect(Array.isArray(character.plugins)).toBe(true);
      expect(character.settings).toBeDefined();
    });
  });

  describe('Service Lifecycle', () => {
    const mockRuntime = {
      getSetting: (key: string) => null,
      registerService: () => {},
      getService: () => null,
    } as unknown as IAgentRuntime;

    it('should start and stop service', async () => {
      const service = await PolymarketService.start(mockRuntime);
      expect(service).toBeDefined();
      expect(service.constructor.name).toBe('PolymarketService');
      
      // Service should have stop method
      expect(typeof service.stop).toBe('function');
    });
  });
});