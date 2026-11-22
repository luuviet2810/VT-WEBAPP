# BÁO CÁO NẠP DỮ LIỆU NỀN CẦN THIẾT (SEED IMPORT REPORT)
**Dự án:** VT AUTO (gara-manager)  
**Thời gian hoàn thành:** 21/11/2026  
**Môi trường thực hiện:** Neon PostgreSQL — Project `autumn-dream-42270306` (`webapp VTAUTO`), Branch `production`

---

## 1. Tổng quan Thực thi

Theo đúng yêu cầu tại Giai đoạn nạp dữ liệu nền:
- **Chỉ thực hiện nạp dữ liệu cho 3 bảng danh mục:** `positions`, `vehicle_option_defs`, `website_settings`.
- **Tuyệt đối không chạy INSERT cho bảng `users`** (không tạo tài khoản nhân sự/admin mẫu).
- **Tuyệt đối không chạy các lệnh UPDATE, DELETE, DROP, TRUNCATE hay backfill.**
- **Toàn bộ 12 file seed gốc trong `neon-migrations/seeds/` được giữ nguyên vẹn.**
- **Không kết nối tới Supabase production.**

---

## 2. Xác định Nguồn Dữ liệu Seed

Qua rà soát 12 file trong thư mục `neon-migrations/seeds/`:

| STT | Bảng mục tiêu | File seed nguồn | Thao tác thực hiện | Số bản ghi |
|---|---|---|---|---|
| 1 | **`positions`** | `neon-migrations/seeds/001_seed_data.sql` | Tách riêng phần `INSERT INTO positions`, bỏ qua phần `users` và `settings`. | **5 bản ghi** |
| 2 | **`vehicle_option_defs`** | `neon-migrations/seeds/031_option_defs_seed.sql` | Nạp nguyên bản toàn bộ danh mục option xe. | **16 bản ghi** |
| 3 | **`website_settings`** | `neon-migrations/seeds/035_website_settings_seed.sql` | Nạp nguyên bản cấu hình liên hệ website (dòng duy nhất `id = 1`). | **1 bản ghi** |

*Các file seed khác (`004`, `012`, `014`, `017`, `019`, `022`, `028`, `033`, `040`) chứa lệnh UPDATE/DELETE hoặc backfill dữ liệu cũ đều được loại trừ hoàn toàn.*

---

## 3. Chi tiết Dữ liệu Thực tế Đã Nạp

### 3.1. Bảng `positions` (5 vị trí gara cốt lõi)
Dữ liệu giữ nguyên 100% UUID cố định, tên vị trí và thứ tự hiển thị:
- `[0] 00000000-0000-0000-0000-000000000001`: **Song nưng dưới này**
- `[1] 00000000-0000-0000-0000-000000000002`: **Song nưng trên này**
- `[2] 00000000-0000-0000-0000-000000000003`: **Rửa máy**
- `[3] 00000000-0000-0000-0000-000000000004`: **Song nưng chốt**
- `[4] 00000000-0000-0000-0000-000000000005`: **Đánh bóng Wolpyong**

### 3.2. Bảng `vehicle_option_defs` (16 Option xe chuẩn)
Dữ liệu phân loại theo 4 nhóm chức năng, giữ nguyên key hệ thống và nhãn tiếng Việt:
- **Nhóm Tiện nghi (`comfort`):**
  - `smart_key` (Thứ tự 1): Smart Key
  - `start_button` (Thứ tự 2): Nút bấm khởi động
  - `av_screen` (Thứ tự 3): Màn hình AV
  - `auto_ac` (Thứ tự 4): Điều hòa tự động
  - `cruise_control` (Thứ tự 5): Cruise Control
- **Nhóm Ghế / Nội thất (`interior`):**
  - `leather_seats` (Thứ tự 6): Ghế da
  - `power_seats` (Thứ tự 7): Ghế điện
  - `seat_heater` (Thứ tự 8): Sưởi ghế
  - `seat_ventilation` (Thứ tự 9): Làm mát ghế
  - `heated_steering` (Thứ tự 10): Vô lăng sưởi
- **Nhóm An toàn / Hỗ trợ (`safety`):**
  - `rear_camera` (Thứ tự 11): Camera lùi
  - `rear_sensor` (Thứ tự 12): Cảm biến lùi
  - `front_sensor` (Thứ tự 13): Cảm biến trước
- **Nhóm Ngoại thất (`exterior`):**
  - `sunroof` (Thứ tự 14): Cửa sổ trời
  - `power_trunk` (Thứ tự 15): Cốp điện
  - `power_mirrors` (Thứ tự 16): Gương điện

### 3.3. Bảng `website_settings` (1 cấu hình liên hệ website)
- **ID:** `1`
- **Địa chỉ CS1:** `CS1: 대전광역시 유성구 유성대로 510, 339호`
- **Địa chỉ CS2:** `CS2: 경기 수원시 권선구 세화로 49, 8호`
- **Điện thoại:** `010-2592-5885 (Tiến)` / Mã quay số: `+821025925885`
- **Kênh TikTok:** `@viettienauto` (`https://www.tiktok.com/@viettienauto`)

---

## 4. Kiểm tra Trùng lặp & Tính Toàn vẹn (Integrity Checks)

| Nội dung kiểm tra | Kết quả thực tế | Đánh giá |
|---|---|---|
| **Trùng lặp ID trong `positions`** | `0 bản ghi trùng` | Đạt chuẩn toàn vẹn (PK) |
| **Trùng lặp Key trong `vehicle_option_defs`** | `0 bản ghi trùng` | Đạt chuẩn duy nhất (UNIQUE) |
| **Trùng lặp ID trong `vehicle_option_defs`** | `0 bản ghi trùng` | Đạt chuẩn toàn vẹn (PK) |
| **Ràng buộc dòng đơn trong `website_settings`** | `Chính xác 1 dòng (id = 1)` | Đạt chuẩn cấu hình toàn cục |
| **Kiểm tra bảng `users`** | `0 bản ghi` | Tuân thủ không nạp user mẫu |

---

## 5. Xác nhận Khả năng Truy vấn của Ứng dụng

Đã mô phỏng các câu lệnh truy vấn mà Frontend VT AUTO đang sử dụng trong mã nguồn:
1. **Truy vấn vị trí xe:** `SELECT * FROM positions ORDER BY sort_order ASC` -> **Thành công (trả về đúng 5 vị trí).**
2. **Truy vấn danh mục option xe:** `SELECT * FROM vehicle_option_defs ORDER BY sort_order ASC` -> **Thành công (trả về đúng 16 option).**
3. **Truy vấn thông tin website:** `SELECT * FROM website_settings WHERE id = 1 LIMIT 1` -> **Thành công (trả về đúng 1 dòng cấu hình).**

Hệ thống cơ sở dữ liệu trên Neon PostgreSQL hiện đã có đầy đủ cấu trúc nghiệp vụ và dữ liệu danh mục nền tảng để ứng dụng hoạt động bình thường.
