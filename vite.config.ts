import { defineConfig } from 'vitest/config';

// Served from https://johnsonafj.github.io/Back40/, so every asset path needs
// the /Back40/ prefix. Port 8440 is fixed because each port gets its own
// localStorage: a different port would show a different farm.
export default defineConfig({
  base: '/Back40/',
  server: { port: 8440, strictPort: true },
  preview: { port: 8441, strictPort: true },
  test: { include: ['tests/**/*.test.ts'] },
});
