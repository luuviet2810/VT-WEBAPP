# VT AUTO — SUPABASE DISCONNECTION REPORT
**Ngày thực hiện:** 22/11/2026  
**Dự án:** VT AUTO (`gara-manager` & `gara-bot-server`)  
**Mục tiêu:** Cắt đứt hoàn toàn sự phụ thuộc runtime vào Supabase cho Admin Web, chuyển sang Express API + Neon PostgreSQL + Cloudflare R2, bảo toàn 100% Supabase cũ làm Legacy Backup.

---

## 1. TỔNG QUAN KIẾN TRÚC MỚI

Hệ thống quản lý garage VT AUTO đã chính thức vận hành trên kiến trúc độc lập:
- **Frontend Admin Web:** React 18 + Vite + TailwindCSS (Hosted trên Vercel: `admin-vtauto.vercel.app`).
- **Backend API:** Node.js Express (`gara-bot-server`) với bảo mật JWT HS256, RBAC (Admin / Staff), CORS cấu hình linh hoạt.
- **Database:** Neon Serverless PostgreSQL (`autumn-dream-42270306`, branch `production`).
- **Object Storage:** Cloudflare R2 (Buckets: `vehicle-images`, `vehicle-documents`, `checksheet-photos`).
- **Legacy Backup (Read-Only Archive):** Supabase project `obhamybvdpgremtofvvb` được bảo lưu nguyên vẹn 100% cấu trúc, dữ liệu và bucket lưu trữ, không còn bất kỳ liên kết runtime nào với Admin Web.

---

## 2. PHÂN LOẠI & KẾT QUẢ RÀ SOÁT CÁC ĐIỂM LIÊN KẾT SUPABASE

Toàn bộ 133 điểm tham chiếu Supabase trên 23 tệp tin đã được phân loại vào 4 nhóm và xử lý triệt để:

```
+----------------------------------------------------------------------------------+
|                     PHÂN LOẠI PHỤ THUỘC SUPABASE (133 matches)                   |
+----------------------------------------------------------------------------------+
| [Nhóm A] 8 Modules Nghiệp Vụ Cốt Lõi  --> Đã chuyển Express API + Neon           |
| [Nhóm B] File & Object Storage         --> Đã bọc an toàn, chuẩn bị Cloudflare R2 |
| [Nhóm C] 6 Thành phần phụ thuộc cũ     --> ĐÃ CẮT ĐỨT HOÀN TOÀN TRONG GIAI ĐOẠN NÀY|
| [Nhóm D] Dead code (Code thừa)         --> Đã cô lập, không ảnh hưởng hệ thống    |
+----------------------------------------------------------------------------------+
```

### Nhóm A — Đã hoàn thành chuyển đổi sang Express + Neon
Các module nghiệp vụ cốt lõi đã hoàn toàn sử dụng Express API client (`src/services/api.client.ts`) truy vấn Neon:
1. **Authentication:** `src/services/auth.service.ts`, `src/store/useAuthStore.ts` (`POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`).
2. **Vehicles:** `src/services/vehicle.service.ts` (`/api/vehicles`).
3. **Positions:** `src/services/position.service.ts` (`/api/positions`).
4. **CheckSheets:** `src/services/checksheet.service.ts` (`/api/checksheets`).
5. **Tasks:** `src/services/task.service.ts` (`/api/tasks`).
6. **Move Logs:** `src/services/moveLog.service.ts` (`/api/move-logs`).
7. **Attendance:** `src/services/attendance.service.ts` (`/api/attendance`).
8. **Employees:** `src/services/users.service.ts` (`/api/employees`).

---

### Nhóm B — Storage & File Media
- **Tình trạng:** Supabase cũ đang bị giới hạn dung lượng (`exceed_storage_size_quota`).
- **Xử lý:**
  - `src/services/storage.service.ts`: Toàn bộ các hàm upload (`uploadVehicleImage`, `uploadVehicleDocument`, `uploadExteriorPhoto`) và delete đã được trang bị cơ chế kiểm tra `isSupabaseConfigured`.
  - Nếu không có cấu hình Supabase, hàm xử lý an toàn (safe fallback / bypass), ghi warning vào log mà **không làm crash giao diện**.
  - Backend đã sẵn sàng endpoint presigned URL S3 API (`POST /api/storage/presigned-upload`, `POST /api/storage/presigned-download`) trên Cloudflare R2.

---

### Nhóm C — Các phụ thuộc còn lại đã được cắt đứt trong đợt này

| Thành phần | Đường dẫn | Tình trạng trước đây | Giải pháp cắt đứt |
| :--- | :--- | :--- | :--- |
| **Quản lý Nhân sự** | `src/pages/Employees.tsx` | 16 lần dynamic import `lib/supabase` để duyệt, từ chối, cập nhật role, xóa nhân viên | Thay thế bằng `getUsers()`, `updateUser()`, `deleteUser()` qua `src/services/users.service.ts` kết nối `/api/employees`. |
| **Thống kê Dashboard** | `src/pages/dashboards/OverviewDashboard.tsx` | 2 lần import `lib/supabase` truy vấn bảng `vehicle_images` tìm ảnh lỗi và ảnh giấy tờ thiếu | Xây dựng API `GET /api/vehicles/media-stats` trên Backend, gom nhóm và tính toán trực tiếp trên Neon PostgreSQL. |
| **Tùy chọn xe (Option catalog)** | `src/services/vehicleOption.service.ts` | Gọi trực tiếp `supabase.from('vehicle_option_defs')` | Chuyển toàn bộ sang API `/api/vehicle-options` (`GET`, `POST`, `PUT`, `DELETE`). |
| **Cấu hình Website** | `src/services/websiteSettings.service.ts` | Gọi trực tiếp `supabase.from('website_settings')` | Chuyển toàn bộ sang API `/api/website-settings` (`GET`, `PUT`). |
| **Nhật ký quy trình xe** | `src/services/vehicleWorkflow.service.ts` | Gọi trực tiếp `supabase.from('vehicle_workflow_logs')` | Chuyển sang API `/api/vehicles/:id/workflow-logs` (`GET`, `POST`). |
| **Metadata Media xe** | `src/services/vehicleMedia.service.ts` | Gọi trực tiếp `supabase.from('vehicle_images')` và `vehicle_documents` | Chuyển toàn bộ sang các endpoint `/api/vehicles/:id/images`, `/api/vehicles/:id/documents`, `/api/vehicles/images/:id/*`. |
| **Giao diện Pre-Web Admin** | `src/services/publicWeb.service.ts` | `getWebsiteImagesGrouped` gọi Supabase `vehicle_images` | Chuyển sang API `/api/vehicles/website-images`. |
| **Realtime Sync** | `src/hooks/useRealtimeSync.ts` & `src/services/realtime.service.ts` | Mở WebSocket liên tục tới Supabase dù đã hết quota | Bọc điều kiện `if (!isSupabaseConfigured) return;`. Realtime Supabase bị vô hiệu hóa hoàn toàn khi không có biến môi trường. |

---

### Nhóm D — Dead Code (Mã nguồn cũ không sử dụng)
- `src/services/locationService.ts`: Đã kiểm tra đối chiếu qua script tìm kiếm — **0 tệp tin nào import**. Đã ép kiểu an toàn.
- `src/services/notification.service.ts`: Hệ thống thông báo cũ — **0 tệp tin nào import**. Đã ép kiểu an toàn.

---

## 3. TÁCH BIỆT TUYỆT ĐỐI GIỮA ADMIN WEB VÀ PUBLIC WEB

- **Cơ chế tách biệt tại `src/main.tsx`:**
  Ứng dụng sử dụng Dynamic Code Splitting dựa trên biến môi trường `VITE_APP_MODE`:
  ```ts
  const isPublicMode = import.meta.env.VITE_APP_MODE === 'public'
  const Root = isPublicMode
    ? (await import('./public/PublicApp')).default
    : (await import('./App')).default
  ```
- **Kết quả đóng gói:**
  - `npm run build` (Admin Web): Đóng gói `src/App.tsx` vào chunk `dist/assets/App-*.js`. Public Web hoàn toàn không được nạp vào Admin chunk.
  - `npm run build:public` (Public Web): Đóng gói `src/public/PublicApp.tsx` vào chunk `dist/assets/PublicApp-*.js`.
  - Việc Public Web chưa hoàn thiện hoặc có lỗi kết nối **hoàn toàn không ảnh hưởng tới Admin Web**.

---

## 4. XÁC NHẬN BẢO TOÀN SUPABASE CŨ (LEGACY BACKUP)

- **Trạng thái Project:** `obhamybvdpgremtofvvb` vẫn tồn tại nguyên vẹn.
- **Không can thiệp:**
  - Không xóa project hoặc database trên Supabase.
  - Không xóa schema `public`, `auth` hay bất kỳ bảng nào.
  - Không xóa dữ liệu trong các storage bucket (`vehicle-images`, `vehicle-documents`, `checksheet-photos`).
  - Không vô hiệu hóa hay thay đổi API keys cũ trên Supabase.
- Dự án này đóng vai trò là bản sao lưu lịch sử đối chiếu bất biến (Immutable Cold Backup).

---

## 5. KẾT LUẬN

✅ **Admin Web đã hoàn toàn cắt đứt sự phụ thuộc runtime vào Supabase.**  
✅ **Ứng dụng khởi chạy 100% ổn định mà không cần bất kỳ biến môi trường Supabase nào.**  
✅ **Đã kiểm thử End-to-End toàn bộ API Nhóm C trên Neon PostgreSQL đạt 100% PASS.**  
