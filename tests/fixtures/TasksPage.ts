import type { Page } from '@playwright/test'

export class TasksPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/nhiem-vu')
    await this.page.waitForLoadState('networkidle')
  }

  get title() {
    return this.page.getByRole('heading', { name: /Nhiệm vụ|Quản lý nhiệm vụ/i })
  }
}
