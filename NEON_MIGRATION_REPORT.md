# BÁO CÁO MIGRATION CẤU TRÚC DATABASE SANG NEON POSTGRESQL
**Dự án:** VT AUTO (gara-manager)  
**Thời gian hoàn thành:** 21/11/2026  
**Môi trường thực hiện:** Neon PostgreSQL — Project `autumn-dream-42270306` (`webapp VTAUTO`), Branch `production`, Region `aws-ap-southeast-1`

---

## 1. Tổng quan Kết quả Thực thi

| Chỉ số | Số lượng / Trạng thái | Ghi chú |
|---|---|---|
| **Tổng số file migration** | **42** | Toàn bộ 42 file trong thư mục `migrations/` |
| **Số migration chạy thành công** | **42 / 42 (100%)** | Toàn bộ cấu trúc bảng, enum, view, index đã được tạo |
| **Số migration lỗi** | **0** | Đã khắc phục tương thích foreign key tại `003` |
| **Số migration chưa chạy** | **0** | Không bỏ qua bất kỳ migration nào |
| **Bảng theo dõi migration** | `_neon_migrations` | Lưu trữ lịch sử và thời điểm chạy của từng file |

---

## 2. Kiểm kê Cấu trúc Database Đã Khởi tạo trên Neon

Qua quá trình kiểm tra trực tiếp (`verify-neon-schema.mjs`), toàn bộ các đối tượng cơ sở dữ liệu đã hiện diện đầy đủ và chính xác trên Neon:

### 2.1. Danh sách Bảng nghiệp vụ (21 Tables)
1. `_neon_migrations`: Bảng quản lý tiến trình migration, chống chạy trùng lặp.
2. `users`: Bảng nhân sự, tài khoản nhân viên và ban quản trị.
3. `passkeys`: Lưu trữ khóa xác thực WebAuthn/Passkey.
4. `positions`: Danh mục các vị trí đỗ xe trong gara (Song nưng, Rửa máy, Đánh bóng,...).
5. `vehicles`: Bảng quản lý xe cốt lõi (biển số, đời xe, giá nhập/bán, trạng thái, options,...).
6. `vehicle_images`: Danh sách ảnh xe (ảnh ngoại thất, nội thất, website).
7. `vehicle_documents`: Giấy tờ đăng kiểm, bảo hiểm xe.
8. `tasks`: Danh sách công việc Kanban, task sửa chữa và quy trình xe.
9. `task_activity_logs`: Nhật ký thao tác chi tiết từng task.
10. `move_logs`: Nhật ký di chuyển vị trí xe trong gara.
11. `attendance`: Bảng chấm công ra/vào của nhân viên.
12. `check_sheets`: Phiếu kiểm tra xe (check-in / check-out, hư hại ngoại thất JSONB).
13. `checksheet_logs`: Nhật ký chỉnh sửa phiếu kiểm tra.
14. `notifications`: Thông báo hệ thống tới nhân viên.
15. `activity_logs`: Nhật ký hoạt động chung của hệ thống.
16. `settings`: Cấu hình hệ thống gara.
17. `locations`: Danh mục các cơ sở gara.
18. `vehicle_workflow_logs`: Lịch sử chuyển đổi trạng thái quy trình xe.
19. `vehicles_import`: Bảng staging nhập khẩu dữ liệu xe.
20. `vehicle_option_defs`: Danh mục option xe ("Option xe" - Smart Key, Ghế điện, Cửa sổ trời,...).
21. `website_settings`: Cấu hình thông tin liên hệ và hiển thị cho Public Web.

### 2.2. Danh sách Views (2 Views)
- `public_vehicles`: View công khai phục vụ website bán xe (chỉ lọc xe hiển thị và còn hàng, ẩn giá vốn/thông tin nội bộ).
- `public_vehicle_images`: View công khai ảnh xe cho website bán xe.

### 2.3. Các kiểu dữ liệu ENUM (7 Custom Enums)
- `activity_action`: `[create, update, delete, login, logout, register, check_in, check_out, move_vehicle, check_sheet_in, check_sheet_out, approve, reject, enable, disable]`
- `checksheet_type`: `[in, out]`
- `task_priority`: `[low, medium, high, urgent]`
- `task_status`: `[todo, doing, done]`
- `user_role`: `[admin, staff]`
- `user_status`: `[pending, approved, rejected, disabled]`
- `vehicle_status`: `[available, deposited, sold]`

### 2.4. Khóa ngoại và Ràng buộc (21 Foreign Keys)
- Tất cả các liên kết nghiệp vụ (`vehicles` <-> `tasks`, `users`, `positions`, `check_sheets`, `move_logs`, `images`, `documents`, `workflow_logs`) đã được thiết lập đầy đủ với ràng buộc toàn vẹn dữ liệu (`ON DELETE CASCADE` / `SET NULL`).
- Tổng cộng **77 Indexes** tối ưu hóa hiệu năng truy vấn cho toàn bộ các bảng.

---

## 3. Xử lý Tương thích & Thành phần Phụ thuộc Supabase

Trong quá trình chuyển đổi, các thành phần đặc thù của Supabase đã được xử lý triệt để mà không làm ảnh hưởng đến cấu trúc nghiệp vụ:

1. **Khắc phục lỗi Foreign Key tại `003_add_vehicle_workflow_log.sql`:**
   - *Nguyên nhân:* File gốc khai báo `vehicle_id TEXT`, trong khi `vehicles.id` có kiểu `UUID`. PostgreSQL không cho phép tạo Foreign Key giữa 2 kiểu dữ liệu khác nhau.
   - *Xử lý tương thích:* Chuẩn hóa kiểu của `vehicle_id` thành `UUID` (đồng bộ 100% với các bảng khác như `tasks`, `check_sheets`, `move_logs`). File gốc trong `migrations/` vẫn được bảo toàn nguyên vẹn.
2. **Hỗ trợ hàm và Schema Supabase Auth (`auth.uid()`, `auth.jwt()`, `auth.role()`):**
   - Khởi tạo schema `auth` và các hàm tương thích ảo (`auth.uid()`, `auth.jwt()`, `auth.role()`) trên Neon. Nhờ đó, các View và RLS policy kế thừa từ Supabase không bị lỗi cú pháp khi thực thi.
3. **Hỗ trợ Roles Supabase (`anon`, `authenticated`, `service_role`):**
   - Tạo sẵn các role `anon`, `authenticated`, `service_role` trên Neon PostgreSQL để các lệnh phân quyền (`GRANT SELECT ON ... TO anon, authenticated`) và chính sách bảo mật thực thi trơn tru.
4. **Bảo toàn và Tách riêng Dữ liệu Mẫu (Seed & Data Backfill):**
   - Đúng theo quy tắc an toàn ("Nếu migration chứa INSERT dữ liệu mẫu hoặc thay đổi dữ liệu, hãy tách riêng và chưa chạy"), toàn bộ các câu lệnh `INSERT` danh mục và `UPDATE/DELETE` dữ liệu cũ đã được tách riêng vào thư mục `neon-migrations/seeds/`:
     - `001_seed_data.sql`: Dữ liệu seed positions, admin users, settings ban đầu.
     - `004_auth_backfill.sql`: Backfill legacy auth_id.
     - `012_set_default_vehicle_position.sql`: Gán vị trí mặc định cho xe cũ.
     - `014_simplify_task_priority.sql` & `017_convert_urgent_to_high.sql`: Quy đổi độ ưu tiên task cũ.
     - `019_sold_date_backfill.sql`: Điền ngày bán xe cũ.
     - `022_task_source_backfill.sql`: Điền nguồn gốc task cũ.
     - `028_delete_duplicates.sql`: Xóa task trùng lặp cũ.
     - `031_option_defs_seed.sql`: Danh mục 16 option xe chuẩn.
     - `033_sort_order_backfill.sql`: Thứ tự sắp xếp xe web cũ.
     - `035_website_settings_seed.sql`: Thông tin liên hệ cơ sở gara trên website.
     - `040_snapshots_backfill.sql`: Snapshot thông tin xe đã bán cho task.
   - *Các file seed này không chạy ở bước này để đảm bảo database hoàn toàn sạch và an toàn.*

---

## 4. Nhật ký Thực thi Chi tiết 42 Migration

| STT | File Migration | Trạng thái | Nội dung chính |
|---|---|---|---|
| 1 | `001_initial_schema.sql` | **Thành công** | Khởi tạo 16 bảng cốt lõi, 7 ENUM, index, triggers. Tách seed data. |
| 2 | `002_add_task_rule_id.sql` | **Thành công** | Thêm cột `rule_id` và index cho bảng `tasks`. |
| 3 | `003_add_vehicle_workflow_log.sql` | **Thành công** | Tạo bảng `vehicle_workflow_logs`, sửa tương thích khóa ngoại UUID. |
| 4 | `004_supabase_auth.sql` | **Thành công** | Xóa cột `password_hash`, đánh index `auth_id` trên `users`. |
| 5 | `005_add_checksheet_input_fields.sql` | **Thành công** | Bổ sung các trường nhập liệu phiếu kiểm tra. |
| 6 | `006_add_out_tire_state.sql` | **Thành công** | Thêm trạng thái lốp xuất kho cho checksheet. |
| 7 | `007_add_notification_data.sql` | **Thành công** | Thêm trường dữ liệu JSON cho bảng `notifications`. |
| 8 | `008_fix_notifications_schema.sql` | **Thành công** | Chuẩn hóa schema thông báo. |
| 9 | `009_remove_checksheet_defaults.sql` | **Thành công** | Gỡ bỏ default values của checksheet. |
| 10 | `010_fix_vehicles_import_trigger.sql` | **Thành công** | Chuẩn hóa bảng import xe và ràng buộc nhiên liệu/màu sắc. |
| 11 | `011_remove_import_trigger.sql` | **Thành công** | Gỡ bỏ trigger import cũ. |
| 12 | `012_set_default_vehicle_position.sql` | **Thành công** | Đã ghi nhận migration (tách UPDATE xe cũ sang seeds). |
| 13 | `013_add_checksheet_fields.sql` | **Thành công** | Thêm trường checksheet. |
| 14 | `014_simplify_task_priority.sql` | **Thành công** | Đã ghi nhận migration (tách UPDATE task sang seeds). |
| 15 | `015_remove_songnung_default.sql` | **Thành công** | Gỡ bỏ vị trí song nưng mặc định. |
| 16 | `016_add_output_key_fields.sql` | **Thành công** | Thêm trường chìa khóa xuất xưởng. |
| 17 | `017_convert_urgent_to_high.sql` | **Thành công** | Đã ghi nhận migration (tách UPDATE task sang seeds). |
| 18 | `018_sync_checksheet_schema.sql` | **Thành công** | Đồng bộ schema checksheet. |
| 19 | `019_add_sold_date.sql` | **Thành công** | Thêm cột `sold_date` vào `vehicles`. |
| 20 | `020_add_yard_position.sql` | **Thành công** | Thêm vị trí bãi đỗ. |
| 21 | `021_add_images_deleted_at.sql` | **Thành công** | Thêm soft-delete `deleted_at` cho `vehicle_images`. |
| 22 | `022_add_task_source.sql` | **Thành công** | Thêm cột `source` cho `tasks` (default 'manual'). |
| 23 | `023_add_undercarriage_status.sql` | **Thành công** | Thêm trạng thái gầm xe. |
| 24 | `024_add_task_deferred.sql` | **Thành công** | Thêm cột `is_deferred` hoãn công việc. |
| 25 | `025_add_image_category.sql` | **Thành công** | Phân loại ảnh xe (website, hồ sơ,...). |
| 26 | `026_add_song_nung_expiry.sql` | **Thành công** | Hạn song nưng. |
| 27 | `027_add_vehicle_expiry_dates.sql` | **Thành công** | Các mốc hạn đăng kiểm/bảo hiểm xe. |
| 28 | `028_fix_duplicate_auto_tasks.sql` | **Thành công** | Tạo UNIQUE INDEX `idx_tasks_vehicle_rule` ngăn trùng lặp task. |
| 29 | `029_add_tire_inflated.sql` | **Thành công** | Kiểm tra bơm lốp xe. |
| 30 | `030_add_vehicle_public_options.sql` | **Thành công** | Thêm cột `is_public` và `options` (JSONB) cho `vehicles`. |
| 31 | `031_create_vehicle_option_defs.sql` | **Thành công** | Tạo bảng danh mục `vehicle_option_defs`. |
| 32 | `032_public_web.sql` | **Thành công** | Thêm `brand` và tạo 2 Views `public_vehicles`, `public_vehicle_images`. |
| 33 | `033_public_web_sort_order.sql` | **Thành công** | Thêm `public_sort_order` và cập nhật view `public_vehicles`. |
| 34 | `034_public_web_in_stock_only.sql` | **Thành công** | Cập nhật view `public_vehicles` chỉ lấy xe sẵn sàng bán. |
| 35 | `035_website_settings.sql` | **Thành công** | Tạo bảng `website_settings` cấu hình liên hệ website. |
| 36 | `036_vehicle_option_defs_admin_write.sql` | **Thành công** | Cập nhật chính sách ghi danh mục option xe cho Admin. |
| 37 | `037_checksheet_filters_oil.sql` | **Thành công** | Hạng mục lọc dầu / thay nhớt trên checksheet. |
| 38 | `038_checksheet_equipment_inputs.sql` | **Thành công** | Hạng mục thiết bị phụ trợ kiểm tra xe. |
| 39 | `039_allow_duplicate_plate.sql` | **Thành công** | Gỡ bỏ ràng buộc UNIQUE plate, hỗ trợ nhiều hồ sơ xe trùng biển số. |
| 40 | `040_sold_task_kanban.sql` | **Thành công** | Thêm cột `sold_handled`, snapshot biển số và mẫu xe cho `tasks`. |
| 41 | `041_vehicle_rbac.sql` | **Thành công** | Phân quyền thao tác bảng `vehicles` theo vai trò. |
| 42 | `042_add_vehicle_options_checked.sql` | **Thành công** | Thêm cột `options_checked` cho `vehicles`. |

---

## 5. Các Việc Cần Làm Tiếp Theo

Database trên Neon PostgreSQL hiện đã hoàn chỉnh cấu trúc 100%. Các bước tiếp theo cần triển khai gồm:

1. **Nạp Dữ liệu Danh mục Cần thiết (Seed Data):**
   - Nạp các danh mục cơ bản từ `neon-migrations/seeds/` (Vị trí đỗ xe `positions`, danh mục 16 option xe `vehicle_option_defs`, cấu hình website `website_settings`, tài khoản ban đầu).
2. **Cấu hình Cloudflare R2 (Lưu trữ ảnh & file):**
   - Khởi tạo R2 Bucket trên Cloudflare (`vehicle-images`, `vehicle-documents`, `checksheet-photos`).
   - Cung cấp API Credentials (R2 Access Key, Secret Key, Endpoint) vào backend.
3. **Xây dựng Backend Express API:**
   - Mở rộng `gara-bot-server` thành Backend API hoàn chỉnh:
     - Tích hợp kết nối Neon PostgreSQL (`pg`).
     - Tích hợp xác thực người dùng JWT (thay thế Supabase Auth).
     - Viết các API CRUD phục vụ quản lý xe, checksheet, task, chấm công,...
     - Cấp Presigned URL để frontend upload/download ảnh trực tiếp lên Cloudflare R2.
4. **Chuyển đổi Frontend:**
   - Thay thế 17 service frontend từ gọi `@supabase/supabase-js` sang gọi Backend API nội bộ.
