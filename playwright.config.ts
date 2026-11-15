import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, retries: process.env.CI ? 1 : 0,
  timeout: 45000, expect: { timeout: 10000 }, reporter: [['list'], ['html', { open: 'never' }]],
  use: { ...devices['Desktop Chrome'], baseURL: process.env.E2E_ORIGIN || 'http://127.0.0.1:13823', timezoneId: 'Asia/Jakarta', trace: 'retain-on-failure', screenshot: 'only-on-failure' }
})
