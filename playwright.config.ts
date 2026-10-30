import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    channel: 'msedge',
    headless: true,
    viewport: { width: 1440, height: 960 },
    acceptDownloads: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'edge', use: { deviceScaleFactor: 1 } },
    { name: 'edge-hidpi', use: { deviceScaleFactor: 2 } },
  ],
});
