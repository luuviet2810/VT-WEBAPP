import type { Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('networkidle')
  }

  async login(email: string, password: string) {
    await this.page.locator('input[type="email"]').fill(email)
    await this.page.locator('input[type="password"]').fill(password)
    await this.page.getByRole('button', { name: /Đăng nhập/i }).click()
    await this.page.waitForURL('/', { timeout: 15000 })
  }
}
