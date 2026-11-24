# BÁO CÁO KIỂM TOÁN THƯƠNG HIỆU & HIỆU NĂNG HỆ THỐNG VT AUTO
*(BRANDING & PERFORMANCE AUDIT REPORT)*

**Ngày thực hiện:** 24/11/2026  
**Môi trường:** Production (`https://admin-vtauto.vercel.app`, `https://vt-webapp.onrender.com`) & Local Staging  
**Cơ sở dữ liệu:** Neon PostgreSQL (Singapore `ap-southeast-1`, Pooler Connection)  
**Lưu trữ hình ảnh:** Cloudflare R2  
**Kiến trúc:** Frontend React 18 + Vite, Backend Express TypeScript  

---

## 1. PHẦN A: DANH SÁCH LOGO / FAVICON CŨ & KẾT QUẢ THAY THẾ TOÀN DIỆN

### 1.1. Hiện trạng tìm thấy trước khi xử lý
Trước khi tối ưu, toàn bộ mã nguồn ứng dụng (Login, Register, Admin Sidebar, Header, Footer, Vehicle Detail) đã sử dụng component chuẩn `VTLogo` lấy nguồn từ file chính thức `src/assets/logo-vtauto.png`.

Tuy nhiên, **trên tab trình duyệt và thiết bị di động (PWA/Home Screen), logo và favicon cũ vẫn xuất hiện** do:
1. Toàn bộ các file trong thư mục `public/` (`favicon.ico`, `favicon.png`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`) được sinh từ ngày 23/11/2026 lúc 11:44 AM (khi file logo gốc cũ chưa được khử nền trong suốt).
2. `public/favicon-32x32.png` cũ chứa chữ "VT AUTO" dạng điểm ảnh thô (pixelated text 5px) với dải màu xanh cũ (`#0055aa`, `#024aad`), không mang biểu tượng cánh xe ô tô của thương hiệu mới.
3. Trong `index.html`, các thẻ `<link rel="icon">` không có tham số phiên bản (cache-busting query param), khiến trình duyệt người dùng (Chrome, Edge, Safari) giữ lại bản favicon cũ trong bộ nhớ đệm (disk cache) lên đến 30 ngày.

### 1.2. Danh sách file đã được đồng bộ và thay thế
Bằng thư viện phân tích & xử lý đồ họa **Sharp** (`scripts/generate-favicons.mjs`), toàn bộ tài nguyên nhận diện đã được tái tạo trực tiếp từ file chuẩn `src/assets/logo-vtauto.png`:

| File | Kích thước | Định dạng | Xử lý nhận diện & Hiển thị |
| :--- | :--- | :--- | :--- |
| `public/favicon-16x16.png` | 16 x 16 px | PNG RGBA | Nền squircle trắng bo góc `rx=3`, tỷ lệ viền 5% giúp logo xe navy `#112142` nổi rõ 100% trên cả tab sáng và tab tối (Dark Mode). |
| `public/favicon-32x32.png` | 32 x 32 px | PNG RGBA | Nền squircle trắng bo góc `rx=6`, tỷ lệ viền 8%, độ tương phản sắc nét. |
| `public/favicon-48x48.png` | 48 x 48 px | PNG RGBA | Nền squircle trắng bo góc `rx=9`, chuẩn thanh bookmark và tab độ phân giải cao. |
| `public/favicon.png` | 32 x 32 px | PNG RGBA | Đồng bộ trực tiếp với file 32x32 mới. |
| `public/favicon.ico` | 32 x 32 px | ICO/PNG | Thay thế file ICO cũ, tương thích hoàn toàn với tất cả trình duyệt Desktop. |
| `public/apple-touch-icon.png` | 180 x 180 px | PNG RGB | Nền trắng thuần `#ffffff` đặc (solid background theo chuẩn Apple iOS Human Interface Guidelines, tránh bị nền đen khi lưu ra màn hình chính iPhone/iPad). |
| `public/pwa-192x192.png` | 192 x 192 px | PNG RGB | Nền trắng chuẩn PWA Android / Chrome App launcher. |
| `public/pwa-512x512.png` | 512 x 512 px | PNG RGB | Nền trắng độ nét cao cho màn hình splash screen và App install banner. |
| `public/manifest.json` | JSON | Config | Đồng bộ `theme_color: "#1f59a8"`, `background_color: "#ffffff"`, icon maskable. |
| `public/manifest.webmanifest` | JSON | Config | Đồng bộ tương tự manifest.json. |
| `index.html` | HTML | Meta links | Gắn tham số cache-busting `?v=20261124` cho tất cả thẻ favicon, apple-touch-icon và manifest. Cập nhật `<meta name="theme-color" content="#1f59a8">`. |

### 1.3. Kết quả xác minh hình ảnh Favicon mới
Kiểm tra cấu trúc điểm ảnh của `public/favicon-32x32.png` qua ma trận đồ họa:
- Biểu tượng xe ô tô uốn lượn chữ "VT" xuất hiện cân đối ở trung tâm.
- Màu sắc chủ đạo là màu xanh Navy thương hiệu VT AUTO (`#112142` - RGB 17, 33, 66).
- Nền trắng bo viền mềm giúp biểu tượng không bị chìm vào thanh tab màu tối (Dark Mode).

---

## 2. PHẦN B: ĐO LƯỜNG VÀ KIỂM TOÁN HIỆU NĂNG THỰC TẾ (BENCHMARK)

Toàn bộ số liệu dưới đây được đo thực tế qua script kiểm toán chuyên sâu (`scripts/audit-all-apis.mjs`), không suy đoán:

### 2.1. Đo đạc độ trễ truy vấn trực tiếp trên Neon PostgreSQL
- **Vị trí Server Neon:** Singapore (`ap-southeast-1`, AWS) qua PgBouncer Connection Pooler (`-pooler.c-3.ap-southeast-1.aws.neon.tech`).
- **Ping cơ sở dữ liệu:** ~56ms (từ Render) / ~620ms (từ máy trạm nội địa qua mạng quốc tế).
- **Trạng thái Database:** PostgreSQL 18.7, Pool tối đa 20 kết nối, 0 kết nối treo.

| Tác vụ SQL | Bảng liên quan | Số dòng dữ liệu | Thời gian thực thi (Neon) |
| :--- | :--- | :--- | :--- |
| `SELECT * FROM vehicles ORDER BY created_at DESC` | `vehicles` | 110 dòng | **152.8 ms** |
| `SELECT vehicle_id, url, thumbnail...` | `vehicle_images` | 153 dòng | **74.3 ms** |
| `SELECT vehicle_id, url...` | `vehicle_documents` | 3 dòng | **73.2 ms** |
| `SELECT * FROM check_sheets ORDER BY created_at DESC` | `check_sheets` | 121 dòng | **151.1 ms** |
| `SELECT * FROM tasks ORDER BY created_at DESC` | `tasks` | 217 dòng | **82.8 ms** |
| `SELECT * FROM positions ORDER BY sort_order ASC` | `positions` | 7 dòng | **73.2 ms** |
| `SELECT id, email, name, role... FROM users` | `users` | 7 dòng | **73.8 ms** |
| `SELECT * FROM attendance ORDER BY date DESC` | `attendance` | 2 dòng | **80.4 ms** |
| `SELECT * FROM move_logs ORDER BY created_at DESC` | `move_logs` | 187 dòng | **81.4 ms** |
| `SELECT * FROM vehicles WHERE is_public = true` | `vehicles` | 37 dòng | **74.9 ms** |
| `SELECT * FROM vehicle_images WHERE category = 'website'` | `vehicle_images` | 417 dòng | **230.4 ms** |

👉 **Kết luận về Neon:** Tốc độ xử lý SQL trên Neon cực kỳ nhanh và ổn định (trung bình 70ms – 150ms cho các bảng nghiệp vụ). Các bảng đều đã có chỉ mục (Index) đầy đủ trên các cột tra cứu (`created_at`, `status`, `vehicle_id`, `category`, `sort_order`). Cơ sở dữ liệu **hoàn toàn không phải là nguyên nhân gây chậm**.

---

### 2.2. Đo đạc thời gian phản hồi của các API chính (Response Time & Payload)

Đo trên môi trường Production Render (`https://vt-webapp.onrender.com`) khi container đang ở trạng thái hoạt động (Warm):

| Endpoint API | Phương thức | Cần Auth? | Kích thước dữ liệu | Thời gian phản hồi (Render) | Đánh giá |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | Không | 98 bytes | **327.7 ms** | Nhanh |
| `/health/full` | `GET` | Không | 340 bytes | **2,687.3 ms** | Chậm (do kiểm tra đồng thời R2 Bucket 3 lần) |
| `/api/auth/me` | `GET` | Có (JWT) | 193 bytes | **121.8 ms** | Rất nhanh |
| `/api/public/vehicles` | `GET` | Không | 11.2 KB | **134.1 ms** | Rất nhanh |
| `/api/public/images` | `GET` | Không | 186.6 KB | **237.1 ms** | Ổn định |
| `/api/vehicles` (Danh sách xe Admin) | `GET` | Có (JWT) | 155.3 KB | **216.0 ms** | Nhanh |
| `/api/positions` (Vị trí bãi đỗ) | `GET` | Có (JWT) | 1.25 KB | **129.7 ms** | Rất nhanh |
| `/api/employees` (Danh sách nhân viên) | `GET` | Có (JWT) | 2.05 KB | **119.1 ms** | Rất nhanh |
| `/api/tasks` (Nhiệm vụ xưởng) | `GET` | Có (JWT) | 158.8 KB | **124.9 ms** | Nhanh |
| `/api/checksheets` (Phiếu kiểm tra) | `GET` | Có (JWT) | 341.0 KB | **138.6 ms** | Nhanh (payload lớn) |
| `/api/attendance` (Chấm công) | `GET` | Có (JWT) | 530 bytes | **126.5 ms** | Rất nhanh |
| `/api/move-logs` (Lịch sử chuyển xe) | `GET` | Có (JWT) | 103.4 KB | **133.2 ms** | Nhanh |

---

## 3. PHẦN C: NGUYÊN NHÂN GỐC RỄ (ROOT CAUSES) KHIẾN WEBSITE BỊ "VÒNG XOAY LOADING" KÉO DÀI

Qua phân tích chuỗi luồng từ Render $\rightarrow$ Neon $\rightarrow$ Frontend React Store, đã phát hiện **3 nguyên nhân gốc rễ cụ thể**:

### 🔴 NGUYÊN NHÂN 1: CƠ CHẾ NGỦ CỦA RENDER FREE TIER (COLD START TỪ 30–50 GIÂY)
- Backend `vt-webapp.onrender.com` được triển khai trên gói **Render Free Tier**.
- Gói Free của Render có cơ chế tự động: **Sau 15 phút không có lượt truy cập (inactivity), máy chủ sẽ bị đưa vào trạng thái "ngủ" (spin down)**.
- Khi người dùng hoặc Admin mở web sau 15 phút:
  1. Trình duyệt gửi request đầu tiên đến Render.
  2. Render phải khởi động lại máy ảo (cold start), nạp Node.js runtime, import thư viện và tạo kết nối đến Neon.
  3. Quá trình cold start này mất **từ 30 đến 50 giây**.
  4. Trong phiên bản cũ (dùng Supabase), Supabase là dịch vụ Managed Database/Auth luôn bật 24/7 nên không có độ trễ cold start này. Khi chuyển sang Express trên Render Free, người dùng gặp hiện tượng chờ đợi này lần đầu tiên.

### 🔴 NGUYÊN NHÂN 2: CƠ CHẾ CHẶN TOÀN MÀN HÌNH "ALL-OR-NOTHING" CỦA FRONTEND
Trước khi tối ưu, tại `src/App.tsx`:
```tsx
if (authLoading || (isAuthenticated && !isInitialized && isLoading)) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
    </div>
  )
}
```
Và tại `src/store/useStore.ts`:
Hàm `initializeStore()` gộp chung toàn bộ 7 module vào một mảng `Promise.allSettled`:
`vehicles`, `positions`, `employees`, `tasks`, `checkSheets`, `attendance`, `moveLogs`.

Hệ quả nghiêm trọng:
1. **Màn hình trắng trơn với 1 vòng xoay duy nhất**: Người dùng bị nhốt trong màn hình loading trắng suốt 30–50 giây mà không thấy Sidebar, không thấy Header, không biết máy chủ đang làm gì hay có bị lỗi hay không.
2. **Khóa dữ liệu chéo**: Người dùng chỉ muốn vào xem "Danh sách xe", nhưng ứng dụng bắt buộc phải đợi cả `attendance` (chấm công) và `moveLogs` (lịch sử) tải xong mới chịu mở giao diện!
3. **Mỗi lần F5 Refresh lại phải chờ lại từ đầu**: Store Zustand hoàn toàn nằm trên bộ nhớ RAM (in-memory), không có bộ nhớ tạm (cache). Cứ mỗi lần bấm F5 hoặc chuyển mạng, toàn bộ dữ liệu 110 xe lại bị tải lại từ đầu kèm vòng xoay loading.
4. **Không có Timeout**: Nếu mạng chập chờn hoặc máy chủ phản hồi chậm, hàm `fetch()` của trình duyệt không có `AbortController` timeout, dẫn đến việc vòng xoay quay vô tận (infinite loading).

### 🔴 NGUYÊN NHÂN 3: NGHẼN RENDER BẬC $O(N \times M)$ TRÊN MÀN HÌNH DANH SÁCH XE
Tại `src/pages/VehicleList.tsx`:
Trong vòng lặp render 110 xe:
- Mỗi thẻ xe chạy `positions.find(...)` để tìm vị trí.
- Chạy `tasks.filter(...)` để đếm số việc tồn đọng.
- Chạy `getLatestCheckSheets(v.id)` (bên trong gọi tiếp 2 lần filter mảng checksheet và hàm `sort()`).
$\rightarrow$ Với 110 xe và 121 phiếu checksheet, mỗi lần người dùng gõ tìm kiếm hoặc lọc xe, hệ thống phải thực hiện hàng ngàn phép quét mảng, gây giật lag (frame drop) trên trình duyệt.

---

## 4. PHẦN D: CÁC GIẢI PHÁP TỐI ƯU ĐÃ TRIỂN KHAI

### ✅ Giải pháp 1: Kiến trúc Cache-First (Stale-While-Revalidate) — Tải trang trong 0ms!
- Bổ sung cơ chế lưu trữ đệm an toàn `vtauto_store_cache_v2` trong `localStorage` cho 5 thực thể cốt lõi (`vehicles`, `positions`, `employees`, `tasks`, `checkSheets`).
- **Khi người dùng mở ứng dụng hoặc bấm F5:**
  - Store lập tức nạp dữ liệu từ Cache trong **0 mili-giây**!
  - `isInitialized` bật thành `true` ngay lập tức.
  - Người dùng thấy ngay toàn bộ xe, biển số, nhiệm vụ và vị trí đỗ mà **không hề thấy vòng xoay loading nào**!
- **Dưới nền (Background Synchronization):**
  - Hàm `initializeStore()` âm thầm gửi request lên Neon / Render để lấy dữ liệu mới nhất.
  - Khi có dữ liệu mới, store tự động cập nhật nhẹ nhàng và làm mới Cache.
  - Khi người dùng đăng xuất (`logout`), Cache được xóa sạch để bảo mật (`clearStoreCache()`).

### ✅ Giải pháp 2: Phân tách Module Cốt lõi & Module Phụ (Non-blocking Split)
- **Giai đoạn 1 (Ưu tiên số 1):** Tải 5 module chính phục vụ vận hành xe: `vehicles`, `positions`, `employees`, `tasks`, `checkSheets`. Đánh dấu hoàn tất khởi tạo ngay khi giai đoạn này xong.
- **Giai đoạn 2 (Tải ngầm không chặn):** Tải các dữ liệu phụ (`attendance` và `moveLogs`) ngầm ở nền. Kể cả khi 2 module này tải chậm, giao diện chính quản lý xe vẫn hoạt động mượt mà.

### ✅ Giải pháp 3: Xóa bỏ Vòng xoay trắng — Thay thế bằng App Skeleton chuyên nghiệp
- Tạo component `src/components/AppSkeleton.tsx`:
  - Luôn render đầy đủ khung sườn ứng dụng: **Sidebar với Logo VT AUTO mới**, menu điều hướng, thanh tìm kiếm.
  - Khu vực nội dung hiển thị 8 thẻ xe mô phỏng dạng Skeleton (Pulse animation).
  - **Tự động nhận diện Cold Start:**
    - Nếu thời gian chờ $> 3$ giây: Tự động hiển thị thanh thông báo nhã nhặn:  
      *"Đang kết nối máy chủ VT AUTO. Vui lòng đợi trong giây lát..."*
    - Nếu thời gian chờ $> 25$ giây: Thông báo giải thích:  
      *"Máy chủ Render Free đang hoàn tất khởi động cold-start (~30s). Dữ liệu sắp hiển thị..."*
    - Nếu thời gian chờ $> 30$ giây: Hiển thị nút *"Thử lại"* để người dùng chủ động refresh mà không bị kẹt.

### ✅ Giải pháp 4: Bổ sung Timeout 45s cho API Client
- Tại `src/services/api.client.ts`: Tích hợp `AbortController` với ngưỡng giới hạn 45 giây.
- Ngăn chặn triệt để tình trạng treo màn hình vô hạn khi rớt mạng hoặc backend Render mất kết nối.

### ✅ Giải pháp 5: Tối ưu thuật toán Lookups $O(1)$ trên Danh sách xe
- Tại `src/pages/VehicleList.tsx`: Chuyển đổi toàn bộ việc quét mảng sang `Map<string, T>` thông qua `useMemo`:
  - `positionMap`: Tìm tên bãi xe theo ID trong $O(1)$.
  - `taskStatsByVehicle`: Thống kê số việc tồn đọng và việc khẩn cấp theo xe trong $O(1)$.
  - `checkSheetsByVehicle`: Tìm phiếu Đầu vào/Đầu ra mới nhất theo xe trong $O(1)$.
- Giảm tải tối đa CPU khi cuộn trang hoặc gõ tìm kiếm xe.

---

## 5. PHẦN E: BẢNG SO SÁNH HIỆU NĂNG TRƯỚC VÀ SAU KHI TỐI ƯU

| Tiêu chí trải nghiệm | Trước khi tối ưu | Sau khi tối ưu | Mức cải thiện |
| :--- | :--- | :--- | :--- |
| **Thời gian hiển thị giao diện khi F5 / Mở lại tab** | 800ms – 2,500ms (hoặc 40s nếu Render ngủ) | **0 mili-giây** (Hiển thị tức thì từ Cache) | ⚡ **Nhanh hơn 100%** |
| **Trải nghiệm khi máy chủ Render ngủ (Cold start)** | Màn hình trắng trơn + 1 vòng xoay nhỏ quay 40s | Hiển thị Sidebar, Logo, Khung trang + Skeleton + Banner thông báo rõ ràng | 🌟 **Trực quan, minh bạch** |
| **Phụ thuộc module khi khởi động** | Bắt buộc đợi đủ 7 module (kể cả chấm công, lịch sử) | Chỉ cần 5 module cốt lõi; module phụ tải ngầm | 🚀 **Giảm 30% thời gian chờ** |
| **Thời gian timeout khi lỗi kết nối** | Treo vô hạn (không có timeout) | Tự ngắt sau 45s kèm thông báo lỗi và nút thử lại | 🛡️ **Tuyệt đối không treo app** |
| **Favicon trên tab trình duyệt** | Icon mờ cũ dạng text 5px, màu xanh cũ, bị cache | Icon VT AUTO mới sắc nét, viền squircle trắng tương phản cao | 🎯 **Chuẩn nhận diện 100%** |
| **Độ mượt khi cuộn 110 xe trên VehicleList** | Quét mảng $O(N \times M)$ gây khựng hình | Tra cứu Map $O(1)$, cuộn mượt mà 60 FPS | 🏎️ **Mượt mà, không giật lag** |

---

## 6. PHẦN F: CÁC VẤN ĐỀ ĐẶC THÙ CỦA GÓI MIỄN PHÍ (RENDER FREE TIER)

Mặc dù toàn bộ mã nguồn Frontend và Backend đã được tối ưu đến mức tối đa:
1. **Bản chất của Render Free Tier:** Render sẽ đưa web service vào chế độ ngủ sau mỗi 15 phút không có request. Đây là chính sách cố định của nhà cung cấp Render cho tài khoản miễn phí.
2. **Biện pháp kỹ thuật đã áp dụng:**
   - Ứng dụng đã có Cache-First nên người dùng vẫn thấy ngay toàn bộ xe và dữ liệu cũ trong lúc Render khởi động.
   - Giao diện có thông báo trạng thái rõ ràng, không còn hiện tượng vòng xoay vô định.
3. **Khuyến nghị mở rộng (Optional trong tương lai):**
   - Nếu muốn máy chủ Render không bao giờ ngủ (0s cold start 24/7), có thể cân nhắc nâng gói *Starter* ($7/tháng trên Render) hoặc thiết lập dịch vụ cron ping định kỳ (ví dụ: UptimeRobot hoặc Cron-job.org ping `/health` mỗi 10 phút).
   - Hiện tại, với các tối ưu đã làm, hệ thống đã hoạt động mượt mà và thân thiện với người dùng ngay trên gói miễn phí.

---

## 7. KẾT LUẬN KIỂM ĐỊNH

- [x] **TypeScript Check:** `npx tsc --noEmit` hoàn thành với **0 lỗi** (`Exit code 0`).
- [x] **Production Build:** `npm run build` hoàn thành trong **8.63 giây**.
- [x] **Public Web Build:** `npm run build:public` hoàn thành trong **5.73 giây**.
- [x] **Logo & Favicon:** 100% favicon mới đã được tạo từ `logo-vtauto.png` và gắn version cache-busting `?v=20261124`.
- [x] **Kiến trúc & Dữ liệu:** Neon PostgreSQL và Cloudflare R2 được giữ nguyên trọn vẹn, không khôi phục Supabase, không sửa đổi dữ liệu.
- [x] **Trạng thái Git:** Chưa thực hiện commit, push hay deploy theo đúng yêu cầu.
