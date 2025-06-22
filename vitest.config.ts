import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 600000, 
    include: [
      '__tests__/**/*.test.ts',
      //  '__tests__/**/utils/*.ts' // Explicitly include files in utils
    ],
},
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  ssr: { // Moved ssr to the root level
    noExternal: [
    ]},
});
