import { Page } from '@playwright/test'
import path from 'path'

/** Navigate to a path and wait for stable load */
export async function goto(page: Page, url = '/') {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
}

/** Click a sidebar navigation link by label text */
export async function sidebarClick(page: Page, label: string) {
  await page.getByRole('link', { name: label, exact: true }).first().click()
  await page.waitForLoadState('networkidle')
}

/** Open a drawer if a toggle/button is present */
export async function openDrawer(page: Page, toggleLabel?: string) {
  if (toggleLabel) {
    await page.getByRole('button', { name: toggleLabel }).click()
  }
  await page.waitForTimeout(300)
}

/** Open a filter popover/modal */
export async function openFilter(page: Page, filterLabel?: string) {
  const btn = filterLabel
    ? page.getByRole('button', { name: filterLabel })
    : page.getByRole('button', { name: /Bộ lọc|Filter/i })
  await btn.click()
  await page.waitForTimeout(200)
}

/** Open a modal (generic) */
export async function openModal(page: Page, triggerLabel: string) {
  await page.getByRole('button', { name: triggerLabel }).click()
  await page.waitForTimeout(300)
}

/** Close any open overlay (drawer, modal, popover) by pressing Escape */
export async function closeOverlay(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
}

/** Wait for network idle + small settle time for animations to finish */
export async function waitForStableUI(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

/** Take a responsive screenshot for the current device */
export async function captureResponsive(page: Page, name: string) {
  const viewport = page.viewportSize()
  const device = viewport ? `${viewport.width}x${viewport.height}` : 'unknown'
  const dir = path.join('screenshots', device)
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true })
}
