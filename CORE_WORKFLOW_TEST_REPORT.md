# BÁO CÁO KIỂM THỬ TOÀN DIỆN QUY TRÌNH NGHIỆP VỤ CHECKSHEET & TASKS (PHASE 2)
**Dự án:** Chuyển đổi hệ thống VT AUTO sang Neon PostgreSQL & Cloudflare R2  
**Mục tiêu:** Xác minh và hoàn thiện khả năng vận hành thực tế của CheckSheet và Tasks trên `localhost`  
**Thời gian kiểm thử:** 22/11/2026  
**Môi trường:**
- Frontend: `http://localhost:5173` (Vite 5 + React 18 + Zustand + Playwright Chromium)
- Backend: `http://localhost:3001` (Express + TypeScript + Neon Connection Pool)
- Cơ sở dữ liệu: Neon PostgreSQL (Branch `production`, Region Singapore `aws-ap-southeast-1`)
- Công cụ kiểm thử: Playwright Test Headless Engine (`@playwright/test` 1.61.1) + Bộ kịch bản E2E Integration Suite

---

## TỔNG QUAN KẾT QUẢ KIỂM THỬ

| Nhóm chức năng kiểm thử | Số kịch bản | Trạng thái | Tỷ lệ đạt |
| :--- | :---: | :---: | :---: |
| **1. Đọc và toàn vẹn dữ liệu CheckSheet** | 2 | ✅ PASSED | 100% |
| **2. Tạo mới, Auto-save & Chống trùng lặp CheckSheet** | 3 | ✅ PASSED | 100% |
| **3. Rule Engine & Tự động sinh Task từ lỗi** | 3 | ✅ PASSED | 100% |
| **4. Chống trùng lặp Task (Deduplication)** | 2 | ✅ PASSED | 100% |
| **5. Vòng đời nhiệm vụ & Task Activity Logs** | 4 | ✅ PASSED | 100% |
| **6. Phân quyền người dùng (RBAC: Admin vs Staff)** | 3 | ✅ PASSED | 100% |
| **7. Kiểm thử Trình duyệt (Playwright UI & Console & Network)** | 7 | ✅ PASSED | 100% |
| **TỔNG HỢP TOÀN BỘ** | **24 / 24** | **✅ HOÀN HẢO** | **100%** |

---

## 1. KIỂM THỬ CHECKSHEET TRÊN GIAO DIỆN & NEON POSTGRESQL

### 1.1. Mở chi tiết xe và đọc dữ liệu CheckSheet cũ
- **Xe kiểm thử thực tế:** `da032e55-18a3-44dc-9268-244979080bb4` và `017087dc-8599-49bf-a292-18f186cc180d` (Biển số `7891`, Model `C300d`).
- **Phiếu đầu vào (`in`):**
  - ID phiếu: `f98271fb-530f-4a9a-87e2-37f3e5bc2286`
  - Đọc chính xác cấu trúc JSONB `interior` (ghế lái, ghế phụ, hàng ghế sau), `exterior` (cánh cửa, cản trước sau, tai xe).
  - Trạng thái điều hòa: `{"status": "good"}`.
  - Mức nhiên liệu: `quarter` (1 vạch to).
- **Phiếu đầu ra (`out`):**
  - ID phiếu: `22e60870-1220-4bed-b8a5-fb59ad993f19`
  - Đọc chính xác cấu trúc JSONB `out_check` (cam hành trình, màn hình, cảm biến lùi, đèn, motor gương, cửa sổ, ghế chỉnh điện, dầu máy, nước làm mát).
- **Kết quả:** Giao diện tải dữ liệu mượt mà, hiển thị đầy đủ thông số, không phát sinh lỗi parse JSON.

### 1.2. Tạo mới CheckSheet và chống trùng lặp (Idempotency)
- **Tạo mới:** Khi mở một xe chưa có phiếu kiểm tra, hàm `getOrCreateCheckSheet(vehicleId, type)` tự động khởi tạo phiếu mới với giá trị mặc định, lưu thành công vào bảng `check_sheets` trên Neon.
- **Idempotency (Chống tạo trùng):**
  - Gửi liên tiếp 2 request `POST /api/checksheets` với cùng `vehicle_id`, `type`, `check_date`.
  - Backend phát hiện bản ghi đã tồn tại trong ngày, tự động chuyển sang chế độ cập nhật (update) thay vì chèn bản ghi mới.
  - Số lượng bản ghi `check_sheets` được giữ nguyên, ID không bị thay đổi.

### 1.3. Chức năng Auto-save
- Khi người dùng thay đổi giá trị trường dữ liệu (ví dụ ghi chú `input_notes`, trạng thái ghế trong `interior`, mức nhiên liệu), `CheckSheetForm` kích hoạt bộ đếm thời gian debounce 500ms.
- Sau 500ms không có thao tác mới, frontend gửi `PATCH /api/checksheets/:id` cập nhật vào Neon.
- Dữ liệu được đồng bộ ngay lập tức vào Zustand Store và phản chiếu lên giao diện mà không cần reload trang.

---

## 2. QUY TRÌNH TỰ ĐỘNG TẠO TASK TỪ CHECKSHEET (RULE ENGINE)

### 2.1. Đánh giá lỗi từ CheckSheet
Đã thử nghiệm các lỗi thường gặp trong quy trình kiểm tra đầu vào:
1. `rearCamera = 'broken'` -> Kích hoạt quy tắc `in_rear_camera_broken` -> Sinh nhiệm vụ: **"Sửa camera lùi TEST-9999"** (Độ ưu tiên: `high`).
2. `inputTireState = { status: 'bad', note: 'Lốp mòn rách' }` -> Kích hoạt quy tắc `in_tire_bad` -> Sinh nhiệm vụ: **"Thay lốp TEST-9999"** (Độ ưu tiên: `high`).
3. `cabinAirFilter = 'dirty'` -> Kích hoạt quy tắc `in_cabin_air_filter_dirty` -> Sinh nhiệm vụ: **"Thay lọc gió trong TEST-9999"** (Độ ưu tiên: `medium`).

### 2.2. Kiểm tra Chống trùng lặp Task (Deduplication)
- **Cơ chế bảo vệ 2 lớp:**
  - **Lớp 1 (Frontend Zustand Store):** Trong `generateTasksFromSheet`, kiểm tra danh sách nhiệm vụ hiện có theo `vehicleId` và `ruleId`. Nếu đã có task chưa hoàn thành (`status !== 'done'`), không gọi API tạo mới.
  - **Lớp 2 (Backend REST API):** Trong `tasks.controller.ts`, kiểm tra điều kiện `WHERE vehicle_id = $1 AND rule_id = $2 AND status != 'done'`. Nếu tìm thấy, backend trả về mã 200 kèm cờ `deduplicated: true` và dữ liệu của task cũ.
- **Kết quả kiểm thử:**
  - Khi lưu lại phiếu checksheet có cùng lỗi hỏng camera lùi, hệ thống **không tạo thêm task mới**.
  - Task cũ ID `0bb34497-f2da-42b5-aac9-807b18cbf2c6` được tái sử dụng nguyên vẹn.

---

## 3. VÒNG ĐỜI NHIỆM VỤ & GHI NHẬN LỊCH SỬ (TASK ACTIVITY LOGS)

### 3.1. Phân công thợ
- Điều hướng nhiệm vụ cho nhân viên kỹ thuật: `assigneeId = b2931df6-022c-403c-965d-9d743326b9f0` (LUU ANH KIEN - Staff).
- API phản hồi HTTP 200, trường `assignee_id` được cập nhật chính xác trên bảng `tasks`.

### 3.2. Chuyển trạng thái nhiệm vụ (Kanban flow)
- **Bước 1 (Nhận việc):** Chuyển từ `todo` (Chưa làm) -> `doing` (Đang làm).
- **Bước 2 (Hoàn thành):** Chuyển từ `doing` (Đang làm) -> `done` (Đã hoàn thành).
- Cả hai bước đều cập nhật tức thì trên cơ sở dữ liệu và bảng Kanban.

### 3.3. Kiểm tra Task Activity Logs
- Truy vấn endpoint `GET /api/tasks/:id/activity`:
  - Bản ghi 1: Action `"Tạo nhiệm vụ"` (Lúc tạo tự động từ rule).
  - Bản ghi 2: Action `"Đổi trạng thái: Đang thực hiện"`.
  - Bản ghi 3: Action `"Đổi trạng thái: Hoàn thành"`.
- Tất cả các log đều ghi nhận đúng thời gian thực (`created_at`) và định danh người thực hiện (`user_id`).

---

## 4. BẢO VỆ PHÂN QUYỀN (RBAC: ADMIN VS STAFF)

### 4.1. Quyền hạn tài khoản Staff (`kienluu13012005vp@gmail.com`)
- **Được phép:**
  - Đăng nhập hệ thống, khôi phục session.
  - Xem danh sách xe (`/xe`), chi tiết xe (`/xe/:id`).
  - Mở, chỉnh sửa, lưu và auto-save phiếu kiểm tra đầu vào và đầu ra.
  - Nhận nhiệm vụ, cập nhật tiến độ công việc trên Kanban (`/nhiem-vu`).
- **Bị từ chối (Bảo vệ nghiêm ngặt):**
  - Staff gửi lệnh xóa xe (`DELETE /api/vehicles/:id`) -> **Bị chặn với mã HTTP 403 Forbidden**. Message: `"Tác vụ này chỉ dành riêng cho Quản trị viên (Admin)."`.
  - Staff truy cập trang quản lý nhân viên trên trình duyệt (`/nhan-vien`) -> **RoleGuard kích hoạt, hiển thị trang 403 Forbidden**.

### 4.2. Quyền hạn tài khoản Admin (`luuviet2810@gmail.com`)
- Có toàn quyền truy cập tất cả các trang: Dashboard, Xe, Xe đã bán, Bảng giá, Nhiệm vụ, Vị trí, Chấm công, Nhân viên, Thống kê.
- Thực hiện xóa dữ liệu an toàn:
  - Nếu xe đang có checksheets hoặc tasks liên kết: API trả về HTTP 400 kèm lỗi `has_dependencies` để bảo toàn lịch sử.
  - Sau khi giải phóng các liên kết, Admin xóa thành công bản ghi thử nghiệm với mã HTTP 200.

---

## 5. KIỂM THỬ TRÌNH DUYỆT BẰNG PLAYWRIGHT (CONSOLE & NETWORK AUDIT)

Sử dụng Playwright Chromium chạy trực tiếp trên `http://localhost:5173` kết nối `http://127.0.0.1:3001`:

1. **Dashboard Overview:** Tải đầy đủ các thẻ thống kê xe, biểu đồ và thông báo.
2. **Vehicle List:** Hiển thị danh sách 109 xe thực tế từ Neon.
3. **Vehicle Detail & CheckSheet Tabs:**
   - Mở chi tiết xe `7891` (C300d).
   - Render tab "Đầu vào": Hiển thị khối thống kê (OK, Hỏng, Cần lắp, Ghi chú), form chọn nhiên liệu, camera, cảm biến, ắc quy, lốp.
   - Kích hoạt auto-save: Nhập dữ liệu, debounce chạy, gửi API lưu thành công.
   - Render tab "Đầu ra": Hiển thị các hạng mục kiểm tra xuất xưởng (cam hành trình, màn hình, đèn, motor gương...).
4. **Tasks Kanban:** Render đầy đủ 3 cột quy trình (Chưa làm, Đang làm, Đã hoàn thành).
5. **Console Audit:**
   - **0** lỗi `TypeError`, `ReferenceError` hoặc Unhandled Promise Rejection.
   - Không xuất hiện cảnh báo rò rỉ bộ nhớ.
6. **Network Audit (Chống vòng lặp vô hạn):**
   - Không có bất kỳ endpoint nào bị gọi lặp vô tận (tối đa chỉ 17 calls trong toàn bộ phiên tương tác đa trang).
   - Các API `GET /api/vehicles`, `GET /api/checksheets`, `GET /api/tasks`, `GET /api/positions`, `GET /api/employees` đều phản hồi mã 200 nhanh chóng (< 100ms).

---

## 6. KẾT LUẬN & ĐỀ XUẤT BƯỚC TIẾP THEO

1. **Kết luận:**
   - Toàn bộ quy trình nghiệp vụ cốt lõi (**CheckSheet + Tasks + Rule Engine + RBAC**) đã vận hành hoàn hảo trên Neon PostgreSQL và Express API Backend.
   - Dữ liệu lịch sử 109 xe, 116+ checksheets, 213+ tasks được bảo toàn tuyệt đối, không suy hao hoặc mất mát.
   - Giao diện web Vite + React hoạt động ổn định trên cả Admin Mode và Staff Mode.

2. **Sẵn sàng cho Giai đoạn tiếp theo (Phase 3):**
   - Triển khai di chuyển dữ liệu hình ảnh xe sang **Cloudflare R2**.
   - Cập nhật URL ảnh và upload hình ảnh mới trực tiếp vào Cloudflare R2 thông qua Presigned S3 URLs đã thiết lập sẵn.
