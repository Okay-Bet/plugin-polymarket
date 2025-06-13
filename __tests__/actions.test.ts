import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import plugin from '../src/plugin';
import { logger } from '@elizaos/core';
import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import {
  runCoreActionTests,
  documentTestResult,
  createMockRuntime,
  createMockMessage,
  createMockState,
} from './utils/core-test-utils';

// Setup environment variables
dotenv.config();

// Spy on logger to capture logs for documentation
beforeAll(() => {
  vi.spyOn(logger, 'info');
  vi.spyOn(logger, 'error');
  vi.spyOn(logger, 'warn');
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Actions', () => {
  // Find the POLYMARKET_PLUGIN_STARTED_NOTIFICATION action from the plugin
  const pluginStartedAction = plugin.actions?.find((action) => action.name === 'POLYMARKET_PLUGIN_STARTED_NOTIFICATION');

  // Run core tests on all plugin actions
  it('should pass core action tests', () => {
    if (plugin.actions) {
      const coreTestResults = runCoreActionTests(plugin.actions);
      expect(coreTestResults).toBeDefined();
      expect(coreTestResults.formattedNames).toBeDefined();
      expect(coreTestResults.formattedActions).toBeDefined;
      expect(coreTestResults.composedExamples).toBeDefined();

      // Document the core test results
      documentTestResult('Core Action Tests', coreTestResults);
    }
  });

  describe('POLYMARKET_PLUGIN_STARTED_NOTIFICATION Action', () => {
    it('should exist in the plugin', () => {
      expect(pluginStartedAction).toBeDefined();
    });

    it('should have the correct structure', () => {
      if (pluginStartedAction) {
        expect(pluginStartedAction).toHaveProperty('name', 'POLYMARKET_PLUGIN_STARTED_NOTIFICATION');
        expect(pluginStartedAction).toHaveProperty('description');
        expect(pluginStartedAction).toHaveProperty('similes');
        expect(pluginStartedAction).toHaveProperty('validate');
        expect(pluginStartedAction).toHaveProperty('handler');
        expect(pluginStartedAction).toHaveProperty('examples');
        expect(Array.isArray(pluginStartedAction.similes)).toBe(true);
        expect(Array.isArray(pluginStartedAction.examples)).toBe(true);
      }
    });

    it('should have correct similes', () => {
      if (pluginStartedAction) {
        expect(pluginStartedAction.similes).toContain('PLUGIN_READY');
        expect(pluginStartedAction.similes).toContain('POLYMARKET_INITIALIZED');
        expect(pluginStartedAction.similes).toContain('POLYMARKET_ACTIVE');
      }
    });

    it('should have at least one example', () => {
      if (pluginStartedAction && pluginStartedAction.examples) {
        expect(pluginStartedAction.examples.length).toBeGreaterThan(0);

        // Check first example structure
        const firstExample = pluginStartedAction.examples[0];
        expect(firstExample.length).toBeGreaterThan(0); // At least one message (agent notification)

        // Message should be an agent notification
        expect(firstExample[0]).toHaveProperty('name');
        expect(firstExample[0]).toHaveProperty('content');
        expect(firstExample[0].content).toHaveProperty('text');
        expect(firstExample[0].name).toBe('agent');
        expect(firstExample[0].content.text).toBe('Polymarket plugin is now active and ready.');
      }
    });

    it('should return true from validate function', async () => {
      if (pluginStartedAction) {
        const runtime = createMockRuntime();
        // This action isn't typically triggered by a user message, but we can mock one for the validate signature
        const mockMessage = createMockMessage('System startup');
        const mockState = createMockState();

        let result = false;
        let error: Error | null = null;

        try {
          result = await pluginStartedAction.validate(runtime, mockMessage, mockState);
          expect(result).toBe(true);
        } catch (e) {
          error = e as Error;
          logger.error('Validate function error:', e);
        }

        documentTestResult('POLYMARKET_PLUGIN_STARTED_NOTIFICATION action validate', result, error);
      }
    });

    it('should call back with plugin started response from handler', async () => {
      if (pluginStartedAction) {
        const runtime = createMockRuntime();
        const mockMessage = createMockMessage('System startup'); // Similar to validate, for handler signature
        const mockState = createMockState();

        let callbackResponse: any = {};
        let error: Error | null = null;

        const mockCallback = (response: any) => {
          callbackResponse = response;
        };

        try {
          await pluginStartedAction.handler(
            runtime,
            mockMessage,
            mockState,
            {} as any,
            mockCallback as HandlerCallback,
            []
          );

          // Verify callback was called with the right content
          expect(callbackResponse).toBeTruthy();
          expect(callbackResponse).toHaveProperty('text');
          expect(callbackResponse.text).toBe('Polymarket plugin has started and is operational.');
        } catch (e) {
          error = e as Error;
          logger.error('Handler function error:', e);
        }

        documentTestResult('POLYMARKET_PLUGIN_STARTED_NOTIFICATION action handler', callbackResponse, error);
      }
    });
  });
});
