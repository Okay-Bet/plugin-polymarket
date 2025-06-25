// vitest.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Use Vitest globals (describe, test, expect, etc.)
    environment: 'node', // Environment for running tests
    testTimeout: 60000,
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
    include: ['./plugin-polymarket/__tests__/**/*.test.ts'], // Pattern for test files
    // setupFiles: ['./path/to/setupFile.ts'], // If you need global setup
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './plugin-polymarket/src'),
    },
  },
});
