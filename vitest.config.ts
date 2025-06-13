import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 600000,
    deps: {
      inline: ['dotenv', 'uuid'], // Revert to deprecated 'inline'
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  ssr: { // Moved ssr to the root level
    noExternal: [
     /^(dotenv|uuid)$/,
    ],
  },
});
