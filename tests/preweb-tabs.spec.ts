import { test, expect } from '@playwright/test'

test.describe('VT AUTO - Pre-Web Tabs and Hidden Vehicle Removal', () => {
  test('Verify Pre-Web only has 2 tabs (Đang hiển thị & Sắp về), hidden cars are excluded, and switching works', async ({ page }) => {
    // 1. Mở trang Pre-Web
    await page.goto('/pre-web')
    await page.waitForLoadState('networkidle')

    // 2. Kiểm tra tab "Đang ẩn" KHÔNG tồn tại
    const hiddenTab = page.locator('button:has-text("Đang ẩn")')
    await expect(hiddenTab).toHaveCount(0)

    // 3. Kiểm tra 2 tab duy nhất: "Đang hiển thị" và "Sắp về"
    const visibleTab = page.locator('button:has-text("Đang hiển thị")')
    const comingSoonTab = page.locator('button:has-text("Sắp về")')
    await expect(visibleTab).toBeVisible()
    await expect(comingSoonTab).toBeVisible()

    const visibleText = await visibleTab.innerText()
    const comingSoonText = await comingSoonTab.innerText()
    console.log(`[TEST PRE-WEB] Tab 1: "${visibleText}", Tab 2: "${comingSoonText}"`)

    expect(visibleText).toMatch(/Đang hiển thị \(\d+\)/)
    expect(comingSoonText).toMatch(/Sắp về \(\d+\)/)

    // 4. Kiểm tra xe K5 biển số 6234 KHÔNG xuất hiện trên cả 2 tab
    const k5Plate6234 = page.locator('text=6234')
    await expect(k5Plate6234).toHaveCount(0)

    // Chuyển sang tab "Sắp về"
    await comingSoonTab.click()
    await page.waitForTimeout(300)
    await expect(k5Plate6234).toHaveCount(0)

    // 5. Kiểm tra các chức năng kéo-thả và preview website còn nguyên vẹn
    const dragHandles = page.locator('button[aria-label="Kéo để sắp xếp thứ tự trên website"]')
    const dragCount = await dragHandles.count()
    console.log(`[TEST PRE-WEB] Số lượng nút kéo thả trên tab Sắp về: ${dragCount}`)
    expect(dragCount).toBeGreaterThan(0)

    // Preview website iframe tồn tại
    const previewIframe = page.locator('iframe[title*="Preview website"]')
    await expect(previewIframe).toBeVisible()

    // 6. Kiểm tra chuyển xe giữa "Đang hiển thị" và "Sắp về"
    await visibleTab.click()
    await page.waitForTimeout(300)

    // Lấy dropdown đầu tiên trên tab "Đang hiển thị"
    const firstSelect = page.locator('select[aria-label="Trạng thái hiển thị trên website"]').first()
    await expect(firstSelect).toBeVisible()
    await expect(firstSelect).toHaveValue('visible')

    // Chuyển sang "Sắp về"
    await firstSelect.selectOption('coming_soon')
    await page.waitForTimeout(1000)

    // Kiểm tra số lượng đã chuyển: Đang hiển thị (25), Sắp về (11)
    await expect(visibleTab).toHaveText('Đang hiển thị (25)')
    await expect(comingSoonTab).toHaveText('Sắp về (11)')
    console.log('[TEST PRE-WEB] Đã chuyển 1 xe sang Sắp về thành công! Counts: Đang hiển thị (25), Sắp về (11)')

    // Chuyển qua tab "Sắp về" và chuyển xe đó trở lại "Đang hiển thị"
    await comingSoonTab.click()
    await page.waitForTimeout(300)

    // Tìm select của xe vừa chuyển (hoặc select cuối cùng trên Sắp về) và chuyển lại visible
    const lastSelect = page.locator('select[aria-label="Trạng thái hiển thị trên website"]').last()
    await lastSelect.selectOption('visible')
    await page.waitForTimeout(1000)

    // Kiểm tra số lượng đã hoàn nguyên: Đang hiển thị (26), Sắp về (10)
    await expect(visibleTab).toHaveText('Đang hiển thị (26)')
    await expect(comingSoonTab).toHaveText('Sắp về (10)')
    console.log('[TEST PRE-WEB] Đã chuyển xe trở lại Đang hiển thị thành công! Counts phục hồi: Đang hiển thị (26), Sắp về (10)')

    // 7. Chụp ảnh màn hình Desktop & Mobile
    await page.setViewportSize({ width: 1440, height: 900 })
    await visibleTab.click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: 'C:/Users/luuvi/.gemini/antigravity/brain/148ea679-ee80-4b13-9d0f-5b237457f990/screenshots/preweb/preweb-desktop.png', fullPage: true })

    // Chụp ảnh màn hình Mobile
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: 'C:/Users/luuvi/.gemini/antigravity/brain/148ea679-ee80-4b13-9d0f-5b237457f990/screenshots/preweb/preweb-mobile.png', fullPage: true })

    console.log('✅ Pre-Web Desktop & Mobile verification completed!')
  })
})
