import { Page } from '@playwright/test'

/** Navigate to the app and wait for initial load */
export async function gotoApp(page: Page, path = '/') {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

/** Click a sidebar navigation link by its label text */
export async function sidebarClick(page: Page, label: string) {
  await page.getByRole('link', { name: label, exact: true }).first().click()
  await page.waitForLoadState('networkidle')
}

/** Fill a text input by its label */
export async function fillByLabel(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value)
}

/** Select an option from a select by its label */
export async function selectByLabel(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).selectOption(value)
}

/** Click a button by its text */
export async function clickButton(page: Page, text: string) {
  await page.getByRole('button', { name: text, exact: true }).click()
}

/** Wait for a specific text to appear on the page */
export async function waitForText(page: Page, text: string) {
  await page.getByText(text, { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
}

/** Take a full-page screenshot */
export async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
}
