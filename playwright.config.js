import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './client/e2e',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 1080 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: 'list',
});
