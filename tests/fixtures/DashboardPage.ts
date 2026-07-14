import type { Page } from '@playwright/test'

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  get title() {
    return this.page.getByRole('heading', { name: /Tổng quan/i })
  }
}
