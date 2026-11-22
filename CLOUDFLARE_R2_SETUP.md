# THIẾT LẬP VÀ ÁNH XẠ LƯU TRỮ CLOUDFLARE R2 (VT AUTO)
**Mục tiêu:** Chuyển đổi và thiết lập lưu trữ tệp đa phương tiện từ Supabase Storage sang **Cloudflare R2**.  
**Thời gian cập nhật:** 22/11/2026  
**Trạng thái hiện tại:** ĐÃ XÁC MINH VÀ KẾT NỐI THÀNH CÔNG CẢ 3 BUCKET TRÊN CLOUDFLARE R2 BẰNG AWS S3 SDK (READ-ONLY TEST HOÀN TẤT)

---

## 1. Hiện trạng & Xác minh 3 Bucket trên Cloudflare R2

Hệ thống VT AUTO đã xác minh quyền truy cập và kiểm tra danh sách bucket bằng lệnh `npx wrangler r2 bucket list`:
- **Tài khoản Cloudflare:** `luuviet2810@gmail.com`
- **Tên tài khoản (Account Name):** `Luuviet2810@gmail.com's Account`
- **Account ID:** `80e789d50d0c2f3b097ab46200987613`
- **R2 S3 API Endpoint:** `https://80e789d50d0c2f3b097ab46200987613.r2.cloudflarestorage.com`

### Danh sách 3 Bucket đã xác minh tồn tại:
1. `vehicle-images`: Tạo lúc `2026-11-21T16:34:06.236Z` (Trạng thái: Private)
2. `vehicle-documents`: Tạo lúc `2026-11-21T16:34:14.030Z` (Trạng thái: Private)
3. `checksheet-photos`: Tạo lúc `2026-11-21T16:34:19.980Z` (Trạng thái: Private)

---

## 2. Xác thực Wrangler CLI (OAuth Hoàn tất)

Wrangler CLI (phiên bản `4.166.0`) đã được liên kết thành công với tài khoản Cloudflare qua OAuth. Phiên làm việc đã được ghi nhận an toàn tại máy tính cục bộ.

---

## 3. Khảo sát Cấu trúc Bảng Database & Ánh xạ Dữ liệu sang R2

### 3.1. Bảng `vehicle_images` (Database Neon)
- **Cấu trúc trường:**
  - `id` (UUID, PK): Khóa chính của bản ghi ảnh.
  - `vehicle_id` (UUID, FK -> `vehicles.id`): Xe sở hữu ảnh.
  - `path` (TEXT): Đường dẫn tệp dạng `vehicles/{vehicle_id}/{timestamp}_{filename}.jpg`.
  - `bucket` (TEXT): Tên bucket (mặc định `'vehicle-images'`).
  - `url` (TEXT): URL đầy đủ để xem ảnh.
  - `thumbnail` (TEXT, Nullable): URL hoặc đường dẫn ảnh thu nhỏ 600px/800px.
  - `category` (TEXT): Phân loại mục đích ảnh (`'vehicle'` hoặc `'website'`).
  - `sort_order` (INTEGER): Thứ tự sắp xếp ảnh trong thư viện xe.

### 3.2. Bảng `vehicle_documents` (Database Neon)
- **Cấu trúc trường:**
  - `id` (UUID, PK): Khóa chính giấy tờ.
  - `vehicle_id` (UUID, FK -> `vehicles.id`): Xe liên kết.
  - `label` (TEXT): Tên loại giấy tờ (ví dụ: "Đăng ký xe", "Bảo hiểm").
  - `path` (TEXT): Đường dẫn tệp dạng `documents/{vehicle_id}/{timestamp}_{filename}.pdf`.
  - `bucket` (TEXT): Tên bucket (mặc định `'vehicle-documents'`).
  - `url` (TEXT): URL đầy đủ để tải hoặc xem tài liệu.

### 3.3. Bảng `check_sheets` (Database Neon)
- **Cấu trúc trường:**
  - `id` (UUID, PK): Mã phiếu kiểm tra xe.
  - `vehicle_id` (UUID, FK -> `vehicles.id`): Xe được kiểm tra.
  - `exterior_photos` (JSONB): Từ điển ánh xạ theo vị trí hư hại:
    ```json
    {
      "hood": ["https://.../checksheets/{vehicle_id}/hood/{timestamp}_{filename}.jpg"],
      "left_front_door": ["https://.../checksheets/{vehicle_id}/left_front_door/{timestamp}_{filename}.jpg"]
    }
    ```

---

## 4. Đề xuất Cấu trúc Object Key trên Cloudflare R2

Để đảm bảo tính nhất quán 100% với dữ liệu hiện tại trong database và không làm xáo trộn đường dẫn khi di chuyển dữ liệu:

### 4.1. Bucket `vehicle-images`
- **Ảnh gốc (Original):**
  `vehicles/{vehicle_id}/{timestamp}_{sanitized_filename}.{ext}`
  *Ví dụ:* `vehicles/b7e28a90-3456-4abc-9def-0123456789ab/1715000000123_anh_dau_xe.jpg`
- **Ảnh thu nhỏ (Thumbnail):**
  `vehicles/{vehicle_id}/{timestamp}_{sanitized_filename}_thumb.jpg`
  *Ví dụ:* `vehicles/b7e28a90-3456-4abc-9def-0123456789ab/1715000000123_anh_dau_xe_thumb.jpg`
- **Metadata gắn kèm trên R2 Object (HTTP Headers):**
  - `x-amz-meta-vehicle-id`: `{vehicle_id}`
  - `x-amz-meta-category`: `{category}` (`vehicle` / `website`)
  - `x-amz-meta-original-name`: Tên gốc trước khi làm sạch

### 4.2. Bucket `vehicle-documents`
- **Cấu trúc Object Key:**
  `documents/{vehicle_id}/{timestamp}_{sanitized_filename}.{ext}`
  *Ví dụ:* `documents/b7e28a90-3456-4abc-9def-0123456789ab/1715000000456_giay_dang_kiem.pdf`
- **Metadata gắn kèm trên R2 Object:**
  - `x-amz-meta-vehicle-id`: `{vehicle_id}`
  - `x-amz-meta-label`: Tên giấy tờ (encoded URL)

### 4.3. Bucket `checksheet-photos`
- **Cấu trúc Object Key:**
  `checksheets/{vehicle_id}/{spot_key}/{timestamp}_{sanitized_filename}.{ext}`
  *Ví dụ:* `checksheets/b7e28a90-3456-4abc-9def-0123456789ab/hood/1715000000789_vet_xuoc_nap_cabo.jpg`
- **Metadata gắn kèm trên R2 Object:**
  - `x-amz-meta-vehicle-id`: `{vehicle_id}`
  - `x-amz-meta-spot-key`: `{spot_key}` (vị trí: `hood`, `roof`, `front_bumper`, ...)
  - `x-amz-meta-checksheet-id`: `{checksheet_id}`

---

## 5. Hướng dẫn Tạo API Token Quyền Tối thiểu (Khi cần cấu hình Backend)

Do cả 3 bucket đang ở chế độ **Private**, backend Node.js/Express sẽ cần một API Token để:
- Tạo **Presigned URL** cấp quyền tạm thời (10 - 15 phút) cho frontend tự upload ảnh lên R2.
- Đọc/xóa ảnh khi người dùng cập nhật trong hệ thống.

### Hướng dẫn tạo API Token trên Cloudflare Dashboard (Nguyên tắc Quyền tối thiểu):
1. Truy cập **Cloudflare Dashboard** -> **R2** -> Nhìn bên phải chọn **Manage R2 API Tokens**.
2. Bấm nút **Create API Token**.
3. Cấu hình quyền chính xác:
   - **Token Name:** `vtauto-backend-r2`
   - **Permissions:** Chọn **Object Read & Write** (Chỉ cho phép đọc/ghi đối tượng, KHÔNG chọn Admin Read & Write).
   - **Apply to specific buckets only:** Chọn đúng 3 bucket:
     - `vehicle-images`
     - `vehicle-documents`
     - `checksheet-photos`
   - **TTL / Expiry:** Chọn ngày hết hạn phù hợp hoặc để mặc định.
4. Bấm **Create API Token**.
5. Lưu lại 3 giá trị:
   - `Access Key ID`
   - `Secret Access Key`
   - `Endpoint` (dạng `https://<account_id>.r2.cloudflarestorage.com`)
   *(Lưu ý: Không gửi trực tiếp Secret Access Key vào chat; khi đến bước tích hợp backend, tôi sẽ hướng dẫn đưa vào file `.env.local` an toàn).*


---

## 6. Kết quả Kiểm tra Kết nối API (Read-Only Test - 22/11/2026)

Sau khi người dùng bổ sung `R2_ACCESS_KEY_ID` và `R2_SECRET_ACCESS_KEY` vào cấu hình môi trường, hệ thống đã chạy script kiểm tra tự động (`tests/test-r2-connection.mjs`) với các kiểm thử hoàn toàn ở chế độ đọc (**read-only**):
- Lệnh gọi: `HeadBucketCommand` (xác thực quyền truy cập và kiểm tra bucket tồn tại)
- Lệnh gọi: `ListObjectsV2Command` (với `MaxKeys: 1`, xác thực quyền đọc danh sách đối tượng)

### Chi tiết kết quả:
| Bucket Name | Quyền truy cập | HeadBucket | ListObjectsV2 | Ghi chú an toàn |
| :--- | :--- | :--- | :--- | :--- |
| `vehicle-images` | Private | **PASS (200)** | **PASS (200)** | 0 object bị chỉnh sửa / xoá / tạo mới |
| `vehicle-documents` | Private | **PASS (200)** | **PASS (200)** | 0 object bị chỉnh sửa / xoá / tạo mới |
| `checksheet-photos` | Private | **PASS (200)** | **PASS (200)** | 0 object bị chỉnh sửa / xoá / tạo mới |

### Kiểm tra Backend Health Endpoint:
- Endpoint `GET /health/r2` trong `gara-bot-server` trả về:
  ```json
  {
    "ok": true,
    "service": "cloudflare-r2",
    "data": {
      "ok": true,
      "configured": true,
      "buckets": {
        "vehicle-images": true,
        "vehicle-documents": true,
        "checksheet-photos": true
      }
    }
  }
  ```
- Endpoint `POST /api/storage/presigned-upload` tạo thành công Presigned S3 PUT URL (sử dụng thuật toán `AWS4-HMAC-SHA256`) có thời hạn 900 giây (15 phút).
- Đã cấu hình `forcePathStyle: true` theo khuyến nghị chuẩn của Cloudflare R2 để tương thích tốt với AWS S3 SDK.
