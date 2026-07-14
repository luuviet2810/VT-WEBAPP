import { defineConfig, devices } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'iphone-13-pro',
      use: {
        ...devices['iPhone 13 Pro'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'iphone-16-pro-max',
      use: {
        ...devices['iPhone 16 Pro Max'],
        viewport: { width: 430, height: 932 },
      },
    },
    {
      name: 'galaxy-s25-ultra',
      use: {
        ...devices['Galaxy S25 Ultra'],
        viewport: { width: 480, height: 920 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
