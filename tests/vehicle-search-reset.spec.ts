import { test, expect } from '@playwright/test'

test.describe('VT AUTO - Vehicle Search & Filter State Reset', () => {
  test('Search keyword, filter popover, and scroll position reset completely when navigating away and returning', async ({ page }) => {
    // Theo dõi network requests để kiểm tra không tạo request trùng lặp bất thường
    const apiRequests: string[] = []
    page.on('request', (req) => {
      const url = req.url()
      if (url.includes('/api/')) {
        apiRequests.push(`${req.method()} ${url}`)
      }
    })

    // 1. Mở Danh sách xe (/xe): hiển thị toàn bộ xe
    await page.goto('/xe')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Tìm biển số hoặc dòng xe"]')
    await expect(searchInput).toBeVisible()

    const initialCards = page.locator('a[href^="/xe/"]')
    await expect(initialCards.first()).toBeVisible()
    const totalVehiclesCount = await initialCards.count()
    console.log(`[TEST 1] Số lượng xe hiển thị mặc định ban đầu: ${totalVehiclesCount} xe`)
    expect(totalVehiclesCount).toBeGreaterThan(0)

    // 2. Tìm '73': kết quả được lọc đúng
    await searchInput.fill('73')
    await page.waitForTimeout(500)

    const filteredCards73 = page.locator('a[href^="/xe/"]')
    const filteredCount73 = await filteredCards73.count()
    console.log(`[TEST 2] Số lượng xe khớp từ khóa "73": ${filteredCount73} xe`)
    expect(filteredCount73).toBeLessThan(totalVehiclesCount)
    expect(filteredCount73).toBeGreaterThan(0)

    // Kiểm tra các xe hiển thị đều chứa '73'
    for (let i = 0; i < filteredCount73; i++) {
      const text = await filteredCards73.nth(i).innerText()
      expect(text.toLowerCase()).toContain('73')
    }

    // 3. Chuyển sang Dashboard qua Sidebar (SPA Navigation)
    const dashboardLink = page.locator('aside a[href="/"]')
    await expect(dashboardLink).toBeVisible()
    await dashboardLink.click()
    await page.waitForTimeout(300)
    await expect(page).toHaveURL(/\/(#.*)?$/)

    // 4. Quay lại Danh sách xe (/xe) qua Sidebar: hiển thị toàn bộ xe, input rỗng, scroll = 0
    const xeLink = page.locator('aside a[href="/xe"]')
    await expect(xeLink).toBeVisible()
    await xeLink.click()
    await page.waitForTimeout(300)

    // Ô tìm kiếm phải trống rỗng
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toHaveValue('')

    // Danh sách xe phải hiển thị lại đầy đủ
    const returnCards = page.locator('a[href^="/xe/"]')
    await expect(returnCards.first()).toBeVisible()
    const returnCount = await returnCards.count()
    console.log(`[TEST 4] Quay lại Danh sách xe: hiển thị ${returnCount} xe (kỳ vọng ${totalVehiclesCount})`)
    expect(returnCount).toBe(totalVehiclesCount)

    // Vị trí cuộn ở đầu danh sách (scrollTop = 0)
    const scrollTop = await page.evaluate(() => {
      const main = document.querySelector('main')
      return main ? main.scrollTop : window.scrollY
    })
    console.log(`[TEST 4] Vị trí cuộn scrollTop: ${scrollTop}`)
    expect(scrollTop).toBe(0)

    // 5. Lặp lại với bộ lọc nâng cao
    const filterBtn = page.locator('button[title="Bộ lọc"]')
    await filterBtn.click()
    const filterLabel = page.locator('label:has-text("Tình trạng")').first()
    await expect(filterLabel).toBeVisible()

    // Chọn tình trạng 'deposited' (Đã cọc)
    const statusSelect = page.locator('select:has(option[value="deposited"])').first()
    await statusSelect.selectOption('deposited')
    await page.waitForTimeout(500)

    const depositedCount = await page.locator('a[href^="/xe/"]').count()
    console.log(`[TEST 5] Số lượng xe đã cọc: ${depositedCount} xe`)
    expect(depositedCount).toBeLessThan(totalVehiclesCount)

    // Chuyển sang Bảng giá (/bang-gia) qua Sidebar khi popover đang mở
    const bangGiaLink = page.locator('aside a[href="/bang-gia"]')
    await expect(bangGiaLink).toBeVisible()
    await bangGiaLink.click()
    await page.waitForTimeout(300)
    await expect(page).toHaveURL(/\/bang-gia/)

    // Quay lại /xe qua Sidebar
    await xeLink.click()
    await page.waitForTimeout(300)
    await expect(page).toHaveURL(/\/xe/)

    // Bộ lọc nâng cao phải đóng lại
    await expect(page.locator('label:has-text("Tình trạng")')).not.toBeVisible()

    // Danh sách hiển thị đầy đủ toàn bộ xe
    const afterAdvancedReturnCount = await page.locator('a[href^="/xe/"]').count()
    console.log(`[TEST 5] Quay lại sau bộ lọc nâng cao: hiển thị ${afterAdvancedReturnCount} xe`)
    expect(afterAdvancedReturnCount).toBe(totalVehiclesCount)

    // 6. Chuyển tab nhiều lần: không phát sinh request trùng bất thường
    const requestsBeforeLoop = apiRequests.length
    console.log(`[TEST 6] Số request trước vòng lặp chuyển tab: ${requestsBeforeLoop}`)

    for (let loop = 0; loop < 3; loop++) {
      await dashboardLink.click()
      await page.waitForTimeout(200)

      await xeLink.click()
      await page.waitForTimeout(200)
    }

    const requestsAfterLoop = apiRequests.length
    const loopDiff = requestsAfterLoop - requestsBeforeLoop
    console.log(`[TEST 6] Số request phát sinh khi chuyển tab 3 lần: ${loopDiff}`)

    // Không tải lại xe không cần thiết từ API backend (GET /api/vehicles)
    const vehicleListFetches = apiRequests.slice(requestsBeforeLoop).filter(r => r.match(/GET .*\/api\/vehicles(\?|$)/))
    console.log(`[TEST 6] Số request tải lại danh sách xe GET /api/vehicles phát sinh: ${vehicleListFetches.length}`)
    expect(vehicleListFetches.length).toBe(0)

    // 7. Kiểm tra chức năng tìm kiếm vẫn hoạt động bình thường sau khi reset
    await searchInput.fill('73')
    await page.waitForTimeout(500)

    const retestCount = await page.locator('a[href^="/xe/"]').count()
    console.log(`[TEST 7] Tìm kiếm lại sau các lần reset: ${retestCount} xe`)
    expect(retestCount).toBe(filteredCount73)

    // Bấm nút Đặt lại (Reset) trên thanh công cụ
    const resetBtn = page.locator('button[title="Đặt lại"]')
    await resetBtn.click()
    await page.waitForTimeout(300)
    await expect(searchInput).toHaveValue('')
    const finalCount = await page.locator('a[href^="/xe/"]').count()
    console.log(`[TEST 7] Bấm nút Đặt lại: danh sách phục hồi đầy đủ ${finalCount} xe`)
    expect(finalCount).toBe(totalVehiclesCount)
  })
})
