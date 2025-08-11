import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    include: ['__tests__/**/*.test.ts'],
    exclude: ['**/e2e/**', '**/node_modules/**'],
    deps: {
      interopDefault: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@elizaos/core': path.resolve(__dirname, './node_modules/@elizaos/core/dist/index.js'),
    },
    conditions: ['node', 'import', 'default'],
  },
});
