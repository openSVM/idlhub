import { defineConfig, devices } from '@playwright/test';

/**
 * Minimal Playwright configuration for smoke tests
 * Does not start webServer - tests run against external URLs
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/smoke.spec.ts',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer for smoke tests
});
