import { defineConfig } from 'vitest/config';

// Served from https://johnsonafj.github.io/Back40/, so every asset path needs
// the /Back40/ prefix. Port 8440 is fixed because each port gets its own
// localStorage: a different port would show a different farm.
// GitHub Actions sets GITHUB_SHA; a local build is "dev". The service worker
// is registered with it, so every deploy gets a fresh offline cache.
const build = (process.env['GITHUB_SHA'] ?? 'dev').slice(0, 7);

export default defineConfig({
  base: '/Back40/',
  define: { __BUILD__: JSON.stringify(build) },
  server: { port: 8440, strictPort: true },
  preview: { port: 8441, strictPort: true },
  test: { include: ['tests/**/*.test.ts'] },
});
