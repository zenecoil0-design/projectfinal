import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', workers: 1, timeout: 90_000,
  use: { baseURL: 'http://127.0.0.1:3000', headless: true, launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu'] } : undefined },
  webServer: [
    { command: 'node tests/mock-supabase.mjs', url: 'http://127.0.0.1:54321/__reset', reuseExistingServer: false },
    { command: 'npm run start -- --hostname 127.0.0.1', url: 'http://127.0.0.1:3000/login', reuseExistingServer: false, env: { NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY:'test-anon-key' } },
  ],
});
