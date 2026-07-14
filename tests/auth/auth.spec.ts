import { test, expect } from '../fixtures/index.ts'

test.describe('App loads and redirects to login', () => {
  test('home page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page has the login form', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Đăng nhập để tiếp tục')).toBeVisible()
  })
})

test.describe('Protected routes redirect to login', () => {
  const protectedPaths = ['/xe', '/nhiem-vu', '/vi-tri', '/cham-cong', '/thong-ke', '/bang-gia']

  for (const path of protectedPaths) {
    test(`${path} redirects to login`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/login/)
    })
  }
})
