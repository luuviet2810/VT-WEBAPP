# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit.spec.ts >> Responsive Audit >> Positions @390
- Location: tests\audit.spec.ts:75:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button[title*="Hoạt động" i], button:has(svg)').first()
    - locator resolved to <button class="↵                flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all↵                text-slate-500 hover:bg-white/50 hover:text-slate-700↵                ring-1 ring-brand-300 ring-inset↵              ">…</button>
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
    49 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - element is outside of the viewport
     - retrying click action
       - waiting 500ms

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
      - link "Tổng quan" [ref=e30] [cursor=pointer]:
        - /url: /
        - img [ref=e31]
        - generic [ref=e34]: Tổng quan
      - link "Danh sách xe" [ref=e35] [cursor=pointer]:
        - /url: /xe
        - img [ref=e36]
        - generic [ref=e40]: Danh sách xe
      - link "Bảng giá" [ref=e41] [cursor=pointer]:
        - /url: /bang-gia
        - img [ref=e42]
        - generic [ref=e44]: Bảng giá
      - link "Việc của tôi" [ref=e45] [cursor=pointer]:
        - /url: /viec-cua-toi
        - img [ref=e46]
        - generic [ref=e49]: Việc của tôi
      - link "Chấm công" [ref=e50] [cursor=pointer]:
        - /url: /cham-cong
        - img [ref=e51]
        - generic [ref=e54]: Chấm công
    - navigation [ref=e55]:
      - link "Hồ sơ" [ref=e56] [cursor=pointer]:
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
            - heading "Vị trí xe" [level=1] [ref=e85]
            - paragraph [ref=e86]: Kéo thả xe giữa các công đoạn — cập nhật tự động
          - generic [ref=e87]:
            - button "Hoạt động gần đây" [ref=e88] [cursor=pointer]:
              - img [ref=e89]
            - button "Chỉnh sửa vị trí" [ref=e92] [cursor=pointer]:
              - img [ref=e93]
        - generic [ref=e95]:
          - generic [ref=e96]:
            - generic [ref=e98]:
              - generic [ref=e100]: "37"
              - generic [ref=e101]: Song nưng Bãi lớn
            - generic [ref=e102]:
              - link "1613 - SM3" [ref=e103]:
                - /url: /xe/4c3b0ea0-6683-447d-940c-2f2eaa0d744f
                - img [ref=e105]
                - generic [ref=e112]:
                  - text: "1613"
                  - generic [ref=e113]: "- SM3"
              - link "1994 - Cruze" [ref=e114]:
                - /url: /xe/7c4d7ac3-0fb6-41a3-a73c-f9ef5696e54f
                - img [ref=e116]
                - generic [ref=e123]:
                  - text: "1994"
                  - generic [ref=e124]: "- Cruze"
              - link "6173 - SM5" [ref=e125]:
                - /url: /xe/0efe85fa-3db1-40e0-b3dd-10ffec951204
                - img [ref=e127]
                - generic [ref=e134]:
                  - text: "6173"
                  - generic [ref=e135]: "- SM5"
              - link "7265 - SM5" [ref=e136]:
                - /url: /xe/fe07e3ae-1656-4b45-9feb-91c7ad7329ff
                - img [ref=e138]
                - generic [ref=e145]:
                  - text: "7265"
                  - generic [ref=e146]: "- SM5"
              - link "6059 - Canival" [ref=e147]:
                - /url: /xe/14f77dd7-0eff-49c5-b0d6-8f50b999b99d
                - img [ref=e149]
                - generic [ref=e156]:
                  - text: "6059"
                  - generic [ref=e157]: "- Canival"
              - link "8731 - K7" [ref=e158]:
                - /url: /xe/c30a8f9f-c451-431c-bdcd-5a2f37c3b6d5
                - img [ref=e160]
                - generic [ref=e167]:
                  - text: "8731"
                  - generic [ref=e168]: "- K7"
              - link "5115 - Grandeur" [ref=e169]:
                - /url: /xe/8113d09b-d136-4421-ba7b-26e27759995e
                - img [ref=e171]
                - generic [ref=e178]:
                  - text: "5115"
                  - generic [ref=e179]: "- Grandeur"
              - link "0556 - K5" [ref=e180]:
                - /url: /xe/ccde025a-4059-4de2-8dab-325a11b86c0a
                - img [ref=e182]
                - generic [ref=e189]:
                  - text: "0556"
                  - generic [ref=e190]: "- K5"
              - link "3169 - K5" [ref=e191]:
                - /url: /xe/e0dcbd3f-12d5-461d-af83-b7802e006d11
                - img [ref=e193]
                - generic [ref=e200]:
                  - text: "3169"
                  - generic [ref=e201]: "- K5"
              - link "9184 - K5 Hybrid" [ref=e202]:
                - /url: /xe/ce91ef6c-2573-46a6-b5b3-84dca08c5856
                - img [ref=e204]
                - generic [ref=e211]:
                  - text: "9184"
                  - generic [ref=e212]: "- K5 Hybrid"
              - link "1029 - Avante" [ref=e213]:
                - /url: /xe/baaa3a48-c459-4756-a570-d7b1ff03c937
                - img [ref=e215]
                - generic [ref=e222]:
                  - text: "1029"
                  - generic [ref=e223]: "- Avante"
              - link "8910 - Avante" [ref=e224]:
                - /url: /xe/619e657e-c3e8-4d41-beab-e23ce933715e
                - img [ref=e226]
                - generic [ref=e233]:
                  - text: "8910"
                  - generic [ref=e234]: "- Avante"
              - link "9269 - K3" [ref=e235]:
                - /url: /xe/71c8af1b-2370-4055-9465-a0e0559fdb42
                - img [ref=e237]
                - generic [ref=e244]:
                  - text: "9269"
                  - generic [ref=e245]: "- K3"
              - link "3656 - K7" [ref=e246]:
                - /url: /xe/a326c4e3-0b10-4947-9e07-515de38ad09e
                - img [ref=e248]
                - generic [ref=e255]:
                  - text: "3656"
                  - generic [ref=e256]: "- K7"
              - link "7944 - Avante" [ref=e257]:
                - /url: /xe/7b705e0d-5d0d-4946-8c25-a370cc92b4c0
                - img [ref=e259]
                - generic [ref=e266]:
                  - text: "7944"
                  - generic [ref=e267]: "- Avante"
              - link "3277 - K5" [ref=e268]:
                - /url: /xe/ab2cfac8-ab8b-4127-98a9-a3f374d5d527
                - img [ref=e270]
                - generic [ref=e277]:
                  - text: "3277"
                  - generic [ref=e278]: "- K5"
              - link "2562 - Avante" [ref=e279]:
                - /url: /xe/b6eaf7b1-0f31-4553-bf82-8d67635a0e5b
                - img [ref=e281]
                - generic [ref=e288]:
                  - text: "2562"
                  - generic [ref=e289]: "- Avante"
              - link "4482 - Grandeur" [ref=e290]:
                - /url: /xe/4adc9717-dbdf-4a11-8d1b-cca4ad08b7e0
                - img [ref=e292]
                - generic [ref=e299]:
                  - text: "4482"
                  - generic [ref=e300]: "- Grandeur"
              - link "1414 - Grandeur" [ref=e301]:
                - /url: /xe/83223b04-1b6a-4418-a6d2-bd23fe5572f0
                - img [ref=e303]
                - generic [ref=e310]:
                  - text: "1414"
                  - generic [ref=e311]: "- Grandeur"
              - link "9858 - Canival" [ref=e312]:
                - /url: /xe/cb976047-93ad-4259-a9c1-4737dfc9a143
                - img [ref=e314]
                - generic [ref=e321]:
                  - text: "9858"
                  - generic [ref=e322]: "- Canival"
              - link "1186 - K5" [ref=e323]:
                - /url: /xe/85c82b40-7230-4925-96bb-f4203dc2dab3
                - img [ref=e325]
                - generic [ref=e332]:
                  - text: "1186"
                  - generic [ref=e333]: "- K5"
              - link "1874 - K5 Hybrid" [ref=e334]:
                - /url: /xe/d9fdbc90-6f41-4caa-9599-775855be260c
                - img [ref=e336]
                - generic [ref=e343]:
                  - text: "1874"
                  - generic [ref=e344]: "- K5 Hybrid"
              - link "0302 - Canival" [ref=e345]:
                - /url: /xe/cfb7f572-ac9d-4abf-a977-a9c7ef57f43c
                - img [ref=e347]
                - generic [ref=e354]:
                  - text: "0302"
                  - generic [ref=e355]: "- Canival"
              - link "4496 - Canival" [ref=e356]:
                - /url: /xe/178ca21e-eb52-453f-bb98-946bea1fa1e2
                - img [ref=e358]
                - generic [ref=e365]:
                  - text: "4496"
                  - generic [ref=e366]: "- Canival"
              - link "6383 - Tucson" [ref=e367]:
                - /url: /xe/e20e0896-81ae-4151-a14e-b2c26ede3d61
                - img [ref=e369]
                - generic [ref=e376]:
                  - text: "6383"
                  - generic [ref=e377]: "- Tucson"
              - link "9210 - Cayenne" [ref=e378]:
                - /url: /xe/0e9b028e-685e-4f2f-be9a-e64617e4c46d
                - img [ref=e380]
                - generic [ref=e387]:
                  - text: "9210"
                  - generic [ref=e388]: "- Cayenne"
              - link "9994 - Carnival" [ref=e389]:
                - /url: /xe/bb465cf2-55dc-4cbe-821d-bd68dc3e94e9
                - img [ref=e391]
                - generic [ref=e398]:
                  - text: "9994"
                  - generic [ref=e399]: "- Carnival"
              - link "8925 - Grandeur" [ref=e400]:
                - /url: /xe/c353ddb9-f83e-4014-95fa-f13dee6c17d6
                - img [ref=e402]
                - generic [ref=e409]:
                  - text: "8925"
                  - generic [ref=e410]: "- Grandeur"
              - link "7194 - Cruze" [ref=e411]:
                - /url: /xe/e66e3814-56a5-4d01-bb1b-a02418a67ead
                - img [ref=e413]
                - generic [ref=e420]:
                  - text: "7194"
                  - generic [ref=e421]: "- Cruze"
              - link "4423 - K3" [ref=e422]:
                - /url: /xe/c6d83bf3-286d-442d-8439-65ea427eb5d1
                - img [ref=e424]
                - generic [ref=e431]:
                  - text: "4423"
                  - generic [ref=e432]: "- K3"
              - link "1150 - K7" [ref=e433]:
                - /url: /xe/0bd60a84-80c6-43bc-b26a-545c0784e8e9
                - img [ref=e435]
                - generic [ref=e442]:
                  - text: "1150"
                  - generic [ref=e443]: "- K7"
              - link "6362 - Grandeur" [ref=e444]:
                - /url: /xe/b090be0e-f2c8-41f7-9436-6985fb641c47
                - img [ref=e446]
                - generic [ref=e453]:
                  - text: "6362"
                  - generic [ref=e454]: "- Grandeur"
              - link "9028 - Malibu" [ref=e455]:
                - /url: /xe/a024fc17-e346-4ce0-9d67-42a51b71cae3
                - img [ref=e457]
                - generic [ref=e464]:
                  - text: "9028"
                  - generic [ref=e465]: "- Malibu"
              - link "2951 - Morning" [ref=e466]:
                - /url: /xe/20e9852b-9088-4044-bdad-6340c92ba11d
                - img [ref=e468]
                - generic [ref=e475]:
                  - text: "2951"
                  - generic [ref=e476]: "- Morning"
              - link "9323 - Morning" [ref=e477]:
                - /url: /xe/b0ff1dd5-232a-4a7b-84d5-8155c847bc7a
                - img [ref=e479]
                - generic [ref=e486]:
                  - text: "9323"
                  - generic [ref=e487]: "- Morning"
              - link "6423 - SantaFe" [ref=e488]:
                - /url: /xe/de3b3772-f3b2-48ce-b3d5-546570e58864
                - img [ref=e490]
                - generic [ref=e497]:
                  - text: "6423"
                  - generic [ref=e498]: "- SantaFe"
              - link "3424 - Cruze" [ref=e499]:
                - /url: /xe/c31ab049-aca0-41c9-a5a0-8629e6628c97
                - img [ref=e501]
                - generic [ref=e508]:
                  - text: "3424"
                  - generic [ref=e509]: "- Cruze"
          - generic [ref=e510]:
            - generic [ref=e512]:
              - generic [ref=e514]: "1"
              - generic [ref=e515]: Rửa máy
            - link "9196 - Canival" [ref=e517]:
              - /url: /xe/240c3b14-9f56-4391-baee-6811484715a7
              - img [ref=e519]
              - generic [ref=e526]:
                - text: "9196"
                - generic [ref=e527]: "- Canival"
          - generic [ref=e528]:
            - generic [ref=e530]:
              - generic [ref=e532]: "1"
              - generic [ref=e533]: Đánh bóng Wolpyong
            - link "9530 - Sonata" [ref=e535]:
              - /url: /xe/7acc9e71-215f-46e8-9f7a-40a5c9ac4ec3
              - img [ref=e537]
              - generic [ref=e544]:
                - text: "9530"
                - generic [ref=e545]: "- Sonata"
          - generic [ref=e546]:
            - generic [ref=e548]:
              - generic [ref=e550]: "1"
              - generic [ref=e551]: Song nưng gần bãi đất
            - link "4765 - Avante" [ref=e553]:
              - /url: /xe/93f2fb69-a9c9-4f8c-8b93-2ed5ec959d05
              - img [ref=e555]
              - generic [ref=e562]:
                - text: "4765"
                - generic [ref=e563]: "- Avante"
          - generic [ref=e564]:
            - generic [ref=e566]:
              - generic [ref=e568]: "7"
              - generic [ref=e569]: Trong bãi lớn
            - generic [ref=e570]:
              - link "7329 - SM3" [ref=e571]:
                - /url: /xe/aee1be06-1e2a-4329-b153-c864ea28f33c
                - img [ref=e573]
                - generic [ref=e580]:
                  - text: "7329"
                  - generic [ref=e581]: "- SM3"
              - link "9125 - SM5" [ref=e582]:
                - /url: /xe/9d5e3785-a6ba-43f6-8184-7276a02c22b5
                - img [ref=e584]
                - generic [ref=e591]:
                  - text: "9125"
                  - generic [ref=e592]: "- SM5"
              - link "2929 - SM5" [ref=e593]:
                - /url: /xe/747f182e-453b-4576-b3c5-47ead86083e0
                - img [ref=e595]
                - generic [ref=e602]:
                  - text: "2929"
                  - generic [ref=e603]: "- SM5"
              - link "0546 - Cruze" [ref=e604]:
                - /url: /xe/aa80790d-b510-4fc9-aedc-bb398f24d9b2
                - img [ref=e606]
                - generic [ref=e613]:
                  - text: "0546"
                  - generic [ref=e614]: "- Cruze"
              - link "2020 - Carnival" [ref=e615]:
                - /url: /xe/38325c32-bce2-466e-9623-bce6f78641e4
                - img [ref=e617]
                - generic [ref=e624]:
                  - text: "2020"
                  - generic [ref=e625]: "- Carnival"
              - link "5282 - Sonata" [ref=e626]:
                - /url: /xe/83b6e406-7cf2-453f-b930-51c473684319
                - img [ref=e628]
                - generic [ref=e635]:
                  - text: "5282"
                  - generic [ref=e636]: "- Sonata"
              - link "2474 - Carnival" [ref=e637]:
                - /url: /xe/38e9238e-8cf0-40af-90a4-195adb79cc6b
                - img [ref=e639]
                - generic [ref=e646]:
                  - text: "2474"
                  - generic [ref=e647]: "- Carnival"
          - generic [ref=e648]:
            - generic [ref=e650]:
              - generic [ref=e652]: "0"
              - generic [ref=e653]: Ở bãi đất
            - generic [ref=e655]: Kéo xe vào đây
          - generic [ref=e656]:
            - generic [ref=e657]:
              - generic [ref=e659]: "3"
              - generic [ref=e660]: Đã bán
            - generic [ref=e661]:
              - link "3337 K5" [ref=e662] [cursor=pointer]:
                - /url: /xe/45bcc9f4-1f08-4133-b5a9-da9334939492
                - generic [ref=e663]: "3337"
                - generic [ref=e664]: K5
              - link "9770 Malibu" [ref=e665] [cursor=pointer]:
                - /url: /xe/ee2c6af9-d745-4b55-946d-daaf75452ecc
                - generic [ref=e666]: "9770"
                - generic [ref=e667]: Malibu
              - link "2368 SantaFe" [ref=e668] [cursor=pointer]:
                - /url: /xe/9a062dce-d9fe-45a6-9e2d-c617e5ec47ce
                - generic [ref=e669]: "2368"
                - generic [ref=e670]: SantaFe
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
  65  |         await taskCard.click()
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
> 84  |         await historyBtn.click()
      |                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
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