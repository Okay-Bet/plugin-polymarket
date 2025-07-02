import { beforeAll, afterAll, vi } from 'vitest';

// Initialize listeners early
const listeners = new Set();
const dispose = new Set();

beforeAll(() => {
  // Add any global setup here
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });
});

afterAll(() => {
  // Cleanup any listeners
  listeners.clear();
  dispose.clear();
});

// Mock elizaLogger
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core');
  return {
    ...actual,
    elizaLogger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});