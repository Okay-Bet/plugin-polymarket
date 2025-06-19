import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  tsconfig: './tsconfig.json', // Use build-specific tsconfig
  sourcemap: true,
  clean: true,
  format: ['esm'],
  dts: true,
  external: [
    'dotenv', // Externalize dotenv to prevent bundling
    'fs', // Externalize fs to use Node.js built-in module
    'path', // Externalize other built-ins if necessary
    'https',
    'http',
    'zod',
    '@elizaos/plugin-google-genai',  //  Crucially, externalize the plugins
    '@elizaos/plugin-polymarket',  //   So they aren't bundled
  ],
});
