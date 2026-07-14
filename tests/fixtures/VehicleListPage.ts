import type { Page } from '@playwright/test'
import { clickButton, sidebarClick } from '../helpers'

export class VehicleListPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/xe')
    await this.page.waitForLoadState('networkidle')
  }

  get title() {
    return this.page.getByRole('heading', { name: /Danh sách xe/i })
  }

  get vehicleCards() {
    return this.page.locator('a[href^="/xe/"]').filter({ has: this.page.locator('.card') })
  }

  async openVehicleDetail(index = 0) {
    const cards = await this.vehicleCards.all()
    if (cards[index]) await cards[index].click()
  }

  async search(query: string) {
    await this.page.getByPlaceholder(/Tìm biển số/i).fill(query)
  }

  async openFilter() {
    await this.page.getByRole('button', { name: /Bộ lọc/i }).click()
  }

  async clickFirstCheckIn() {
    await this.page.locator('button:has-text("Đầu vào")').first().click()
  }
}
