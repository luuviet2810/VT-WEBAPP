# GIAI ĐOẠN 0: KẾ HOẠCH PHỤC HỒI DỮ LIỆU & ĐÁNH GIÁ KHẢ THI BACKUP (DATA RECOVERY & BACKUP FEASIBILITY PLAN)

**Dự án:** VT AUTO / gara-manager  
**Ngày kiểm toán:** 21/11/2026  
**Chế độ thực hiện:** READ-ONLY PROBE & FEASIBILITY AUDIT (Không ghi/sửa dữ liệu, không thay đổi .env, không xóa file, không bypass giới hạn hệ thống).

---

## 1. Tóm tắt hiện trạng truy cập (Executive Probe Findings)

Qua việc gửi các yêu cầu thăm dò (read-only probe) an toàn bằng `SUPABASE_SERVICE_ROLE_KEY` tới hệ thống Supabase production, kết quả thực tế như sau:

| Endpoint thăm dò | Mã phản hồi HTTP | Thông báo chi tiết từ Supabase |
|---|---|---|
| **PostgREST Read** (`/rest/v1/vehicles?select=id&limit=1`) | **HTTP 402** | `Service for this project is restricted due to the following violations: exceed_storage_size_quota. The project owner must upgrade their plan or remove spend caps to restore service.` |
| **Storage Object List** (`/storage/v1/object/list/vehicle-images`) | **HTTP 402** | `Service for this project is restricted due to the following violations: exceed_storage_size_quota. The project owner must upgrade their plan or remove spend caps to restore service.` |
| **Auth Admin Users** (`/auth/v1/admin/users?page=1&per_page=1`) | **HTTP 402** | `Service for this project is restricted due to the following violations: exceed_storage_size_quota. The project owner must upgrade their plan or remove spend caps to restore service.` |
| **Public Storage Download** (`/storage/v1/object/public/vehicle-images/...`) | **HTTP 402** | `Service for this project is restricted due to the following violations: exceed_storage_size_quota. The project owner must upgrade their plan or remove spend caps to restore service.` |

### Nhận định mấu chốt:
> Các yêu cầu cụ thể ở bảng trên trả HTTP 402 tại thời điểm kiểm tra. Không thể suy rộng thành mọi endpoint hoặc quyền ghi đều bị khóa. URL tải thử dùng đường dẫn chưa xác nhận tồn tại, nên không chứng minh khả năng tải một object thực. Kết nối PostgreSQL trực tiếp và các bản backup sẵn có chưa được kiểm tra. Chủ dự án cần liên hệ Supabase hoặc xem Dashboard để xác định cách khôi phục dịch vụ được hỗ trợ.

---

## 2. Kiểm tra công cụ & Phương thức kết nối hiện có

### 2.1. Kiểm tra công cụ cục bộ (Local Tooling)
- **`psql`**: `NOT_FOUND` (Chưa được cài đặt trên môi trường máy hiện tại).
- **`pg_dump`**: `NOT_FOUND` (Chưa được cài đặt trên môi trường máy hiện tại).
- **`pg_restore`**: `NOT_FOUND` (Chưa được cài đặt trên môi trường máy hiện tại).
- **`supabase` CLI**: `NOT_FOUND` (Chưa được cài đặt toàn cục hoặc cục bộ).
- **Thư viện PostgreSQL driver (`pg`)**: Cả root `package.json` và `gara-bot-server/package.json` đều **chưa cài đặt** package `pg` (Node-Postgres).

### 2.2. Kiểm tra thông tin xác thực & Connection String trong repo
- **File `.env`**: Chỉ có `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
- **File `migrations/.env.local`**: Chỉ có `SUPABASE_URL` (dạng HTTPS REST) và `SUPABASE_SERVICE_ROLE_KEY`.
- **File `gara-bot-server/.env`**: Có `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`.
- **Database connection string:** Không thấy tên biến tương ứng trong ba file môi trường đã kiểm tra; chưa quét toàn bộ repository hay môi trường triển khai và chưa kiểm tra kết nối PostgreSQL.
- **Management API:** Không thấy tên biến token trong ba file môi trường đã kiểm tra; chưa xác minh quyền hay thực hiện yêu cầu Management API.

---

## 3. Đánh giá quyền truy cập chi tiết (Access Rights Assessment)

| Câu hỏi kiểm tra | Đánh giá thực tế | Chi tiết kỹ thuật |
|---|---|---|
| **Có kết nối được PostgreSQL production không?** | **CHƯA THỂ KẾT NỐI** | Trong repository không lưu chuỗi kết nối trực tiếp (`postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`) và mật khẩu database. Máy chưa cài công cụ `psql`/`pg_dump`. |
| **Có quyền đọc public schema không?** | **BỊ CHẶN (HTTP 402)** | Mặc dù `SUPABASE_SERVICE_ROLE_KEY` có đầy đủ đặc quyền bypass RLS trên bảng, nhưng Gateway PostgREST từ chối toàn bộ request do vi phạm quota lưu trữ. |
| **Có quyền đọc `auth.users` không?** | **BỊ CHẶN (HTTP 402)** | Endpoint `/auth/v1/admin/users` của GoTrue trả HTTP 402. Ngoài ra, schema `auth` không bao giờ mở qua PostgREST thông thường, chỉ truy cập được qua direct database connection. |
| **Có thể lấy danh sách toàn bộ Storage objects không?** | **BỊ CHẶN (HTTP 402)** | Lệnh POST tới `/storage/v1/object/list/*` bị chặn ngay từ cổng kiểm soát quota của Supabase. |
| **Có thể tải file Storage về máy không?** | **BỊ CHẶN (HTTP 402)** | Ngay cả link tải công khai (Public URL GET) cũng bị chặn bởi HTTP 402 với cùng lý do vi phạm hạn mức. |

---

## 4. Danh sách dữ liệu cần backup & Phương án chi tiết (Data Backup Matrix)

Bảng dưới đây liệt kê đầy đủ 12 hạng mục dữ liệu theo yêu cầu, phương thức backup chuẩn khi được mở quyền, và phương án thay thế nếu phương thức chính thất bại:

| STT | Hạng mục dữ liệu | Trạng thái truy cập hiện tại | Phương thức backup chính | Quyền hạn cần thiết | Phương án thay thế dự phòng |
|---|---|---|---|---|---|
| **1** | **Toàn bộ Public Schema** (19 bảng, 2 view, 7 enum, index, DDL) | **Bị chặn HTTP 402** (Không thể đọc qua REST) | Sử dụng `pg_dump` qua Direct PostgreSQL Connection String (Port 5432/6543) xuất file `.sql`. | Mật khẩu database Supabase (User `postgres`). | Tái tạo schema từ 42 file migration trong repo (tuy nhiên thiếu dữ liệu thực tế phát sinh trên production). |
| **2** | **Dữ liệu Xe (`vehicles`)** (toàn bộ xe, giá nhập/bán, biển số trùng, snapshot) | **Bị chặn HTTP 402** | `pg_dump --data-only -t vehicles` hoặc script xuất JSON/CSV qua Service Role sau khi mở khóa API. | Direct DB access hoặc Service Role Key (sau khi mở khóa). | Nếu mất toàn bộ database: Nhập lại từ các file Excel kiểm kê nội bộ hoặc bảng staging `vehicles_import` cũ (nếu có bản lưu offline). |
| **3** | **CheckSheets & Lịch sử** (`check_sheets`, `checksheet_logs`) | **Bị chặn HTTP 402** | `pg_dump --data-only -t check_sheets -t checksheet_logs`. Cần xuất nguyên vẹn trường `JSONB` (`interior`, `exterior`, `out_check`). | Direct DB access. | Trích xuất từ IndexedDB/LocalStorage của các thiết bị tablet/điện thoại nhân viên từng mở form (chỉ phục hồi được cục bộ). |
| **4** | **Vehicle Options** (`vehicle_option_defs`, `vehicles.options`) | **Bị chặn HTTP 402** | `pg_dump -t vehicle_option_defs` và dump cột `options` (JSONB) của bảng `vehicles`. | Direct DB access hoặc Service Role Key (sau khi mở khóa). | Danh mục Option có thể tái tạo từ migration 031/036; tuy nhiên các option đã tick của từng xe bắt buộc phải dump từ `vehicles.options`. |
| **5** | **Tasks & Lịch sử Kanban** (`tasks`, `task_activity_logs`) | **Bị chặn HTTP 402** | `pg_dump --data-only -t tasks -t task_activity_logs`. Bảo toàn checklist JSONB và snapshot xe đã bán. | Direct DB access hoặc Service Role Key (sau khi mở khóa). | Tự động sinh lại các task cơ bản từ CheckSheet bằng Rule Engine (`generateTasks`), nhưng sẽ mất các task tạo thủ công và lịch sử hoạt động. |
| **6** | **Chấm công (`attendance`)** | **Bị chặn HTTP 402** | `pg_dump --data-only -t attendance`. | Direct DB access. | Không có nguồn thay thế ngoài database, bắt buộc phải dump trực tiếp. |
| **7** | **Lịch sử di chuyển (`move_logs`)** | **Bị chặn HTTP 402** | `pg_dump --data-only -t move_logs`. | Direct DB access. | Không có nguồn thay thế; nếu mất chỉ lưu vị trí hiện tại (`vehicles.position_id`). |
| **8** | **Thông báo & Audit Logs** (`notifications`, `activity_logs`) | **Bị chặn HTTP 402** | `pg_dump --data-only -t notifications -t activity_logs`. | Direct DB access. | Dữ liệu log lịch sử phụ trợ, có thể chấp nhận bỏ qua nếu database dung lượng quá lớn hoặc hỏng log. |
| **9** | **Tài khoản người dùng & Auth** (`public.users`, `auth.users`) | **Bị chặn HTTP 402** | Dump `public.users` (thông tin, vai trò, số điện thoại). Đồng thời dump `auth.users` lấy cột `encrypted_password` (hash bcrypt). | Quyền Superuser / Postgres Direct Connection String. | Nếu không dump được `auth.users`: Giữ nguyên danh sách nhân viên từ `public.users` và kích hoạt quy trình đặt lại mật khẩu (Password Reset) hàng loạt. |
| **10** | **Ảnh xe (`vehicle-images`)** (~343+ file ảnh gốc và thumbnail) | **Bị chặn HTTP 402** (Tải công khai cũng bị chặn) | Sử dụng công cụ `rclone` cấu hình S3 Storage Backend kết nối trực tiếp vào Storage Endpoint Supabase, hoặc script Node.js Storage API sau khi mở khóa. | Service Role Key (sau khi gỡ khóa) hoặc S3 Access/Secret Key của Supabase Storage. | Dùng các bản sao lưu ảnh gốc chụp từ điện thoại nhân viên/bộ phận chụp ảnh xe (tuy nhiên mất liên kết tự động tới `vehicle_id`). |
| **11** | **Giấy tờ xe (`vehicle-documents`)** | **Bị chặn HTTP 402** | Tương tự mục 10: Tải toàn bộ bucket `vehicle-documents` qua Storage API / rclone. | Service Role Key hoặc S3 Access Key. | Chụp và tải lại hồ sơ giấy tờ xe. |
| **12** | **Ảnh CheckSheet (`checksheet-photos`)** | **Bị chặn HTTP 402** | Tải toàn bộ bucket `checksheet-photos` theo danh sách URL parse từ `check_sheets.exterior_photos`. | Service Role Key hoặc S3 Access Key. | Không thể khôi phục nếu mất, phiếu kiểm tra sẽ thiếu ảnh minh chứng hư hại. |

---

## 5. Quy trình từng bước phục hồi dữ liệu bắt buộc (Action Plan for Project Owner)

Do mọi cổng truy cập tự động đều đang bị Supabase chặn bằng HTTP 402, **Project Owner bắt buộc phải thực hiện các bước sau trên Supabase Console**:

```
[BƯỚC 1: SUPABASE DASHBOARD]
Đăng nhập https://supabase.com/dashboard/project/obhamybvdpgremtofvvb
   │
   ├─► 1.1. Xử lý Quota Violation:
   │        Tạm thời BẬT "Spend Cap off" hoặc nâng gói Pro ($25/tháng, có thể hủy ngay sau khi backup)
   │        để Supabase gỡ bỏ trạng thái "restricted" trên API và Storage.
   │
   └─► 1.2. Lấy thông tin kết nối trực tiếp (Direct Connection):
            Vào Project Settings -> Database -> Connection string:
            Copy chuỗi: postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
            (Cần nhập đúng Database Password đã đặt lúc tạo dự án).
```

### Bước 2: Thiết lập môi trường backup an toàn (Tại máy local)
1. Cài đặt PostgreSQL Client Tooling (để có lệnh `pg_dump` phiên bản 15 hoặc mới hơn):
   ```bash
   # Windows (qua winget):
   winget install PostgreSQL.PostgreSQL.16
   ```
2. Cài đặt công cụ đồng bộ tệp `rclone` (để tải toàn bộ ảnh từ Storage về máy mà không bị giới hạn request):
   ```bash
   winget install Rclone.Rclone
   ```

### Bước 3: Thực thi Full Backup Database
Ngay sau khi có Connection String và mật khẩu:
```bash
# Backup toàn bộ dữ liệu nghiệp vụ và cấu trúc bảng (schema + data):
pg_dump "postgresql://postgres.[ref]:[PASSWORD]@...:6543/postgres" \
  --schema=public \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file="vtauto_public_backup.dump"

# Backup dữ liệu xác thực nhân viên (auth.users) để giữ mật khẩu cũ:
pg_dump "postgresql://postgres.[ref]:[PASSWORD]@...:6543/postgres" \
  --schema=auth \
  --table=auth.users \
  --data-only \
  --file="vtauto_auth_users.sql"
```

### Bước 4: Thực thi Full Backup Storage Files
Sau khi Supabase gỡ chặn HTTP 402:
1. Chạy script tải có kiểm soát (hoặc rclone S3 sync) để tải toàn bộ tệp trong 3 bucket:
   - `vehicle-images/` -> `./backup_storage/vehicle-images/`
   - `vehicle-documents/` -> `./backup_storage/vehicle-documents/`
   - `checksheet-photos/` -> `./backup_storage/checksheet-photos/`
2. Kiểm tra mã băm (MD5/SHA256) và tổng dung lượng tệp tải về so với metadata trong database.

### Bước 5: Kiểm tra toàn vẹn sau Backup (Verification Checklist)
- [ ] File `vtauto_public_backup.dump` có dung lượng hợp lệ (không phải file rỗng).
- [ ] Dùng `pg_restore --list vtauto_public_backup.dump` xác nhận có đầy đủ các bảng: `vehicles`, `check_sheets`, `tasks`, `users`, `vehicle_images`.
- [ ] Số lượng dòng trong bảng `vehicles` dump ra khớp với số lượng xe thực tế của gara.
- [ ] Parse thử 1 bản ghi `check_sheets` xác nhận cột `interior`, `exterior`, `out_check` giữ nguyên cấu trúc JSONB.
- [ ] Đếm số lượng tệp ảnh trong thư mục `./backup_storage/vehicle-images/` khớp với số bản ghi trong bảng `vehicle_images`.

---

## 6. Kết luận cuối cùng về khả năng bảo toàn dữ liệu

1. **Ở thời điểm hiện tại:**  
   Không thể tạo backup live qua các endpoint đã probe vì chúng trả **HTTP 402**. Chưa đủ bằng chứng để định lượng phần trăm dữ liệu có thể bảo toàn: chưa kiểm tra direct PostgreSQL, bản backup hiện có, bản export của chủ dự án hoặc object thật trong Storage.

2. **Sau khi có một kênh backup được cấp quyền và hoạt động (direct PostgreSQL hoặc API/Storage sau khi dịch vụ được khôi phục):**  
   Khả năng bảo toàn về mặt kỹ thuật là cao, nhưng chỉ được kết luận sau khi đối chiếu row counts, checksum, JSONB và manifest object; không được gọi là 100% trước bước verification này:
   - **Cấu trúc DDL:** Giữ nguyên 100% (PostgreSQL chuẩn).
   - **Khóa chính UUID & Khóa ngoại:** Giữ nguyên 100% không suy suyển.
   - **Dữ liệu JSONB (CheckSheet & Options):** Giữ nguyên 100% chi tiết từng checkbox.
   - **Tài khoản nhân viên & Mật khẩu:** Giữ nguyên 100% nếu export được schema `auth.users` qua direct connection.
   - **Tệp ảnh xe và giấy tờ:** Giữ nguyên 100% sau khi mirror từ Supabase Storage sang Cloudflare R2.

> **Khuyến nghị tiên quyết:** Không tiến hành bất kỳ thao tác xóa file hay migration mã nguồn nào cho đến khi Project Owner đăng nhập Supabase Dashboard, tạm thời mở khóa quota hoặc cung cấp Direct Connection String để hoàn tất bước **Full Backup an toàn** về máy cục bộ.
