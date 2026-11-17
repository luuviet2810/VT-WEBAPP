VT AUTO — PATCH: CHO PHÉP TRÙNG BIỂN SỐ

Các file trong gói:
- migrations/039_allow_duplicate_plate.sql
- src/pages/VehicleFormModal.tsx
- src/components/VehicleDetailTabs.tsx
- src/pages/dashboards/dashboard/DashboardViewModel.ts
- src/services/vehicle.service.ts

Cách áp dụng:
1. Sao lưu repository hiện tại.
2. Chép đè 4 file trong src/ và chép migration 039 vào thư mục migrations/.
3. Chạy npm install nếu cần, sau đó npm run build.
4. Chỉ sau khi xác nhận đúng Supabase project và sao lưu DB, mở SQL Editor và chạy migrations/039_allow_duplicate_plate.sql.
5. Refresh ứng dụng và thử tạo hai xe có cùng biển số nhưng dữ liệu xe khác nhau.

Lưu ý:
- Migration chỉ bỏ UNIQUE trên riêng cột vehicles.plate và tạo index thường để tìm kiếm; không xóa/sửa bản ghi xe.
- UPDATE vẫn dùng vehicles.id.
- Không chạy migration trước khi xác nhận project Supabase đang kết nối đúng.
- Gói patch không chứa .env, .git, node_modules hoặc khóa bí mật.
- TypeScript transpile/syntax đã kiểm tra. Chưa xác nhận full build vì dependencies chưa cài được trong môi trường kiểm tra.
