import { defineConfig, devices } from '@playwright/test';

// Chạy: npm run test:e2e (tự bật `npm run dev` nếu cổng 3000 chưa có server)
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 2,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3000', navigationTimeout: 60_000, locale: 'vi-VN' },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'routes', testMatch: /(routes|orders|admin-sales)\.spec\.ts/, dependencies: ['setup'], use: { ...devices['Desktop Chrome'] } },
    { name: 'baseline', testMatch: /baseline\.spec\.ts/, dependencies: ['setup'], use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 180_000 },
});
