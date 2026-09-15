import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  testMatch: /.*\.spec\.ts$/,
  use: {
    baseURL: 'http://localhost:3344',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-features=FileSystemAccessAPI', '--disable-web-security'],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3344,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
