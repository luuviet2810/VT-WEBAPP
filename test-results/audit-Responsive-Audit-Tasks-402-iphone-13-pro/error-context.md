# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit.spec.ts >> Responsive Audit >> Tasks @402
- Location: tests\audit.spec.ts:56:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[draggable]').first()
    - locator resolved to <img alt="VT AUTO" draggable="false" src="/src/assets/logo-vtauto.png" class="h-auto w-full max-w-[160px] select-none object-contain"/>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
      - waiting 100ms
    31 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - element is outside of the viewport
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e7]:
      - generic [ref=e8]: View Mode
      - generic [ref=e9]:
        - button "Admin" [ref=e10] [cursor=pointer]:
          - img [ref=e11]
          - generic [ref=e14]: Admin
        - button "Staff" [ref=e15] [cursor=pointer]:
          - img [ref=e16]
          - generic [ref=e19]: Staff
    - img "VT AUTO" [ref=e22]
    - button "Đóng menu" [ref=e24] [cursor=pointer]:
      - img [ref=e25]
    - navigation [ref=e29]:
      - link "Tổng quan" [ref=e30]:
        - /url: /
        - img [ref=e31]
        - generic [ref=e34]: Tổng quan
      - link "Danh sách xe" [ref=e35]:
        - /url: /xe
        - img [ref=e36]
        - generic [ref=e40]: Danh sách xe
      - link "Bảng giá" [ref=e41]:
        - /url: /bang-gia
        - img [ref=e42]
        - generic [ref=e44]: Bảng giá
      - link "Việc của tôi" [ref=e45]:
        - /url: /viec-cua-toi
        - img [ref=e46]
        - generic [ref=e49]: Việc của tôi
      - link "Chấm công" [ref=e50]:
        - /url: /cham-cong
        - img [ref=e51]
        - generic [ref=e54]: Chấm công
    - navigation [ref=e55]:
      - link "Hồ sơ" [ref=e56]:
        - /url: /ho-so
        - img [ref=e57]
        - generic [ref=e60]: Hồ sơ
    - generic [ref=e62]:
      - img [ref=e63]
      - generic [ref=e66]: Thông báo
    - generic [ref=e68]:
      - generic [ref=e69]: LV
      - generic [ref=e70]:
        - generic [ref=e71]: LƯU VĂN VIỆT
        - generic [ref=e72]: Nhân viên
      - button "Đăng xuất" [ref=e73] [cursor=pointer]:
        - img [ref=e74]
  - main [ref=e77]:
    - generic [ref=e78]:
      - button "Mở menu" [ref=e80] [cursor=pointer]:
        - img [ref=e81]
      - generic [ref=e82]:
        - generic [ref=e83]:
          - generic [ref=e84]:
            - heading "Nhiệm vụ" [level=1] [ref=e85]
            - paragraph [ref=e86]: Kéo thả để cập nhật trạng thái
          - generic [ref=e87]:
            - combobox [ref=e88]:
              - option "Tất cả nhân viên" [selected]
              - option "Anh Thư"
              - option "LƯU VĂN VIỆT"
            - button "Thêm nhiệm vụ" [ref=e89] [cursor=pointer]:
              - img [ref=e90]
              - text: Thêm nhiệm vụ
        - generic [ref=e91]:
          - generic [ref=e92]:
            - generic [ref=e93]:
              - generic [ref=e94]: 🚗 Chưa làm
              - generic [ref=e95]: "2"
            - generic [ref=e96]:
              - generic [ref=e99] [cursor=pointer]:
                - img [ref=e101]
                - generic [ref=e108]:
                  - generic [ref=e109]:
                    - generic [ref=e110]: Kiểm tra điều hòa
                    - generic [ref=e111]: Cứ từ từ
                  - generic [ref=e112]: "0302"
              - generic [ref=e115] [cursor=pointer]:
                - img [ref=e117]
                - generic [ref=e124]:
                  - generic [ref=e125]:
                    - generic [ref=e126]: Đổ ga điều hòa
                    - generic [ref=e127]: Cứ từ từ
                  - generic [ref=e128]: "0302"
          - generic [ref=e129]:
            - generic [ref=e130]:
              - generic [ref=e131]: 🟡 Đang làm
              - generic [ref=e132]: "0"
            - generic [ref=e134]: Kéo task vào đây
          - generic [ref=e135]:
            - generic [ref=e136]:
              - generic [ref=e137]: ✅ Đã hoàn thành
              - generic [ref=e138]: "0"
            - generic [ref=e140]: Kéo task vào đây
```

# Test source

```ts
  1   | import { test } from './fixtures/index.ts'
  2   | import { captureResponsive, waitForStableUI, closeOverlay } from './helpers/index.ts'
  3   | import { hasCredentials } from './auth/credentials.ts'
  4   | 
  5   | const VIEWPORTS = [390, 402, 412, 430, 440]
  6   | 
  7   | test.describe('Responsive Audit', () => {
  8   |   test.skip(!hasCredentials, 'Set TEST_USER_EMAIL / TEST_USER_PASSWORD to run')
  9   | 
  10  |   test.beforeEach(async ({ page }) => {
  11  |     // Navigate to dashboard first to ensure auth state is loaded
  12  |     await page.goto('/')
  13  |     await waitForStableUI(page)
  14  |   })
  15  | 
  16  |   // ====== DASHBOARD ======
  17  |   for (const w of VIEWPORTS) {
  18  |     test(`Dashboard @${w}`, async ({ page }) => {
  19  |       await page.setViewportSize({ width: w, height: 900 })
  20  |       await page.goto('/')
  21  |       await waitForStableUI(page)
  22  |       await captureResponsive(page, `Dashboard/${w}-main`)
  23  |     })
  24  |   }
  25  | 
  26  |   // ====== VEHICLE LIST ======
  27  |   for (const w of VIEWPORTS) {
  28  |     test(`VehicleList @${w}`, async ({ page }) => {
  29  |       await page.setViewportSize({ width: w, height: 900 })
  30  |       await page.goto('/xe')
  31  |       await waitForStableUI(page)
  32  |       await captureResponsive(page, `VehicleList/${w}-main`)
  33  | 
  34  |       // Open filter
  35  |       const filterBtn = page.getByRole('button', { name: /Bộ lọc/i })
  36  |       if (await filterBtn.isVisible()) {
  37  |         await filterBtn.click()
  38  |         await page.waitForTimeout(300)
  39  |         await captureResponsive(page, `VehicleList/${w}-filter`)
  40  |         await closeOverlay(page)
  41  |       }
  42  | 
  43  |       // Open preview if vehicle cards exist
  44  |       const previewBtn = page.locator('button:has-text("Đầu vào")').first()
  45  |       if (await previewBtn.isVisible()) {
  46  |         await previewBtn.click()
  47  |         await page.waitForTimeout(500)
  48  |         await captureResponsive(page, `VehicleList/${w}-preview`)
  49  |         await closeOverlay(page)
  50  |       }
  51  |     })
  52  |   }
  53  | 
  54  |   // ====== TASKS (Kanban) ======
  55  |   for (const w of VIEWPORTS) {
  56  |     test(`Tasks @${w}`, async ({ page }) => {
  57  |       await page.setViewportSize({ width: w, height: 900 })
  58  |       await page.goto('/nhiem-vu')
  59  |       await waitForStableUI(page)
  60  |       await captureResponsive(page, `Tasks/${w}-main`)
  61  | 
  62  |       // Click first task card to open detail drawer
  63  |       const taskCard = page.locator('[draggable]').first()
  64  |       if (await taskCard.isVisible()) {
> 65  |         await taskCard.click()
      |                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  66  |         await page.waitForTimeout(500)
  67  |         await captureResponsive(page, `Tasks/${w}-detail`)
  68  |         await closeOverlay(page)
  69  |       }
  70  |     })
  71  |   }
  72  | 
  73  |   // ====== POSITIONS ======
  74  |   for (const w of VIEWPORTS) {
  75  |     test(`Positions @${w}`, async ({ page }) => {
  76  |       await page.setViewportSize({ width: w, height: 900 })
  77  |       await page.goto('/vi-tri')
  78  |       await waitForStableUI(page)
  79  |       await captureResponsive(page, `Positions/${w}-main`)
  80  | 
  81  |       // Open history drawer
  82  |       const historyBtn = page.locator('button[title*="Hoạt động" i], button:has(svg)').first()
  83  |       if (await historyBtn.isVisible()) {
  84  |         await historyBtn.click()
  85  |         await page.waitForTimeout(500)
  86  |         await captureResponsive(page, `Positions/${w}-history`)
  87  |         await closeOverlay(page)
  88  |       }
  89  |     })
  90  |   }
  91  | 
  92  |   // ====== VEHICLE DETAIL ======
  93  |   for (const w of VIEWPORTS) {
  94  |     test(`VehicleDetail @${w}`, async ({ page }) => {
  95  |       await page.setViewportSize({ width: w, height: 900 })
  96  |       await page.goto('/xe')
  97  |       await waitForStableUI(page)
  98  | 
  99  |       // Click the first vehicle link
  100 |       const vehicleLink = page.locator('a[href^="/xe/"]').first()
  101 |       if (await vehicleLink.isVisible()) {
  102 |         await vehicleLink.click()
  103 |         await page.waitForLoadState('networkidle')
  104 |         await waitForStableUI(page)
  105 |         await captureResponsive(page, `VehicleDetail/${w}-main`)
  106 |       }
  107 |     })
  108 |   }
  109 | 
  110 |   // ====== PRICE LIST ======
  111 |   for (const w of VIEWPORTS) {
  112 |     test(`PriceList @${w}`, async ({ page }) => {
  113 |       await page.setViewportSize({ width: w, height: 900 })
  114 |       await page.goto('/bang-gia')
  115 |       await waitForStableUI(page)
  116 |       await captureResponsive(page, `PriceList/${w}-main`)
  117 | 
  118 |       // Open vehicle form modal if edit button exists
  119 |       const editBtn = page.locator('button:has([data-lucide="edit"])').first()
  120 |       if (await editBtn.isVisible()) {
  121 |         await editBtn.click()
  122 |         await page.waitForTimeout(500)
  123 |         await captureResponsive(page, `PriceList/${w}-edit`)
  124 |         await closeOverlay(page)
  125 |       }
  126 |     })
  127 |   }
  128 | 
  129 |   // ====== ATTENDANCE ======
  130 |   for (const w of VIEWPORTS) {
  131 |     test(`Attendance @${w}`, async ({ page }) => {
  132 |       await page.setViewportSize({ width: w, height: 900 })
  133 |       await page.goto('/cham-cong')
  134 |       await waitForStableUI(page)
  135 |       await captureResponsive(page, `Attendance/${w}-main`)
  136 |     })
  137 |   }
  138 | 
  139 |   // ====== EMPLOYEES ======
  140 |   for (const w of VIEWPORTS) {
  141 |     test(`Employees @${w}`, async ({ page }) => {
  142 |       await page.setViewportSize({ width: w, height: 900 })
  143 |       await page.goto('/nhan-vien')
  144 |       await waitForStableUI(page)
  145 |       await captureResponsive(page, `Employees/${w}-main`)
  146 |     })
  147 |   }
  148 | 
  149 |   // ====== STATISTICS ======
  150 |   for (const w of VIEWPORTS) {
  151 |     test(`Statistics @${w}`, async ({ page }) => {
  152 |       await page.setViewportSize({ width: w, height: 900 })
  153 |       await page.goto('/thong-ke')
  154 |       await waitForStableUI(page)
  155 |       await captureResponsive(page, `Statistics/${w}-main`)
  156 |     })
  157 |   }
  158 | })
  159 | 
```