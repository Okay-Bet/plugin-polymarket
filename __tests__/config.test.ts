import { vi, describe, beforeEach, afterEach, it, expect } from "vitest";
import plugin from "../src/plugin";

// Mock logger
vi.mock('@elizaos/core/v2', async () => {
  const actual = await vi.importActual('@elizaos/core/v2');
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
        await initPlugin(validConfig, {} as any);
      } catch (e) {
        error = e;
      }
      expect(error).toBeNull();
    }
  });

  it('should accept empty configuration', async () => {
    const emptyConfig = {};

    if (initPlugin) {      
      const mockRuntime = {
        registerPlugin: vi.fn(), // Add mock registerPlugin
    };
      let error = null;
      try {
        await initPlugin(emptyConfig, {} as any);
      } catch (e) {
        error = e;
      }
      expect(error).toBeNull();
    }
  });
});