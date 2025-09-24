import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'specs/demo-web/tests/playwright',
  timeout: 120_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  reporter: [['github'], ['list']],
  use: {
    baseURL: process.env.CUPBEAR_E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --hostname 0.0.0.0 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
