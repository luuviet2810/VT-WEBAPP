import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.resolve('playwright/.auth/user.json')

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
    // Unauthenticated — runs auth and smoke tests
    {
      name: 'unauthenticated',
      testMatch: /auth\.spec\.ts|smoke\.spec\.ts/,
    },
    // Auth setup — generates shared storageState
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Authenticated — runs page object / integration tests
    {
      name: 'desktop-chrome',
      dependencies: ['auth-setup'],
      testIgnore: /auth\.spec\.ts|smoke\.spec\.ts|auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: AUTH_FILE,
      },
    },
    {
      name: 'iphone-13-pro',
      dependencies: ['auth-setup'],
      testIgnore: /auth\.spec\.ts|smoke\.spec\.ts|auth\.setup\.ts/,
      use: {
        ...devices['iPhone 13 Pro'],
        storageState: AUTH_FILE,
      },
    },
    {
      name: 'iphone-16-pro-max',
      dependencies: ['auth-setup'],
      testIgnore: /auth\.spec\.ts|smoke\.spec\.ts|auth\.setup\.ts/,
      use: {
        ...devices['iPhone 16 Pro Max'],
        storageState: AUTH_FILE,
      },
    },
    {
      name: 'galaxy-s25-ultra',
      dependencies: ['auth-setup'],
      testIgnore: /auth\.spec\.ts|smoke\.spec\.ts|auth\.setup\.ts/,
      use: {
        ...devices['Galaxy S25 Ultra'],
        storageState: AUTH_FILE,
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
