# BÁO CÁO XÂY DỰNG NỀN TẢNG BACKEND API (GARA-BOT-SERVER)
**Dự án:** VT AUTO (gara-manager)  
**Thời gian hoàn thành:** 22/11/2026  
**Thành phần thực hiện:** `gara-bot-server` (Mở rộng từ Telegram Bot microservice thành Backend REST API Server hoàn chỉnh)

---

## 1. Tổng quan Kiến trúc Đã Triển khai

Backend `gara-bot-server` đã được tổ chức lại theo mô hình module hóa chuyên nghiệp chuẩn TypeScript NodeNext ESM, bảo đảm **100% không ảnh hưởng** tới tính năng Telegram Bot đang hoạt động:

```
gara-bot-server/src/
├── config/                  # Quản lý cấu hình & biến môi trường (Neon, JWT, R2, CORS)
│   └── index.ts
├── database/                # Kết nối Connection Pool Neon PostgreSQL (pg.Pool)
│   └── index.ts
├── middleware/              # Lớp kiểm soát bảo mật, xác thực và phân quyền
│   ├── auth.middleware.ts   # Xác thực JWT Bearer Token
│   ├── rbac.middleware.ts   # Phân quyền Admin / Staff (RBAC)
│   ├── error.middleware.ts  # Bắt lỗi toàn cục, khử secret và connection string khỏi log
│   └── validate.middleware.ts # Kiểm tra tính hợp lệ dữ liệu đầu vào bằng Zod
├── storage/                 # Dịch vụ tích hợp Cloudflare R2 (S3-compatible)
│   └── r2.service.ts        # Presigned URL (Upload/Download) & Kiểm tra kết nối 3 bucket
├── services/                # Nghiệp vụ xử lý logic
│   ├── auth.service.ts      # Ký token, giải mã token, tra cứu hồ sơ người dùng
│   └── health.service.ts    # Tổng hợp báo cáo sức khỏe hệ thống (Database, R2, Uptime)
├── controllers/             # Tiếp nhận và xử lý HTTP Request
│   ├── health.controller.ts # API giám sát sức khỏe (/health, /health/db, /health/r2, /health/full)
│   ├── auth.controller.ts   # API hồ sơ người dùng (/api/auth/me, /api/auth/verify)
│   └── storage.controller.ts# API cấp Presigned URL (/api/storage/presigned-upload, /presigned-download)
├── routes/                  # Định tuyến API
│   ├── health.routes.ts
│   ├── auth.routes.ts
│   ├── storage.routes.ts
│   └── index.ts             # Tích hợp toàn bộ API routes + bảo toàn /api/telegram
├── api/                     # Module Telegram API hiện có (BẢO TOÀN NGUYÊN VẸN)
│   ├── telegram.routes.ts
│   └── telegram.service.ts
├── telegram/                # Bot Telegram hiện có (BẢO TOÀN NGUYÊN VẸN)
│   ├── bot.ts
│   ├── link.service.ts
│   └── types.ts
└── index.ts                 # Điểm khởi chạy server, kiểm tra kết nối DB và start Telegram Bot
```

---

## 2. Chi tiết Các Module Cốt lõi

### 2.1. Module Kết nối Neon PostgreSQL (`src/database/index.ts`)
- Sử dụng thư viện `pg` với cơ chế Connection Pooling (`pg.Pool`), tối ưu kết nối và tự động tái sử dụng kết nối.
- Cấu hình an toàn:
  - Đọc `DATABASE_URL` từ môi trường (tự động kế thừa từ file `.env` root hoặc `gara-bot-server/.env`).
  - Hỗ trợ SSL (`rejectUnauthorized: false` cho môi trường cloud).
  - Thiết lập `connectionTimeoutMillis: 15000` phù hợp với độ trễ Serverless Postgres.
- Hàm chẩn đoán `checkDatabaseHealth()` đo đạc trực tiếp độ trễ (latency ms) và phiên bản PostgreSQL đang chạy.

### 2.2. Module Xác thực & Phân quyền JWT (`src/middleware/auth.middleware.ts` & `rbac.middleware.ts`)
- **JWT Authentication:** Xác thực token gửi qua header `Authorization: Bearer <token>`, trích xuất thông tin người dùng (`id`, `name`, `email`, `role`, `status`).
- **RBAC (Role-Based Access Control):**
  - `requireAdmin`: Chỉ cho phép người dùng có quyền `admin`.
  - `requireStaffOrAdmin`: Cho phép cả `admin` và nhân viên `staff` có tài khoản hợp lệ, tự động chặn tài khoản bị `disabled` hoặc `rejected`.
- **Bảo mật:** Chưa mở API đăng ký/đăng nhập tự do cho đến khi chốt phương án chuyển giao mật khẩu từ Supabase Auth.

### 2.3. Module Lưu trữ Cloudflare R2 (`src/storage/r2.service.ts`)
- Sử dụng chuẩn AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- Quản lý tách biệt quyền hạn của cả 3 bucket private:
  - `vehicle-images`
  - `vehicle-documents`
  - `checksheet-photos`
- Hàm tạo **Presigned Upload URL** (hạn 15 phút): Cho phép Frontend tải ảnh trực tiếp lên R2 mà không bao giờ cần biết Secret Key của Cloudflare.
- Hàm tạo **Presigned Download URL** (hạn 15 phút): Cho phép Frontend đọc các tài liệu bảo mật từ bucket Private.
- Hàm kiểm tra kết nối `checkR2Health()`: Gửi lệnh `HeadBucketCommand` tới từng bucket để xác định trạng thái hoạt động thực tế.

### 2.4. Module Bắt lỗi & Kiểm tra Dữ liệu (`src/middleware/error.middleware.ts` & `validate.middleware.ts`)
- Tích hợp thư viện `zod` để kiểm tra chặt chẽ cấu trúc tham số (request body / query) trước khi xử lý.
- Bộ lọc lỗi toàn cục tự động xóa sạch các thông tin nhạy cảm (`DATABASE_URL`, mật khẩu, token) trước khi in ra log hoặc gửi về client.

---

## 3. Kết quả Kiểm thử Thực tế (100% Pass)

Toàn bộ các bài kiểm thử biên dịch và endpoint đã được thực hiện trực tiếp:

| Mục kiểm thử | Lệnh / Endpoint | Kết quả thực tế | Đánh giá |
|---|---|---|---|
| **Biên dịch TypeScript** | `npm run build` (`tsc -p tsconfig.json`) | **Thành công (0 lỗi)** | Mã nguồn đạt chuẩn Type-safe NodeNext ESM |
| **Kiểm tra cơ bản** | `GET /health` | `HTTP 200 OK` (`ok: true`, uptime) | Đạt |
| **Kết nối Neon PostgreSQL** | `GET /health/db` | `HTTP 200 OK` (Độ trễ: **649ms**, `PostgreSQL 18.7`, DB: `neondb`) | Đạt chuẩn kết nối |
| **Trạng thái Cloudflare R2** | `GET /health/r2` | `HTTP 200 OK` (`ok: true`, cả 3 bucket `vehicle-images`, `vehicle-documents`, `checksheet-photos` đều `true`) | Đạt kết nối 100% |
| **Bảo vệ Endpoint** | `GET /api/auth/me` (không token) | `HTTP 401 Unauthorized` | Chặn truy cập trái phép |
| **Xác thực JWT Token** | `GET /api/auth/me` (token hợp lệ) | `HTTP 200 OK` (Trả về đúng User và Role `admin`) | Cơ chế JWT hoạt động chuẩn xác |
| **Cấp Presigned URL** | `POST /api/storage/presigned-upload` | `HTTP 200 OK` (Tạo URL S3 PUT ký bằng `AWS4-HMAC-SHA256`) | Đạt cấp phép an toàn |

---

## 4. Bảo tồn Nghiệp vụ & Tuân thủ An toàn

- **Telegram Bot:** Các router `/api/telegram` và các hàm khởi chạy polling (`setupTelegramBot()`, `startBotPolling()`) được giữ nguyên 100%, không bị xáo trộn.
- **Frontend:** Không sửa đổi bất kỳ file nào trong 17 service Supabase của Frontend ở bước này.
- **Supabase Production:** Không kết nối, không sửa đổi dữ liệu Supabase.
- **Neon Database:** Giữ nguyên vẹn cấu trúc và master data, không chạy lệnh DROP hay DELETE.
- **Bảo mật mã nguồn:** Không hardcode mật khẩu hay secret key vào source code, không commit hay push Git.

---

## 5. Trạng thái Xác minh Cloudflare R2 & Bước tiếp theo

### Trạng thái Xác minh R2 (Hoàn thành):
- Người dùng đã nạp `R2_ACCESS_KEY_ID` và `R2_SECRET_ACCESS_KEY` an toàn vào file cấu hình môi trường.
- Đã chạy kiểm thử tự động đọc quyền (`HeadBucket`, `ListObjectsV2` MaxKeys=1): **Cả 3 bucket (`vehicle-images`, `vehicle-documents`, `checksheet-photos`) kết nối thành công 100%**.
- Không có bất kỳ tệp tin nào bị tạo, sửa đổi hay xóa trên R2.
- Endpoint `POST /api/storage/presigned-upload` đã tạo thành công link ký S3 PUT URL trực tiếp tới Cloudflare R2.

### Bước tiếp theo đề xuất:
1. **Chiến lược Chuyển đổi Tài khoản (Auth Migration):**
   - Xác định phương án chuyển đổi tài khoản người dùng từ Supabase Auth sang Neon PostgreSQL (ví dụ: tạo bảng tài khoản mật khẩu bcrypt/argon2 hoặc nạp tài khoản admin).
2. **Xây dựng các REST API nghiệp vụ cốt lõi:**
   - Quản lý xe (`/api/vehicles`): danh sách xe, chi tiết xe, thêm/sửa trạng thái xe.
   - Quản lý phiếu kiểm tra (`/api/checksheets`): phiếu khám xe, ảnh ngoại thất/nội thất.
   - Quản lý công việc & báo cáo (`/api/tasks`, `/api/reports`).
3. **Chuyển giao Frontend:**
   - Từng bước cập nhật 17 service frontend chuyển từ Supabase Client sang gọi Backend API nội bộ.
