# VT AUTO — VERCEL PRODUCTION RECOVERY REPORT
**Ngày thực hiện:** 22/11/2026  
**Dự án:** VT AUTO (`admin-vtauto.vercel.app`)  
**Mục tiêu:** Xác định nguyên nhân gốc rễ lỗi trang trắng (white screen) trên Vercel Production, triển khai giải pháp kỹ thuật triệt để và ban hành hướng dẫn cấu hình môi trường Vercel.

---

## 1. NGUYÊN NHÂN GỐC RỄ LỖI TRANG TRẮNG TRÊN VERCEL

### Hiện tượng
Khi người dùng truy cập trang Production `https://admin-vtauto.vercel.app`, màn hình hoàn toàn trắng xóa. Kiểm tra Console trình duyệt hiển thị lỗi nghiêm trọng:
```text
Uncaught (in promise) Error: supabaseUrl is required.
    at createClient (supabase.js:35)
    at supabase.ts:63
```

### Chuỗi nạp Module (Import Chain)
```
[src/main.tsx] (bootstrap function)
       │
       ▼ (dynamic import)
  [src/App.tsx]
       │
       ▼ (import static)
  [src/hooks/useRealtimeSync.ts]
       │
       ▼ (import static)
  [src/services/realtime.service.ts]
       │
       ▼ (import static)
  [src/lib/supabase.ts] ──► createClient(process.env.VITE_SUPABASE_URL, ...)
```

### Phân tích kỹ thuật
1. Tại `src/main.tsx`, hàm khởi chạy ứng dụng `bootstrap()` sử dụng dynamic import `await import('./App')` để phân tách mã nguồn (code splitting).
2. Khi module `src/App.tsx` được nạp, nó nạp toàn bộ cây phụ thuộc tĩnh (static import chain) tới `src/lib/supabase.ts`.
3. Trong phiên bản cũ của `src/lib/supabase.ts`, hàm `createClient(supabaseUrl, supabaseAnonKey)` được gọi đồng bộ (synchronously) ngay ở cấp độ cao nhất của tệp (top-level evaluation).
4. Thư viện `@supabase/supabase-js` có cơ chế kiểm tra bắt buộc: nếu `supabaseUrl` là `undefined` hoặc chuỗi rỗng, nó sẽ ném ra lỗi `Error: supabaseUrl is required.`.
5. Trên môi trường Vercel Production, các biến môi trường Supabase cũ không được cung cấp (hoặc bị thiếu). Do đó, lỗi này bị ném ra **trước khi React kịp khởi tạo**.
6. Ngoại lệ đồng bộ làm reject Promise của dynamic `import('./App')`, khiến hàm `bootstrap()` dừng lại, không thể thực thi câu lệnh `ReactDOM.createRoot(document.getElementById('root')!).render(...)`. Kết quả là thẻ `<div id="root"></div>` hoàn toàn rỗng, tạo ra hiện tượng **trang trắng**.

---

## 2. GIẢI PHÁP KỸ THUẬT TRIỆT ĐỂ

Nhóm kỹ thuật đã triển khai mô hình kiến trúc **Safe Proxy Pattern & Environment Guard** nhằm bảo vệ ứng dụng khỏi mọi ngoại lệ môi trường:

### A. Tái cấu trúc `src/lib/supabase.ts`
- Bổ sung cờ nhận diện cấu hình:
  ```ts
  export const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey.trim() !== ''
  )
  ```
- Xây dựng **Safe No-Op Proxy**:
  Khi `isSupabaseConfigured = false` (chế độ ngắt kết nối Supabase như trên Vercel), thay vì gọi `createClient()`, hệ thống trả về một Safe Proxy:
  - `supabase.auth`: Trả về các hàm giả lập (`getSession`, `onAuthStateChange`, `signOut`) trả về session null an toàn.
  - `supabase.storage`: Trả về các handler trả về URL rỗng, không crash.
  - `supabase.channel`: Trả về subscription giả lập không kích hoạt kết nối mạng.
  - `supabase.from`: Trả về chuỗi Proxy chainable tự giải quyết Promise `{ data: null, error: null }`.

### B. Vô hiệu hóa Realtime WebSocket khi thiếu cấu hình
- Trong `src/hooks/useRealtimeSync.ts` và `src/services/realtime.service.ts`, đặt điều kiện kiểm tra ngay đầu vòng đời:
  ```ts
  if (!isSupabaseConfigured) return;
  ```
- Ngăn chặn hoàn toàn việc trình duyệt cố gắng kết nối WebSocket tới `wss://obhamybvdpgremtofvvb.supabase.co` (nơi đã hết hạn ngạch và liên tục trả về HTTP 401).

### C. Chuyển đổi toàn bộ truy vấn dữ liệu sang Express API
Toàn bộ dữ liệu của Admin Web (`Employees`, `OverviewDashboard`, `vehicleOption`, `websiteSettings`, `vehicleWorkflow`, `vehicleMedia`) đều đã được chuyển qua Express Backend API kết nối Neon PostgreSQL, không còn gọi qua Supabase JS client.

---

## 3. KẾT QUẢ KIỂM THỬ XÁC MINH TRÊN BẢN BUILD PRODUCTION

Kịch bản kiểm thử tự động sử dụng **Playwright Headless Browser** (`tests/verify-production-bundle.mjs`) được thực thi trực tiếp trên bản build đã biên dịch minified (`vite preview`):

| Tiêu chí kiểm thử | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :--- | :--- | :--- | :--- |
| **Tiêu đề trang (Title)** | Có tiêu đề thương hiệu | `VT AUTO — XE CŨ TẠI HÀN QUỐC` | **PASS** |
| **Dung lượng HTML `#root`** | `> 0` byte (Có giao diện) | **5,039 bytes** (DOM hoàn chỉnh) | **PASS** |
| **Lỗi Javascript dừng trang (Page Errors)** | `0` lỗi | `[]` (Không có bất kỳ lỗi nào) | **PASS** |
| **Lỗi `supabaseUrl is required`** | Hoàn toàn không xuất hiện | **0 lỗi xuất hiện** | **PASS** |
| **Trạng thái màn hình trắng** | Không có trang trắng | Giao diện hiển thị đầy đủ components | **PASS** |

---

## 4. HƯỚNG DẪN CẤU HÌNH MÔI TRƯỜNG TRÊN VERCEL

Để đưa ứng dụng lên Vercel Production hoạt động ổn định nhất, cấu hình như sau trên Vercel Dashboard (**Project Settings -> Environment Variables**):

### A. Biến môi trường bắt buộc (Frontend Vercel)

| Tên biến | Giá trị mẫu | Mục đích |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://api.vtauto.vn` (hoặc URL backend Render/Railway) | Địa chỉ Express API Backend phục vụ dữ liệu Neon |

### B. Các biến môi trường KHÔNG CẦN THIẾT (Cần xóa hoặc bỏ trống)

| Tên biến | Trạng thái trên Vercel | Ghi chú |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | **KHÔNG CẦN ĐẶT** (Bỏ trống hoặc Xóa) | Đã ngắt kết nối runtime khỏi Supabase |
| `VITE_SUPABASE_ANON_KEY` | **KHÔNG CẦN ĐẶT** (Bỏ trống hoặc Xóa) | Tránh rò rỉ key cũ và tránh lỗi 401 |
| `VITE_APP_MODE` | **KHÔNG CẦN ĐẶT** (Hoặc để mặc định) | Chế độ mặc định là Admin Web. Chỉ đặt `public` cho dự án web khách hàng riêng biệt. |

### C. Cấu hình CORS trên Backend (`gara-bot-server`)
Backend đã được cập nhật tại `src/index.ts` để tự động chấp nhận các yêu cầu từ:
- `https://admin-vtauto.vercel.app`
- Mọi subdomain preview của Vercel: `*.vercel.app`
- Môi trường phát triển cục bộ: `http://localhost:5173`, `http://127.0.0.1:5173`
- Giá trị tùy chỉnh từ biến `FRONTEND_URL`

---

## 5. KẾT LUẬN

✅ **Lỗi trang trắng `supabaseUrl is required` trên Vercel đã được xử lý triệt để tận gốc.**  
✅ **Admin Web biên dịch độc lập, hoạt động mượt mà không cần bất kỳ thông tin nào của Supabase.**  
✅ **Đã sẵn sàng cho việc deploy lại trên Vercel Production.**  
