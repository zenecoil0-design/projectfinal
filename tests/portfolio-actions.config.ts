import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
export default defineConfig({
  testDir: './component', testMatch: 'portfolio-actions.spec.ts', workers: 1, timeout: 30_000,
  outputDir: '../test-results/portfolio-actions',
  use: { baseURL: 'http://127.0.0.1:3011', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } },
  webServer: { command: 'node tests/harness/portfolio-actions-server.mjs', cwd: resolve(__dirname, '..'), url: 'http://127.0.0.1:3011', reuseExistingServer: false },
});
