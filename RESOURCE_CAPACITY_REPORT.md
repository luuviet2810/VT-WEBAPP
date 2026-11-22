# BÁO CÁO ĐÁNH GIÁ DUNG LƯỢNG VÀ TÀI NGUYÊN HỆ THỐNG VT AUTO
**Dự án:** VT AUTO Management System  
**Thời gian kiểm tra:** 22/11/2026  
**Mục tiêu:** Khảo sát dung lượng thực tế, hạn mức tài nguyên gói Free, kiểm tra End-to-End và ước tính khả năng mở rộng của **Neon PostgreSQL** và **Cloudflare R2**.

---

## 1. TỔNG HỢP TÀI NGUYÊN & MỨC ĐỘ SỬ DỤNG HIỆN TẠI

| Dịch vụ | Tài nguyên | Đang sử dụng | Hạn mức gói Free | Tỷ lệ sử dụng | Trạng thái |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Neon PostgreSQL** | Dung lượng Database (neondb) | **10.0 MB** | 1,024 MB (1.0 GiB) | **0.98%** | 🟢 Cực kỳ an toàn |
| **Neon PostgreSQL** | Dung lượng Logical Branch | **35.17 MB** | 1,024 MB (1.0 GiB) | **3.43%** | 🟢 Cực kỳ an toàn |
| **Neon PostgreSQL** | Compute Usage tháng này | **~0.54 CU-h** (32.3 phút) | 100 CU-hours / tháng | **< 1.0%** | 🟢 Cực kỳ an toàn |
| **Neon PostgreSQL** | Số lượng Branch | **1 branch** (`production`) | 10 branches | **10%** | 🟢 Dư dả |
| **Cloudflare R2** | Dung lượng lưu trữ (3 Buckets) | **0.00 B** | 10.0 GB (Standard) | **0.00%** | 🟢 Sẵn sàng nạp ảnh |
| **Cloudflare R2** | Class A Ops (Ghi/Upload) | **< 100 requests** | 1,000,000 req / tháng | **< 0.01%** | 🟢 Rất thoải mái |
| **Cloudflare R2** | Class B Ops (Đọc/Download) | **< 100 requests** | 10,000,000 req / tháng | **< 0.001%** | 🟢 Rất thoải mái |
| **Cloudflare R2** | Băng thông tải về (Egress) | **0.00 B** | Miễn phí 100% ($0 fee) | **0.00%** | 🟢 Không giới hạn |

---

## 2. CHI TIẾT TÀI NGUYÊN NEON POSTGRESQL

### 2.1. Cấu hình Dự án & Endpoint
- **Project ID:** `autumn-dream-42270306` (webapp VTAUTO)
- **Branch ID:** `br-lingering-frost-azgm2dgo` (`production`)
- **Region:** `aws-ap-southeast-1` (Singapore)
- **PostgreSQL Version:** 18.7
- **Gói dịch vụ:** `free_v3` (Free Tier)
- **Autoscaling:** Tối thiểu `0.25 CU` (0.25 vCPU, 1 GB RAM) đến tối đa `2.0 CU`.
- **Scale-to-Zero:** `suspend_timeout_seconds: 0` (Tự động tạm dừng compute ngay khi hết truy vấn, tránh lãng phí compute-hours khi gara đóng cửa hoặc không có người dùng thao tác).
- **Lịch sử khôi phục (History Retention):** `21,600s` (6 giờ Point-in-time restore).

### 2.2. Phân bổ Dung lượng Các Bảng và Index (Public Schema)
Tổng dung lượng người dùng hiện tại là **~2.2 MB** cho toàn bộ 21 bảng nghiệp vụ và 77 indexes:

| Tên bảng | Số bản ghi thật | Kích thước Data | Kích thước Index | Tổng kích thước | Tỷ lệ trong DB |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `vehicle_images` | 749 | 424 kB | 104 kB | **560 kB** | 25.4% |
| `check_sheets` | 119 | 168 kB | 96 kB | **296 kB** | 13.4% |
| `tasks` | 218 | 48 kB | 160 kB | **240 kB** | 10.9% |
| `vehicles` | 109 | 24 kB | 112 kB | **168 kB** | 7.6% |
| `users` | 7 | 8 kB | 144 kB | **160 kB** | 7.3% |
| `move_logs` | 184 | 24 kB | 48 kB | **96 kB** | 4.4% |
| `attendance` | 1 | 8 kB | 64 kB | **80 kB** | 3.6% |
| `task_activity_logs` | 9 | 8 kB | 64 kB | **80 kB** | 3.6% |
| `vehicle_workflow_logs` | 144 | 16 kB | 16 kB | **64 kB** | 2.9% |
| `vehicle_documents` | 3 | 8 kB | 48 kB | **64 kB** | 2.9% |
| `_neon_migrations` | 42 | 8 kB | 32 kB | **48 kB** | 2.2% |
| `positions` | 7 | 8 kB | 32 kB | **48 kB** | 2.2% |
| `vehicle_option_defs` | 16 | 8 kB | 32 kB | **48 kB** | 2.2% |
| `auth_login_attempts` | 1 | 8 kB | 32 kB | **48 kB** | 2.2% |
| `website_settings` | 1 | 8 kB | 16 kB | **32 kB** | 1.5% |
| `settings` | 1 | 8 kB | 16 kB | **32 kB** | 1.5% |
| Các bảng rỗng khác (notifications, logs) | 0 | 0 kB | 184 kB | **192 kB** | 8.7% |
| **TỔNG CỘNG** | **1,590** | **784 kB** | **1,216 kB** | **~2,248 kB (2.2 MB)** | **100%** |

### 2.3. Đánh giá Khả năng Đáp ứng & Tăng trưởng trên Neon
- **Mức tiêu thụ trung bình:** Mỗi chiếc xe mới nhập vào gara (kèm đầy đủ phiếu checksheet đầu vào/đầu ra, 10-15 nhiệm vụ kỹ thuật, lịch sử chuyển vị trí và metadata ảnh) chỉ tiêu hao khoảng **15 - 20 KB** dữ liệu lưu trữ văn bản/JSONB trong PostgreSQL.
- **Khả năng mở rộng:** Với **988 MB dung lượng còn trống** trong hạn mức Free (1.0 GiB), Neon PostgreSQL có thể lưu trữ tối thiểu **50,000 - 65,000 xe** và hơn **500,000 phiếu checksheet/nhiệm vụ**.
- **Kết luận:** Quy mô dữ liệu nghiệp vụ văn bản của VT AUTO (trung bình 20 - 50 xe/tháng) hoàn toàn không thể làm đầy gói Neon Free trong vòng **5 - 10 năm** tới.

---

## 3. CHI TIẾT TÀI NGUYÊN CLOUDFLARE R2

### 3.1. Hiện trạng 3 Buckets
Cả 3 Buckets đều đang ở trạng thái bảo mật riêng tư (**Private**), vị trí lưu trữ tự động tối ưu độ trễ, và sử dụng lớp lưu trữ **Standard Storage**:

| Tên Bucket | Phân loại | Số lượng file | Dung lượng hiện tại | Lớp lưu trữ (Storage Class) | Trạng thái |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `vehicle-images` | Ảnh xe & Thư viện | 0 | 0 B | STANDARD (Default) | 🟢 Sẵn sàng |
| `vehicle-documents` | Đăng ký & Bảo hiểm | 0 | 0 B | STANDARD (Default) | 🟢 Sẵn sàng |
| `checksheet-photos` | Ảnh lỗi kiểm tra xe | 0 | 0 B | STANDARD (Default) | 🟢 Sẵn sàng |
| **TỔNG CỘNG** | | **0 files** | **0 B** | **Standard Storage** | |

### 3.2. Kiểm thử End-to-End Presigned URL & Phân quyền R2 Token
Đã thực hiện kịch bản kiểm thử tích hợp thực tế:
1. **Tạo Presigned Download URL:** **THÀNH CÔNG 100%**. Backend tạo URL có chữ ký `AWS4-HMAC-SHA256`, client tải file về trả về mã `HTTP 200 OK`, nội dung toàn vẹn 100%.
2. **Tải lên qua Wrangler CLI:** **THÀNH CÔNG 100%**. Wrangler sử dụng xác thực OAuth tài khoản `luuviet2810@gmail.com` tải lên và xóa file kiểm thử `audit-probe.txt` thành công.
3. **Phát hiện quan trọng về R2 API Token trong file `.env`:**
   - Khi kiểm tra lệnh ghi `PutObject` thông qua S3 Client của backend (sử dụng `R2_ACCESS_KEY_ID`), Cloudflare R2 trả về lỗi `HTTP 403 Access Denied`.
   - **Nguyên nhân:** Token API hiện tại trong file môi trường được khởi tạo với quyền **Object Read-Only** (hoặc chưa tick chọn quyền Write).
   - **Xác nhận an toàn:** Lệnh đọc (`HeadBucket`, `ListObjectsV2`, `GetObject`) hoạt động chuẩn xác 100%, nhưng backend cần quyền Ghi để chuẩn bị cho Phase 3 (Upload ảnh mới).
   - **Giải pháp:** Trước khi tiến hành Phase 3, người dùng sẽ tạo 1 API Token mới trên Cloudflare Dashboard với quyền **Object Read & Write** (chỉ mất 1 phút) và cập nhật vào file `.env`.
4. **Dọn dẹp kiểm thử:** Toàn bộ file kiểm thử đã được dọn sạch hoàn toàn, kiểm tra bằng `HeadObjectCommand` trả về mã `NotFound (404)`. Tuyệt đối không xóa hay ảnh hưởng đến bất kỳ file thật nào.

### 3.3. Đánh giá Khả năng Đáp ứng Kho ảnh Xe của VT AUTO
- **Ước tính dữ liệu cần di chuyển từ Supabase:**
  - `vehicle_images`: 749 ảnh xe.
  - `vehicle_documents`: 3 file tài liệu.
  - Ước tính dung lượng trung bình: 1.5 MB - 2.5 MB / ảnh.
  - Tổng dung lượng ước tính khi nạp toàn bộ ảnh cũ vào R2: **~1.2 GB - 1.8 GB**.
- **So sánh với Hạn mức Free Tier của Cloudflare R2:**
  - Hạn mức miễn phí: **10.0 GB**.
  - Tỷ lệ chiếm dụng sau khi di chuyển: **~12% - 18%**.
  - Dung lượng miễn phí còn lại: **hơn 8.2 GB** (đáp ứng lưu thêm **4,000 - 5,000 bức ảnh xe mới**).
  - Không tốn chi phí băng thông tải về (Egress fees = $0).

---

## 4. BẢNG KHUYẾN NGHỊ NGƯỠNG CÂN NHẮC NÂNG CẤP

| Nền tảng | Ngưỡng an toàn hiện tại | Ngưỡng nên cân nhắc nâng cấp | Chi phí ước tính khi vượt ngưỡng | Khuyến nghị hành động |
| :--- | :---: | :---: | :---: | :--- |
| **Neon PostgreSQL** | Đang dùng 35 MB (3.4%) | Khi dung lượng vượt **800 MB** (80% của 1 GiB) | Gói **Neon Launch** ($19/tháng: 10 GiB storage, 300 CU-hours) | **Giữ nguyên gói Free**. Chưa cần nâng cấp trong nhiều năm tới. |
| **Cloudflare R2** | Đang dùng 0 GB (Sau Phase 3: ~1.5 GB) | Khi tổng dung lượng ảnh vượt **8.0 GB** (80% của 10 GB) | **$0.015 / GB / tháng** (khoảng ~375 VNĐ / GB lưu thêm). Egress vẫn 100% Free. | **Giữ nguyên gói Free**. Chỉ cần tạo lại Token R2 quyền "Object Read & Write" trước khi upload. |

---

## 5. KẾT LUẬN

1. **Về Database (Neon):** Cực kỳ ổn định, tốc độ phản hồi nhanh, dung lượng sử dụng mới chỉ chiếm **3.4%** gói Free. Hệ thống hoàn toàn dư dả tài nguyên cho toàn bộ hoạt động của VT AUTO.
2. **Về Lưu trữ hình ảnh (Cloudflare R2):** Cả 3 bucket sẵn sàng 100%, lớp lưu trữ Standard Storage chuẩn hóa. Sau khi nạp toàn bộ 749 ảnh từ Supabase vẫn chỉ chiếm khoảng 15% hạn mức miễn phí (10 GB).
3. **Bước chuẩn bị duy nhất cho Phase 3:** Cập nhật R2 API Token sang quyền **Object Read & Write** để mở khóa tính năng upload ảnh trực tiếp.
