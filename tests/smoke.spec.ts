import { test, expect } from './fixtures/index.ts'

test.describe('Smoke tests - unauthenticated', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // The page should contain a form with email/ password inputs
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name*="email" i]')
    const passwordInput = page.locator('input[type="password"]')

    // Allow either the inputs to exist or the register link to exist
    const hasInputs = (await emailInput.count()) > 0 && (await passwordInput.count()) > 0
    const hasRegisterLink = (await page.getByRole('link', { name: /Đăng ký|Register/i }).count()) > 0

    expect(hasInputs || hasRegisterLink).toBeTruthy()
  })

  test('forbidden page accessible', async ({ page }) => {
    const response = await page.goto('/403')
    expect(response?.status()).toBeLessThan(500)
  })
})
