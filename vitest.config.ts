// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Use Vitest globals (describe, test, expect, etc.)
    environment: 'node', // Environment for running tests
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
    include: ['plugin-polymarket/src/**/*.{test,spec}.ts'], // Pattern for test files
    // setupFiles: ['./path/to/setupFile.ts'], // If you need global setup
  },
});