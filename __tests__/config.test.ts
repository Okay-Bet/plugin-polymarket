import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import plugin from '../src/plugin';
import { z } from 'zod';

// Mock logger
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  };
});

// Access the plugin's init function
const initPlugin = plugin.init;

describe('Plugin Configuration Schema', () => {
  // Create a backup of the original env values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables after each test
    process.env = { ...originalEnv };
  });

  it('should accept valid configuration', async () => {
    const validConfig = {
      EXAMPLE_PLUGIN_VARIABLE: 'valid-value',
    };

    if (initPlugin) {
      let error = null;
      try {
        await initPlugin(validConfig, {} as any); // Pass a mock runtime
      } catch (e) {
        error = e;
      }
      expect(error).toBeNull();
    }
  });

  it('should accept empty configuration', async () => {
    const emptyConfig = {};

    if (initPlugin) {
      let error = null;
      try {
        await initPlugin(emptyConfig, {} as any); // Pass a mock runtime
      } catch (e) {
        error = e;
      }
      expect(error).toBeNull();
    }
  });
});