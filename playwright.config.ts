import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      STORAGE_ADAPTER: process.env.E2E_STORAGE_ADAPTER ?? 'json',
      LOCAL_STORE_PATH: '.local/e2e-plans.json',
      GOOGLE_CLOUD_PROJECT: 'demo-food-access',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
