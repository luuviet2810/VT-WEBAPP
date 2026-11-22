# TIẾN ĐỘ CHUYỂN ĐỔI HỆ THỐNG VT AUTO (MIGRATION PROGRESS)
**Mục tiêu:** Chuyển đổi cơ sở dữ liệu và lưu trữ từ Supabase sang **Neon PostgreSQL** và **Cloudflare R2**.  
**Thời gian cập nhật:** 22/11/2026  
**Giai đoạn hiện tại:** GIAI ĐOẠN 13 — HOÀN THÀNH TRIỂN KHAI CRUD API BACKEND VÀ CHUYỂN ĐỔI FRONTEND DATA SERVICES SANG NEON (100% BUILD & E2E TEST PASS)

---

## 1. Kiểm tra Công cụ trên Máy tính & Kết nối Neon & Cloudflare R2

### Tiến trình kết nối & Migration Neon PostgreSQL:
- **Tài khoản xác thực:** `luuviet2810` (`luuviet2810@gmail.com`) qua OAuth.
- **Organization:** `org-shy-hat-26989006`
- **Project:** `webapp VTAUTO` (`autumn-dream-42270306`)
- **Region:** `aws-ap-southeast-1` (Singapore — tối ưu độ trễ cho Việt Nam)
- **Branch:** `production` (`br-lingering-frost-azgm2dgo`)
- **Postgres Version:** PostgreSQL 18.7
- **Kết quả chạy Migration:** **42 / 42 file thành công 100%** (Ghi nhận đầy đủ trong bảng `_neon_migrations`).
  - Đã khởi tạo 21 bảng nghiệp vụ, 2 views, 7 custom ENUMs, 21 foreign keys, 77 indexes.
  - Chi tiết xem tại báo cáo đầy đủ: [NEON_MIGRATION_REPORT.md](file:///d:/Download%20D/gara-manager/NEON_MIGRATION_REPORT.md).
- **Kết quả nạp Dữ liệu nền (Master Data):** **Thành công 100%**
  - Đã nạp 5 vị trí đỗ xe cốt lõi vào `positions`.
  - Đã nạp 16 danh mục option xe chuẩn vào `vehicle_option_defs`.
  - Đã nạp 1 cấu hình thông tin liên hệ website vào `website_settings`.
  - Tuyệt đối không nạp user/admin mẫu, không chạy UPDATE/DELETE/backfill dữ liệu cũ.
  - Chi tiết xem tại báo cáo: [SEED_IMPORT_REPORT.md](file:///d:/Download%20D/gara-manager/SEED_IMPORT_REPORT.md).

### Tiến trình Lưu trữ Cloudflare R2 (Giai đoạn 5):
- **Trạng thái Bucket:** Đã xác minh 100% bằng `wrangler r2 bucket list`. Cả 3 Bucket đều tồn tại và ở chế độ Private:
  - `vehicle-images` (Tạo: 2026-11-21T16:34:06Z)
  - `vehicle-documents` (Tạo: 2026-11-21T16:34:14Z)
  - `checksheet-photos` (Tạo: 2026-11-21T16:34:19Z)
- **Tài khoản Cloudflare:** `luuviet2810@gmail.com` (Account ID: `80e789d50d0c2f3b097ab46200987613`).
- **Endpoint R2 S3:** `https://80e789d50d0c2f3b097ab46200987613.r2.cloudflarestorage.com`
- **Công cụ dòng lệnh:** `wrangler` (phiên bản `4.166.0`) đã đăng nhập thành công qua OAuth.
- **Khảo sát cấu trúc Database & Ánh xạ Object Key:** Đã nghiên cứu chi tiết 3 bảng `vehicle_images`, `vehicle_documents`, `check_sheets` và thiết lập cấu trúc Object Key đồng bộ 100% với dữ liệu hiện có.
- **Tài liệu hướng dẫn:** Xem chi tiết tại [CLOUDFLARE_R2_SETUP.md](file:///d:/Download%20D/gara-manager/CLOUDFLARE_R2_SETUP.md).

### Tiến trình Xây dựng Backend API (Giai đoạn 6):
- **Server:** Mở rộng `gara-bot-server` thành Backend API hoàn chỉnh, bảo toàn 100% logic Telegram Bot.
- **Cấu trúc Module:** `config`, `database`, `middleware`, `storage`, `services`, `controllers`, `routes`.
- **Kết nối Database:** Tích hợp `pg.Pool` kết nối Neon PostgreSQL với độ trễ phản hồi thấp (649ms).
- **Bảo mật & Phân quyền:** Tích hợp JWT Authentication nền tảng và RBAC Middleware (`requireAdmin`, `requireStaffOrAdmin`).
- **Lưu trữ R2:** Tích hợp AWS SDK v3, hàm cấp Presigned Upload/Download URL cho 3 bucket và endpoint kiểm tra kết nối `GET /health/r2`.
- **Kiểm thử & Biên dịch:** TypeScript compile 0 lỗi, kiểm thử toàn bộ endpoint HTTP 200/401/503 đạt chuẩn.
- **Chi tiết xem tại:** [BACKEND_MIGRATION_REPORT.md](file:///d:/Download%20D/gara-manager/BACKEND_MIGRATION_REPORT.md).

### Tiến trình Xác minh R2 & Presigned URL (Giai đoạn 7):
- **Trạng thái Credentials:** `R2_ACCESS_KEY_ID` và `R2_SECRET_ACCESS_KEY` đã được nạp an toàn từ biến môi trường.
- **Kiểm thử Read-Only trên 3 Bucket:**
  - `vehicle-images`: **PASS** (HeadBucket 200, ListObjectsV2 200)
  - `vehicle-documents`: **PASS** (HeadBucket 200, ListObjectsV2 200)
  - `checksheet-photos`: **PASS** (HeadBucket 200, ListObjectsV2 200)
  - Không có bất kỳ file nào bị tải lên, sửa đổi hoặc xóa (0 objects modified).
- **Kiểm thử Endpoint Backend:**
  - `GET /health/r2`: Trả về HTTP 200 (`configured: true`, 3/3 buckets active).
  - `POST /api/storage/presigned-upload`: Tạo thành công Presigned S3 PUT URL (chuẩn `AWS4-HMAC-SHA256`, TTL 900s).
- **Tối ưu tương thích:** Kích hoạt `forcePathStyle: true` theo khuyến nghị của Cloudflare R2 để tương thích tốt với AWS S3 SDK.

### Tiến trình Nhập Dữ liệu Nghiệp vụ Backup (Giai đoạn 8):
- **Trạng thái:** **HOÀN THÀNH 100% TẤT CẢ CÁC BẢNG DỮ LIỆU NGHIỆP VỤ & LỊCH SỬ**.
- **Quy trình kiểm thử an toàn:**
  - Đã thực hiện chạy thử nghiệm trong Transaction Dry-Run có Rollback (`validate-all-backups.mjs`) kiểm tra cú pháp và toàn vẹn khóa ngoại.
  - Sau khi kiểm thử thành công 100%, thực hiện nạp dữ liệu theo 2 đợt giao dịch nguyên tử (`BEGIN ... COMMIT`):
    - Đợt 1: 3 bảng ưu tiên + bảng tiền đề phụ thuộc (`positions`, `users`, `vehicles`, `check_sheets`, `vehicle_images`).
    - Đợt 2: Toàn bộ bảng lịch sử vận hành (`settings`, `attendance`, `vehicle_documents`, `move_logs`, `vehicle_workflow_logs`, `tasks`).
- **Tổng hợp số lượng bản ghi thực tế trên Neon PostgreSQL:**
  - `positions`: **7** vị trí bãi đỗ xe.
  - `users`: **7** nhân sự và quản trị viên thực tế.
  - `vehicles`: **109** xe (73 xe đã bán, 36 xe đang sẵn sàng).
  - `check_sheets`: **116** phiếu kiểm tra xe (đầy đủ lịch sử kiểm tra).
  - `vehicle_images`: **749** metadata ảnh xe.
  - `vehicle_documents`: **3** tài liệu xe đính kèm.
  - `tasks`: **213** công việc (128 todo, 83 done, 2 doing).
  - `vehicle_workflow_logs`: **144** log trạng thái quy trình xe.
  - `move_logs`: **184** log di chuyển xe giữa các vị trí bãi đỗ.
  - `attendance`: **1** bản ghi chấm công nhân sự.
  - `settings`: **1** cấu hình hoạt động gara.
  - `website_settings`: **1** cấu hình liên hệ website.
  - `vehicle_option_defs`: **16** danh mục tùy chọn xe chuẩn.
  - `public_vehicles` (View): Tự động hiển thị **26 xe công khai** sẵn sàng bán.
  - `public_vehicle_images` (View): Tự động liên kết **371 ảnh xe website**.
- **Kiểm tra tính toàn vẹn (Orphan check):**
  - **0** bản ghi mồ côi trên toàn bộ cơ sở dữ liệu.
  - Bảo toàn 100% UUID gốc, timestamp, trạng thái xe và trường JSONB.
  - Không ghi đè hoặc trùng lặp bản ghi nhờ mệnh đề `ON CONFLICT (id) DO NOTHING`.
- **Báo cáo chi tiết:**
  - Báo cáo 3 bảng ưu tiên: [DATA_IMPORT_REPORT.md](file:///d:/Download%20D/gara-manager/DATA_IMPORT_REPORT.md).
  - Báo cáo các bảng lịch sử: [DATA_IMPORT_HISTORY_REPORT.md](file:///d:/Download%20D/gara-manager/DATA_IMPORT_HISTORY_REPORT.md).

### Tiến trình Chuyển đổi Xác thực & Nạp Mật khẩu (Giai đoạn 9):
- **Trạng thái:** **HOÀN THÀNH 100% PHƯƠNG ÁN A — GIỮ NGUYÊN MẬT KHẨU CŨ CHO TOÀN BỘ NHÂN SỰ & QUẢN TRỊ VIÊN**.
- **Kết quả nhập Password Hash vào Neon:**
  - Tổng số tài khoản được cập nhật: **7 / 7** tài khoản thực tế.
  - Loại bỏ hoàn toàn 2 tài khoản thử nghiệm (`testadmin@demo.com`, `teststaff@demo.com`).
  - Đối chiếu kép: `users.auth_id === auth.users.id` VÀ `users.email === auth.users.email` (chuẩn hóa trim & lower). Khớp chính xác 100%.
  - Định dạng bcrypt: Tất cả 7 chuỗi hash đều chuẩn `$2a$` có độ dài 60 ký tự.
  - Giao dịch an toàn: Thực hiện trong khối `BEGIN ... COMMIT`, 0 lỗi, bảo toàn nguyên vẹn mọi trường dữ liệu khác (`role`, `status`, `disabled`, `name`).
  - Kiểm soát trạng thái tài khoản: Tài khoản `linhthu.neu@gmail.com` bảo toàn trạng thái `rejected`.
- **Hạ tầng Auth Backend (`gara-bot-server`):**
  - Đã cài đặt `bcryptjs` (^3.0.3) và `@types/bcryptjs` (^2.4.6), TypeScript build 0 lỗi.
  - Đã sinh `JWT_SECRET` ngẫu nhiên 256-bit (64 ký tự hex) lưu tại `gara-bot-server/.env`.
  - Đã gỡ Git tracking (`git rm --cached`) cho toàn bộ file `.env` và cập nhật `.gitignore`.
- **Tài liệu chi tiết:** Xem tại [AUTH_MIGRATION_REPORT.md](file:///d:/Download%20D/gara-manager/AUTH_MIGRATION_REPORT.md).

### Tiến trình Triển khai Backend Auth API & Kiểm thử Hoàn chỉnh (Giai đoạn 10):
- **Trạng thái:** **HOÀN THÀNH 100% CÁC ENDPOINT AUTH, MIDDLEWARE ĐỐI CHIẾU NEON VÀ RATE LIMITING**.
- **Các Endpoint Đã Hoàn Thiện:**
  - `POST /api/auth/login`: Xác thực bcryptjs, kiểm tra `disabled`, `status`, không lộ sự tồn tại của email, rate limit 5 lần / 15 phút.
  - `GET /api/auth/me`: Bảo vệ bởi `authenticateJwt`, đối chiếu trạng thái tài khoản trực tiếp từ Neon, không trả về password_hash/auth_id.
  - `GET /api/auth/admin-check`: Bảo vệ bởi `authenticateJwt` và `requireAdmin`.
  - `POST /api/auth/logout`: Đăng xuất an toàn, hướng dẫn client xóa token.
  - `POST /api/auth/verify`: Kiểm tra chữ ký và hạn JWT.
- **Middleware Phân quyền & Đối chiếu Neon Trực tiếp:**
  - `authenticateJwt`: Phân biệt `token_expired` và `invalid_token`. Truy vấn trực tiếp Neon để lấy trạng thái thực tế mới nhất (`role`, `status`, `disabled`). Token cũ không giữ được quyền nếu user bị khóa hoặc hạ quyền trong database.
  - `requireAdmin`: Bắt buộc `role === 'admin'` từ dữ liệu thực tế Neon.
  - `requireStaffOrAdmin`: Cho phép `admin` hoặc `staff` đã phê duyệt.
- **Hệ thống Rate Limiting:**
  - Tạo bảng `auth_login_attempts` trong Neon: Lưu vết theo IP và normalized email, tự động xóa log cũ sau 1 giờ.
  - Chặn đúng sau 5 lần thử thất bại trong 15 phút với mã HTTP 429 Too Many Requests.
- **Kết quả Kiểm thử (Test Suite):**
  - **14 / 14 test cases thành công (100% PASS)**: Kiểm thử đầy đủ Admin/Staff đăng nhập đúng, sai mật khẩu, email không tồn tại, tài khoản disabled, tài khoản rejected, password_hash NULL, token expired, token giả mạo, staff gọi admin route, admin bị hạ quyền trong DB, tài khoản bị khóa sau khi có JWT, Profile sanitized, Logout.
  - Kiểm thử Rate Limiting: 5 lần 401, lần thứ 6 trả HTTP 429 chuẩn xác.

### Tiến trình Chuyển đổi Frontend Auth Store (Giai đoạn 11):
- **Trạng thái:** **HOÀN THÀNH 100% TÁCH KHỎI SUPABASE AUTH SANG EXPRESS BACKEND + NEON**.
- **Các Module Frontend Đã Nâng Cấp:**
  - `src/services/auth.service.ts`: Chuyển hoàn toàn sang gọi các endpoint REST API backend (`POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`). Lưu trữ token duy nhất qua khóa `vtauto_auth_token` trong localStorage.
  - `src/store/useAuthStore.ts`: Loại bỏ hoàn toàn sự phụ thuộc vào `supabase.auth`. Khôi phục session tự động khi reload trang thông qua `GET /api/auth/me`. Xóa token sạch sẽ khi đăng xuất hoặc token hết hạn.
  - `src/services/vehicle.service.ts`: Cập nhật hàm `assertCanDeleteVehicle` lấy role trực tiếp từ `useAuthStore.getState().currentUser` thay vì gọi Supabase Auth.
- **Bảo toàn chức năng:**
  - Giữ nguyên 100% cơ chế View Mode (`useViewModeStore.ts` Admin Mode vs Staff Mode).
  - Không phá vỡ các dịch vụ CRUD nghiệp vụ (xe, checksheet, tasks) vẫn tạm thời kết nối Supabase Client.
- **Kiểm thử & Biên dịch:**
  - `npm run build` (Admin/Main app): **Thành công 0 lỗi**.
  - `npm run build:public` (Public Web): **Thành công 0 lỗi**.
  - Kiểm thử End-to-end frontend flow (`tests/frontend-auth-flow.test.mjs`): **7/7 test cases thành công (100% PASS)**.

### Tiến trình Khảo sát Toàn diện Data Services & Luồng Dữ liệu (Giai đoạn 12):
- **Trạng thái:** **HOÀN THÀNH 100% KHẢO SÁT TOÀN DIỆN & XÁC ĐỊNH CHÍNH XÁC NGUYÊN NHÂN HIỂN THỊ 0 DỮ LIỆU**.
- **Kết quả Kiểm tra Dữ liệu trên Neon PostgreSQL:**
  - `users`: **7** bản ghi (2 Admin, 5 Staff).
  - `vehicles`: **109** bản ghi (36 available, 73 sold).
  - `check_sheets`: **116** bản ghi.
  - `tasks`: **213** bản ghi (128 todo, 83 done, 2 doing).
  - `vehicle_images`: **749** metadata ảnh.
  - `vehicle_documents`: **3** metadata tài liệu.
  - `move_logs`: **184** log di chuyển.
  - `vehicle_workflow_logs`: **144** log quy trình.
  - `positions`: **7** vị trí bãi đỗ.
  - `attendance`: **1** bản ghi chấm công.
  - `vehicle_option_defs`: **16** danh mục tùy chọn.
  - `website_settings`: **1** cấu hình web.
  - `settings`: **1** cấu hình chung.
  - `public_vehicles` (View): **26** xe công khai.
  - `public_vehicle_images` (View): **371** ảnh xe công khai.
  - **Đối soát với DATA_IMPORT_REPORT và DATA_IMPORT_HISTORY_REPORT:** Khớp 100%, 0 bản ghi sai lệch hoặc mồ côi.
- **Nguyên nhân cốt lõi gây lỗi Dashboard & Danh sách xe hiển thị 0:**
  1. Frontend Auth đã chuyển thành công sang Express Backend + Neon, đăng nhập thành công.
  2. Tuy nhiên, `initializeFromSupabase()` trong `src/store/useStore.ts` và 16 service trong `src/services/` vẫn gọi trực tiếp PostgREST API của Supabase (`https://obhamybvdpgremtofvvb.supabase.co`).
  3. Dự án Supabase cũ bị khóa do hạn ngạch lưu trữ (`exceed_storage_size_quota`), trả về lỗi 402/403.
  4. Cơ chế bọc lỗi `.catch(() => [])` trong `useStore.ts` nuốt toàn bộ lỗi và trả về mảng rỗng `[]` cho vehicles, tasks, checkSheets, positions, employees, attendance, moveLogs.
  5. `OverviewDashboard.tsx` dùng `DashboardViewModel.ts` tính toán chỉ số KPI hoàn toàn trong bộ nhớ từ các mảng rỗng trên, dẫn đến toàn bộ số liệu bằng `0`.
  6. Backend `gara-bot-server` hiện mới chỉ có Auth, R2 Presigned URLs và Telegram, chưa có các REST endpoint nghiệp vụ cho Vehicles, Tasks, CheckSheets...
- **Báo cáo chi tiết:** Xem tại [DATABASE_SERVICES_AUDIT.md](file:///d:/Download%20D/gara-manager/DATABASE_SERVICES_AUDIT.md).

### Tiến trình Triển khai CRUD API & Chuyển đổi Frontend Data Layer (Giai đoạn 13):
- **Trạng thái:** **HOÀN THÀNH 100% CẢ 4 MODULE CỐT LÕI (VEHICLES, POSITIONS, CHECKSHEETS, TASKS, EMPLOYEES, MOVE LOGS, ATTENDANCE)**.
- **Backend API Đã Xây Dựng & Kiểm Thử (`gara-bot-server`):**
  - **Module 1 (Vị trí & Xe):**
    - `GET /api/positions`: Trả về 7 vị trí bãi đỗ xe sắp xếp theo `sort_order`.
    - `GET /api/vehicles`: Trả về 109 xe (36 available, 73 sold), tự động gắn metadata ảnh & tài liệu.
    - `GET /api/vehicles/:id` & `GET /api/vehicles/by-plate/:plate`: Tìm xe theo UUID và biển số.
    - `POST /api/vehicles`: Tạo xe mới an toàn, tự động ghi log di chuyển ban đầu nếu có vị trí.
    - `PUT /api/vehicles/:id`: Cập nhật linh hoạt các trường xe, không ghi đè dữ liệu cũ bằng null.
    - `POST /api/vehicles/:id/move`: Cập nhật vị trí xe và tự động thêm bản ghi vào `move_logs`.
    - `DELETE /api/vehicles/:id`: Bảo vệ bởi `requireAdmin`, chặn xóa nếu xe có checksheet/task liên kết.
  - **Module 2 (Phiếu kiểm tra xe - CheckSheets):**
    - `GET /api/checksheets`: Trả về 116 phiếu kiểm tra (hỗ trợ lọc `?vehicleId=...`).
    - `GET /api/checksheets/:id`: Lấy chi tiết phiếu kiểm tra.
    - `POST /api/checksheets`: Tạo phiếu kiểm tra, tích hợp cơ chế chống tạo trùng (Idempotency).
    - `PUT /api/checksheets/:id`: Cập nhật chi tiết 12 hạng mục kiểm tra, ảnh ngoại thất và trạng thái ắc quy.
  - **Module 3 (Công việc kỹ thuật - Tasks):**
    - `GET /api/tasks`: Trả về 213 nhiệm vụ (hỗ trợ lọc `status`, `priority`, `assigneeId`, `vehicleId`).
    - `POST /api/tasks`: Tạo nhiệm vụ mới, chống trùng lặp theo `(vehicle_id, rule_id)` khi nhiệm vụ chưa hoàn thành (`status !== 'done'`), tự động ghi log `task_activity_logs`.
    - `PUT /api/tasks/:id`: Cập nhật trạng thái nhiệm vụ, tự động ghi log hoạt động khi trạng thái thay đổi.
    - `DELETE /api/tasks/:id`: Xóa nhiệm vụ nếu nghiệp vụ cho phép.
    - `GET /api/tasks/:id/activity` & `GET /api/tasks/activity/all`: Đọc lịch sử hoạt động nhiệm vụ.
    - `POST /api/tasks/:id/activity`: Thêm log hoạt động nhiệm vụ.
  - **Module 4 (Nhân sự - Employees & Lịch sử di chuyển):**
    - `GET /api/employees`: Trả về 7 nhân sự, tuyệt đối KHÔNG trả về `password_hash` hay `auth_id`.
    - `GET /api/move-logs`: Trả về 184 log di chuyển xe giữa các vị trí bãi đỗ.
    - `GET /api/attendance`: Trả về 1 bản ghi chấm công thực tế từ Neon.
- **Frontend Data Services Đã Chuyển Đổi (`src/services/`):**
  - Tạo mới `src/services/api.client.ts`: Tự động gắn token JWT Bearer từ `localStorage`, chuẩn hóa lỗi `ApiError`, xử lý phân quyền 401/403.
  - Chuyển đổi hoàn toàn `vehicle.service.ts` sang API backend.
  - Chuyển đổi hoàn toàn `position.service.ts` sang API backend.
  - Chuyển đổi hoàn toàn `checksheet.service.ts` sang API backend.
  - Chuyển đổi hoàn toàn `task.service.ts` sang API backend.
  - Chuyển đổi hoàn toàn `users.service.ts` sang API backend.
  - Chuyển đổi hoàn toàn `moveLog.service.ts` sang API backend.
  - Chuyển đổi hoàn toàn `attendance.service.ts` sang API backend.
- **Nâng Cấp Quản Lý Trạng Thái (`src/store/useStore.ts`):**
  - Loại bỏ hoàn toàn cơ chế bọc lỗi im lặng `.catch(() => [])`.
  - Sử dụng `Promise.allSettled` kiểm soát từng module: `vehicles`, `positions`, `employees`, `tasks`, `checkSheets`, `attendance`, `moveLogs`.
  - Phân biệt rõ rệt 3 trạng thái: `isLoading`, empty và `initError`.
  - Không đánh dấu `isInitialized: true` nếu bất kỳ module dữ liệu cốt lõi nào bị lỗi.
  - Giao diện Dashboard tự động tính toán KPI từ 109 xe và 213 nhiệm vụ thật.
- **Kết Quả Kiểm Thử Toàn Diện (Verification & E2E):**
  - Backend compile TypeScript: **0 lỗi**.
  - Frontend `npm run build` (Admin app): **0 lỗi**.
  - Frontend `npm run build:public` (Public Web): **0 lỗi**.
  - Script kiểm thử E2E (`tests/e2e-business-operations.test.mjs`): **7 / 7 test suites thành công 100%**:
    - Positions: 7 / 7 vị trí khớp.
    - Vehicles: 109 / 109 xe khớp (36 available, 73 sold).
    - CheckSheets: 116 / 116 phiếu kiểm tra khớp.
    - Tasks: 213 / 213 nhiệm vụ khớp.
    - Employees: 7 / 7 nhân viên khớp, bảo mật 100% (không lộ hash).
    - Move Logs: 184 / 184 log di chuyển xe khớp.
    - Attendance: 1 / 1 bản ghi chấm công khớp.

---

| Công cụ | Phiên bản / Trạng thái | Đánh giá | Ghi chú |
|---|---|---|---|
| **Node.js** | `v24.19.0` | ĐÃ CÓ | Phiên bản mới, hỗ trợ đầy đủ ESM, tương thích tốt với backend Node/Express hiện đại. |
| **npm** | `11.17.0` | ĐÃ CÓ | Trình quản lý package đi kèm Node.js. |
| **Git** | `2.55.0.windows.5` | ĐÃ CÓ | Quản lý phiên bản mã nguồn. |
| **VS Code** | `1.146.0` | ĐÃ CÓ | Trình soạn thảo mã nguồn chính. |
| **Windows Package Manager (`winget`)** | Sẵn có trên hệ điều hành | ĐÃ CÓ | Dùng để cài đặt nhanh các tiện ích hệ thống miễn phí. |
| **PostgreSQL Client (`psql`)** | `Chưa cài đặt` | **CÒN THIẾU** | Cần thiết để kết nối trực tiếp, kiểm tra bảng và chạy script SQL trên Neon PostgreSQL. |
| **PostgreSQL Backup Tools (`pg_dump`, `pg_restore`)** | `Chưa cài đặt` | **CÒN THIẾU** | Cần thiết để xuất/sao lưu dữ liệu và khôi phục vào Neon. |
| **Neon CLI (`neon`)** | Sẵn sàng qua `npx neon@latest` | ĐÃ CÓ | Đã đăng nhập và liên kết thành công với project `autumn-dream-42270306`. |
| **PostgreSQL Driver trong Node.js (`pg`)** | Đã cài đặt (`pg: ^8.13.3`) | ĐÃ CÓ | Kết nối và chạy migration vào Neon thành công. |
| **Cloudflare CLI (`wrangler`)** | Đã đăng nhập (`wrangler: 4.166.0`) | ĐÃ CÓ | Đã đăng nhập OAuth và xác minh 3 bucket R2 thành công. |
| **AWS S3 SDK Client cho Cloudflare R2** | Đã cài đặt (`@aws-sdk/client-s3: ^3.758.0`) | ĐÃ CÓ | Đã tích hợp trong gara-bot-server để xử lý Presigned URL và kết nối 3 bucket R2. |

---

## 2. Đề xuất Cài đặt Công cụ (Miễn phí & An toàn)

Để làm việc trơn tru với Neon PostgreSQL và Cloudflare R2 mà không tốn chi phí:

1. **Cài đặt PostgreSQL Client Tools (psql, pg_dump, pg_restore):**
   - **Cách 1 (Khuyên dùng qua Winget):** Chạy lệnh trong PowerShell (quyền Admin):
     ```powershell
     winget install PostgreSQL.PostgreSQL.16 --accept-source-agreements --accept-package-agreements
     ```
   - **Cách 2:** Tải bộ cài đặt chính thức từ trang chủ PostgreSQL (chọn chỉ cài Command Line Tools nếu không muốn chạy PostgreSQL server nền): [PostgreSQL Official Downloads](https://www.postgresql.org/download/windows/).
2. **Cài đặt Neon CLI (`neonctl`):**
   - Cài đặt toàn cục (Global) qua npm:
     ```powershell
     npm install -g neonctl
     ```
   - Hoặc sử dụng trực tiếp qua `npx neonctl` khi cần.
3. **Thư viện Backend (sẽ thực hiện ở giai đoạn code backend):**
   - `pg` và `@types/pg` (Node PostgreSQL driver).
   - `@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner` (Cloudflare R2 SDK).

---

## 3. Khảo sát Cấu trúc Dự án `gara-manager`

### 3.1. Frontend (`src/`)
- **Công nghệ:** React 18, Vite 5, TypeScript 5.5, Tailwind CSS, Zustand, React Router DOM v6.
- **Mức độ phụ thuộc Supabase:** **Rất cao (BaaS Model)**
  - Frontend hiện tại đang kết nối trực tiếp tới Supabase bằng thư viện `@supabase/supabase-js` thông qua file khởi tạo `src/lib/supabase.ts`.
  - Có **17 file service** gọi trực tiếp các phương thức của Supabase SDK (`supabase.from(...)`):
    - `vehicle.service.ts`: Quản lý xe (`vehicles`).
    - `task.service.ts`: Quản lý công việc và lịch sử thao tác (`tasks`, `task_activity_logs`).
    - `checksheet.service.ts`: Phiếu kiểm tra xe (`check_sheets`, `checksheet_logs`).
    - `vehicleOption.service.ts`: Danh mục option xe (`vehicle_option_defs`).
    - `websiteSettings.service.ts`: Cấu hình website (`website_settings`).
    - `publicWeb.service.ts`: Dữ liệu web công khai (`public_vehicles`, `public_vehicle_images`).
    - `vehicleMedia.service.ts`: Ảnh xe và tài liệu (`vehicle_images`, `vehicle_documents`).
    - `position.service.ts`: Vị trí đỗ xe trong gara (`positions`).
    - `attendance.service.ts`: Dữ liệu chấm công (`attendance`).
    - `moveLog.service.ts`: Lịch sử di chuyển xe (`move_logs`).
    - `users.service.ts`: Thông tin nhân sự (`users`).
    - `notification.service.ts`: Thông báo hệ thống (`notifications`).
    - `vehicleWorkflow.service.ts`: Log quy trình xe (`vehicle_workflow_logs`).
    - `locationService.ts`: Vị trí cơ sở (`locations`).
    - `telegramConfig.service.ts`: Cấu hình Telegram.
    - `storage.service.ts`: Upload/xem/xóa file trên Supabase Storage.
    - `realtime.service.ts`: Lắng nghe thay đổi dữ liệu thời gian thực (8 bảng qua WebSocket).
  - **Xác thực người dùng (Auth):** Sử dụng Supabase Auth (`supabase.auth.signUp`, `signInWithPassword`, `getSession`) kết hợp `useAuthStore.ts`.

### 3.2. Backend (`gara-bot-server/`)
- **Công nghệ:** Node.js, Express 4, TypeScript, Telegraf (Telegram Bot).
- **Hiện trạng:** Đây là một micro-service phục vụ Telegram Bot (liên kết mã tài khoản Telegram nhân viên và nhận thông báo).
- **Lưu ý quan trọng:** `gara-bot-server` **chưa phải là Backend API** cho toàn bộ frontend. Khi bỏ Supabase, cần mở rộng server này (hoặc xây dựng REST API Express) để làm cầu nối trung gian giữa Frontend và Neon PostgreSQL + Cloudflare R2.

### 3.3. Các file Migration SQL (`migrations/`)
- Gồm **42 file migration** từ `001_initial_schema.sql` đến `042_add_vehicle_options_checked.sql`.
- Backend bot có thêm file: `gara-bot-server/migrations/20250101000000_telegram_users.sql`.
- **Khả năng tương thích với Neon PostgreSQL:** **Rất cao (~95% - 100%)**. Toàn bộ cấu trúc dùng chuẩn PostgreSQL thuần (UUID `gen_random_uuid()`, ENUM types, JSONB, Indexes, Views). Không có stored procedure/trigger phức tạp phụ thuộc riêng vào Supabase (trigger import đã được gỡ bỏ từ migration 011).

### 3.4. Các file Cấu hình và Biến môi trường (.env)
- `.env`: Chứa `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `.env.publicweb`: Chứa `VITE_APP_MODE`.
- `gara-bot-server/.env`: Chứa `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `FRONTEND_URL`.
- `migrations/.env.local`: Chứa `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- *Hiện chưa có chuỗi kết nối PostgreSQL trực tiếp (`DATABASE_URL`), thông tin cấu hình Neon hoặc Cloudflare R2.*

---

## 4. Tình trạng File Backup Dữ liệu trong Dự án

- **Dữ liệu thực tế (Data Dumps):** Đã nạp thành công 100% dữ liệu thực tế từ thư mục `backups/` vào Neon PostgreSQL (109 vehicles, 116 check_sheets, 749 vehicle_images, 213 tasks, 144 workflow logs, 184 move logs, 7 users, 7 positions, 16 options, 1 setting, 1 attendance, 1 website setting).
- **Cấu trúc DDL:** 42 file migration đã hoàn thành 100% trên Neon.
- **Dữ liệu Mật khẩu:** Chưa có password hash trong các file sao lưu (do Supabase lưu riêng trong schema nội bộ `auth.users`).

---

## 5. Kế hoạch Các Bước Tiếp Theo (Next Steps)

```
[BƯỚC 1: HẠ TẦNG & MIGRATION NEON + CLOUDFLARE R2] ─── (HOÀN THÀNH 100%)
  ├── Kết nối Neon PostgreSQL & 42 Migration DDL
  ├── Nạp Dữ liệu nền (Master Data)
  └── Xác minh 3 Private Bucket Cloudflare R2
        │
        ▼
[BƯỚC 2: KHÔI PHỤC DỮ LIỆU NGHIỆP VỤ TỪ BẢN SAO LƯU] ─── (HOÀN THÀNH 100%)
  ├── Nhập 3 bảng cốt lõi (vehicles, check_sheets, vehicle_images)
  └── Nhập toàn bộ bảng lịch sử (tasks, move_logs, workflow_logs, users,...)
        │
        ▼
[BƯỚC 3: HOÀN THIỆN HỆ THỐNG XÁC THỰC AUTH & BACKEND API] ─── (HOÀN THÀNH 100%)
  ├── Phân tích Auth schema & rà soát password hash (HOÀN THÀNH 100%)
  ├── Cập nhật password_hash cho 7 tài khoản từ Supabase Phương án A (HOÀN THÀNH 100%)
  ├── Cài đặt bcryptjs, sinh JWT_SECRET 256-bit, khắc phục rủi ro Git (HOÀN THÀNH 100%)
  ├── Hoàn thiện API đăng nhập, hồ sơ, đăng xuất, RBAC, Rate Limiting (HOÀN THÀNH 100%)
  └── Viết API CRUD nghiệp vụ: xe, task, checksheet, nhân viên, vị trí (HOÀN THÀNH 100%)
        │
        ▼
[BƯỚC 4: CHUYỂN ĐỔI FRONTEND & KHÔI PHỤC DỮ LIỆU THỰC TẾ] ─── (CỐT LÕI HOÀN THÀNH 100%)
  ├── Thay thế Supabase Auth store (useAuthStore.ts) bằng JWT Backend API (HOÀN THÀNH 100%)
  ├── Khảo sát toàn diện Data Services & phân tích lỗi Dashboard (HOÀN THÀNH 100%)
  ├── Tạo API Client chuẩn có JWT Bearer và xử lý lỗi (HOÀN THÀNH 100%)
  ├── Chuyển đổi các service nghiệp vụ (xe, task, checksheet, nhân sự) sang Express REST API (HOÀN THÀNH 100%)
  ├── Nâng cấp Zustand Store hiển thị dữ liệu thật không che giấu lỗi (HOÀN THÀNH 100%)
  └── Hiển thị ảnh và tài liệu thông qua Cloudflare R2 Presigned URLs (BƯỚC TIẾP THEO)
        │
        ▼
[BƯỚC 5: KIỂM THỬ THỰC TẾ TRÊN LOCALHOST & UAT] ◄── [ĐANG Ở ĐÂY]
  ├── Xác nhận hiển thị Dashboard và danh sách 109 xe trên localhost
  ├── Kiểm tra tạo/lưu CheckSheet và sinh Task tự động
  └── Hoàn thiện các module phụ còn lại và cắt chuyển khỏi Supabase
```
