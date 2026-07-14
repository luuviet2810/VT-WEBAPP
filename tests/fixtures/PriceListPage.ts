import type { Page } from '@playwright/test'

export class PriceListPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/bang-gia')
    await this.page.waitForLoadState('networkidle')
  }

  get title() {
    return this.page.getByRole('heading', { name: /Bảng giá/i })
  }
}
