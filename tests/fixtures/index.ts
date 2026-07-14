import { test as base } from '@playwright/test'
import { gotoApp } from '../helpers'

export type TestFixtures = object

export const test = base.extend<TestFixtures>({
  // Extend with custom fixtures here
})

export { expect } from '@playwright/test'
export { gotoApp }
