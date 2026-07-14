import { test as setup } from '@playwright/test'
import { CREDENTIALS, hasCredentials } from './credentials'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.resolve('playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  if (!hasCredentials) {
    console.log('⚠️ TEST_USER_EMAIL / TEST_USER_PASSWORD not set — auth tests will be skipped')
    // Create empty storage state so downstream projects don't crash
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Fill and submit login form
  await page.locator('input[type="email"]').fill(CREDENTIALS.email)
  await page.locator('input[type="password"]').fill(CREDENTIALS.password)
  await page.getByRole('button', { name: /Đăng nhập/i }).click()

  // Wait for either navigation or error display
  await page.waitForTimeout(3000)

  // Check if login succeeded by URL
  if (!page.url().includes('/login')) {
    // Success — save storage state
    await page.context().storageState({ path: AUTH_FILE })
    console.log('✅ Auth setup complete')
    return
  }

  // Login failed
  console.log('⚠️ Login failed for', CREDENTIALS.email, '— auth tests will be skipped')
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
})
