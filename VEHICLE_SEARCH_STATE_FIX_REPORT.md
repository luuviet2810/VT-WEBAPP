# BÁO CÁO KHẮC PHỤC TRIỆT ĐỂ TRẠNG THÁI TÌM KIẾM & BỘ LỌC XE
**Dự án:** VT AUTO Web App  
**Mục tiêu:** Tự động reset search keyword, bộ lọc nâng cao, điều kiện lọc tạm thời và vị trí cuộn khi rời và quay lại trang Danh sách xe (`/xe`).  
**Trạng thái:** ✅ Đã hoàn thành & Kiểm thử tự động đạt 100%

---

## 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)

Qua rà soát mã nguồn `VehicleList.tsx`, `VehicleFilterBar.tsx`, `Sidebar.tsx` và Zustand Store:

1. **Lưu trữ trạng thái tạm thời trong `sessionStorage`:**
   - Trong `VehicleList.tsx`, biến state `filters` trước đây được khởi tạo bằng hàm đọc từ `sessionStorage.getItem('vehicle-list-filters')`.
   - Mỗi lần người dùng gõ từ khóa tìm kiếm (ví dụ: `73`) hoặc thay đổi bộ lọc, `useEffect` tự động ghi đè giá trị này vào `sessionStorage`.
   - Khi người dùng bấm vào một xe bất kỳ, hàm `saveListStateBeforeDetail` tiếp tục lưu cả `filters` và vị trí cuộn (`scrollTop`) vào `sessionStorage`.
   - Kết quả: Khi chuyển sang tab khác (Tổng quan, Bảng giá...) rồi quay lại Danh sách xe, component đọc lại `sessionStorage` cũ, khiến từ khóa tìm kiếm và bộ lọc cũ vẫn bị áp dụng, chỉ hiển thị danh sách thu gọn thay vì danh sách mặc định.

2. **Thiếu cơ chế đồng bộ 2 chiều và dọn dẹp (Cleanup) ở `VehicleFilterBar`:**
   - Component `VehicleFilterBar` lưu giữ state nội bộ độc lập (`filterOpen`, `filters`, `extendedRange`).
   - Khi chuyển tab hoặc rời khỏi trang, popover bộ lọc nâng cao và các lựa chọn lọc tạm thời không được unmount/reset một cách đồng bộ.

3. **Xung đột Stacking Context (z-index) giữa Dropdown Backdrop và Sidebar:**
   - Khi mở popover bộ lọc nâng cao trên Desktop, lớp phủ bắt sự kiện click ra ngoài `<div className="fixed inset-0 z-30" />` bao phủ toàn bộ màn hình.
   - Thanh điều hướng Desktop `<aside>` trước đó chưa có z-index riêng (mặc định z-index: 0), khiến người dùng bấm vào menu bên trái khi đang mở popover bị lớp phủ chặn lại thay vì chuyển tab ngay lập tức.

---

## 2. PHẠM VI THAY ĐỔI & GIẢI PHÁP ĐÃ THỰC HIỆN

### A. Trang Danh sách xe (`src/pages/VehicleList.tsx`)
- **Khởi tạo bộ lọc thuần khiết:** Loại bỏ hoàn toàn việc đọc từ `sessionStorage`. State `filters` luôn được khởi tạo với hằng số mặc định `DEFAULT_VEHICLE_FILTERS`:
  ```ts
  const DEFAULT_VEHICLE_FILTERS = {
    query: '',
    status: 'all',
    positionId: 'all',
    assigneeId: 'all',
    sortBy: 'default' as 'default' | 'price_asc' | 'price_desc',
    priceMin: 0,
    priceMax: 110000000,
  }
  ```
- **Vòng đời Component (Lifecycle Cleanup):** Thêm `useEffect` tự động dọn sạch `sessionStorage` và đặt vị trí cuộn về `0`:
  ```ts
  useEffect(() => {
    try {
      sessionStorage.removeItem('vehicle-list-filters')
      sessionStorage.removeItem('vehicle-list-scroll')
    } catch {}

    const main = document.querySelector('main')
    if (main) {
      main.scrollTop = 0
      main.scrollLeft = 0
    }
    window.scrollTo(0, 0)

    return () => {
      try {
        sessionStorage.removeItem('vehicle-list-filters')
        sessionStorage.removeItem('vehicle-list-scroll')
      } catch {}
    }
  }, [])
  ```
- **Loại bỏ lưu trạng thái trước khi chuyển trang:** Xóa bỏ `saveListStateBeforeDetail` và prop `onNavigateToDetail` trên `VehicleCard`.

### B. Thanh công cụ tìm kiếm & lọc (`src/components/VehicleFilterBar.tsx`)
- **Hỗ trợ đồng bộ props từ cha:** Tiếp nhận `filters: externalFilters` và callback `onFilterChange`.
- **Đồng bộ hóa trạng thái reset:** Khi component cha reset về mặc định, `VehicleFilterBar` tự động:
  - Cập nhật state bộ lọc nội bộ về giá trị mặc định.
  - Tự động đóng popover bộ lọc nâng cao (`setFilterOpen(false)`).
  - Tự động tắt dải giá mở rộng (`setExtendedRange(false)`).
- **Cleanup khi unmount:** Đảm bảo khi rời component, popup/drawer lọc luôn được đóng hoàn toàn.
- **Nút "Đặt lại" (Reset):** Phục hồi ngay lập tức toàn bộ bộ lọc về trạng thái ban đầu và đóng popover nếu đang mở.

### C. Sidebar điều hướng (`src/components/Sidebar.tsx`)
- Bổ sung `relative z-40` cho `<aside className="hidden ... md:flex relative z-40">`.
- Giúp thanh điều hướng Sidebar Desktop luôn nằm trên các popover/backdrop nội bộ của trang (`z-30`), cho phép chuyển tab mượt mà ngay cả khi popover đang mở, đồng thời vẫn nằm dưới các hộp thoại Modal toàn hệ thống (`z-50`).

---

## 3. KẾT QUẢ KIỂM THỬ PLAYWRIGHT (7 SCENARIOS)

File kiểm thử tự động: `tests/vehicle-search-reset.spec.ts`

| STT | Kịch bản kiểm thử | Kỳ vọng | Kết quả thực tế | Trạng thái |
|:---:|:---|:---|:---|:---:|
| **1** | Mở trang Danh sách xe ban đầu (`/xe`) | Hiển thị đầy đủ danh sách xe mặc định | Hiển thị đầy đủ **37 xe** | **PASS** |
| **2** | Tìm kiếm từ khóa `"73"` | Chỉ hiển thị các xe có biển số/dòng xe khớp `"73"` | Lọc chính xác còn **4 xe** | **PASS** |
| **3** | Chuyển sang trang Dashboard (`/`) qua Sidebar | Điều hướng SPA thành công sang Dashboard | Điều hướng thành công sang `/` | **PASS** |
| **4** | Quay lại Danh sách xe (`/xe`) qua Sidebar | Tự động reset input tìm kiếm về `""`, hiển thị đủ xe, scroll ở đầu trang | Input rỗng `""`, hiển thị đủ **37 xe**, `scrollTop = 0` | **PASS** |
| **5** | Mở bộ lọc nâng cao, chọn tình trạng "Đã cọc", chuyển tab sang Bảng giá rồi quay lại | Popover bộ lọc tự đóng, danh sách phục hồi đầy đủ không còn bị lọc | Popover đóng kín, hiển thị đủ **37 xe** | **PASS** |
| **6** | Vòng lặp chuyển tab liên tục 3 lần giữa Dashboard và Danh sách xe | Không gọi API thừa, không phát sinh request trùng lặp | **0 request** `GET /api/vehicles` phát sinh thêm | **PASS** |
| **7** | Kiểm tra tìm kiếm & nút Đặt lại sau khi reset | Tìm kiếm lại vẫn hoạt động chuẩn; nút "Đặt lại" phục hồi danh sách | Tìm lại `"73"` ra đúng 4 xe; bấm "Đặt lại" phục hồi đủ **37 xe** | **PASS** |

**Tóm tắt kết quả chạy Playwright:**
```bash
Running 2 tests using 1 worker
✅ Auth setup complete with valid admin JWT token
  ok 1 [auth-setup] › tests\auth\auth.setup.ts:13:1 › authenticate (4ms)
[TEST 1] Số lượng xe hiển thị mặc định ban đầu: 37 xe
[TEST 2] Số lượng xe khớp từ khóa "73": 4 xe
[TEST 4] Quay lại Danh sách xe: hiển thị 37 xe (kỳ vọng 37)
[TEST 4] Vị trí cuộn scrollTop: 0
[TEST 5] Số lượng xe đã cọc: 0 xe
[TEST 5] Quay lại sau bộ lọc nâng cao: hiển thị 37 xe
[TEST 6] Số request trước vòng lặp chuyển tab: 12
[TEST 6] Số request phát sinh khi chuyển tab 3 lần: 12
[TEST 6] Số request tải lại danh sách xe GET /api/vehicles phát sinh: 0
[TEST 7] Tìm kiếm lại sau các lần reset: 4 xe
[TEST 7] Bấm nút Đặt lại: danh sách phục hồi đầy đủ 37 xe
  ok 2 [desktop-chrome] › tests\vehicle-search-reset.spec.ts:4:3 › VT AUTO - Vehicle Search & Filter State Reset (8.7s)

  2 passed (10.2s)
```

---

## 4. KIỂM TRA TYPE CHECK & BUILD PRODUCTION

1. **TypeScript Check (`npx tsc --noEmit`):**
   - Không có bất kỳ lỗi kiểu dữ liệu nào (Exit Code 0).
2. **Production Build (`npm run build`):**
   - Build thành công toàn bộ bundle frontend trong **8.80s** (Exit Code 0).

---

## 5. CAM KẾT VÀ GIỚI HẠN THAY ĐỔI
- **Không reset toàn bộ Zustand Store:** Dữ liệu xe, vị trí xe, nhân viên được lưu giữ trong store, không bị xóa khi chuyển tab.
- **Không gọi API tải lại không cần thiết:** Chuyển tab sử dụng dữ liệu đã có trong store, không spam `GET /api/vehicles`.
- **Không sửa Backend API / Neon Database:** Backend và Database được giữ nguyên vẹn 100%.
- **Không commit, push hoặc deploy:** Toàn bộ thay đổi nằm trong working copy phục vụ kiểm thử và vận hành.
