# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pages.spec.ts >> Authenticated - Vehicle List interactions >> can open filter popover
- Location: tests\pages.spec.ts:64:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=Tình trạng').or(locator('text=Vị trí')).first()
Expected: visible
Received: hidden
Timeout:  10000ms

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=Tình trạng').or(locator('text=Vị trí')).first()
    22 × locator resolved to <label class="mb-1.5 block text-xs font-medium text-slate-500">Tình trạng</label>
       - unexpected value "hidden"

```

```yaml
- text: View Mode
- button "Admin":
  - img
  - text: Admin
- button "Staff":
  - img
  - text: Staff
- img "VT AUTO"
- button "Đóng menu":
  - img
- navigation:
  - link "Tổng quan":
    - /url: /
    - img
    - text: Tổng quan
  - link "Danh sách xe":
    - /url: /xe
    - img
    - text: Danh sách xe
  - link "Bảng giá":
    - /url: /bang-gia
    - img
    - text: Bảng giá
  - link "Việc của tôi":
    - /url: /viec-cua-toi
    - img
    - text: Việc của tôi
  - link "Chấm công":
    - /url: /cham-cong
    - img
    - text: Chấm công
- navigation:
  - link "Hồ sơ":
    - /url: /ho-so
    - img
    - text: Hồ sơ
- img
- text: Thông báo LV LƯU VĂN VIỆT Nhân viên
- button "Đăng xuất":
  - img
- main:
  - button "Mở menu":
    - img
  - heading "Danh sách xe" [level=1]
  - paragraph:
    - text: 50 xe trong hệ thống — thêm xe mới tại
    - link "Bảng giá":
      - /url: /bang-gia
  - img
  - textbox "Tìm biển số hoặc dòng xe..."
  - button "Bộ lọc":
    - img
    - text: Bộ lọc
  - heading "Bộ lọc" [level=2]
  - button:
    - img
  - text: Sắp xếp
  - combobox:
    - option "Mặc định" [selected]
    - 'option "Giá: Thấp đến cao"'
    - 'option "Giá: Cao đến thấp"'
  - text: Tình trạng
  - combobox:
    - option "Tất cả tình trạng" [selected]
    - option "Chưa bán"
    - option "Đã cọc"
    - option "Đã bán"
  - text: Vị trí
  - combobox:
    - option "Tất cả vị trí" [selected]
    - option "Song nưng Bãi lớn"
    - option "Rửa máy"
    - option "Đánh bóng Wolpyong"
    - option "Song nưng gần bãi đất"
    - option "Trong bãi lớn"
    - option "Ở bãi đất"
  - text: Người phụ trách
  - combobox:
    - option "Mọi người" [selected]
    - option "Anh Thư"
    - option "LƯU VĂN VIỆT"
  - text: Khoảng giá
  - button ">20.000.000₩"
  - text: 0₩ 110.000.000₩
  - slider: "0"
  - slider: "12"
  - button "Đặt lại"
  - button "Áp dụng"
  - button "Đặt lại":
    - img
    - text: Đặt lại
  - link "0302 Đang sửa Canival 7.300.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/cfb7f572-ac9d-4abf-a977-a9c7ef57f43c
    - img
    - text: 0302 Đang sửa Canival 7.300.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "0546 Mới nhập Cruze 3.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/aa80790d-b510-4fc9-aedc-bb398f24d9b2
    - img
    - text: 0546 Mới nhập Cruze 3.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "0556 Mới nhập K5 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/ccde025a-4059-4de2-8dab-325a11b86c0a
    - img
    - text: 0556 Mới nhập K5 4.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "1029 Mới nhập Avante 5.000.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/baaa3a48-c459-4756-a570-d7b1ff03c937
    - img
    - text: 1029 Mới nhập Avante 5.000.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "1150 Mới nhập K7 0 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/0bd60a84-80c6-43bc-b26a-545c0784e8e9
    - img
    - text: 1150 Mới nhập K7 0 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "1186 Mới nhập K5 6.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/85c82b40-7230-4925-96bb-f4203dc2dab3
    - img
    - text: 1186 Mới nhập K5 6.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "1414 Mới nhập Grandeur 5.600.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/83223b04-1b6a-4418-a6d2-bd23fe5572f0
    - img
    - text: 1414 Mới nhập Grandeur 5.600.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "SM3 1613 Đầu vào SM3 2.500.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/4c3b0ea0-6683-447d-940c-2f2eaa0d744f
    - img "SM3"
    - text: 1613 Đầu vào SM3 2.500.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "1874 Mới nhập K5 Hybrid 6.900.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/d9fdbc90-6f41-4caa-9599-775855be260c
    - img
    - text: 1874 Mới nhập K5 Hybrid 6.900.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "1994 Mới nhập Cruze 2.700.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/7c4d7ac3-0fb6-41a3-a73c-f9ef5696e54f
    - img
    - text: 1994 Mới nhập Cruze 2.700.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "2020 Mới nhập Carnival 4.500.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/38325c32-bce2-466e-9623-bce6f78641e4
    - img
    - text: 2020 Mới nhập Carnival 4.500.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "2368 Mới nhập SantaFe 6.900.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/9a062dce-d9fe-45a6-9e2d-c617e5ec47ce
    - img
    - text: 2368 Mới nhập SantaFe 6.900.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "2474 Mới nhập Carnival 4.500.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/38e9238e-8cf0-40af-90a4-195adb79cc6b
    - img
    - text: 2474 Mới nhập Carnival 4.500.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "2562 Mới nhập Avante 5.500.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/b6eaf7b1-0f31-4553-bf82-8d67635a0e5b
    - img
    - text: 2562 Mới nhập Avante 5.500.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "2929 Mới nhập SM5 2.900.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/747f182e-453b-4576-b3c5-47ead86083e0
    - img
    - text: 2929 Mới nhập SM5 2.900.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "2951 Mới nhập Morning 3.700.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/20e9852b-9088-4044-bdad-6340c92ba11d
    - img
    - text: 2951 Mới nhập Morning 3.700.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "3169 Mới nhập K5 4.890.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/e0dcbd3f-12d5-461d-af83-b7802e006d11
    - img
    - text: 3169 Mới nhập K5 4.890.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "3277 Mới nhập K5 5.300.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/ab2cfac8-ab8b-4127-98a9-a3f374d5d527
    - img
    - text: 3277 Mới nhập K5 5.300.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "3337 Đã bán K5 5.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/45bcc9f4-1f08-4133-b5a9-da9334939492
    - img
    - text: 3337 Đã bán K5 5.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "3424 Mới nhập Cruze 2.900.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/c31ab049-aca0-41c9-a5a0-8629e6628c97
    - img
    - text: 3424 Mới nhập Cruze 2.900.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "3656 Mới nhập K7 5.000.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/a326c4e3-0b10-4947-9e07-515de38ad09e
    - img
    - text: 3656 Mới nhập K7 5.000.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "4423 Mới nhập K3 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/c6d83bf3-286d-442d-8439-65ea427eb5d1
    - img
    - text: 4423 Mới nhập K3 4.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "4482 Mới nhập Grandeur 5.500.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/4adc9717-dbdf-4a11-8d1b-cca4ad08b7e0
    - img
    - text: 4482 Mới nhập Grandeur 5.500.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "4496 Mới nhập Canival 7.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/178ca21e-eb52-453f-bb98-946bea1fa1e2
    - img
    - text: 4496 Mới nhập Canival 7.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "4765 Mới nhập Avante 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/93f2fb69-a9c9-4f8c-8b93-2ed5ec959d05
    - img
    - text: 4765 Mới nhập Avante 4.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "5115 Mới nhập Grandeur 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/8113d09b-d136-4421-ba7b-26e27759995e
    - img
    - text: 5115 Mới nhập Grandeur 4.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "5282 Mới nhập Sonata 4.600.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/83b6e406-7cf2-453f-b930-51c473684319
    - img
    - text: 5282 Mới nhập Sonata 4.600.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "6059 Mới nhập Canival 3.900.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/14f77dd7-0eff-49c5-b0d6-8f50b999b99d
    - img
    - text: 6059 Mới nhập Canival 3.900.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "6173 Mới nhập SM5 2.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/0efe85fa-3db1-40e0-b3dd-10ffec951204
    - img
    - text: 6173 Mới nhập SM5 2.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "6362 Mới nhập Grandeur 5.600.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/b090be0e-f2c8-41f7-9436-6985fb641c47
    - img
    - text: 6362 Mới nhập Grandeur 5.600.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "6383 Mới nhập Tucson 11.900.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/e20e0896-81ae-4151-a14e-b2c26ede3d61
    - img
    - text: 6383 Mới nhập Tucson 11.900.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "6423 Mới nhập SantaFe 8.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/de3b3772-f3b2-48ce-b3d5-546570e58864
    - img
    - text: 6423 Mới nhập SantaFe 8.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "7194 Mới nhập Cruze 2.700.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/e66e3814-56a5-4d01-bb1b-a02418a67ead
    - img
    - text: 7194 Mới nhập Cruze 2.700.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "7265 Mới nhập SM5 2.900.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/fe07e3ae-1656-4b45-9feb-91c7ad7329ff
    - img
    - text: 7265 Mới nhập SM5 2.900.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "7329 Mới nhập SM3 2.500.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/aee1be06-1e2a-4329-b153-c864ea28f33c
    - img
    - text: 7329 Mới nhập SM3 2.500.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "7944 Mới nhập Avante 5.300.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/7b705e0d-5d0d-4946-8c25-a370cc92b4c0
    - img
    - text: 7944 Mới nhập Avante 5.300.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "8731 Mới nhập K7 4.200.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/c30a8f9f-c451-431c-bdcd-5a2f37c3b6d5
    - img
    - text: 8731 Mới nhập K7 4.200.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "8910 Mới nhập Avante 5.000.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/619e657e-c3e8-4d41-beab-e23ce933715e
    - img
    - text: 8910 Mới nhập Avante 5.000.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "8925 Mới nhập Grandeur 5.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/c353ddb9-f83e-4014-95fa-f13dee6c17d6
    - img
    - text: 8925 Mới nhập Grandeur 5.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9028 Mới nhập Malibu 3.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/a024fc17-e346-4ce0-9d67-42a51b71cae3
    - img
    - text: 9028 Mới nhập Malibu 3.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9125 Đang sửa SM5 2.200.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/9d5e3785-a6ba-43f6-8184-7276a02c22b5
    - img
    - text: 9125 Đang sửa SM5 2.200.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9184 Mới nhập K5 Hybrid 4.900.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/ce91ef6c-2573-46a6-b5b3-84dca08c5856
    - img
    - text: 9184 Mới nhập K5 Hybrid 4.900.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9196 Mới nhập Canival 4.300.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/240c3b14-9f56-4391-baee-6811484715a7
    - img
    - text: 9196 Mới nhập Canival 4.300.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9210 Mới nhập Cayenne 105.000.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/0e9b028e-685e-4f2f-be9a-e64617e4c46d
    - img
    - text: 9210 Mới nhập Cayenne 105.000.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9269 Mới nhập K3 5.000.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/71c8af1b-2370-4055-9465-a0e0559fdb42
    - img
    - text: 9269 Mới nhập K3 5.000.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9323 Mới nhập Morning 3.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/b0ff1dd5-232a-4a7b-84d5-8155c847bc7a
    - img
    - text: 9323 Mới nhập Morning 3.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9530 Mới nhập Sonata 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/7acc9e71-215f-46e8-9f7a-40a5c9ac4ec3
    - img
    - text: 9530 Mới nhập Sonata 4.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9770 Đã bán Malibu 3.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/ee2c6af9-d745-4b55-946d-daaf75452ecc
    - img
    - text: 9770 Đã bán Malibu 3.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9858 Mới nhập Canival 6.300.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/cb976047-93ad-4259-a9c1-4737dfc9a143
    - img
    - text: 9858 Mới nhập Canival 6.300.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
  - link "9994 Mới nhập Carnival 4.800.000 đ Nhiệm vụ Đầu vào Đầu ra":
    - /url: /xe/bb465cf2-55dc-4cbe-821d-bd68dc3e94e9
    - img
    - text: 9994 Mới nhập Carnival 4.800.000 đ
    - button "Nhiệm vụ":
      - img
    - button "Đầu vào":
      - img
    - button "Đầu ra":
      - img
```

# Test source

```ts
  1  | import { test } from './fixtures/index.ts'
  2  | import { expect } from '@playwright/test'
  3  | import { hasCredentials } from './auth/credentials.ts'
  4  | 
  5  | const authDesc = hasCredentials ? test.describe : test.describe.skip
  6  | 
  7  | authDesc('Authenticated - Page Objects', () => {
  8  |   test.skip(!hasCredentials, 'Set TEST_USER_EMAIL / TEST_USER_PASSWORD to run')
  9  | 
  10 |   test('Dashboard loads', async ({ dashboardPage }) => {
  11 |     await dashboardPage.goto()
  12 |     await expect(dashboardPage.title).toBeVisible()
  13 |   })
  14 | 
  15 |   test('Vehicle List loads', async ({ vehicleListPage }) => {
  16 |     await vehicleListPage.goto()
  17 |     await expect(vehicleListPage.title).toBeVisible()
  18 |   })
  19 | 
  20 |   test('Price List loads', async ({ priceListPage }) => {
  21 |     await priceListPage.goto()
  22 |     await expect(priceListPage.title).toBeVisible()
  23 |   })
  24 | 
  25 |   test('Tasks loads', async ({ tasksPage }) => {
  26 |     await tasksPage.goto()
  27 |     await expect(tasksPage.title).toBeVisible()
  28 |   })
  29 | 
  30 |   test('Positions loads', async ({ positionsPage }) => {
  31 |     await positionsPage.goto()
  32 |     await expect(positionsPage.title).toBeVisible()
  33 |   })
  34 | 
  35 |   test('Attendance loads', async ({ attendancePage }) => {
  36 |     await attendancePage.goto()
  37 |     await expect(attendancePage.title).toBeVisible()
  38 |   })
  39 | 
  40 |   test('Employees loads', async ({ employeesPage }) => {
  41 |     await employeesPage.goto()
  42 |     await expect(employeesPage.title).toBeVisible()
  43 |   })
  44 | 
  45 |   test('Statistics loads', async ({ statisticsPage }) => {
  46 |     await statisticsPage.goto()
  47 |     await expect(statisticsPage.title).toBeVisible()
  48 |   })
  49 | 
  50 |   test('Settings loads', async ({ settingsPage }) => {
  51 |     await settingsPage.goto()
  52 |     await expect(settingsPage.title).toBeVisible()
  53 |   })
  54 | })
  55 | 
  56 | authDesc('Authenticated - Vehicle List interactions', () => {
  57 |   test('search filters vehicles', async ({ vehicleListPage, page }) => {
  58 |     await vehicleListPage.goto()
  59 |     await vehicleListPage.search('test')
  60 |     await vehicleListPage.openFilter()
  61 |     await page.keyboard.press('Escape')
  62 |   })
  63 | 
  64 |   test('can open filter popover', async ({ vehicleListPage, page }) => {
  65 |     await vehicleListPage.goto()
  66 |     await vehicleListPage.openFilter()
  67 |     const popover = page.locator('text=Tình trạng').or(page.locator('text=Vị trí'))
> 68 |     await expect(popover.first()).toBeVisible()
     |                                   ^ Error: expect(locator).toBeVisible() failed
  69 |   })
  70 | })
  71 | 
```