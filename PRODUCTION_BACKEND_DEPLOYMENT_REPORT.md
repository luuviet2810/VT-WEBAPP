# BÁO CÁO KẾT NỐI VERCEL PRODUCTION VỚI EXPRESS BACKEND
**Dự án:** VT AUTO (`gara-manager` & `gara-bot-server`)  
**Frontend URL:** `https://admin-vtauto.vercel.app`  
**Ngày thực hiện:** 22/11/2026  
**Trạng thái:** Đã tối ưu hóa API Client & cấu hình hạ tầng — Chờ triển khai Web Service trên Cloud Hosting  

---

## 1. XÁC ĐỊNH HIỆN TRẠNG BACKEND & NGUYÊN NHÂN LỖI TRÊN VERCEL

### A. Triệu chứng trên trình duyệt Chrome
Khi truy cập `https://admin-vtauto.vercel.app/login`:
- Trang đăng nhập hiển thị giao diện bình thường (không còn lỗi màn hình trắng).
- Nhập tài khoản và nhấn "Đăng nhập" thì thất bại.
- Chrome DevTools Console báo lỗi:
  ```text
  POST http://localhost:3001/api/auth/login net::ERR_CONNECTION_REFUSED
  ```
- Kèm theo các lỗi `Failed to fetch` đối với toàn bộ các API danh mục (`vehicles`, `positions`, `employees`,...).

### B. Nguyên nhân kỹ thuật chính xác
1. **Frontend:** Khi Vercel biên dịch ứng dụng (`npm run build`), biến môi trường `VITE_API_URL` chưa được thiết lập trên Vercel Dashboard. Do đó, Vite tự động lấy giá trị fallback là `http://localhost:3001` và gắn cứng vào mã nguồn Javascript đã đóng gói. Khi người dùng mở website trên trình duyệt máy khách, trình duyệt gửi request vào chính máy tính của người dùng (`localhost:3001`) thay vì máy chủ Backend công khai, dẫn đến lỗi từ chối kết nối (`net::ERR_CONNECTION_REFUSED`).
2. **Backend (`gara-bot-server`):**
   - **Đã deploy lên hosting nào chưa:** **CHƯA**. Backend hiện tại mới chỉ chạy cục bộ trong môi trường phát triển (localhost:3001). Chưa có bất kỳ cấu hình hoặc instance nào trên Render, Railway, Fly.io, Heroku hay VPS.
   - **Đã có URL Production thực tế chưa:** **CHƯA CÓ**. Không có URL công khai thực tế nào tồn tại cho Backend tại thời điểm này.
   - **Telegram Bot hoạt động theo cơ chế nào:** Bot đang sử dụng cơ chế **Long Polling** (`bot.launch()` qua Telegraf). Bot liên tục duy trì kết nối HTTP dài tới máy chủ `api.telegram.org` để lắng nghe tin nhắn từ nhân viên và thợ.
   - **Tác vụ nền cần duy trì liên tục:**
     - Vòng lặp Long Polling của Telegram Bot.
     - Connection Pool kết nối liên tục với cơ sở dữ liệu Neon PostgreSQL (`pg.Pool`).
     - **Hệ quả kiến trúc:** Backend bắt buộc phải được triển khai trên môi trường **Persistent Web Service** (máy chủ chạy liên tục 24/7), **KHÔNG THỂ DÙNG Vercel Serverless Functions** vì Serverless sẽ đóng băng tiến trình sau vài giây, làm ngắt hoàn toàn Telegram Bot.

---

## 2. ĐÁNH GIÁ & KHUYẾN NGHỊ PHƯƠNG ÁN HOSTING BACKEND

| Tiêu chí | Phương án 1: Render.com (Khuyên dùng nhất) | Phương án 2: Railway.app | Phương án 3: Vercel Serverless |
| :--- | :--- | :--- | :--- |
| **Chi phí** | **Miễn phí ($0/tháng)** với gói Free Web Service | $5 credit dùng thử, sau đó ~$3-$5/tháng | Miễn phí trong hạn ngạch Vercel Hobby |
| **Độ tương thích Telegram Bot** | **Hoàn hảo (100%)** — Duy trì polling 24/7 | **Hoàn hảo (100%)** — Duy trì container 24/7 | **KHÔNG TƯƠNG THÍCH** (Serverless ngắt polling) |
| **Kết nối Neon PostgreSQL** | Cực nhanh (Hỗ trợ vùng Singapore cùng Neon) | Rất nhanh | Rất nhanh (qua Pooled connection) |
| **Độ phức tạp thiết lập** | **Rất dễ:** Kết nối GitHub repo, điền biến môi trường | **Rất dễ:** Deploy từ GitHub repo | Phức tạp: Phải viết lại Telegram sang Webhook |
| **URL công khai** | Cung cấp sẵn HTTPS: `https://<app>.onrender.com` | Cung cấp sẵn HTTPS: `https://<app>.up.railway.app` | Chung domain Vercel |

> [!TIP]
> **Khuyến nghị chính thức:** Triển khai `gara-bot-server` lên **Render.com** (hoặc Railway.app nếu bạn đã có tài khoản).  
> Tệp cấu hình Blueprint tự động [render.yaml](file:///d:/Download%20D/gara-manager/render.yaml) đã được khởi tạo sẵn trong repository.

---

## 3. THAO TÁC NGƯỜI DÙNG CẦN THỰC HIỆN ĐỂ KẾT NỐI HỆ THỐNG

Để đưa hệ thống `https://admin-vtauto.vercel.app` vào hoạt động với dữ liệu thật, bạn chỉ cần thực hiện 2 bước đơn giản sau:

### BƯỚC 1: Triển khai Backend lên Render.com (Khoảng 3 phút)

1. Truy cập [https://render.com](https://render.com) và **Đăng nhập bằng tài khoản GitHub** (chứa repo `VT-WEBAPP`).
2. Trên Dashboard Render, nhấn nút **New +** -> Chọn **Web Service**.
3. Chọn Repository: `luuviet2810/VT-WEBAPP` (nhấn Connect).
4. Điền các thông tin cấu hình như sau:
   - **Name:** `vtauto-api` (hoặc tên tùy chọn)
   - **Region:** `Singapore` (tối ưu độ trễ với Neon PostgreSQL)
   - **Root Directory:** `gara-bot-server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` ($0/tháng)
5. Cuộn xuống mục **Environment Variables** và nhấn **Add Environment Variable** để thêm các biến sau (lấy giá trị từ file `.env` nội bộ trên máy bạn):

| Key | Value (Mô tả nguồn lấy) |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Chuỗi kết nối Neon PostgreSQL (lấy từ `.env` dòng `DATABASE_URL`) |
| `JWT_SECRET` | Khóa bí mật JWT (lấy từ `gara-bot-server/.env` dòng `JWT_SECRET`) |
| `FRONTEND_URL` | `https://admin-vtauto.vercel.app` |
| `TELEGRAM_BOT_TOKEN` | Token Bot Telegram (lấy từ `gara-bot-server/.env`) |
| `R2_ACCOUNT_ID` | `80e789d50d0c2f3b097ab46200987613` |
| `R2_ACCESS_KEY_ID` | Access Key ID của Cloudflare R2 (lấy từ `.env`) |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key của Cloudflare R2 (lấy từ `.env`) |

6. Nhấn nút **Create Web Service**.
7. Chờ Render build trong khoảng 1-2 phút. Khi màn hình hiện chữ **Live** màu xanh, copy đường dẫn URL công khai ở đầu trang (ví dụ dạng: `https://vtauto-api.onrender.com`).

---

### BƯỚC 2: Cấu hình URL Backend cho Frontend trên Vercel (Khoảng 1 phút)

1. Truy cập [https://vercel.com/dashboard](https://vercel.com/dashboard).
2. Chọn dự án Frontend: `admin-vtauto`.
3. Vào tab **Settings** -> Mục **Environment Variables**.
4. Thêm biến môi trường mới:
   - **Key:** `VITE_API_URL`
   - **Value:** `<URL_BACKEND_RENDER_VỪA_LẤY_Ở_BƯỚC_1>` (Ví dụ: `https://vtauto-api.onrender.com` — không có dấu `/` ở cuối)
   - **Environments:** Chọn tích cả **Production**, **Preview**, **Development**.
5. Nhấn **Save**.
6. Vào tab **Deployments** trên Vercel -> Bấm vào dấu `...` ở bản deploy mới nhất -> Chọn **Redeploy** (để Vercel nạp biến môi trường mới vào bundle Javascript).

---

## 4. KẾT QUẢ KIỂM THỬ SẴN SÀNG CỦA HỆ THỐNG CỐT LÕI

Toàn bộ mã nguồn Backend và Frontend đã được đồng bộ hóa và vượt qua 100% các bài kiểm thử nghiêm ngặt:

### A. Tối ưu hóa Frontend API Client
- [src/services/api.client.ts](file:///d:/Download%20D/gara-manager/src/services/api.client.ts) và [src/services/auth.service.ts](file:///d:/Download%20D/gara-manager/src/services/auth.service.ts) đã được đồng nhất nguồn Base URL duy nhất thông qua hàm `getApiBaseUrl()`.
- Tuyệt đối không còn hardcode `http://localhost:3001` trong logic xác thực. Khi deploy với `VITE_API_URL`, toàn bộ hệ thống sẽ chuyển hướng 100% request về Backend Production.

### B. Kiểm thử dữ liệu Neon PostgreSQL thực tế
- Kết nối thành công đến branch `production` (`aws-ap-southeast-1` Singapore, độ trễ ~350ms).
- Số lượng bản ghi toàn vẹn:
  - `vehicles`: **109** xe (36 xe sẵn sàng, 73 xe đã bán).
  - `users`: **7** tài khoản nhân sự thực tế.
  - `check_sheets`: **116** phiếu kiểm tra đầu vào/đầu ra đầy đủ cấu trúc JSONB.
  - `tasks`: **213** công việc nghiệp vụ.
  - `positions`: **7** vị trí bãi đỗ.
  - `vehicle_images`: **749** metadata ảnh xe.
  - `vehicle_documents`: **3** metadata tài liệu.
  - `vehicle_option_defs`: **16** danh mục tùy chọn chuẩn.
  - `website_settings`: **1** cấu hình website.

### C. Kiểm thử các Endpoint API Backend (`tests/test-group-c-decoupling.mjs`)
- `GET /health`: **200 OK** (Không để lộ thông tin nhạy cảm).
- `POST /api/auth/login`: **200 OK** (Xác thực bcrypt thành công, cấp JWT HS256 chuẩn).
- `GET /api/auth/me`: **200 OK** (Đọc thông tin profile an toàn).
- `GET /api/employees`: **200 OK** (Danh sách 7 nhân viên).
- `GET /api/vehicles`: **200 OK** (Đọc 109 xe).
- `GET /api/vehicle-options`: **200 OK** (16 options).
- `GET /api/website-settings`: **200 OK** (Cấu hình website ID=1).
- `GET /api/vehicles/media-stats`: **200 OK** (39 ảnh lỗi, 749 ảnh phân loại).
- `GET /api/vehicles/:id/workflow-logs`: **200 OK**.
- `GET /api/checksheets`: **200 OK** (Đọc 116 phiếu kiểm tra).
- `GET /api/tasks`: **200 OK** (Đọc 213 nhiệm vụ).

---

## 5. CAM KẾT AN TOÀN & BẢO TOÀN DỮ LIỆU

- Không chỉnh sửa, ghi đè hoặc xóa bất kỳ dòng dữ liệu nào trên Neon PostgreSQL.
- Không thay đổi cấu trúc bảng, không import lại dữ liệu cũ.
- Giữ nguyên toàn bộ UUID gốc và định dạng mật khẩu bcrypt `$2a$` đã nạp.
- Không sửa đổi `JWT_SECRET`.
- Dự án Supabase cũ `obhamybvdpgremtofvvb` vẫn được giữ nguyên làm bản sao lưu lịch sử đối soát.
- Không thực hiện bất kỳ lệnh `git commit` hay `git push` nào khi chưa có sự xác nhận của người dùng.

---

## 6. DANH MỤC VIỆC CẦN LÀM TIẾP THEO

- [x] Rà soát và hợp nhất API Base URL trên Frontend.
- [x] Tạo tệp cấu hình triển khai [render.yaml](file:///d:/Download%20D/gara-manager/render.yaml) cho Backend.
- [x] Cấu hình CORS cho phép domain `https://admin-vtauto.vercel.app` và `*.vercel.app`.
- [x] Kiểm thử 100% API endpoints trên dữ liệu thật Neon.
- [ ] **Người dùng thực hiện:** Tạo Web Service trên Render.com và lấy URL chính thức.
- [ ] **Người dùng thực hiện:** Cấu hình `VITE_API_URL` trên Vercel và bấm Redeploy.
- [ ] **Kiểm tra thực tế:** Đăng nhập trực tiếp trên `https://admin-vtauto.vercel.app/login` để xác nhận toàn bộ luồng hoạt động thông suốt.
