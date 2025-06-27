import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['plugin-polymarket/src/index.ts'],
  outDir: './dist',
  tsconfig: './tsconfig.build.json', // Use build-specific tsconfig
  sourcemap: true,
  clean: true,
  format: ['esm'], // Ensure you're targeting CommonJS
  dts: false, // Skip DTS generation to avoid external import issues // Ensure you're targeting CommonJS
  external: [
      'dotenv',           // Externalize dotenv
      'fs',               // Externalize Node.js built-in 'fs'
      'path',             // Externalize Node.js built-in 'path'
      'https',            // Externalize Node.js built-in 'https'
      'http',             // Externalize Node.js built-in 'http'
      'zod',              // Externalize zod
      '@elizaos/plugin-google-genai',  //  Crucially, externalize the plugins
      '@elizaos/plugin-polymarket',    //   So they aren't bundled
  ],
});
