# VT AUTO – BÁO CÁO ĐÁNH GIÁ SẴN SÀNG DEPLOY RENDER
**File:** `RENDER_DEPLOYMENT_READINESS.md`  
**Ngày thực hiện:** 22/11/2026  
**Dự án:** VT AUTO (`gara-bot-server` & Admin Web)  
**Trạng thái kiểm tra:** Hoàn tất 100% các bước kỹ thuật  

---

## 1. KẾT LUẬN TỔNG QUAN (EXECUTIVE VERDICT)

> ### ⚠️ TRẠNG THÁI HIỆN TẠI: **NOT READY TO DEPLOY NGAY LẬP TỨC**
> *(Chỉ vì lý do: Toàn bộ mã nguồn khắc phục sự cố khởi động Supabase đang nằm ở **Local Working Directory**, **CHƯA ĐƯỢC COMMIT VÀ PUSH** lên GitHub `origin/main`).*
>
> 🛑 **Cảnh báo quan trọng:**  
> Render lấy mã nguồn tự động hoặc kích hoạt deploy từ commit trên nhánh `main` của repository GitHub: `https://github.com/luuviet2810/VT-WEBAPP.git`.  
> Commit mới nhất trên GitHub hiện tại vẫn là `378f117` (commit cũ).  
> **Nếu bấm "Manual Deploy" trên Render ngay lúc này, Render vẫn sẽ kéo mã nguồn cũ chưa sửa và tiếp tục crash với lỗi:**  
> `Error: Missing Supabase env for bot server at dist/supabase.js:5`.
>
> ✅ **KHI NÀO TRỞ THÀNH READY TO DEPLOY?**  
> Sau khi người dùng thực hiện kiểm tra diff và chạy lệnh `git commit` + `git push origin main` (hướng dẫn chi tiết tại **Mục 6**), trạng thái sẽ chuyển thành **100% READY TO DEPLOY**.

---

## 2. PHẦN A – KIỂM TRA GIT VÀ MÃ NGUỒN

### 2.1. Trạng thái Git (`git status`)
- **Nhánh hiện tại:** `main`
- **Remote tracking:** `origin/main` (`https://github.com/luuviet2810/VT-WEBAPP.git`)
- **Commit HEAD hiện tại:** `378f117`
- **Trạng thái working tree:** Có 6 file đã sửa đổi (Changes not staged for commit) và 3 file untracked.

### 2.2. Danh sách file đã sửa liên quan đến sửa lỗi Supabase startup
| File | Loại thay đổi | Tác dụng kỹ thuật |
| :--- | :---: | :--- |
| `gara-bot-server/src/supabase.ts` | **Sửa cốt lõi** | Loại bỏ hoàn toàn `throw new Error('Missing Supabase env...')`. Thêm cờ `isSupabaseConfigured` và Safe Stub Proxy để nếu thiếu biến Supabase, server vẫn khởi động bình thường ở chế độ độc lập Neon. |
| `gara-bot-server/src/api/telegram.routes.ts` | Bảo vệ API | Bọc các truy vấn Supabase (`telegram_users`, `telegram_logs`) bằng điều kiện `if (isSupabaseConfigured)`. Tránh sập route `/notify` và `/status`. |
| `gara-bot-server/src/api/telegram.service.ts` | Bảo vệ Service | Bọc `getLinked()` và `getStatus()` bằng `if (!isSupabaseConfigured) return []`. Thêm cờ `supabaseConnected: isSupabaseConfigured` vào response. |
| `gara-bot-server/src/telegram/link.service.ts` | Bảo vệ Bot Logic | Thêm guard kiểm tra `isSupabaseConfigured` cho các hàm liên kết người dùng Telegram (`findLinkedUser`, `linkTelegramToEmployee`, `markLastSeen`, `getLinkedEmployees`). |
| `gara-bot-server/src/index.ts` | Cấu hình Host | Cập nhật `app.listen(port, '0.0.0.0')` để bảo đảm tương thích với môi trường container/PaaS của Render. |
| `src/services/auth.service.ts` | Đồng bộ Frontend | Chuẩn hóa hàm `getBaseUrl()` loại bỏ dấu gạch chéo cuối (`.replace(/\/$/, '')`), ngăn chặn lỗi double slash khi cấu hình `VITE_API_URL`. |

### 2.3. Các file untracked được tạo phục vụ kiểm thử & triển khai
1. `render.yaml`: File cấu hình Infrastructure as Code cho Render Web Service.
2. `tests/test-render-startup-simulation.mjs`: Kịch bản Node.js mô phỏng 100% điều kiện khởi động của Render (xóa sạch mọi biến Supabase).
3. `PRODUCTION_BACKEND_DEPLOYMENT_REPORT.md`: Báo cáo hướng dẫn chi tiết triển khai Render.

### 2.4. Xác nhận nguyên tắc an toàn
- **Không có bất kỳ thao tác `git commit` hay `git push` tự ý nào được thực hiện bởi trợ lý AI.**
- Mọi thay đổi đều chờ quyết định và phê duyệt của người dùng.

---

## 3. PHẦN B – KIỂM TRA TELEGRAM BOT TRÊN MÔI TRƯỜNG PRODUCTION

### 3.1. Điều kiện khởi động Bot khi `NODE_ENV=production`
Trong `gara-bot-server/src/index.ts`:
```typescript
// Initialize Telegram Bot without interruption
try {
  await setupTelegramBot();
  await startBotPolling();
  console.log('[Telegram Bot] Bot initialized and polling started');
} catch (err: any) {
  console.error('[Telegram Bot] Failed to initialize bot:', err.message);
}
```
- Khối lệnh được bọc trong `try ... catch`. Nếu bot không khởi động được (do token sai hoặc thiếu kết nối), **Express Backend vẫn tiếp tục chạy bình thường**, các API nghiệp vụ và Auth phục vụ Frontend Vercel không bị sập.

### 3.2. Cơ chế Polling hay Webhook?
- Trong `gara-bot-server/src/telegram/bot.ts`, hàm `setupTelegramBot()` chỉ kiểm tra biến `TELEGRAM_WEBHOOK_URL`.
- Hiện tại, backend **chưa có route Express middleware `bot.webhookCallback(...)`** để đón dữ liệu webhook từ Telegram.
- Ngay sau `setupTelegramBot()`, server gọi thẳng `startBotPolling()` (`await bot.launch()`).
- 👉 **Xác nhận:** Bot đang vận hành bằng cơ chế **Long Polling** qua thư viện `telegraf`.

### 3.3. Cảnh báo nguy cơ chạy hai tiến trình Polling (Dual Polling Conflict)
- **Cơ chế của Telegram API:** Một bot token tại một thời điểm chỉ cho phép **duy nhất 1 kết nối `getUpdates`**.
- **Rủi ro:** Nếu bạn đang chạy Backend dưới máy local (`npm run dev` trong `gara-bot-server`) mà Render cũng khởi động tiến trình polling với cùng `TELEGRAM_BOT_TOKEN`, Telegram sẽ trả về lỗi:
  ```text
  409 Conflict: terminated by other getUpdates request; make sure that only one bot instance is running
  ```
  Hậu quả: Hai tiến trình sẽ liên tục ngắt kết nối của nhau và làm rơi tin nhắn từ bot.
- 💡 **Khuyến cáo:** Trước khi kích hoạt Render hoặc kiểm thử Telegram trên Render, **hãy tắt toàn bộ tiến trình Node.js/Bot đang chạy ở máy local**.

### 3.4. Các chức năng Telegram còn phụ thuộc Supabase
- Các bảng Telegram cũ (`telegram_users`, `telegram_logs`) hiện vẫn nằm trên Supabase cũ.
- Khi Supabase bị ngắt kết nối:
  - Lệnh `/start` và nút "Liên kết tài khoản" sẽ thông báo: *"Hệ thống liên kết tài khoản Telegram đang trong quá trình chuyển đổi sang Neon."*
  - Các tin nhắn thông thường (`bot.on('text')`) và thông báo tác vụ cơ bản (`sendTaskNotification`) qua Chat ID trực tiếp vẫn hoạt động bình thường mà không bị crash.

### 3.5. Đánh giá tính khả thi hoạt động 24/7 trên Render
- ⚠️ **Không thể cam kết hoạt động 24/7 nếu dùng gói Render Free Tier:**
  - Gói Free của Render sẽ tự động chuyển sang chế độ ngủ (Spin down / Sleep) sau **15 phút** không có lưu lượng truy cập HTTP.
  - Khi container ngủ, luồng Polling của Telegram Bot sẽ **dừng hoàn toàn**. Tin nhắn của người dùng gửi tới Bot trong lúc này sẽ không nhận được phản hồi ngay lập tức.
  - Bot chỉ thức dậy khi có một request HTTP (ví dụ từ người mở web admin Vercel hoặc cron-job ping). Thời gian wake-up mất từ 30s - 60s (Cold Start).
  - Để Bot hoạt động 24/7 thực sự, cần một dịch vụ ping HTTP định kỳ 10 phút một lần (như UptimeRobot / Cron-job.org trỏ vào endpoint `/health`) hoặc nâng cấp gói Starter ($7/tháng).

---

## 4. PHẦN C – KIỂM TRA VÀ ĐỐI CHIẾU BIẾN MÔI TRƯỜNG (ENVIRONMENT AUDIT)

Bảng đối chiếu toàn bộ các biến `process.env` được sử dụng trong mã nguồn `gara-bot-server`:

| Tên biến môi trường | Phân loại | Cấu hình trên Render | Tác dụng |
| :--- | :---: | :---: | :--- |
| `DATABASE_URL` | **Bắt buộc** | ✅ Đã cấu hình | Chuỗi kết nối Neon PostgreSQL (nhánh Production). |
| `JWT_SECRET` | **Bắt buộc** | ✅ Đã cấu hình | Khóa bí mật ký token HS256 cho Auth API. |
| `FRONTEND_URL` | **Bắt buộc** | ✅ Đã cấu hình (`https://admin-vtauto.vercel.app`) | Cấu hình CORS cho phép Vercel gửi cookie/header. |
| `NODE_ENV` | **Bắt buộc** | ✅ Đã cấu hình (`production`) | Kích hoạt chế độ tối ưu hóa Production của Express. |
| `PORT` | **Bắt buộc** | ✅ Render tự cấp (`10000`) | Cổng lắng nghe HTTP của Web Service. |
| `TELEGRAM_BOT_TOKEN` | Tùy chọn (Bot) | ✅ Đã cấu hình | Khởi tạo Telegram Bot qua Telegraf. |
| `DATABASE_URL_UNPOOLED` | Tùy chọn | ✅ Đã cấu hình | Chuỗi kết nối Neon trực tiếp không qua Pooler. |
| `R2_ACCOUNT_ID` | Tùy chọn (Storage) | *(Khuyến nghị bổ sung nếu upload ảnh)* | ID tài khoản Cloudflare R2. |
| `R2_ACCESS_KEY_ID` | Tùy chọn (Storage) | *(Khuyến nghị bổ sung nếu upload ảnh)* | R2 Access Key ID. |
| `R2_SECRET_ACCESS_KEY` | Tùy chọn (Storage) | *(Khuyến nghị bổ sung nếu upload ảnh)* | R2 Secret Access Key. |
| `SUPABASE_URL` | **ĐÃ LOẠI BỎ** | ❌ Không cấu hình (Chính xác) | Không cần thiết. Server đã có stub an toàn. |
| `SUPABASE_SERVICE_ROLE_KEY` | **ĐÃ LOẠI BỎ** | ❌ Không cấu hình (Chính xác) | Không cần thiết. Server đã có stub an toàn. |

> 🔒 **Ghi chú bảo mật:** Tuyệt đối không in hoặc lưu các giá trị token/secret/password trong log hoặc file tài liệu này.

---

## 5. PHẦN D – KẾT QUẢ BUILD VÀ SIMULATION THỰC TẾ

### 5.1. Build mã nguồn Backend (`gara-bot-server`)
```bash
npm --prefix gara-bot-server run build
```
- **Kết quả:** `tsc -p tsconfig.json` hoàn thành với **Exit code 0**.
- Không có bất kỳ lỗi cú pháp (SyntaxError) hay TypeScript type mismatch nào.
- Thư mục `gara-bot-server/dist` đã được biên dịch hoàn chỉnh.

### 5.2. Build mã nguồn Frontend (`gara-manager`)
```bash
npm run build
```
- **Kết quả:** `tsc -b && vite build` hoàn thành với **Exit code 0** (7.46s).
- Bundle `dist` sẵn sàng phục vụ Production.

### 5.3. Mô phỏng khởi động Production không có Supabase (`tests/test-render-startup-simulation.mjs`)
- **Điều kiện mô phỏng:** Xóa sạch `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Đặt `NODE_ENV=production`, `PORT=3095`.
- **Nhật ký thực thi thực tế:**
  1. `[VT AUTO API Server] listening on http://0.0.0.0:3095`: Khởi động thành công.
  2. `[Database] Neon PostgreSQL connected successfully (1267ms, PostgreSQL 18.7 (84da7d8))`: Kết nối Neon ổn định.
  3. `GET /health` trả về `200 OK`: Uptime hoạt động tốt.
  4. `GET /health/db` trả về `200 OK`: Dịch vụ DB Neon phản hồi chuẩn.
  5. `POST /api/auth/login` phản hồi `401 Unauthorized`: Xử lý thông tin đăng nhập sai một cách an toàn và đúng nghiệp vụ, **không crash**.
  6. **Đánh giá:** `PASSED 100% ZERO CRASHES`.

---

## 6. PHẦN E – HƯỚNG DẪN BƯỚC THỰC HIỆN ĐỂ TRIỂN KHAI RENDER

Vì các thay đổi hiện tại đang ở máy cục bộ và chưa commit lên GitHub, bạn hãy làm theo các bước sau:

### Bước 1: Kiểm tra lại các file đã sửa
Mở terminal tại thư mục gốc dự án và chạy:
```bash
git status
```

### Bước 2: Commit và Push mã nguồn lên GitHub
Chạy các lệnh sau để đưa bản sửa lỗi lên `origin/main`:
```bash
git add gara-bot-server/src/ src/services/auth.service.ts render.yaml
git commit -m "fix(backend): remove supabase startup requirement and add safe stub proxy for render"
git push origin main
```

### Bước 3: Deploy trên Render Dashboard
1. Truy cập vào trang quản trị của Render: [dashboard.render.com](https://dashboard.render.com).
2. Chọn Web Service `gara-bot-server` (hoặc tên dịch vụ bạn đã tạo).
3. Nhấn nút **Manual Deploy** -> Chọn **Deploy latest commit**.
4. Theo dõi **Logs**:
   - Quá trình build sẽ chạy `npm run build` hoặc tương đương.
   - Khi chạy lệnh start, log sẽ xuất hiện:
     ```text
     [VT AUTO API Server] listening on http://0.0.0.0:10000
     [Database] Neon PostgreSQL connected successfully
     ```
   - Không còn xuất hiện `Missing Supabase env for bot server`.

### Bước 4: Kiểm tra kết nối từ Frontend Vercel
1. Sau khi Render deploy xong và cấp URL (ví dụ: `https://gara-bot-server.onrender.com`):
   - Mở trình duyệt kiểm tra: `https://<YOUR-RENDER-URL>/health` (phải trả về `{"ok":true,...}`).
   - Kiểm tra `https://<YOUR-RENDER-URL>/health/db` (phải trả về `{"ok":true,"service":"neon-postgresql"}`).
2. Cập nhật biến môi trường trên Vercel:
   - Vào Vercel Dashboard -> Dự án Frontend -> **Settings** -> **Environment Variables**.
   - Sửa hoặc thêm `VITE_API_URL` = `https://<YOUR-RENDER-URL>` (không có dấu `/` ở cuối).
   - Nhấn **Redeploy** trên Vercel.
3. Truy cập `https://admin-vtauto.vercel.app/login` và thực hiện đăng nhập bằng một trong 7 tài khoản nhân viên.
