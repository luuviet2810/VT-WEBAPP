import type { Page } from '@playwright/test'

export class PositionsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/vi-tri')
    await this.page.waitForLoadState('networkidle')
  }

  get title() {
    return this.page.getByRole('heading', { name: /Vị trí xe/i })
  }
}

export class AttendancePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/cham-cong')
    await this.page.waitForLoadState('networkidle')
  }

  get title() {
    return this.page.getByRole('heading', { name: /Chấm công/i })
  }
}

export class EmployeesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/nhan-vien')
    await this.page.waitForLoadState('networkidle')
  }

  get title() {
    return this.page.getByRole('heading', { name: /Nhân viên/i })
  }
}

export class StatisticsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/thong-ke')
    await this.page.waitForLoadState('networkidle')
  }

  get title() {
    return this.page.getByRole('heading', { name: /Thống kê/i })
  }
}

export class SettingsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/cai-dat')
    await this.page.waitForLoadState('networkidle')
  }

  get title() {
    return this.page.getByRole('heading', { name: /Cài đặt/i })
  }
}
