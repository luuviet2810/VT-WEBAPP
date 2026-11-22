# BÁO CÁO KIỂM TOÁN KIẾN TRÚC VT AUTO (GARA-MANAGER)
## ĐÁNH GIÁ KHẢ THI MIGRATION TỪ SUPABASE SANG NEON POSTGRESQL + CLOUDFLARE R2

*Ngày kiểm toán: 21/11/2026*  
*Chế độ kiểm toán: READ-ONLY (Không sửa đổi source code, không chạy migration, không thay đổi credentials/production data).*

---

## 1. Executive Summary (Tóm tắt điều hành)

Hệ thống **VT AUTO / gara-manager** hiện tại là kiến trúc **BaaS (Backend-as-a-Service)** lai (hybrid):
1. **Frontend (React 18 + Vite + TypeScript)** kết nối **trực tiếp** từ trình duyệt tới Supabase qua thư viện `@supabase/supabase-js`, sử dụng `VITE_SUPABASE_ANON_KEY` để thực hiện:
   - Toàn bộ hoạt động xác thực người dùng (**Supabase Auth**: đăng ký, đăng nhập, phiên, đổi mật khẩu).
   - Toàn bộ truy vấn dữ liệu CRUD qua **PostgREST** trên hơn 18 bảng nghiệp vụ.
   - Quản lý tệp đa phương tiện trực tiếp qua **Supabase Storage** (upload ảnh xe, giấy tờ, ảnh kiểm tra).
   - Lắng nghe dữ liệu thời gian thực qua **Supabase Realtime (WebSockets)** cho 8 bảng.
2. **Backend Express (`gara-bot-server`)** hiện tại **CHỈ là một micro-service riêng biệt phục vụ Telegram Bot** (quản lý liên kết tài khoản Telegram của nhân viên và gửi thông báo). Nó **hoàn toàn không** phải là một API Gateway hay backend xử lý nghiệp vụ chung cho frontend.
3. **Mục tiêu đề xuất:** Chuyển đổi từ Supabase sang **Neon PostgreSQL (Database)** + **Cloudflare R2 (Object Storage)**, giữ nguyên frontend React/Vite (deploy trên Vercel) và phát triển backend Node.js/Express.

### Kết luận khả thi sơ bộ:
- **Neon PostgreSQL:** **Rất khả thi (95% tương thích).** Toàn bộ schema của VT AUTO là chuẩn PostgreSQL (UUID `gen_random_uuid()`, ENUM types, JSONB, View, Index). Do trigger import đã được gỡ bỏ từ migration 011 và không còn Stored Procedures/RPC phức tạp, schema có thể import nguyên bản vào Neon mà không cần viết lại câu lệnh DDL.
- **Cloudflare R2:** **Rất khả thi và tiết kiệm chi phí tối đa.** R2 hỗ trợ chuẩn S3-compatible API. Tuy nhiên, frontend **không được phép** gọi trực tiếp R2 bằng secret key (sẽ lộ khóa); do đó bắt buộc phải có backend Express hoặc Cloudflare Worker cấp **Presigned URL** cho upload.
- **Thách thức lớn nhất nằm ở lớp trung gian (Data Access & Auth):** Do hiện tại frontend gọi thẳng Supabase SDK ở trình duyệt, nếu bỏ Supabase thì **toàn bộ 17 service files ở frontend** sẽ không còn backend PostgREST/Auth để gọi trực tiếp. Bạn sẽ cần một backend Express làm REST/GraphQL API server hoặc chuyển sang giải pháp Backend API tập trung.

---

## 2. Supabase Dependency Inventory (Kiểm kê phụ thuộc Supabase)

### 2.1. Client SDK & Khởi tạo
- **File khởi tạo duy nhất ở frontend:** `src/lib/supabase.ts:1-7`
  - Đọc biến: `import.meta.env.VITE_SUPABASE_URL`, `import.meta.env.VITE_SUPABASE_ANON_KEY`.
  - Khởi tạo: `export const supabase = createClient(supabaseUrl, supabaseAnonKey)`.
- **File khởi tạo ở backend bot:** `gara-bot-server/src/supabase.ts:1-15`
  - Đọc biến: `process.env.SUPABASE_URL`, `process.env.SUPABASE_SERVICE_ROLE_KEY`.

### 2.2. Supabase Auth
- **Vị trí code:** `src/services/auth.service.ts` và `src/store/useAuthStore.ts`.
- **Hàm SDK sử dụng:**
  - `supabase.auth.signUp()`: Đăng ký tài khoản mới bằng Email/Password.
  - `supabase.auth.signInWithPassword()`: Đăng nhập.
  - `supabase.auth.signOut()`: Đăng xuất.
  - `supabase.auth.getSession()`: Lấy JWT session từ trình duyệt.
  - `supabase.auth.getUser()`: Lấy thông tin user hiện tại từ token.
  - `supabase.auth.onAuthStateChange()`: Lắng nghe trạng thái đăng nhập/hết hạn token để load profile vào Zustand store.
- **Mô hình tài khoản:**
  - Supabase quản lý credentials trong schema nội bộ `auth.users`.
  - Bảng nghiệp vụ `public.users` liên kết với Supabase Auth thông qua cột `auth_id` (chứa `auth.users.id`).
  - Mật khẩu người dùng được băm (hashed) bằng thuật toán bcrypt nội bộ của Supabase và nằm hoàn toàn trong bảng ẩn `auth.users`.

### 2.3. Database Queries (PostgREST)
Frontend đang gọi trực tiếp các phương thức `.from('table').select().insert().update().delete().order().range()` trên 17 service files:
1. `src/services/vehicle.service.ts`: `vehicles`
2. `src/services/task.service.ts`: `tasks`, `task_activity_logs`
3. `src/services/checksheet.service.ts`: `check_sheets`, `checksheet_logs`
4. `src/services/vehicleOption.service.ts`: `vehicle_option_defs`
5. `src/services/websiteSettings.service.ts`: `website_settings`
6. `src/services/publicWeb.service.ts`: `public_vehicles`, `public_vehicle_images`
7. `src/services/vehicleMedia.service.ts`: `vehicle_images`, `vehicle_documents`
8. `src/services/position.service.ts`: `positions`
9. `src/services/attendance.service.ts`: `attendance`
10. `src/services/moveLog.service.ts`: `move_logs`
11. `src/services/users.service.ts`: `users`
12. `src/services/notification.service.ts`: `notifications`
13. `src/services/vehicleWorkflow.service.ts`: `vehicle_workflow_logs`
14. `src/services/locationService.ts`: `locations`
15. `src/public/publicApi.ts`: `public_vehicles`, `public_vehicle_images`, `vehicle_option_defs`
16. `src/pages/dashboards/OverviewDashboard.tsx`: Query bổ sung kiểm tra ảnh/checksheet
17. `src/pages/Employees.tsx`: Query quản trị nhân sự trên `users`

### 2.4. Realtime Subscriptions
- **Vị trí code:** `src/services/realtime.service.ts:22-185` và `src/hooks/useRealtimeSync.ts`.
- **Cơ chế:** Dùng `supabase.channel().on('postgres_changes', ...).subscribe()` để đồng bộ tức thời:
  - `realtime-vehicles`: INSERT, UPDATE, DELETE bảng `vehicles`.
  - `realtime-tasks`: INSERT, UPDATE, DELETE bảng `tasks`.
  - `realtime-positions`: INSERT, UPDATE, DELETE bảng `positions`.
  - `realtime-movelogs`: INSERT bảng `move_logs`.
  - `realtime-taskactivity`: INSERT bảng `task_activity_logs`.
  - `realtime-vehicleimages`: INSERT, DELETE bảng `vehicle_images`.
  - `realtime-vehicledocs`: INSERT, DELETE bảng `vehicle_documents`.
  - `realtime-notifications`: INSERT bảng `notifications`.

### 2.5. Storage (Tệp đa phương tiện)
- **Vị trí code:** `src/services/storage.service.ts`
- **Các bucket đang sử dụng:**
  1. `vehicle-images`: Lưu ảnh xe (`vehicles/{vehicleId}/{timestamp}_{filename}`).
  2. `vehicle-documents`: Lưu giấy tờ đăng kiểm, bảo hiểm (`documents/{vehicleId}/{timestamp}_{filename}`).
  3. `checksheet-photos`: Lưu ảnh ngoại thất kiểm tra từng vị trí (`checksheets/{vehicleId}/{spotKey}/{timestamp}_{filename}`).
- **Phương thức SDK sử dụng:**
  - `supabase.storage.from(bucket).upload(path, file, { upsert: false })`
  - `supabase.storage.from(bucket).getPublicUrl(path)`
  - `supabase.storage.from(bucket).remove([path])`
  - `supabase.storage.from(bucket).download(path)` (trong script kiểm tra)

### 2.6. RPC Functions & Edge Functions
- **RPC:** Qua rà soát toàn bộ source code `src/` và `gara-bot-server/`, **không có bất kỳ lời gọi `supabase.rpc()` nào**.
- **Edge Functions:** Không có thư mục `supabase/functions` hoặc mã Deno Edge Functions trong repository.

---

## 3. Database Schema Inventory (Kiểm kê cấu trúc dữ liệu)

Toàn bộ lược đồ được cấu trúc qua **42 file migration SQL** (từ `001_initial_schema.sql` đến `042_add_vehicle_options_checked.sql`):

### 3.1. Danh sách ENUMs (PostgreSQL Custom Types)
- `vehicle_status`: `'available'`, `'deposited'`, `'sold'`
- `task_priority`: `'low'`, `'medium'`, `'high'`, `'urgent'` (017 chuyển urgent thành high)
- `task_status`: `'todo'`, `'doing'`, `'done'`
- `user_role`: `'admin'`, `'staff'`
- `user_status`: `'pending'`, `'approved'`, `'rejected'`, `'disabled'`
- `checksheet_type`: `'in'`, `'out'`
- `activity_action`: `'create'`, `'update'`, `'delete'`, `'login'`, `'logout'`, `'register'`, `'check_in'`, `'check_out'`, `'move_vehicle'`, `'check_sheet_in'`, `'check_sheet_out'`, `'approve'`, `'reject'`, `'enable'`, `'disable'`

### 3.2. Danh sách bảng (19 bảng)
1. **`users`**: Quản lý nhân viên/tài khoản. Khóa chính `id` UUID. Khóa ngoại logic `auth_id` TEXT liên kết auth.
2. **`passkeys`**: Lưu WebAuthn credentials (hiện chỉ là bản nháp giao diện).
3. **`positions`**: Vị trí bãi xe (`id` UUID, `name`, `sort_order`).
4. **`vehicles`**: Bảng lõi xe (`id` UUID, `plate` text cho phép trùng sau 039, `model`, `brand`, `year`, `fuel_type`, `displacement`, `mileage`, `color`, `cost_price`, `sell_price`, `status`, `position_id` FK, `assignee_id` FK, `is_public`, `public_sort_order`, `options` JSONB, `options_checked`, `sold_date`, `yard_position`, `images_deleted_at`, `song_nung_expiry_date`, `registration_expiry_date`).
5. **`vehicle_images`**: Metadata ảnh xe (`id` UUID, `vehicle_id` FK cascade, `path`, `bucket`, `url`, `thumbnail`, `size_bytes`, `mime_type`, `sort_order`, `category`, `subtype`, `resolved`, `song_nung_expiry_date`).
6. **`vehicle_documents`**: Metadata giấy tờ (`id` UUID, `vehicle_id` FK cascade, `label`, `path`, `bucket`, `url`, `size_bytes`, `mime_type`, `sort_order`).
7. **`tasks`**: Nhiệm vụ Kanban (`id` UUID, `title`, `description`, `checklist` JSONB, `priority`, `status`, `assignee_id` FK set null, `vehicle_id` FK set null, `due_date`, `due_time`, `rule_id`, `source`, `deferred`, `sold_handled`, `vehicle_model_snapshot`, `vehicle_plate_snapshot`).
8. **`task_activity_logs`**: Lịch sử task (`id` UUID, `task_id` FK cascade, `user_id` FK set null, `action`).
9. **`move_logs`**: Lịch sử chuyển bãi (`id` UUID, `vehicle_id` FK cascade, `from_position_id` FK set null, `to_position_id` FK set null, `user_id` FK set null).
10. **`attendance`**: Chấm công nhân viên (`id` UUID, `user_id` FK cascade, `date` DATE, `check_in`, `check_out`, `note`). UNIQUE (`user_id`, `date`).
11. **`check_sheets`**: Phiếu kiểm tra đầu vào/đầu ra (`id` UUID, `vehicle_id` FK cascade, `type`, `checker_id` FK set null, `check_date`, `fuel_level`, `screen`, `rear_camera`, `hipass`, `rear_sensor`, `dashcam`, `interior` JSONB, `exterior` JSONB, `exterior_photos` JSONB, `out_check` JSONB, `out_notes`, `undercarriage_status`, `input_tire_inflated`, `output_tire_inflated`, `cabin_air_filter`, `engine_oil_level`, `engine_air_filter`, `input_den_pha_cot`, `input_motor_guong_nut_bam`, `input_cua_so`, `input_ghe_chinh_dien`, `input_acquy_soh`, `input_acquy_soc`, `acquy_soh`, `acquy_soc`).
12. **`checksheet_logs`**: Audit log kiểm tra (`id` UUID, `checksheet_id` FK cascade, `editor_id` FK set null, `field`, `old_value` JSONB, `new_value` JSONB).
13. **`notifications`**: Thông báo (`id` UUID, `user_id` FK set null, `type`, `title`, `body`, `read`, `data` JSONB).
14. **`activity_logs`**: System audit log (`id` UUID, `user_id` FK set null, `action`, `entity_type`, `entity_id` UUID, `description`, `metadata` JSONB, `ip_address`, `user_agent`).
15. **`settings`**: Cấu hình công ty/giờ làm (`id` UUID, 1 row).
16. **`locations`**: Địa điểm (`id` UUID).
17. **`vehicle_workflow_logs`**: Tiến độ xe (`id` UUID, `vehicle_id` FK cascade, `new_status`, `changed_by`).
18. **`vehicle_option_defs`**: Danh mục Option xe (`id` UUID, `group_key`, `group_label`, `key`, `label`, `sort_order`).
19. **`website_settings`**: Cấu hình trang Public Web (`id` UUID, hotline, zalo, địa chỉ, banner...).
20. *(Phụ trợ)* **`vehicles_import`**: Bảng staging import tạm (trigger đã xóa).
21. *(Phụ trợ bot)* **`telegram_users`**, **`telegram_logs`**: Quản lý bot Telegram.

### 3.3. Views (2 Views)
- **`public_vehicles`**: View an toàn cho khách, chỉ lấy xe `is_public = true` và `status = 'available'` (đã cập nhật qua 034).
- **`public_vehicle_images`**: View ảnh website của xe public.

### 3.4. Triggers, Functions & RLS
- **Functions/Triggers:** Toàn bộ trigger import xe đã bị `DROP` tại migration 011. Hệ thống **không có trigger nào đang hoạt động**.
- **RLS Policies:** Được định nghĩa ở migration 003, 031, 035, 036, 041. **Lưu ý quan trọng:** RLS chỉ có tác dụng khi truy cập qua Supabase PostgREST client; khi chuyển sang Backend Express kết nối trực tiếp PostgreSQL bằng Connection String (user `postgres`), các câu lệnh SQL sẽ chạy trực tiếp và bỏ qua RLS (BypassRLS), quyền hạn sẽ do middleware của Express kiểm soát.

---

## 4. Authentication & Authorization (Xác thực & Phân quyền)

### 4.1. Thực trạng kiến trúc Auth
- Frontend đăng nhập trực tiếp qua `supabase.auth.signInWithPassword()`.
- Supabase cấp cặp token: `access_token` (JWT chứa `sub = auth_id`) và `refresh_token` lưu trong `localStorage` dưới key `sb-<ref>-auth-token`.
- Sau khi có token, frontend truy vấn bảng `users` với điều kiện `.eq('auth_id', auth_id)` để lấy vai trò (`role = 'admin'` hoặc `role = 'staff'`) và nạp vào `useAuthStore`.

### 4.2. Vấn đề mật khẩu khi chuyển sang Neon
- **Supabase Auth lưu mật khẩu trong schema nội bộ `auth.users`**. Bảng này **không thể export trực tiếp** bằng các lệnh PostgREST thông thường của frontend, mà cần quyền Superuser database export (pg_dump trên schema `auth`).
- Mật khẩu được mã hóa bằng thuật toán bcrypt.
- **Phương án giải quyết khi chuyển sang Neon:**
  - *Phương án A (Khuyến nghị - An toàn & Chuẩn xác):* Xuất bảng `public.users` sang Neon. Bổ sung trường `password_hash` vào bảng `users`. Thiết lập luồng đăng nhập qua Express backend bằng `bcryptjs` + `jsonwebtoken`. Khi chuyển đổi hệ thống, toàn bộ nhân viên được gửi email/link đặt lại mật khẩu hoặc Admin cấp mật khẩu tạm thời ban đầu.
  - *Phương án B (Giữ nguyên mật khẩu nếu export được auth.users):* Dump bảng `auth.users` lấy trường `encrypted_password` sang cột `password_hash` của Neon. Thư viện `bcrypt` của Node.js hoàn toàn tương thích và giải mã kiểm tra được các chuỗi hash bcrypt này.

---

## 5. Storage & Image Handling (Lưu trữ ảnh & Cloudflare R2)

### 5.1. Khối lượng và cấu trúc file
- Hiện có **khoảng 343+ file ảnh** (~402 MB) và nhiều ảnh xe đang hoạt động trong bucket `vehicle-images`.
- Đường dẫn file có cấu trúc rõ ràng:
  - `vehicles/{vehicle_id}/{filename}`
  - `documents/{vehicle_id}/{filename}`
  - `checksheets/{vehicle_id}/{spotKey}/{filename}`
- Bảng `vehicle_images` và `vehicle_documents` lưu cả `path` và `url` tuyệt đối:
  `https://<project-ref>.supabase.co/storage/v1/object/public/vehicle-images/...`

### 5.2. Chuyển đổi sang Cloudflare R2
- **Tính tương thích:** Cloudflare R2 tương thích 100% với chuẩn S3 API (sử dụng thư viện `@aws-sdk/client-s3` trên Node.js Express).
- **Kiến trúc tải lên (Upload Flow):**
  - Trình duyệt **không được chứa R2 Access Key/Secret Key**.
  - **Quy trình chuẩn:**
    1. Trình duyệt gửi request `POST /api/media/presign-upload` lên Express backend kèm `fileName`, `fileType`, `vehicleId`.
    2. Express backend kiểm tra JWT (xác thực nhân viên), tạo một **Presigned S3 PUT URL** từ R2 với thời hạn 5 phút và trả về client.
    3. Trình duyệt dùng `fetch(presignedUrl, { method: 'PUT', body: file })` đẩy thẳng file lên R2 (không tốn băng thông backend).
    4. Trình duyệt gọi `POST /api/media/confirm` để lưu metadata (`path`, `size`, `url`) vào PostgreSQL Neon.
- **Domain & Public URL:**
  - Cloudflare R2 cho phép gắn Custom Domain miễn phí (ví dụ: `https://media.vtauto.vn` hoặc `https://pub-<id>.r2.dev`).
  - Đường dẫn ảnh trên R2 giữ nguyên cấu trúc `/vehicles/{vehicle_id}/{filename}`.
  - Khi migrate, chỉ cần chạy một câu lệnh SQL UPDATE đơn giản trên bảng `vehicle_images` và `vehicle_documents`:
    ```sql
    UPDATE vehicle_images 
    SET url = REPLACE(url, 'https://<old-ref>.supabase.co/storage/v1/object/public/vehicle-images', 'https://media.vtauto.vn')
    WHERE url LIKE '%supabase.co%';
    ```

---

## 6. Frontend / Backend Dependency Map (Bản đồ phụ thuộc)

| Thành phần | Hiện tại (Supabase) | Đích đề xuất (Neon + R2 + Express) |
|---|---|---|
| **Database Engine** | Supabase Postgres 15 (AWS us-east) | **Neon Serverless PostgreSQL** |
| **Data Access** | Trình duyệt gọi `@supabase/supabase-js` | **Express Backend API** (dùng `pg` / `drizzle-orm` / `prisma`) kết nối Neon |
| **Authentication** | Supabase Auth (GoTrue) | **Express Auth Controller** (JWT HttpOnly Cookie hoặc Bearer Token + bcrypt) |
| **File Storage** | Supabase Storage (S3-compatible) | **Cloudflare R2** (Upload qua Presigned URL S3 API) |
| **Realtime** | Supabase Realtime (Elixir Phoenix WS) | **Server-Sent Events (SSE)** hoặc **WebSocket (ws)** trên Express, hoặc polling thông minh |
| **Public Web** | Trình duyệt đọc `public_vehicles` qua anon key | **Public API Endpoint** `GET /api/public/vehicles` (Cache CDN tại Vercel Edge) |
| **Admin / Staff RBAC** | Client hooks + RLS Postgres | **Middleware Express** (`requireAuth`, `requireAdmin`, `requireStaff`) |
| **Bot Telegram** | `gara-bot-server` riêng biệt | Gộp vào chung backend Express chính hoặc giữ làm module route |
| **Hosting Frontend** | Vercel (SPA Vite) | **Vercel** (Giữ nguyên 100%) |
| **Hosting Backend** | Không có (chỉ có bot server chạy riêng) | **Render / Railway / Fly.io / VPS** (Miễn phí hoặc ~$0-5/tháng) |

---

## 7. Migration Complexity (Độ phức tạp chuyển đổi)

| Hạng mục | Khối lượng thay đổi | Rủi ro kỹ thuật | Mức độ phức tạp |
|---|---|---|---|
| **1. Database Schema & Data** | Nhỏ | Rất thấp (PostgreSQL chuẩn, không có tính năng độc quyền của Supabase) | **Thấp** |
| **2. Storage Migration (R2)** | Vừa | Thấp (Dùng công cụ `rclone` hoặc AWS CLI copy từ Supabase sang R2) | **Thấp - Vừa** |
| **3. Backend API Development** | Lớn | Trung bình (Cần viết các endpoint CRUD thay thế cho PostgREST SDK) | **Vừa** |
| **4. Authentication Migration** | Vừa | Trung bình (Tạo bảng auth/mật khẩu, cấp phát JWT và xử lý phiên) | **Vừa** |
| **5. Frontend Services Refactor** | Lớn | Thấp (Chuyển 17 file `src/services/*` từ gọi `supabase.from()` sang gọi `api.get()/post()`) | **Vừa** |
| **6. Realtime Replacement** | Vừa | Trung bình (Nếu cần sync đa thiết bị tức thì, cần SSE/Socket.io) | **Vừa** |

---

## 8. Recommended Target Architecture (Kiến trúc đích đề xuất)

```
[Khách truy cập Web / Nhân viên / Admin]
                  │
                  ▼
         [Vercel Frontend]
   (React 18 + Vite SPA, PWA ready)
      │                       │
      │ (Static Assets &      │ (Upload ảnh qua Presigned S3 URL)
      │  Public Web CDN)      │
      │                       ▼
      │             [Cloudflare R2 Storage]
      │             (Miễn phí 10GB, 0$ egress bandwidth)
      │                       ▲
      ▼                       │ (Tạo Presigned URL & S3 API)
[Node.js / Express Backend API] (Host trên Render / Railway / VPS)
   - Auth Middleware (JWT + Bcrypt)
   - RBAC (Admin / Staff)
   - REST API Controllers (Vehicles, CheckSheet, Tasks, Attendance)
   - Realtime Broadcast (SSE - Server-Sent Events nhẹ nhàng, không tốn ram)
   - Telegram Bot Service (Gộp chung từ gara-bot-server)
      │
      ▼ (Connection Pooling qua pg / drizzle)
[Neon Serverless PostgreSQL]
   - Bảng nghiệp vụ, UUID nguyên bản, JSONB CheckSheets
   - Miễn phí 0.5 GB storage, autoscaling
```

---

## 9. Step-by-step Migration Plan (Kế hoạch từng bước)

### Giai đoạn 1: Chuẩn bị hạ tầng mới (Không gián đoạn hệ thống cũ)
1. **Khởi tạo Neon PostgreSQL:** Tạo dự án Neon, chọn khu vực gần nhất (Singapore - `ap-southeast-1` để có độ trễ thấp nhất về Việt Nam).
2. **Khởi tạo Cloudflare R2:** Tạo bucket `vtauto-media`, thiết lập CORS và gắn Custom Domain (hoặc bật R2 Public Access URL).
3. **Dump Schema & Data từ Supabase sang Neon:**
   - Dùng lệnh `pg_dump` từ Supabase:
     ```bash
     pg_dump -h <supabase_db_host> -U postgres -d postgres --schema=public --no-owner --no-privileges -f vtauto_dump.sql
     ```
   - Chạy import vào Neon:
     ```bash
     psql -h <neon_host> -U <neon_user> -d <neon_db> -f vtauto_dump.sql
     ```
   - Kiểm tra xác nhận toàn bộ 19 bảng, 2 view, dữ liệu UUID và JSONB nguyên vẹn 100%.

### Giai đoạn 2: Di chuyển tệp đa phương tiện (Storage Migration)
1. Dùng công cụ `rclone` (hoặc script Node.js với S3 API) copy toàn bộ file từ 3 bucket Supabase sang Cloudflare R2.
2. Chạy câu lệnh SQL cập nhật các URL ảnh trong bảng `vehicle_images` và `vehicle_documents` từ domain Supabase sang domain Cloudflare R2.

### Giai đoạn 3: Xây dựng Backend Express API Core
1. Mở rộng `gara-bot-server` thành `backend-server` hoàn chỉnh:
   - Module `auth`: Login, Register, Refresh Token, Profile, Password Reset.
   - Module `vehicles`: CRUD xe, cập nhật options, phân quyền xóa xe chỉ Admin.
   - Module `checksheets`: Lưu phiếu kiểm tra đầu vào/đầu ra, lịch sử.
   - Module `tasks`: Kanban tasks, hoàn thành task, auto-sync.
   - Module `media`: Cấp Presigned URL tải lên Cloudflare R2, xác nhận metadata.
   - Module `public`: Endpoint public lấy danh sách xe bán cho khách.
   - Module `realtime`: Sử dụng Server-Sent Events (SSE) để phát thông báo khi có thay đổi dữ liệu.
2. Viết middleware xác thực JWT và kiểm tra quyền Admin/Staff ở tầng Express.

### Giai đoạn 4: Refactor Frontend Client
1. Tạo một API Client duy nhất (`src/lib/api.ts`) dùng `fetch` hoặc `axios` có tự động đính kèm JWT token.
2. Thay thế logic trong 17 files `src/services/*` sang gọi API backend Express thay vì `supabase.from()`.
3. Thay thế `useRealtimeSync.ts` sang lắng nghe SSE endpoint từ backend Express.

### Giai đoạn 5: Cắt chuyển (Cut-over) & Triển khai
1. Đặt thông báo bảo trì tạm thời (khoảng 30 phút).
2. Chạy dump delta dữ liệu mới nhất từ Supabase sang Neon.
3. Deploy Backend lên môi trường chạy (Render / Railway / VPS).
4. Cập nhật biến môi trường frontend trên Vercel sang trỏ vào Backend mới.
5. Kiểm thử toàn diện và gỡ bảo trì.

---

## 10. Critical Risks and Data Preservation Checklist (Rủi ro & Danh mục bảo toàn dữ liệu)

### Checklist bảo toàn dữ liệu:
- [x] **UUID xe và các bảng liên quan:** Giữ nguyên 100%. PostgreSQL trên Neon hỗ trợ hàm `gen_random_uuid()` gốc, toàn bộ ID dạng UUID v4 của xe, task, checksheet sẽ giữ nguyên vẹn giá trị, không bao giờ bị đổi sang số tự tăng (auto-increment).
- [x] **Foreign Keys & Quan hệ:** Quan hệ `ON DELETE CASCADE` và `ON DELETE SET NULL` giữa `vehicles` và `check_sheets`, `tasks`, `vehicle_images`, `move_logs` được giữ nguyên vẹn trong DDL dump.
- [x] **Toàn bộ CheckSheet & Option:** Cột `check_sheets.interior`, `exterior`, `out_check` và `vehicles.options` đều là chuẩn `JSONB` của PostgreSQL. Neon hỗ trợ JSONB hoàn hảo và truy vấn chỉ mục GIN đầy đủ, đảm bảo từng checkbox và trạng thái đã tick không bị mất mát hay sai lệch cấu trúc.
- [x] **Xe trùng biển số:** Tính năng cho phép trùng biển số (đã gỡ UNIQUE constraint ở migration 039) được giữ nguyên, hệ thống tiếp tục định danh duy nhất bằng `vehicle.id`.

### Các rủi ro kỹ thuật cần lưu ý:
1. **Mật khẩu người dùng:** Do Supabase giấu bảng `auth.users`, nếu không dump được schema `auth`, bạn phải gửi thông báo cấp mật khẩu mới cho nhân viên.
2. **Realtime WebSockets:** Neon không có sẵn máy chủ WebSockets như Supabase Realtime. Giải pháp tối ưu và nhẹ nhất là dùng **Server-Sent Events (SSE)** trên Express backend để bắn event khi có mutation, client nhận event và cập nhật Zustand store tương tự hiện tại.
3. **Trình duyệt gọi trực tiếp R2:** Tuyệt đối không để Access Key của R2 ở file `.env` frontend. Bắt buộc phải qua bước cấp Presigned URL của backend.

---

## 11. Trả lời các câu hỏi cụ thể của bạn

### 1. Có thể giữ nguyên PostgreSQL schema không?
**CÓ, HOÀN TOÀN GIỮ NGUYÊN ĐƯỢC.**  
Toàn bộ schema hiện tại của VT AUTO (19 bảng, 2 view, 7 enum, các chỉ mục và ràng buộc khóa ngoại) đều sử dụng các tính năng chuẩn của PostgreSQL (Standard ANSI SQL / Postgres 15). Không có extension độc quyền hay cú pháp riêng của Supabase trong cấu trúc bảng. Bạn có thể xuất nguyên vẹn schema này sang Neon.

### 2. Có thể giữ nguyên UUID của tất cả xe không?
**CÓ, GIỮ NGUYÊN 100%.**  
Khi xuất dữ liệu bằng `pg_dump` (hoặc chép dữ liệu dạng SQL INSERT), giá trị UUID của từng chiếc xe, task, ảnh và phiếu kiểm tra sẽ được giữ nguyên chính xác từng ký tự. Mọi liên kết khóa ngoại (`vehicle_id`) giữa các bảng đều khớp hoàn hảo.

### 3. Làm sao giữ toàn bộ CheckSheet và Option?
Dữ liệu CheckSheet và Option xe nằm trong các cột kiểu **`JSONB`** (`check_sheets.interior`, `check_sheets.exterior`, `check_sheets.out_check`, `vehicles.options`).  
Khi xuất dữ liệu từ Postgres sang Postgres (Neon), toàn bộ cấu trúc cây JSON, key, giá trị chuỗi, boolean và mảng bên trong đều được sao chép nguyên vẹn 1-1, không bị chuyển đổi thành text hay mất định dạng.

### 4. Có thể giữ nguyên tài khoản nhân viên không, hay cần đặt lại mật khẩu?
- **Thông tin nhân viên (Tên, Email, SĐT, Role Admin/Staff, Trạng thái):** **Giữ nguyên 100%** vì nằm trong bảng `public.users`.
- **Mật khẩu:** 
  - Nếu bạn có quyền kết nối trực tiếp vào database Supabase qua PostgreSQL connection string với quyền superuser/postgres, bạn có thể dump bảng `auth.users` và lấy cột `encrypted_password` (chứa hash bcrypt) chuyển sang cột `password_hash` của bảng `users` trên Neon. Khi đó **nhân viên đăng nhập bằng mật khẩu cũ bình thường**.
  - Nếu Supabase của bạn bị khóa hoặc không export được bảng `auth.users`, **nhân viên sẽ cần đặt lại mật khẩu một lần** (Admin tạo mật khẩu mặc định hoặc gửi link đặt lại qua Email/Telegram).

### 5. Những phần nào bắt buộc phải viết lại?
1. **Lớp dịch vụ dữ liệu Frontend (`src/services/*`):** Cần viết lại 17 file này từ việc dùng thư viện `@supabase/supabase-js` sang gọi HTTP REST API thông thường tới backend Express (dùng `fetch` hoặc `axios`).
2. **Backend API (`gara-bot-server`):** Mở rộng từ một bot server đơn giản thành một REST API Server đầy đủ (bổ sung các route đăng nhập, CRUD xe, CheckSheet, Task, Attendance và phân quyền JWT).
3. **Lớp xử lý upload ảnh (`storage.service.ts`):** Thay thế `supabase.storage.upload` bằng cơ chế lấy Presigned URL từ backend Express rồi PUT lên Cloudflare R2.
4. **Cơ chế Realtime (`realtime.service.ts`):** Thay thế `supabase.channel` bằng Server-Sent Events (SSE) hoặc WebSocket nhẹ do Express quản lý.

### 6. Có thể đạt chi phí vận hành 0 USD/tháng trong hạn mức miễn phí không?
**HOÀN TOÀN CÓ THỂ ĐẠT 0 USD/THÁNG** với quy mô hiện tại của VT AUTO:
1. **Neon PostgreSQL (Free Tier):**
   - Miễn phí **0.5 GB lưu trữ** (Dữ liệu text, bảng, JSONB của cả nghìn xe và lịch sử CheckSheet chỉ chiếm khoảng 10 - 50 MB, thừa sức chứa).
   - Tự động sleep khi không có truy vấn và đánh thức tức thì khi có request.
2. **Cloudflare R2 (Free Tier):**
   - Miễn phí **10 GB lưu trữ ảnh/tháng** (Hiện tại gara có ~402 MB ảnh, chỉ chiếm khoảng 4% hạn mức miễn phí).
   - **0 USD phí băng thông tải về (Zero Egress Fees)**: Khách xem web bao nhiêu ảnh cũng không bao giờ bị tính tiền băng thông (khác biệt hoàn toàn so với AWS S3 hay Supabase).
   - 1.000.000 lượt ghi Class A và 10.000.000 lượt đọc Class B miễn phí mỗi tháng.
3. **Vercel (Frontend Hosting - Free Tier):**
   - Miễn phí hosting cho React/Vite SPA, cấp SSL tự động, băng thông 100 GB/tháng.
4. **Backend Express API:**
   - Có thể chạy trên gói miễn phí của **Render** (Free Web Service), **Koyeb** (Free Nano instance), hoặc **Vercel Serverless Functions** (tích hợp trực tiếp vào repo dưới thư mục `/api`).

---

## 12. FINAL VERIFICATION (Xác minh cuối cùng trước migration)

Phần này phân biệt rõ **bằng chứng đọc được trong repository** với **xác minh trực tiếp trên Supabase production**. Trong phiên kiểm toán này không dùng Supabase Dashboard, không chạy SQL, không gọi API production để đọc dữ liệu và không có quyền xác nhận live schema. Vì vậy, mọi kết luận dưới đây về production đều phải được hiểu theo trạng thái tương ứng.

### 12.1. Phạm vi xác minh schema

#### Đã xác minh từ file migration (repository evidence)

- Các ENUM, bảng lõi, cột, index, foreign key, `ON DELETE CASCADE/SET NULL`, JSONB và các view được mô tả trong `migrations/001_initial_schema.sql` và các migration tiếp theo.
- Các migration bổ sung cho `vehicles`, `check_sheets`, `vehicle_images`, `tasks`, Option, Public Web, sold-task snapshot và `options_checked`.
- Migration 011 xóa trigger/function import xe được định nghĩa trong migration 010; điều này chỉ chứng minh ý định/lịch sử migration, không chứng minh trạng thái live hiện tại.
- RLS policy được viết trong các migration 003, 031, 035, 036 và 041.
- Các view `public_vehicles` và `public_vehicle_images` được tạo/làm mới trong 032–034.
- Không tìm thấy `supabase/functions`, `supabase.rpc()` hoặc migration tạo bucket Storage trong repository.

#### Chưa xác minh trực tiếp từ Supabase

- Migration nào đã thực sự chạy trên project production.
- Phiên bản/định nghĩa hiện tại của từng bảng, view, ENUM, index, FK, trigger, function và policy.
- Trạng thái RLS/grant thực tế của tất cả bảng nghiệp vụ.
- Danh sách object thực tế trong Storage, bucket visibility, Storage RLS policy và tổng dung lượng.
- Schema `auth.users`, dữ liệu người dùng Auth, hash mật khẩu và quyền truy cập schema `auth`.
- Có hay không các policy/trigger/function được tạo thủ công ngoài repository.
- Các migration 039–042, bao gồm duplicate plate, sold task, vehicle RLS và `options_checked`, đã chạy hay chưa.

**Kết luận:** Báo cáo không được coi migration repository là bằng chứng live. Trước cut-over cần lấy schema-only dump và catalog snapshot trực tiếp từ Supabase bằng quyền quản trị phù hợp, sau đó đối chiếu với 42 migration.

### 12.2. Xác minh tất cả vị trí URL ảnh và bucket

#### Đã xác minh từ code/schema

| Nguồn dữ liệu | Trường | Nội dung | Bucket/đường dẫn hiện tại |
|---|---|---|---|
| `vehicle_images` | `path`, `url`, `thumbnail` | Metadata ảnh xe và URL public/thumbnail | `vehicle-images`; code upload dùng `vehicles/{vehicleId}/{safeKey}` |
| `vehicle_documents` | `path`, `url` | Metadata giấy tờ | `vehicle-documents`; code upload dùng `documents/{vehicleId}/{safeKey}` |
| `check_sheets` | `exterior_photos` JSONB | `Record<ExteriorSpotKey, string[]>`; mỗi mảng chứa URL ảnh ngoại thất | `checksheet-photos`; code upload dùng `checksheets/{vehicleId}/{spotKey}/{safeKey}` |
| `check_sheets` | `interior`, `exterior`, `out_check` JSONB | Trạng thái/note/detail, không thấy code tạo URL ảnh trong các cấu trúc này | Không có bucket riêng theo code hiện tại |
| `vehicles` | `options` JSONB | Mảng key Option xe (`vehicle_option_defs.key`) | Không phải ảnh, không cần chuyển object |
| `tasks` | `checklist` JSONB | `{id,text,done}`; không có URL ảnh theo type/code hiện tại | Không có bucket |
| `activity_logs` | `metadata` JSONB | JSON tùy ý; schema không giới hạn nội dung | Chưa thể đảm bảo không có URL nếu dữ liệu thực tế từng ghi URL |
| `notifications` | `data` JSONB (sau migration 007/008) | Payload thông báo tùy ý | Chưa thể đảm bảo không có URL nếu dữ liệu thực tế từng ghi URL |
| `users` | `avatar` | Chuỗi avatar có thể là URL | Bucket không xác định từ migration/code upload hiện tại; phải kiểm tra dữ liệu thật |
| `website_settings` | Các trường cấu hình/banner | Cấu hình Public Web; một số giá trị có thể chứa URL | Code cần được kiểm tra dữ liệu thực tế để xác định URL/bucket cụ thể |

Các vị trí code xác nhận chính:
- Upload `vehicle-images`, `vehicle-documents`, `checksheet-photos`: `src/services/storage.service.ts`.
- Map `check_sheets.exterior_photos`: `src/services/checksheet.service.ts`.
- Kiểu `exteriorPhotos`: `src/types.ts` và `src/types/database.ts`.
- Option xe chỉ là key JSONB: `src/components/VehicleDetailTabs.tsx` và `src/services/vehicleOption.service.ts`.
- Public image view chỉ lấy metadata `vehicle_images` loại `category='website'`: migrations 032–034 và `src/public/publicApi.ts`.

#### Chính xác những object cần lập inventory khi migrate

1. Toàn bộ object trong bucket `vehicle-images`, đối chiếu với `vehicle_images.path` và `vehicle_images.url/thumbnail`.
2. Toàn bộ object trong bucket `vehicle-documents`, đối chiếu với `vehicle_documents.path/url`.
3. Toàn bộ object trong bucket `checksheet-photos`, đối chiếu với mọi phần tử trong `check_sheets.exterior_photos` sau khi parse JSONB.
4. Tìm URL theo pattern Supabase Storage trong `users.avatar`, `website_settings`, `activity_logs.metadata`, `notifications.data`, và các JSONB khác; không được chỉ dựa vào danh sách bảng metadata ảnh.
5. Tách object public/customer-safe khỏi giấy tờ và ảnh nội bộ; không nên dùng chung một chính sách public R2 cho cả ba nhóm.

**Chưa xác minh:** số lượng object, object orphan không có metadata, metadata trỏ tới object đã mất, thumbnail là URL hay path riêng, và URL nào đã được cache ngoài database. Cần chạy inventory read-only trực tiếp từ Storage API/DB trước khi copy.

### 12.3. Hosting Express với mục tiêu 0 USD/tháng

#### Presigned URL

Presigned URL cho R2 có thể chạy trên backend Express hoặc serverless function vì mỗi request ngắn, stateless và không cần giữ kết nối lâu. Tuy nhiên vẫn phải có:
- JWT/session verification trước khi cấp URL.
- Kiểm tra role, `vehicleId`, MIME type, kích thước và object key.
- TTL ngắn, bucket/key scope hẹp, CORS đúng origin.
- Endpoint confirm metadata và cơ chế dọn object mồ côi.

#### SSE

SSE cần kết nối HTTP dài hạn. Vì vậy:
- VPS hoặc một process/container luôn chạy là phù hợp nhất.
- Serverless function kiểu request/response ngắn thường không phù hợp để giữ SSE ổn định hoặc có giới hạn thời gian/kết nối.
- Free web service có cơ chế sleep/scale-to-zero có thể ngắt SSE; client phải tự reconnect, có event ID hoặc fallback polling.
- Cần tính giới hạn concurrent connections, memory, timeout, proxy buffering và multi-instance broadcast nếu backend scale thành nhiều instance.

#### Telegram Bot

Polling cần process chạy liên tục. Free hosting có sleep, restart, giới hạn CPU/RAM hoặc không đảm bảo uptime có thể làm bot mất polling, trễ thông báo hoặc cần reconnect. Webhook giảm yêu cầu process polling nhưng vẫn cần endpoint public ổn định, secret-token verification và nền tảng không ngủ khi request đến.

#### Đánh giá thực tế chi phí

Không thể khẳng định backend Express **chắc chắn 0 USD/tháng** chỉ dựa vào free tier. Có thể thử phương án 0 USD nhưng phải chấp nhận:
- Free tier có thể sleep, cold start, giới hạn giờ chạy, giới hạn băng thông/thời gian request hoặc thay đổi chính sách.
- SSE và Telegram polling cần uptime dài hạn, mâu thuẫn với nhiều free tier.
- Vercel phù hợp frontend và presigned endpoint ngắn; không phải lựa chọn mặc định tốt cho polling/SSE lâu dài.
- Neon/R2/Vercel có free quotas nhưng vượt quota hoặc thay đổi pricing có thể phát sinh chi phí/gián đoạn.

**Khuyến nghị:** giữ backend Telegram/polling và SSE trên một process luôn chạy (VPS nhỏ hoặc dịch vụ paid rẻ) nếu uptime là yêu cầu; nếu bắt buộc 0 USD, dùng webhook + polling fallback/reconnect, bỏ SSE bắt buộc và chấp nhận polling/cold-start với giám sát rõ ràng. Cần quyết định SLA trước migration.

### 12.4. Khả năng giữ mật khẩu Supabase Auth

#### Đã xác minh từ repository

- Frontend dùng Supabase Auth email/password: `signUp`, `signInWithPassword`, `signOut`, `getSession`, `getUser`, `onAuthStateChange` trong `src/services/auth.service.ts`.
- `public.users.auth_id` liên kết profile nghiệp vụ với Auth identity.
- Migration 004 đã xóa `public.users.password_hash`; mật khẩu hiện không nằm trong bảng profile public theo schema repository.
- Code hiện tại không truy cập `auth.users`, không có API export Auth users và không có server-side password migration.

#### Chưa xác minh trực tiếp từ Supabase

- Tài khoản đang dùng có quyền đọc schema `auth` hay không.
- Có thể dùng `pg_dump`/connection string để export `auth.users` hay không.
- Hash hiện tại có nằm trong `auth.users.encrypted_password` và có định dạng/thuật toán nào cho toàn bộ user hay không.
- Có user dùng provider ngoài password, MFA, email confirmation, recovery state, banned/deleted state hoặc metadata cần bảo toàn hay không.

#### Tính tương thích Node.js

Nếu có quyền hợp lệ để export `auth.users.encrypted_password`, hash bcrypt thường có thể được kiểm tra bằng thư viện Node.js tương thích bcrypt (`bcrypt`/`bcryptjs`), vì việc xác minh dùng chính hash đã lưu. Tuy nhiên **không được coi đây là xác nhận cho project hiện tại** trước khi kiểm tra mẫu hash và chính sách Auth trực tiếp.

Việc chuyển hash cũng chưa đủ để giữ nguyên toàn bộ Auth:
- Phải giữ user UUID, email normalized, confirmation/banned state, recovery/MFA/provider metadata nếu có.
- Phải thiết kế lại refresh token, password reset, email verification và session revocation.
- Không được đưa `encrypted_password` vào client hoặc log.
- Nếu không có quyền export `auth.users`, phương án an toàn là giữ `public.users` (profile/role) và bắt buộc reset mật khẩu khi chuyển sang Auth mới.

### 12.5. Bảng trạng thái xác minh và quyết định

| Nhóm | Đã xác minh | Chưa xác minh | Có rủi ro | Cần quyết định trước migration |
|---|---|---|---|---|
| Schema public | DDL, cột, JSONB, ENUM/FK theo repository migrations | Schema live và migration history production | Drift giữa migration và production | Dùng live schema dump làm source of truth hay sửa migration trước |
| RLS/grants | Policy được viết trong một số migration | Policy/grant thực tế của mọi bảng | Browser write có thể khác dự kiến | Chuyển toàn bộ enforcement sang Express middleware + DB roles nào |
| Auth | Frontend phụ thuộc Supabase Auth; profile ở `public.users` | Quyền đọc `auth.users`, hash và user state | Mất session/mật khẩu/MFA | Giữ hash hay reset password toàn bộ |
| Ảnh xe | Bucket/path code và metadata `vehicle_images` | Object inventory live, orphan, thumbnail | Mất ảnh hoặc URL hỏng | Public/private domain và chiến lược orphan |
| Ảnh CheckSheet | `exterior_photos` là JSONB URL; bucket code là `checksheet-photos` | Tất cả URL thực tế trong JSONB | Bỏ sót ảnh vì không có bảng metadata riêng | Parse/inventory JSONB trước khi copy |
| Giấy tờ | Bucket `vehicle-documents`, metadata table | Object inventory live và quyền truy cập | Vô tình public giấy tờ | R2 private + signed GET bắt buộc |
| Option | `vehicles.options` là JSONB key array; không phải media | Dữ liệu live/định nghĩa key nếu migration chưa chạy | Mất mapping key-label | Giữ nguyên key và migrate `vehicle_option_defs` cùng transaction |
| Realtime | Các channel và bảng phụ thuộc đã xác định | Nhu cầu realtime thực tế/SLA | SSE đứt khi free host sleep/scale | SSE, WebSocket hay polling |
| Express hosting | API Telegram hiện có; presign có thể triển khai stateless | Uptime/quota/free-tier thực tế | Bot/SSE gián đoạn | Chấp nhận 0 USD với downtime hay trả phí uptime |
| R2 | Chưa có integration trong repo | R2 account, quota, CORS, domain, lifecycle | Credentials/key exposure, URL cache | Public domain, private signed URLs, retention |
| Data cut-over | UUID/JSONB/FK có thể giữ khi pg_dump/restore | Row counts/checksums/live delta | Mất dữ liệu phát sinh trong cut-over | Downtime, dual-write hoặc delta replication |

### 12.6. Kết luận đã hiệu chỉnh

- **Có thể giữ PostgreSQL schema và UUID**, nhưng chỉ sau khi đối chiếu live schema với migration repository; chưa được gọi là verified production.
- **CheckSheet và Option có thể bảo toàn** bằng native PostgreSQL dump/restore, nhưng ảnh URL trong `exterior_photos` phải được inventory riêng vì không có bảng metadata ảnh CheckSheet.
- **Không thể xác nhận giữ mật khẩu hiện tại** nếu chưa có quyền đọc/export `auth.users` và kiểm tra hash. Kế hoạch phải hỗ trợ reset password.
- **0 USD/tháng là mục tiêu thử nghiệm, không phải cam kết vận hành.** SSE và Telegram polling là hai phần tạo rủi ro uptime lớn nhất trên free hosting.
- Trước migration cần một phase **read-only live verification** riêng: schema catalog, row counts/checksums, Auth export capability, Storage inventory và quota/uptime test. Không chạy cut-over chỉ dựa trên migration files.

---
*Báo cáo được hoàn thành dựa trên kiểm toán repository; các mục “chưa xác minh trực tiếp” cần được kiểm chứng với quyền quản trị Supabase trước khi migration.*
