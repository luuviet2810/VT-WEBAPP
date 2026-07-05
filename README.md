# Gara Manager — Quản lý bãi xe

Web app quản lý gara/bãi xe: danh sách xe, bảng giá, nhiệm vụ (kanban), vị trí xe (kéo thả),
thống kê, chấm công, nhân viên, và phiếu kiểm tra xe (đầu vào/đầu ra) chi tiết.

Đây là bản **demo chạy local**: toàn bộ dữ liệu (xe, ảnh, nhiệm vụ...) được lưu trong
**localStorage của trình duyệt**, không có server/database. Phù hợp để xem giao diện,
demo cho khách, hoặc làm nền tảng để bạn nối vào backend thật (Supabase/Firebase...) sau này.

## Công nghệ

- React 18 + TypeScript + Vite
- Tailwind CSS (styling)
- Zustand (state, persist vào localStorage)
- React Router (điều hướng)
- Recharts (biểu đồ ở trang Thống kê)
- lucide-react (icon)

## Cài đặt & chạy thử

Yêu cầu: đã cài [Node.js](https://nodejs.org/) bản 18 trở lên.

```bash
# 1. Cài dependencies
npm install

# 2. Chạy dev server
npm run dev
```

Mở trình duyệt tại địa chỉ hiện ra trong terminal (thường là http://localhost:5173).

Build bản production:

```bash
npm run build
npm run preview
```

## Cấu trúc thư mục

```
src/
  types.ts              # Toàn bộ kiểu dữ liệu (Vehicle, Task, CheckSheet...)
  store/useStore.ts      # State toàn cục (zustand) + dữ liệu mẫu
  utils/format.ts         # Hàm format tiền tệ, ngày tháng, tạo id
  components/
    Sidebar.tsx           # Menu điều hướng
    ui.tsx                 # Modal, Badge, Tabs, CollapsibleCard, SegButton...
    PhotoUploader.tsx       # Upload ảnh (lưu base64 trong localStorage)
    CheckSheetForm.tsx       # Phiếu đầu vào/đầu ra (mobile-first, collapsible)
  pages/
    VehicleList.tsx         # Danh sách xe
    PriceList.tsx            # Bảng giá xe (input chính, đồng bộ toàn hệ thống)
    VehicleFormModal.tsx      # Modal thêm xe (tabs: Thông tin/Ảnh/Đầu vào/Đầu ra/Giấy tờ)
    VehicleDetail.tsx          # Chi tiết 1 xe
    Tasks.tsx                   # Nhiệm vụ (Kanban + danh sách)
    Positions.tsx                # Vị trí xe (kéo thả giữa công đoạn)
    Dashboard.tsx                 # Thống kê
    Attendance.tsx                 # Chấm công
    Employees.tsx                   # Nhân viên
```

## Ghi chú quan trọng

- **Dữ liệu lưu ở đâu?** Trong `localStorage` của trình duyệt (key: `gara-manager-storage`).
  Xoá cache trình duyệt sẽ mất dữ liệu. Mở app trên máy/trình duyệt khác sẽ **không** thấy
  cùng dữ liệu (vì chưa có backend).
- **Ảnh/giấy tờ** được lưu dạng base64 ngay trong localStorage — phù hợp demo, nhưng
  dung lượng lớn (nhiều ảnh) có thể vượt giới hạn ~5-10MB của localStorage. Khi lên
  production thật, nên chuyển sang lưu ảnh ở cloud storage (S3, Supabase Storage...).
- **Bảng giá xe** là nơi nhập liệu chính: xe tạo ở đây sẽ tự xuất hiện ở "Danh sách xe"
  và "Vị trí xe" (đúng như yêu cầu ban đầu).
- Toàn bộ logic nghiệp vụ nằm trong `src/store/useStore.ts` — đây là chỗ bạn sẽ sửa khi
  muốn nối vào API/database thật (thay các action `set(...)` bằng gọi API + cập nhật state).

## Nâng cấp lên backend thật (gợi ý)

Khi bạn sẵn sàng cho nhiều nhân viên dùng chung, đồng bộ nhiều máy:

1. Tạo project Supabase (hoặc Firebase) — có sẵn Auth + Database + Storage.
2. Tạo bảng `vehicles`, `positions`, `tasks`, `employees`, `move_logs`, `check_sheets`,
   `attendance` theo đúng field trong `src/types.ts`.
3. Thay các action trong `useStore.ts` bằng gọi Supabase client (insert/update/delete),
   dùng Supabase Realtime để đồng bộ nhiều máy tự động.
4. Đổi `PhotoUploader.tsx` để upload lên Supabase Storage thay vì base64.

Nếu cần, có thể nhờ mình viết tiếp phần này.
