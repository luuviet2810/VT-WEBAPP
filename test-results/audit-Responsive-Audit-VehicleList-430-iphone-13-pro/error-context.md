# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit.spec.ts >> Responsive Audit >> VehicleList @430
- Location: tests\audit.spec.ts:28:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Đầu vào")').first()
    - locator resolved to <button aria-label="Đầu vào" class="flex flex-1 items-center justify-center rounded-lg text-xs font-medium transition-colors sm:min-h-[44px] sm:gap-1.5 sm:px-3 bg-blue-50 text-blue-600 hover:bg-blue-100">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex items-center justify-between text-xs text-slate-500">…</div> from <div class="card mt-8 px-6 py-5">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <label class="text-xs font-medium text-slate-500">Khoảng giá</label> from <div class="card mt-8 px-6 py-5">…</div> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">…</div> from <div class="card mt-8 px-6 py-5">…</div> subtree intercepts pointer events
  5 × retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex items-center justify-between text-xs text-slate-500">…</div> from <div class="card mt-8 px-6 py-5">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <label class="text-xs font-medium text-slate-500">Khoảng giá</label> from <div class="card mt-8 px-6 py-5">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">…</div> from <div class="card mt-8 px-6 py-5">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">…</div> from <div class="card mt-8 px-6 py-5">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="flex items-center justify-between text-xs text-slate-500">…</div> from <div class="card mt-8 px-6 py-5">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <label class="text-xs font-medium text-slate-500">Khoảng giá</label> from <div class="card mt-8 px-6 py-5">…</div> subtree intercepts pointer events
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
          - heading "Danh sách xe" [level=1] [ref=e84]
          - paragraph [ref=e85]:
            - text: 50 xe trong hệ thống — thêm xe mới tại
            - link "Bảng giá" [ref=e86]:
              - /url: /bang-gia
        - generic [ref=e88]:
          - generic [ref=e89]:
            - img
            - textbox "Tìm biển số hoặc dòng xe..." [ref=e90]
          - generic [ref=e91]:
            - button "Bộ lọc" [ref=e92] [cursor=pointer]:
              - img [ref=e93]
              - text: Bộ lọc
            - generic [ref=e97]:
              - generic [ref=e98]:
                - heading "Bộ lọc" [level=2] [ref=e99]
                - button [ref=e100] [cursor=pointer]:
                  - img [ref=e101]
              - generic [ref=e105]:
                - generic [ref=e106]:
                  - generic [ref=e107]: Sắp xếp
                  - combobox [ref=e108]:
                    - option "Mặc định" [selected]
                    - 'option "Giá: Thấp đến cao"'
                    - 'option "Giá: Cao đến thấp"'
                - generic [ref=e109]:
                  - generic [ref=e110]: Tình trạng
                  - combobox [ref=e111]:
                    - option "Tất cả tình trạng" [selected]
                    - option "Chưa bán"
                    - option "Đã cọc"
                    - option "Đã bán"
                - generic [ref=e112]:
                  - generic [ref=e113]: Vị trí
                  - combobox [ref=e114]:
                    - option "Tất cả vị trí" [selected]
                    - option "Song nưng Bãi lớn"
                    - option "Rửa máy"
                    - option "Đánh bóng Wolpyong"
                    - option "Song nưng gần bãi đất"
                    - option "Trong bãi lớn"
                    - option "Ở bãi đất"
                - generic [ref=e115]:
                  - generic [ref=e116]: Người phụ trách
                  - combobox [ref=e117]:
                    - option "Mọi người" [selected]
                    - option "Anh Thư"
                    - option "LƯU VĂN VIỆT"
                - generic [ref=e118]:
                  - generic [ref=e119]:
                    - generic [ref=e120]: Khoảng giá
                    - button ">20.000.000₩" [ref=e121] [cursor=pointer]
                  - generic [ref=e122]:
                    - generic [ref=e123]: 0₩
                    - generic [ref=e124]: 110.000.000₩
                  - generic [ref=e125]:
                    - slider: "0"
                    - slider: "12"
              - generic [ref=e128]:
                - button "Đặt lại" [ref=e129] [cursor=pointer]
                - button "Áp dụng" [ref=e130] [cursor=pointer]
          - button "Đặt lại" [ref=e131] [cursor=pointer]:
            - img [ref=e132]
            - text: Đặt lại
        - generic [ref=e135]:
          - link "0302 Đang sửa Canival 7.300.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e136]:
            - /url: /xe/cfb7f572-ac9d-4abf-a977-a9c7ef57f43c
            - img [ref=e139]
            - generic [ref=e143]:
              - generic [ref=e144]:
                - generic [ref=e145]: "0302"
                - generic [ref=e146]: Đang sửa
              - generic [ref=e147]: Canival
              - generic [ref=e148]: 7.300.000 đ
              - generic [ref=e149]:
                - button "Nhiệm vụ" [ref=e150] [cursor=pointer]:
                  - img [ref=e151]
                - button "Đầu vào" [ref=e153] [cursor=pointer]:
                  - img [ref=e154]
                - button "Đầu ra" [ref=e157] [cursor=pointer]:
                  - img [ref=e158]
          - link "0546 Mới nhập Cruze 3.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e161]:
            - /url: /xe/aa80790d-b510-4fc9-aedc-bb398f24d9b2
            - img [ref=e164]
            - generic [ref=e168]:
              - generic [ref=e169]:
                - generic [ref=e170]: "0546"
                - generic [ref=e171]: Mới nhập
              - generic [ref=e172]: Cruze
              - generic [ref=e173]: 3.800.000 đ
              - generic [ref=e174]:
                - button "Nhiệm vụ" [ref=e175] [cursor=pointer]:
                  - img [ref=e176]
                - button "Đầu vào" [ref=e178] [cursor=pointer]:
                  - img [ref=e179]
                - button "Đầu ra" [ref=e182] [cursor=pointer]:
                  - img [ref=e183]
          - link "0556 Mới nhập K5 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e186]:
            - /url: /xe/ccde025a-4059-4de2-8dab-325a11b86c0a
            - img [ref=e189]
            - generic [ref=e193]:
              - generic [ref=e194]:
                - generic [ref=e195]: "0556"
                - generic [ref=e196]: Mới nhập
              - generic [ref=e197]: K5
              - generic [ref=e198]: 4.800.000 đ
              - generic [ref=e199]:
                - button "Nhiệm vụ" [ref=e200] [cursor=pointer]:
                  - img [ref=e201]
                - button "Đầu vào" [ref=e203] [cursor=pointer]:
                  - img [ref=e204]
                - button "Đầu ra" [ref=e207] [cursor=pointer]:
                  - img [ref=e208]
          - link "1029 Mới nhập Avante 5.000.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e211]:
            - /url: /xe/baaa3a48-c459-4756-a570-d7b1ff03c937
            - img [ref=e214]
            - generic [ref=e218]:
              - generic [ref=e219]:
                - generic [ref=e220]: "1029"
                - generic [ref=e221]: Mới nhập
              - generic [ref=e222]: Avante
              - generic [ref=e223]: 5.000.000 đ
              - generic [ref=e224]:
                - button "Nhiệm vụ" [ref=e225] [cursor=pointer]:
                  - img [ref=e226]
                - button "Đầu vào" [ref=e228] [cursor=pointer]:
                  - img [ref=e229]
                - button "Đầu ra" [ref=e232] [cursor=pointer]:
                  - img [ref=e233]
          - link "1150 Mới nhập K7 0 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e236]:
            - /url: /xe/0bd60a84-80c6-43bc-b26a-545c0784e8e9
            - img [ref=e239]
            - generic [ref=e243]:
              - generic [ref=e244]:
                - generic [ref=e245]: "1150"
                - generic [ref=e246]: Mới nhập
              - generic [ref=e247]: K7
              - generic [ref=e248]: 0 đ
              - generic [ref=e249]:
                - button "Nhiệm vụ" [ref=e250] [cursor=pointer]:
                  - img [ref=e251]
                - button "Đầu vào" [ref=e253] [cursor=pointer]:
                  - img [ref=e254]
                - button "Đầu ra" [ref=e257] [cursor=pointer]:
                  - img [ref=e258]
          - link "1186 Mới nhập K5 6.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e261]:
            - /url: /xe/85c82b40-7230-4925-96bb-f4203dc2dab3
            - img [ref=e264]
            - generic [ref=e268]:
              - generic [ref=e269]:
                - generic [ref=e270]: "1186"
                - generic [ref=e271]: Mới nhập
              - generic [ref=e272]: K5
              - generic [ref=e273]: 6.800.000 đ
              - generic [ref=e274]:
                - button "Nhiệm vụ" [ref=e275] [cursor=pointer]:
                  - img [ref=e276]
                - button "Đầu vào" [ref=e278] [cursor=pointer]:
                  - img [ref=e279]
                - button "Đầu ra" [ref=e282] [cursor=pointer]:
                  - img [ref=e283]
          - link "1414 Mới nhập Grandeur 5.600.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e286]:
            - /url: /xe/83223b04-1b6a-4418-a6d2-bd23fe5572f0
            - img [ref=e289]
            - generic [ref=e293]:
              - generic [ref=e294]:
                - generic [ref=e295]: "1414"
                - generic [ref=e296]: Mới nhập
              - generic [ref=e297]: Grandeur
              - generic [ref=e298]: 5.600.000 đ
              - generic [ref=e299]:
                - button "Nhiệm vụ" [ref=e300] [cursor=pointer]:
                  - img [ref=e301]
                - button "Đầu vào" [ref=e303] [cursor=pointer]:
                  - img [ref=e304]
                - button "Đầu ra" [ref=e307] [cursor=pointer]:
                  - img [ref=e308]
          - link "SM3 1613 Đầu vào SM3 2.500.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e311]:
            - /url: /xe/4c3b0ea0-6683-447d-940c-2f2eaa0d744f
            - img "SM3" [ref=e313]
            - generic [ref=e314]:
              - generic [ref=e315]:
                - generic [ref=e316]: "1613"
                - generic [ref=e317]: Đầu vào
              - generic [ref=e318]: SM3
              - generic [ref=e319]: 2.500.000 đ
              - generic [ref=e320]:
                - button "Nhiệm vụ" [ref=e321] [cursor=pointer]:
                  - img [ref=e322]
                - button "Đầu vào" [ref=e324] [cursor=pointer]:
                  - img [ref=e325]
                - button "Đầu ra" [ref=e328] [cursor=pointer]:
                  - img [ref=e329]
          - link "1874 Mới nhập K5 Hybrid 6.900.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e332]:
            - /url: /xe/d9fdbc90-6f41-4caa-9599-775855be260c
            - img [ref=e335]
            - generic [ref=e339]:
              - generic [ref=e340]:
                - generic [ref=e341]: "1874"
                - generic [ref=e342]: Mới nhập
              - generic [ref=e343]: K5 Hybrid
              - generic [ref=e344]: 6.900.000 đ
              - generic [ref=e345]:
                - button "Nhiệm vụ" [ref=e346] [cursor=pointer]:
                  - img [ref=e347]
                - button "Đầu vào" [ref=e349] [cursor=pointer]:
                  - img [ref=e350]
                - button "Đầu ra" [ref=e353] [cursor=pointer]:
                  - img [ref=e354]
          - link "1994 Mới nhập Cruze 2.700.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e357]:
            - /url: /xe/7c4d7ac3-0fb6-41a3-a73c-f9ef5696e54f
            - img [ref=e360]
            - generic [ref=e364]:
              - generic [ref=e365]:
                - generic [ref=e366]: "1994"
                - generic [ref=e367]: Mới nhập
              - generic [ref=e368]: Cruze
              - generic [ref=e369]: 2.700.000 đ
              - generic [ref=e370]:
                - button "Nhiệm vụ" [ref=e371] [cursor=pointer]:
                  - img [ref=e372]
                - button "Đầu vào" [ref=e374] [cursor=pointer]:
                  - img [ref=e375]
                - button "Đầu ra" [ref=e378] [cursor=pointer]:
                  - img [ref=e379]
          - link "2020 Mới nhập Carnival 4.500.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e382]:
            - /url: /xe/38325c32-bce2-466e-9623-bce6f78641e4
            - img [ref=e385]
            - generic [ref=e389]:
              - generic [ref=e390]:
                - generic [ref=e391]: "2020"
                - generic [ref=e392]: Mới nhập
              - generic [ref=e393]: Carnival
              - generic [ref=e394]: 4.500.000 đ
              - generic [ref=e395]:
                - button "Nhiệm vụ" [ref=e396] [cursor=pointer]:
                  - img [ref=e397]
                - button "Đầu vào" [ref=e399] [cursor=pointer]:
                  - img [ref=e400]
                - button "Đầu ra" [ref=e403] [cursor=pointer]:
                  - img [ref=e404]
          - link "2368 Mới nhập SantaFe 6.900.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e407]:
            - /url: /xe/9a062dce-d9fe-45a6-9e2d-c617e5ec47ce
            - img [ref=e410]
            - generic [ref=e414]:
              - generic [ref=e415]:
                - generic [ref=e416]: "2368"
                - generic [ref=e417]: Mới nhập
              - generic [ref=e418]: SantaFe
              - generic [ref=e419]: 6.900.000 đ
              - generic [ref=e420]:
                - button "Nhiệm vụ" [ref=e421] [cursor=pointer]:
                  - img [ref=e422]
                - button "Đầu vào" [ref=e424] [cursor=pointer]:
                  - img [ref=e425]
                - button "Đầu ra" [ref=e428] [cursor=pointer]:
                  - img [ref=e429]
          - link "2474 Mới nhập Carnival 4.500.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e432]:
            - /url: /xe/38e9238e-8cf0-40af-90a4-195adb79cc6b
            - img [ref=e435]
            - generic [ref=e439]:
              - generic [ref=e440]:
                - generic [ref=e441]: "2474"
                - generic [ref=e442]: Mới nhập
              - generic [ref=e443]: Carnival
              - generic [ref=e444]: 4.500.000 đ
              - generic [ref=e445]:
                - button "Nhiệm vụ" [ref=e446] [cursor=pointer]:
                  - img [ref=e447]
                - button "Đầu vào" [ref=e449] [cursor=pointer]:
                  - img [ref=e450]
                - button "Đầu ra" [ref=e453] [cursor=pointer]:
                  - img [ref=e454]
          - link "2562 Mới nhập Avante 5.500.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e457]:
            - /url: /xe/b6eaf7b1-0f31-4553-bf82-8d67635a0e5b
            - img [ref=e460]
            - generic [ref=e464]:
              - generic [ref=e465]:
                - generic [ref=e466]: "2562"
                - generic [ref=e467]: Mới nhập
              - generic [ref=e468]: Avante
              - generic [ref=e469]: 5.500.000 đ
              - generic [ref=e470]:
                - button "Nhiệm vụ" [ref=e471] [cursor=pointer]:
                  - img [ref=e472]
                - button "Đầu vào" [ref=e474] [cursor=pointer]:
                  - img [ref=e475]
                - button "Đầu ra" [ref=e478] [cursor=pointer]:
                  - img [ref=e479]
          - link "2929 Mới nhập SM5 2.900.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e482]:
            - /url: /xe/747f182e-453b-4576-b3c5-47ead86083e0
            - img [ref=e485]
            - generic [ref=e489]:
              - generic [ref=e490]:
                - generic [ref=e491]: "2929"
                - generic [ref=e492]: Mới nhập
              - generic [ref=e493]: SM5
              - generic [ref=e494]: 2.900.000 đ
              - generic [ref=e495]:
                - button "Nhiệm vụ" [ref=e496] [cursor=pointer]:
                  - img [ref=e497]
                - button "Đầu vào" [ref=e499] [cursor=pointer]:
                  - img [ref=e500]
                - button "Đầu ra" [ref=e503] [cursor=pointer]:
                  - img [ref=e504]
          - link "2951 Mới nhập Morning 3.700.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e507]:
            - /url: /xe/20e9852b-9088-4044-bdad-6340c92ba11d
            - img [ref=e510]
            - generic [ref=e514]:
              - generic [ref=e515]:
                - generic [ref=e516]: "2951"
                - generic [ref=e517]: Mới nhập
              - generic [ref=e518]: Morning
              - generic [ref=e519]: 3.700.000 đ
              - generic [ref=e520]:
                - button "Nhiệm vụ" [ref=e521] [cursor=pointer]:
                  - img [ref=e522]
                - button "Đầu vào" [ref=e524] [cursor=pointer]:
                  - img [ref=e525]
                - button "Đầu ra" [ref=e528] [cursor=pointer]:
                  - img [ref=e529]
          - link "3169 Mới nhập K5 4.890.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e532]:
            - /url: /xe/e0dcbd3f-12d5-461d-af83-b7802e006d11
            - img [ref=e535]
            - generic [ref=e539]:
              - generic [ref=e540]:
                - generic [ref=e541]: "3169"
                - generic [ref=e542]: Mới nhập
              - generic [ref=e543]: K5
              - generic [ref=e544]: 4.890.000 đ
              - generic [ref=e545]:
                - button "Nhiệm vụ" [ref=e546] [cursor=pointer]:
                  - img [ref=e547]
                - button "Đầu vào" [ref=e549] [cursor=pointer]:
                  - img [ref=e550]
                - button "Đầu ra" [ref=e553] [cursor=pointer]:
                  - img [ref=e554]
          - link "3277 Mới nhập K5 5.300.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e557]:
            - /url: /xe/ab2cfac8-ab8b-4127-98a9-a3f374d5d527
            - img [ref=e560]
            - generic [ref=e564]:
              - generic [ref=e565]:
                - generic [ref=e566]: "3277"
                - generic [ref=e567]: Mới nhập
              - generic [ref=e568]: K5
              - generic [ref=e569]: 5.300.000 đ
              - generic [ref=e570]:
                - button "Nhiệm vụ" [ref=e571] [cursor=pointer]:
                  - img [ref=e572]
                - button "Đầu vào" [ref=e574] [cursor=pointer]:
                  - img [ref=e575]
                - button "Đầu ra" [ref=e578] [cursor=pointer]:
                  - img [ref=e579]
          - link "3337 Đã bán K5 5.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e582]:
            - /url: /xe/45bcc9f4-1f08-4133-b5a9-da9334939492
            - img [ref=e585]
            - generic [ref=e589]:
              - generic [ref=e590]:
                - generic [ref=e591]: "3337"
                - generic [ref=e592]: Đã bán
              - generic [ref=e593]: K5
              - generic [ref=e594]: 5.800.000 đ
              - generic [ref=e595]:
                - button "Nhiệm vụ" [ref=e596] [cursor=pointer]:
                  - img [ref=e597]
                - button "Đầu vào" [ref=e599] [cursor=pointer]:
                  - img [ref=e600]
                - button "Đầu ra" [ref=e603] [cursor=pointer]:
                  - img [ref=e604]
          - link "3424 Mới nhập Cruze 2.900.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e607]:
            - /url: /xe/c31ab049-aca0-41c9-a5a0-8629e6628c97
            - img [ref=e610]
            - generic [ref=e614]:
              - generic [ref=e615]:
                - generic [ref=e616]: "3424"
                - generic [ref=e617]: Mới nhập
              - generic [ref=e618]: Cruze
              - generic [ref=e619]: 2.900.000 đ
              - generic [ref=e620]:
                - button "Nhiệm vụ" [ref=e621] [cursor=pointer]:
                  - img [ref=e622]
                - button "Đầu vào" [ref=e624] [cursor=pointer]:
                  - img [ref=e625]
                - button "Đầu ra" [ref=e628] [cursor=pointer]:
                  - img [ref=e629]
          - link "3656 Mới nhập K7 5.000.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e632]:
            - /url: /xe/a326c4e3-0b10-4947-9e07-515de38ad09e
            - img [ref=e635]
            - generic [ref=e639]:
              - generic [ref=e640]:
                - generic [ref=e641]: "3656"
                - generic [ref=e642]: Mới nhập
              - generic [ref=e643]: K7
              - generic [ref=e644]: 5.000.000 đ
              - generic [ref=e645]:
                - button "Nhiệm vụ" [ref=e646] [cursor=pointer]:
                  - img [ref=e647]
                - button "Đầu vào" [ref=e649] [cursor=pointer]:
                  - img [ref=e650]
                - button "Đầu ra" [ref=e653] [cursor=pointer]:
                  - img [ref=e654]
          - link "4423 Mới nhập K3 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e657]:
            - /url: /xe/c6d83bf3-286d-442d-8439-65ea427eb5d1
            - img [ref=e660]
            - generic [ref=e664]:
              - generic [ref=e665]:
                - generic [ref=e666]: "4423"
                - generic [ref=e667]: Mới nhập
              - generic [ref=e668]: K3
              - generic [ref=e669]: 4.800.000 đ
              - generic [ref=e670]:
                - button "Nhiệm vụ" [ref=e671] [cursor=pointer]:
                  - img [ref=e672]
                - button "Đầu vào" [ref=e674] [cursor=pointer]:
                  - img [ref=e675]
                - button "Đầu ra" [ref=e678] [cursor=pointer]:
                  - img [ref=e679]
          - link "4482 Mới nhập Grandeur 5.500.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e682]:
            - /url: /xe/4adc9717-dbdf-4a11-8d1b-cca4ad08b7e0
            - img [ref=e685]
            - generic [ref=e689]:
              - generic [ref=e690]:
                - generic [ref=e691]: "4482"
                - generic [ref=e692]: Mới nhập
              - generic [ref=e693]: Grandeur
              - generic [ref=e694]: 5.500.000 đ
              - generic [ref=e695]:
                - button "Nhiệm vụ" [ref=e696] [cursor=pointer]:
                  - img [ref=e697]
                - button "Đầu vào" [ref=e699] [cursor=pointer]:
                  - img [ref=e700]
                - button "Đầu ra" [ref=e703] [cursor=pointer]:
                  - img [ref=e704]
          - link "4496 Mới nhập Canival 7.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e707]:
            - /url: /xe/178ca21e-eb52-453f-bb98-946bea1fa1e2
            - img [ref=e710]
            - generic [ref=e714]:
              - generic [ref=e715]:
                - generic [ref=e716]: "4496"
                - generic [ref=e717]: Mới nhập
              - generic [ref=e718]: Canival
              - generic [ref=e719]: 7.800.000 đ
              - generic [ref=e720]:
                - button "Nhiệm vụ" [ref=e721] [cursor=pointer]:
                  - img [ref=e722]
                - button "Đầu vào" [ref=e724] [cursor=pointer]:
                  - img [ref=e725]
                - button "Đầu ra" [ref=e728] [cursor=pointer]:
                  - img [ref=e729]
          - link "4765 Mới nhập Avante 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e732]:
            - /url: /xe/93f2fb69-a9c9-4f8c-8b93-2ed5ec959d05
            - img [ref=e735]
            - generic [ref=e739]:
              - generic [ref=e740]:
                - generic [ref=e741]: "4765"
                - generic [ref=e742]: Mới nhập
              - generic [ref=e743]: Avante
              - generic [ref=e744]: 4.800.000 đ
              - generic [ref=e745]:
                - button "Nhiệm vụ" [ref=e746] [cursor=pointer]:
                  - img [ref=e747]
                - button "Đầu vào" [ref=e749] [cursor=pointer]:
                  - img [ref=e750]
                - button "Đầu ra" [ref=e753] [cursor=pointer]:
                  - img [ref=e754]
          - link "5115 Mới nhập Grandeur 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e757]:
            - /url: /xe/8113d09b-d136-4421-ba7b-26e27759995e
            - img [ref=e760]
            - generic [ref=e764]:
              - generic [ref=e765]:
                - generic [ref=e766]: "5115"
                - generic [ref=e767]: Mới nhập
              - generic [ref=e768]: Grandeur
              - generic [ref=e769]: 4.800.000 đ
              - generic [ref=e770]:
                - button "Nhiệm vụ" [ref=e771] [cursor=pointer]:
                  - img [ref=e772]
                - button "Đầu vào" [ref=e774] [cursor=pointer]:
                  - img [ref=e775]
                - button "Đầu ra" [ref=e778] [cursor=pointer]:
                  - img [ref=e779]
          - link "5282 Mới nhập Sonata 4.600.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e782]:
            - /url: /xe/83b6e406-7cf2-453f-b930-51c473684319
            - img [ref=e785]
            - generic [ref=e789]:
              - generic [ref=e790]:
                - generic [ref=e791]: "5282"
                - generic [ref=e792]: Mới nhập
              - generic [ref=e793]: Sonata
              - generic [ref=e794]: 4.600.000 đ
              - generic [ref=e795]:
                - button "Nhiệm vụ" [ref=e796] [cursor=pointer]:
                  - img [ref=e797]
                - button "Đầu vào" [ref=e799] [cursor=pointer]:
                  - img [ref=e800]
                - button "Đầu ra" [ref=e803] [cursor=pointer]:
                  - img [ref=e804]
          - link "6059 Mới nhập Canival 3.900.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e807]:
            - /url: /xe/14f77dd7-0eff-49c5-b0d6-8f50b999b99d
            - img [ref=e810]
            - generic [ref=e814]:
              - generic [ref=e815]:
                - generic [ref=e816]: "6059"
                - generic [ref=e817]: Mới nhập
              - generic [ref=e818]: Canival
              - generic [ref=e819]: 3.900.000 đ
              - generic [ref=e820]:
                - button "Nhiệm vụ" [ref=e821] [cursor=pointer]:
                  - img [ref=e822]
                - button "Đầu vào" [ref=e824] [cursor=pointer]:
                  - img [ref=e825]
                - button "Đầu ra" [ref=e828] [cursor=pointer]:
                  - img [ref=e829]
          - link "6173 Mới nhập SM5 2.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e832]:
            - /url: /xe/0efe85fa-3db1-40e0-b3dd-10ffec951204
            - img [ref=e835]
            - generic [ref=e839]:
              - generic [ref=e840]:
                - generic [ref=e841]: "6173"
                - generic [ref=e842]: Mới nhập
              - generic [ref=e843]: SM5
              - generic [ref=e844]: 2.800.000 đ
              - generic [ref=e845]:
                - button "Nhiệm vụ" [ref=e846] [cursor=pointer]:
                  - img [ref=e847]
                - button "Đầu vào" [ref=e849] [cursor=pointer]:
                  - img [ref=e850]
                - button "Đầu ra" [ref=e853] [cursor=pointer]:
                  - img [ref=e854]
          - link "6362 Mới nhập Grandeur 5.600.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e857]:
            - /url: /xe/b090be0e-f2c8-41f7-9436-6985fb641c47
            - img [ref=e860]
            - generic [ref=e864]:
              - generic [ref=e865]:
                - generic [ref=e866]: "6362"
                - generic [ref=e867]: Mới nhập
              - generic [ref=e868]: Grandeur
              - generic [ref=e869]: 5.600.000 đ
              - generic [ref=e870]:
                - button "Nhiệm vụ" [ref=e871] [cursor=pointer]:
                  - img [ref=e872]
                - button "Đầu vào" [ref=e874] [cursor=pointer]:
                  - img [ref=e875]
                - button "Đầu ra" [ref=e878] [cursor=pointer]:
                  - img [ref=e879]
          - link "6383 Mới nhập Tucson 11.900.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e882]:
            - /url: /xe/e20e0896-81ae-4151-a14e-b2c26ede3d61
            - img [ref=e885]
            - generic [ref=e889]:
              - generic [ref=e890]:
                - generic [ref=e891]: "6383"
                - generic [ref=e892]: Mới nhập
              - generic [ref=e893]: Tucson
              - generic [ref=e894]: 11.900.000 đ
              - generic [ref=e895]:
                - button "Nhiệm vụ" [ref=e896] [cursor=pointer]:
                  - img [ref=e897]
                - button "Đầu vào" [ref=e899] [cursor=pointer]:
                  - img [ref=e900]
                - button "Đầu ra" [ref=e903] [cursor=pointer]:
                  - img [ref=e904]
          - link "6423 Mới nhập SantaFe 8.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e907]:
            - /url: /xe/de3b3772-f3b2-48ce-b3d5-546570e58864
            - img [ref=e910]
            - generic [ref=e914]:
              - generic [ref=e915]:
                - generic [ref=e916]: "6423"
                - generic [ref=e917]: Mới nhập
              - generic [ref=e918]: SantaFe
              - generic [ref=e919]: 8.800.000 đ
              - generic [ref=e920]:
                - button "Nhiệm vụ" [ref=e921] [cursor=pointer]:
                  - img [ref=e922]
                - button "Đầu vào" [ref=e924] [cursor=pointer]:
                  - img [ref=e925]
                - button "Đầu ra" [ref=e928] [cursor=pointer]:
                  - img [ref=e929]
          - link "7194 Mới nhập Cruze 2.700.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e932]:
            - /url: /xe/e66e3814-56a5-4d01-bb1b-a02418a67ead
            - img [ref=e935]
            - generic [ref=e939]:
              - generic [ref=e940]:
                - generic [ref=e941]: "7194"
                - generic [ref=e942]: Mới nhập
              - generic [ref=e943]: Cruze
              - generic [ref=e944]: 2.700.000 đ
              - generic [ref=e945]:
                - button "Nhiệm vụ" [ref=e946] [cursor=pointer]:
                  - img [ref=e947]
                - button "Đầu vào" [ref=e949] [cursor=pointer]:
                  - img [ref=e950]
                - button "Đầu ra" [ref=e953] [cursor=pointer]:
                  - img [ref=e954]
          - link "7265 Mới nhập SM5 2.900.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e957]:
            - /url: /xe/fe07e3ae-1656-4b45-9feb-91c7ad7329ff
            - img [ref=e960]
            - generic [ref=e964]:
              - generic [ref=e965]:
                - generic [ref=e966]: "7265"
                - generic [ref=e967]: Mới nhập
              - generic [ref=e968]: SM5
              - generic [ref=e969]: 2.900.000 đ
              - generic [ref=e970]:
                - button "Nhiệm vụ" [ref=e971] [cursor=pointer]:
                  - img [ref=e972]
                - button "Đầu vào" [ref=e974] [cursor=pointer]:
                  - img [ref=e975]
                - button "Đầu ra" [ref=e978] [cursor=pointer]:
                  - img [ref=e979]
          - link "7329 Mới nhập SM3 2.500.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e982]:
            - /url: /xe/aee1be06-1e2a-4329-b153-c864ea28f33c
            - img [ref=e985]
            - generic [ref=e989]:
              - generic [ref=e990]:
                - generic [ref=e991]: "7329"
                - generic [ref=e992]: Mới nhập
              - generic [ref=e993]: SM3
              - generic [ref=e994]: 2.500.000 đ
              - generic [ref=e995]:
                - button "Nhiệm vụ" [ref=e996] [cursor=pointer]:
                  - img [ref=e997]
                - button "Đầu vào" [ref=e999] [cursor=pointer]:
                  - img [ref=e1000]
                - button "Đầu ra" [ref=e1003] [cursor=pointer]:
                  - img [ref=e1004]
          - link "7944 Mới nhập Avante 5.300.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1007]:
            - /url: /xe/7b705e0d-5d0d-4946-8c25-a370cc92b4c0
            - img [ref=e1010]
            - generic [ref=e1014]:
              - generic [ref=e1015]:
                - generic [ref=e1016]: "7944"
                - generic [ref=e1017]: Mới nhập
              - generic [ref=e1018]: Avante
              - generic [ref=e1019]: 5.300.000 đ
              - generic [ref=e1020]:
                - button "Nhiệm vụ" [ref=e1021] [cursor=pointer]:
                  - img [ref=e1022]
                - button "Đầu vào" [ref=e1024] [cursor=pointer]:
                  - img [ref=e1025]
                - button "Đầu ra" [ref=e1028] [cursor=pointer]:
                  - img [ref=e1029]
          - link "8731 Mới nhập K7 4.200.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1032]:
            - /url: /xe/c30a8f9f-c451-431c-bdcd-5a2f37c3b6d5
            - img [ref=e1035]
            - generic [ref=e1039]:
              - generic [ref=e1040]:
                - generic [ref=e1041]: "8731"
                - generic [ref=e1042]: Mới nhập
              - generic [ref=e1043]: K7
              - generic [ref=e1044]: 4.200.000 đ
              - generic [ref=e1045]:
                - button "Nhiệm vụ" [ref=e1046] [cursor=pointer]:
                  - img [ref=e1047]
                - button "Đầu vào" [ref=e1049] [cursor=pointer]:
                  - img [ref=e1050]
                - button "Đầu ra" [ref=e1053] [cursor=pointer]:
                  - img [ref=e1054]
          - link "8910 Mới nhập Avante 5.000.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1057]:
            - /url: /xe/619e657e-c3e8-4d41-beab-e23ce933715e
            - img [ref=e1060]
            - generic [ref=e1064]:
              - generic [ref=e1065]:
                - generic [ref=e1066]: "8910"
                - generic [ref=e1067]: Mới nhập
              - generic [ref=e1068]: Avante
              - generic [ref=e1069]: 5.000.000 đ
              - generic [ref=e1070]:
                - button "Nhiệm vụ" [ref=e1071] [cursor=pointer]:
                  - img [ref=e1072]
                - button "Đầu vào" [ref=e1074] [cursor=pointer]:
                  - img [ref=e1075]
                - button "Đầu ra" [ref=e1078] [cursor=pointer]:
                  - img [ref=e1079]
          - link "8925 Mới nhập Grandeur 5.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1082]:
            - /url: /xe/c353ddb9-f83e-4014-95fa-f13dee6c17d6
            - img [ref=e1085]
            - generic [ref=e1089]:
              - generic [ref=e1090]:
                - generic [ref=e1091]: "8925"
                - generic [ref=e1092]: Mới nhập
              - generic [ref=e1093]: Grandeur
              - generic [ref=e1094]: 5.800.000 đ
              - generic [ref=e1095]:
                - button "Nhiệm vụ" [ref=e1096] [cursor=pointer]:
                  - img [ref=e1097]
                - button "Đầu vào" [ref=e1099] [cursor=pointer]:
                  - img [ref=e1100]
                - button "Đầu ra" [ref=e1103] [cursor=pointer]:
                  - img [ref=e1104]
          - link "9028 Mới nhập Malibu 3.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1107]:
            - /url: /xe/a024fc17-e346-4ce0-9d67-42a51b71cae3
            - img [ref=e1110]
            - generic [ref=e1114]:
              - generic [ref=e1115]:
                - generic [ref=e1116]: "9028"
                - generic [ref=e1117]: Mới nhập
              - generic [ref=e1118]: Malibu
              - generic [ref=e1119]: 3.800.000 đ
              - generic [ref=e1120]:
                - button "Nhiệm vụ" [ref=e1121] [cursor=pointer]:
                  - img [ref=e1122]
                - button "Đầu vào" [ref=e1124] [cursor=pointer]:
                  - img [ref=e1125]
                - button "Đầu ra" [ref=e1128] [cursor=pointer]:
                  - img [ref=e1129]
          - link "9125 Đang sửa SM5 2.200.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1132]:
            - /url: /xe/9d5e3785-a6ba-43f6-8184-7276a02c22b5
            - img [ref=e1135]
            - generic [ref=e1139]:
              - generic [ref=e1140]:
                - generic [ref=e1141]: "9125"
                - generic [ref=e1142]: Đang sửa
              - generic [ref=e1143]: SM5
              - generic [ref=e1144]: 2.200.000 đ
              - generic [ref=e1145]:
                - button "Nhiệm vụ" [ref=e1146] [cursor=pointer]:
                  - img [ref=e1147]
                - button "Đầu vào" [ref=e1149] [cursor=pointer]:
                  - img [ref=e1150]
                - button "Đầu ra" [ref=e1153] [cursor=pointer]:
                  - img [ref=e1154]
          - link "9184 Mới nhập K5 Hybrid 4.900.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1157]:
            - /url: /xe/ce91ef6c-2573-46a6-b5b3-84dca08c5856
            - img [ref=e1160]
            - generic [ref=e1164]:
              - generic [ref=e1165]:
                - generic [ref=e1166]: "9184"
                - generic [ref=e1167]: Mới nhập
              - generic [ref=e1168]: K5 Hybrid
              - generic [ref=e1169]: 4.900.000 đ
              - generic [ref=e1170]:
                - button "Nhiệm vụ" [ref=e1171] [cursor=pointer]:
                  - img [ref=e1172]
                - button "Đầu vào" [ref=e1174] [cursor=pointer]:
                  - img [ref=e1175]
                - button "Đầu ra" [ref=e1178] [cursor=pointer]:
                  - img [ref=e1179]
          - link "9196 Mới nhập Canival 4.300.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1182]:
            - /url: /xe/240c3b14-9f56-4391-baee-6811484715a7
            - img [ref=e1185]
            - generic [ref=e1189]:
              - generic [ref=e1190]:
                - generic [ref=e1191]: "9196"
                - generic [ref=e1192]: Mới nhập
              - generic [ref=e1193]: Canival
              - generic [ref=e1194]: 4.300.000 đ
              - generic [ref=e1195]:
                - button "Nhiệm vụ" [ref=e1196] [cursor=pointer]:
                  - img [ref=e1197]
                - button "Đầu vào" [ref=e1199] [cursor=pointer]:
                  - img [ref=e1200]
                - button "Đầu ra" [ref=e1203] [cursor=pointer]:
                  - img [ref=e1204]
          - link "9210 Mới nhập Cayenne 105.000.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1207]:
            - /url: /xe/0e9b028e-685e-4f2f-be9a-e64617e4c46d
            - img [ref=e1210]
            - generic [ref=e1214]:
              - generic [ref=e1215]:
                - generic [ref=e1216]: "9210"
                - generic [ref=e1217]: Mới nhập
              - generic [ref=e1218]: Cayenne
              - generic [ref=e1219]: 105.000.000 đ
              - generic [ref=e1220]:
                - button "Nhiệm vụ" [ref=e1221] [cursor=pointer]:
                  - img [ref=e1222]
                - button "Đầu vào" [ref=e1224] [cursor=pointer]:
                  - img [ref=e1225]
                - button "Đầu ra" [ref=e1228] [cursor=pointer]:
                  - img [ref=e1229]
          - link "9269 Mới nhập K3 5.000.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1232]:
            - /url: /xe/71c8af1b-2370-4055-9465-a0e0559fdb42
            - img [ref=e1235]
            - generic [ref=e1239]:
              - generic [ref=e1240]:
                - generic [ref=e1241]: "9269"
                - generic [ref=e1242]: Mới nhập
              - generic [ref=e1243]: K3
              - generic [ref=e1244]: 5.000.000 đ
              - generic [ref=e1245]:
                - button "Nhiệm vụ" [ref=e1246] [cursor=pointer]:
                  - img [ref=e1247]
                - button "Đầu vào" [ref=e1249] [cursor=pointer]:
                  - img [ref=e1250]
                - button "Đầu ra" [ref=e1253] [cursor=pointer]:
                  - img [ref=e1254]
          - link "9323 Mới nhập Morning 3.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1257]:
            - /url: /xe/b0ff1dd5-232a-4a7b-84d5-8155c847bc7a
            - img [ref=e1260]
            - generic [ref=e1264]:
              - generic [ref=e1265]:
                - generic [ref=e1266]: "9323"
                - generic [ref=e1267]: Mới nhập
              - generic [ref=e1268]: Morning
              - generic [ref=e1269]: 3.800.000 đ
              - generic [ref=e1270]:
                - button "Nhiệm vụ" [ref=e1271] [cursor=pointer]:
                  - img [ref=e1272]
                - button "Đầu vào" [ref=e1274] [cursor=pointer]:
                  - img [ref=e1275]
                - button "Đầu ra" [ref=e1278] [cursor=pointer]:
                  - img [ref=e1279]
          - link "9530 Mới nhập Sonata 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1282]:
            - /url: /xe/7acc9e71-215f-46e8-9f7a-40a5c9ac4ec3
            - img [ref=e1285]
            - generic [ref=e1289]:
              - generic [ref=e1290]:
                - generic [ref=e1291]: "9530"
                - generic [ref=e1292]: Mới nhập
              - generic [ref=e1293]: Sonata
              - generic [ref=e1294]: 4.800.000 đ
              - generic [ref=e1295]:
                - button "Nhiệm vụ" [ref=e1296] [cursor=pointer]:
                  - img [ref=e1297]
                - button "Đầu vào" [ref=e1299] [cursor=pointer]:
                  - img [ref=e1300]
                - button "Đầu ra" [ref=e1303] [cursor=pointer]:
                  - img [ref=e1304]
          - link "9770 Đã bán Malibu 3.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1307]:
            - /url: /xe/ee2c6af9-d745-4b55-946d-daaf75452ecc
            - img [ref=e1310]
            - generic [ref=e1314]:
              - generic [ref=e1315]:
                - generic [ref=e1316]: "9770"
                - generic [ref=e1317]: Đã bán
              - generic [ref=e1318]: Malibu
              - generic [ref=e1319]: 3.800.000 đ
              - generic [ref=e1320]:
                - button "Nhiệm vụ" [ref=e1321] [cursor=pointer]:
                  - img [ref=e1322]
                - button "Đầu vào" [ref=e1324] [cursor=pointer]:
                  - img [ref=e1325]
                - button "Đầu ra" [ref=e1328] [cursor=pointer]:
                  - img [ref=e1329]
          - link "9858 Mới nhập Canival 6.300.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1332]:
            - /url: /xe/cb976047-93ad-4259-a9c1-4737dfc9a143
            - img [ref=e1335]
            - generic [ref=e1339]:
              - generic [ref=e1340]:
                - generic [ref=e1341]: "9858"
                - generic [ref=e1342]: Mới nhập
              - generic [ref=e1343]: Canival
              - generic [ref=e1344]: 6.300.000 đ
              - generic [ref=e1345]:
                - button "Nhiệm vụ" [ref=e1346] [cursor=pointer]:
                  - img [ref=e1347]
                - button "Đầu vào" [ref=e1349] [cursor=pointer]:
                  - img [ref=e1350]
                - button "Đầu ra" [ref=e1353] [cursor=pointer]:
                  - img [ref=e1354]
          - link "9994 Mới nhập Carnival 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra" [ref=e1357]:
            - /url: /xe/bb465cf2-55dc-4cbe-821d-bd68dc3e94e9
            - img [ref=e1360]
            - generic [ref=e1364]:
              - generic [ref=e1365]:
                - generic [ref=e1366]: "9994"
                - generic [ref=e1367]: Mới nhập
              - generic [ref=e1368]: Carnival
              - generic [ref=e1369]: 4.800.000 đ
              - generic [ref=e1370]:
                - button "Nhiệm vụ" [ref=e1371] [cursor=pointer]:
                  - img [ref=e1372]
                - button "Đầu vào" [ref=e1374] [cursor=pointer]:
                  - img [ref=e1375]
                - button "Đầu ra" [ref=e1378] [cursor=pointer]:
                  - img [ref=e1379]
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
> 46  |         await previewBtn.click()
      |                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
```