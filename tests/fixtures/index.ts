import { test as base } from '@playwright/test'
import { LoginPage } from './LoginPage.ts'
import { DashboardPage } from './DashboardPage.ts'
import { VehicleListPage } from './VehicleListPage.ts'
import { PriceListPage } from './PriceListPage.ts'
import { TasksPage } from './TasksPage.ts'
import { PositionsPage, AttendancePage, EmployeesPage, StatisticsPage, SettingsPage } from './OtherPages.ts'

export type TestFixtures = {
  loginPage: LoginPage
  dashboardPage: DashboardPage
  vehicleListPage: VehicleListPage
  priceListPage: PriceListPage
  tasksPage: TasksPage
  positionsPage: PositionsPage
  attendancePage: AttendancePage
  employeesPage: EmployeesPage
  statisticsPage: StatisticsPage
  settingsPage: SettingsPage
}

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => await use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => await use(new DashboardPage(page)),
  vehicleListPage: async ({ page }, use) => await use(new VehicleListPage(page)),
  priceListPage: async ({ page }, use) => await use(new PriceListPage(page)),
  tasksPage: async ({ page }, use) => await use(new TasksPage(page)),
  positionsPage: async ({ page }, use) => await use(new PositionsPage(page)),
  attendancePage: async ({ page }, use) => await use(new AttendancePage(page)),
  employeesPage: async ({ page }, use) => await use(new EmployeesPage(page)),
  statisticsPage: async ({ page }, use) => await use(new StatisticsPage(page)),
  settingsPage: async ({ page }, use) => await use(new SettingsPage(page)),
})

export { expect } from '@playwright/test'
