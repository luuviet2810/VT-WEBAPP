import { test } from './fixtures/index.ts'
import { captureResponsive, waitForStableUI, closeOverlay } from './helpers/index.ts'
import { hasCredentials } from './auth/credentials.ts'

const VIEWPORTS = [390, 402, 412, 430, 440]

test.describe('Responsive Audit', () => {
  test.skip(!hasCredentials, 'Set TEST_USER_EMAIL / TEST_USER_PASSWORD to run')

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard first to ensure auth state is loaded
    await page.goto('/')
    await waitForStableUI(page)
  })

  // ====== DASHBOARD ======
  for (const w of VIEWPORTS) {
    test(`Dashboard @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.goto('/')
      await waitForStableUI(page)
      await captureResponsive(page, `Dashboard/${w}-main`)
    })
  }

  // ====== VEHICLE LIST ======
  for (const w of VIEWPORTS) {
    test(`VehicleList @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.goto('/xe')
      await waitForStableUI(page)
      await captureResponsive(page, `VehicleList/${w}-main`)

      // Open filter
      const filterBtn = page.getByRole('button', { name: /Bộ lọc/i })
      if (await filterBtn.isVisible()) {
        await filterBtn.click()
        await page.waitForTimeout(300)
        await captureResponsive(page, `VehicleList/${w}-filter`)
        await closeOverlay(page)
      }

      // Open preview if vehicle cards exist
      const previewBtn = page.locator('button:has-text("Đầu vào")').first()
      if (await previewBtn.isVisible()) {
        await previewBtn.click()
        await page.waitForTimeout(500)
        await captureResponsive(page, `VehicleList/${w}-preview`)
        await closeOverlay(page)
      }
    })
  }

  // ====== TASKS (Kanban) ======
  for (const w of VIEWPORTS) {
    test(`Tasks @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.goto('/nhiem-vu')
      await waitForStableUI(page)
      await captureResponsive(page, `Tasks/${w}-main`)

      // Click first task card to open detail drawer
      const taskCard = page.locator('[draggable]').first()
      if (await taskCard.isVisible()) {
        await taskCard.click()
        await page.waitForTimeout(500)
        await captureResponsive(page, `Tasks/${w}-detail`)
        await closeOverlay(page)
      }
    })
  }

  // ====== POSITIONS ======
  for (const w of VIEWPORTS) {
    test(`Positions @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.goto('/vi-tri')
      await waitForStableUI(page)
      await captureResponsive(page, `Positions/${w}-main`)

      // Open history drawer
      const historyBtn = page.locator('button[title*="Hoạt động" i], button:has(svg)').first()
      if (await historyBtn.isVisible()) {
        await historyBtn.click()
        await page.waitForTimeout(500)
        await captureResponsive(page, `Positions/${w}-history`)
        await closeOverlay(page)
      }
    })
  }

  // ====== VEHICLE DETAIL ======
  for (const w of VIEWPORTS) {
    test(`VehicleDetail @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.goto('/xe')
      await waitForStableUI(page)

      // Click the first vehicle link
      const vehicleLink = page.locator('a[href^="/xe/"]').first()
      if (await vehicleLink.isVisible()) {
        await vehicleLink.click()
        await page.waitForLoadState('networkidle')
        await waitForStableUI(page)
        await captureResponsive(page, `VehicleDetail/${w}-main`)
      }
    })
  }

  // ====== PRICE LIST ======
  for (const w of VIEWPORTS) {
    test(`PriceList @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.goto('/bang-gia')
      await waitForStableUI(page)
      await captureResponsive(page, `PriceList/${w}-main`)

      // Open vehicle form modal if edit button exists
      const editBtn = page.locator('button:has([data-lucide="edit"])').first()
      if (await editBtn.isVisible()) {
        await editBtn.click()
        await page.waitForTimeout(500)
        await captureResponsive(page, `PriceList/${w}-edit`)
        await closeOverlay(page)
      }
    })
  }

  // ====== ATTENDANCE ======
  for (const w of VIEWPORTS) {
    test(`Attendance @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.goto('/cham-cong')
      await waitForStableUI(page)
      await captureResponsive(page, `Attendance/${w}-main`)
    })
  }

  // ====== EMPLOYEES ======
  for (const w of VIEWPORTS) {
    test(`Employees @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.goto('/nhan-vien')
      await waitForStableUI(page)
      await captureResponsive(page, `Employees/${w}-main`)
    })
  }

  // ====== STATISTICS ======
  for (const w of VIEWPORTS) {
    test(`Statistics @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      await page.goto('/thong-ke')
      await waitForStableUI(page)
      await captureResponsive(page, `Statistics/${w}-main`)
    })
  }
})
