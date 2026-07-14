import { test } from './fixtures/index.ts'
import { expect } from '@playwright/test'
import { hasCredentials } from './auth/credentials.ts'

const authDesc = hasCredentials ? test.describe : test.describe.skip

authDesc('Authenticated - Page Objects', () => {
  test.skip(!hasCredentials, 'Set TEST_USER_EMAIL / TEST_USER_PASSWORD to run')

  test('Dashboard loads', async ({ dashboardPage }) => {
    await dashboardPage.goto()
    await expect(dashboardPage.title).toBeVisible()
  })

  test('Vehicle List loads', async ({ vehicleListPage }) => {
    await vehicleListPage.goto()
    await expect(vehicleListPage.title).toBeVisible()
  })

  test('Price List loads', async ({ priceListPage }) => {
    await priceListPage.goto()
    await expect(priceListPage.title).toBeVisible()
  })

  test('Tasks loads', async ({ tasksPage }) => {
    await tasksPage.goto()
    await expect(tasksPage.title).toBeVisible()
  })

  test('Positions loads', async ({ positionsPage }) => {
    await positionsPage.goto()
    await expect(positionsPage.title).toBeVisible()
  })

  test('Attendance loads', async ({ attendancePage }) => {
    await attendancePage.goto()
    await expect(attendancePage.title).toBeVisible()
  })

  test('Employees loads', async ({ employeesPage }) => {
    await employeesPage.goto()
    await expect(employeesPage.title).toBeVisible()
  })

  test('Statistics loads', async ({ statisticsPage }) => {
    await statisticsPage.goto()
    await expect(statisticsPage.title).toBeVisible()
  })

  test('Settings loads', async ({ settingsPage }) => {
    await settingsPage.goto()
    await expect(settingsPage.title).toBeVisible()
  })
})

authDesc('Authenticated - Vehicle List interactions', () => {
  test('search filters vehicles', async ({ vehicleListPage, page }) => {
    await vehicleListPage.goto()
    await vehicleListPage.search('test')
    await vehicleListPage.openFilter()
    await page.keyboard.press('Escape')
  })

  test('can open filter popover', async ({ vehicleListPage, page }) => {
    await vehicleListPage.goto()
    await vehicleListPage.openFilter()
    const popover = page.locator('text=Tình trạng').or(page.locator('text=Vị trí'))
    await expect(popover.first()).toBeVisible()
  })
})
