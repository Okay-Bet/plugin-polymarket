import { describe, expect, it, vi, beforeEach, assert } from 'vitest';
import { ClobTestSuite } from '../src/tests';

// Mock runtime
const createMockRuntime = () => {
  return {
    registerPlugin: vi.fn().mockResolvedValue(undefined),
    actions: [
      {
      },
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
        'This is a clob service which is attached to the agent through the clob plugin.',
      stop: vi.fn(),
    }),
    processActions: vi.fn(),
  };
};

vi.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
}));

describe('ClobTestSuite', () => {
  let testSuite: ClobTestSuite;

  beforeEach(() => {
    testSuite = new ClobTestSuite();
  });

  it('should have name and description', () => {
    expect(testSuite.name).toBe('clob');
    expect(testSuite.description).toBe('Tests for the clob project');
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
    const serviceTest = testSuite.tests.find((test) => test.name === 'PolymarketService test');
    if (serviceTest) {
      await expect(serviceTest.fn(mockRuntime as any)).resolves.not.toThrow();
      expect(mockRuntime.getService).toHaveBeenCalledWith('clob');
    } else {
      assert.fail('PolymarketService test not found');
    }
  });
});
