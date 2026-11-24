# BÁO CÁO KỸ THUẬT: CƠ CHẾ XÓA XE CASCADE TRIỆT ĐỂ & BẢO TOÀN DỮ LIỆU
**Hệ thống VT AUTO (VT-WEBAPP)**  
*Ngày thực hiện: 24/11/2026*

---

## 1. NGUYÊN NHÂN GỐC (ROOT CAUSE ANALYSIS)

Trước khi thực hiện bản vá, khi Quản trị viên (Admin) gửi yêu cầu `DELETE /api/vehicles/:id` từ giao diện hoặc API, máy chủ luôn phản hồi mã lỗi **HTTP 400 Bad Request** với thông báo:
> *"Không thể xóa xe biển số ... vì đang có X phiếu kiểm tra và Y nhiệm vụ liên kết để bảo toàn lịch sử."*

### Phân tích kỹ thuật:
1. **Khối chặn cứng tại Backend Controller (`gara-bot-server/src/controllers/vehicles.controller.ts`)**:
   Trước đây, hàm `deleteVehicle` thực hiện kiểm tra `SELECT count(*) FROM check_sheets` và `SELECT count(*) FROM tasks`. Nếu số lượng lớn hơn 0, hệ thống lập tức từ chối và trả về HTTP 400 `has_dependencies`.
2. **Nguy cơ mồ côi dữ liệu (Data Orphan Risk)** nếu chỉ xóa thô:
   - Bảng `tasks` có khóa ngoại `tasks_vehicle_id_fkey` cấu hình `ON DELETE SET NULL`. Nếu chỉ xóa xe, các nhiệm vụ sẽ trở thành mồ côi (`vehicle_id = null`), làm mất liên kết thực tế.
   - Các bảng phụ thuộc cấp sâu như `task_activity_logs` (liên kết với `tasks`) và `checksheet_logs` (liên kết với `check_sheets`) cần được dọn dẹp theo đúng trật tự topo quan hệ.
   - Dữ liệu media lưu trên Cloudflare R2 (ảnh xe, ảnh thumbnail, tài liệu xe, ảnh trong phiếu kiểm tra) trước đây chưa có cơ chế dọn dẹp đồng bộ khi xe bị xóa.

---

## 2. KIỂM TOÁN QUAN HỆ KHÓA NGOẠI (FOREIGN KEY AUDIT)

Qua kiểm tra toàn diện schema Neon PostgreSQL bằng script `inspect-all-foreign-keys.mjs`, hệ thống đã xác định toàn bộ mạng lưới quan hệ liên quan đến `vehicles.id`:

| Bảng liên quan | Cột liên kết | Khóa ngoại (FK Constraint) | Quy tắc ON DELETE mặc định | Xử lý trong Cascade Transaction |
| :--- | :--- | :--- | :--- | :--- |
| `task_activity_logs` | `task_id` | `task_activity_logs_task_id_fkey` | CASCADE | **Bước 1**: Xóa toàn bộ logs của các tasks thuộc xe |
| `tasks` | `vehicle_id` | `tasks_vehicle_id_fkey` | **SET NULL** | **Bước 2**: Xóa toàn bộ tasks thuộc xe (chặn mồ côi) |
| `checksheet_logs` | `checksheet_id`| `checksheet_logs_checksheet_id_fkey`| CASCADE | **Bước 3**: Xóa logs của các check_sheets thuộc xe |
| `check_sheets` | `vehicle_id` | `check_sheets_vehicle_id_fkey` | CASCADE | **Bước 4**: Xóa toàn bộ check_sheets của xe |
| `vehicle_images` | `vehicle_id` | `vehicle_images_vehicle_id_fkey` | CASCADE | **Bước 5**: Xóa toàn bộ bản ghi ảnh xe |
| `vehicle_documents` | `vehicle_id` | `vehicle_documents_vehicle_id_fkey` | CASCADE | **Bước 6**: Xóa toàn bộ tài liệu xe |
| `move_logs` | `vehicle_id` | `move_logs_vehicle_id_fkey` | CASCADE | **Bước 7**: Xóa lịch sử di chuyển vị trí của xe |
| `vehicle_workflow_logs` | `vehicle_id` | `vehicle_workflow_logs_vehicle_id_fkey` | CASCADE | **Bước 8**: Xóa lịch sử quy trình gara của xe |
| `activity_logs` | `entity_id` / `metadata` | Quan hệ thực thể mềm | Không có | **Bước 9**: Dọn dẹp các log cũ gắn với xe |
| `notifications` | `data->>'vehicle_id'` | Quan hệ mềm qua JSONB | Không có | **Bước 10**: Dọn dẹp thông báo liên quan xe |
| `vehicles` | `id` | Khóa chính | — | **Bước 11**: Xóa bản ghi xe gốc |
| `activity_logs` | `entity_id` | Ghi nhận Audit mới | — | **Bước 12**: Ghi audit log xóa của Admin |

---

## 3. KIẾN TRÚC GIẢI PHÁP & QUY TRÌNH CASCADE CLEANUP

### 3.1. Phân quyền và Bảo mật nghiêm ngặt (RBAC)
- Tuyến đường `DELETE /api/vehicles/:id` áp dụng middleware kép: `authenticateJwt` và `requireAdmin`.
- Bên trong controller `deleteVehicle`, bổ sung lớp kiểm tra độc lập:
  ```typescript
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      ok: false,
      error: 'forbidden',
      message: 'Chỉ Quản trị viên (Admin) mới có quyền xóa vĩnh viễn xe và dữ liệu liên quan.',
    });
  }
  ```
- Nhân viên (`staff`) cố tình gọi endpoint xóa lập tức nhận phản hồi **HTTP 403 Forbidden**.

### 3.2. Thu thập danh sách Cloudflare R2 Keys trước Transaction
Trước khi xóa dữ liệu trong database, hệ thống truy vấn và bóc tách toàn bộ key tệp tin trên Cloudflare R2:
- **Bucket `images`**: Bóc tách `path` và `thumbnail` của xe (hỗ trợ cả đường dẫn tương đối và URL tuyệt đối).
- **Bucket `documents`**: Bóc tách `path` tài liệu đăng kiểm/hồ sơ xe.
- **Bucket `photos`**: Đệ quy phân tích cấu trúc JSONB `exterior_photos` của toàn bộ phiếu kiểm tra để thu thập toàn bộ ảnh chi tiết.

### 3.3. Database Transaction nguyên tử (`BEGIN ... COMMIT / ROLLBACK`)
Toàn bộ 11 bảng được dọn dẹp thông qua một kết nối chuyên dụng duy nhất từ Connection Pool của Neon:
- Nếu bất kỳ câu lệnh SQL nào phát sinh lỗi, `ROLLBACK` lập tức được kích hoạt. Không có tình trạng xóa dở dang, đảm bảo tính toàn vẹn 100%.
- Sau khi xóa thành công, hệ thống ghi một bản ghi kiểm toán duy nhất vào `activity_logs` lưu trữ chi tiết: Admin thực hiện, ID, biển số, model xe, thời gian và số lượng chi tiết từng loại bản ghi con đã xóa.

### 3.4. Dọn dẹp Cloudflare R2 sau Commit
- Sau khi DB Transaction đã commit an toàn, server duyệt danh sách R2 keys đã thu thập (loại bỏ trùng lặp) và gọi `deleteObject(bucketType, key)`.
- Các lỗi đơn lẻ trên R2 (ví dụ tệp di sản cũ không tồn tại) được bắt lại, ghi warning và báo cáo trong payload phản hồi, không làm ảnh hưởng đến tính nhất quán của cơ sở dữ liệu đã commit.

---

## 4. CẢI TIẾN GIAO DIỆN XÁC NHẬN (FRONTEND)

### 4.1. Component mới `DeleteVehicleModal.tsx`
Thay thế hộp thoại xác nhận đơn giản bằng một Modal an toàn tiêu chuẩn quản trị:
- **Cảnh báo trực quan nổi bật**: Icon tam giác cảnh báo màu đỏ, hộp thoại liệt kê rõ ràng 4 nhóm dữ liệu sắp bị xóa vĩnh viễn.
- **Cơ chế khóa bằng mã xác thực**: Bắt buộc Admin phải nhập đúng **4 số cuối của biển số xe** (hoặc toàn bộ biển số) vào ô input thì nút "Xóa vĩnh viễn xe" mới được kích hoạt (hiển thị badge "Khớp" màu xanh).
- **Trạng thái xử lý rõ ràng**: Khi nhấn xóa, nút chuyển sang trạng thái loading với spinner và dòng chữ *"Đang dọn dẹp dữ liệu và file lưu trữ..."*, đồng thời vô hiệu hóa nút Hủy để tránh thao tác xung đột.
- **Xử lý lỗi**: Hiển thị thông báo lỗi chi tiết nếu kết nối hoặc API phản hồi lỗi.

### 4.2. Cập nhật Store Zustand & Cache Cục Bộ Tức Thời
Tại `src/store/useStore.ts`:
- Hàm `deleteVehicle(id)` gọi Backend cascade delete.
- Sau khi API trả về thành công:
  - Lập tức lọc bỏ xe khỏi `s.vehicles`.
  - Lọc bỏ các công việc của xe khỏi `s.tasks`.
  - Lọc bỏ các phiếu kiểm tra của xe khỏi `s.checkSheets`.
  - Lọc bỏ nhật ký di chuyển của xe khỏi `s.moveLogs`.
  - Xóa dòng thời gian của xe trong `s.vehicleTimelines`.
  - Gọi ngay `persistStoreCache(...)` cập nhật khóa cache `vtauto_store_cache_v2` trong LocalStorage. Người dùng reload trang hoặc chuyển tab không bị hiện tượng dữ liệu cũ hiển thị lại.
- Tự động điều hướng về màn hình Danh sách xe (`/xe`) và hiển thị Toast thông báo thành công.

---

## 5. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (TEST VERIFICATION RESULTS)

Hệ thống đã chạy toàn bộ kịch bản kiểm thử độc lập trong `scripts/test-vehicle-cascade-delete.mjs` trên môi trường thực tế kết nối Neon PostgreSQL:

```text
=== VT AUTO CASCADE VEHICLE DELETION TEST SUITE ===

[AUTH] Admin user: luuviet2810@gmail.com (5952c302-6998-4804-8121-80a663c81fb5)
[AUTH] Staff user: nguyendinhtuan160504@gmail.com (9ddfef4e-b76e-44c0-84d4-0c04983a5694)
[BASELINE] Số lượng xe thật trong hệ thống trước khi test: 110 xe

[SETUP] Tạo xe TEST: TEST-CASCADE-8814 (ID: 710c3c3a-c8be-451c-91e5-3ccdfed9b5bf)...
[SETUP] Đã tạo thành công xe TEST và toàn bộ 10 bản ghi liên kết.

--- TEST 1: PHÂN QUYỀN (Staff cố gắng xóa xe) ---
Staff DELETE HTTP Status: 403
Staff DELETE Response: {
  ok: false,
  error: 'forbidden',
  message: 'Tác vụ này chỉ dành riêng cho Quản trị viên (Admin).'
}
✅ TEST 1 PASSED: Staff bị chặn chính xác với HTTP 403.

--- TEST 2: ADMIN CASCADE DELETE ---
Admin DELETE HTTP Status: 200
Admin DELETE Response: {
  "ok": true,
  "message": "Đã xóa vĩnh viễn xe biển số TEST-CASCADE-8814 cùng toàn bộ 1 phiếu kiểm tra, 2 công việc và các file liên quan thành công.",
  "data": {
    "vehicleId": "710c3c3a-c8be-451c-91e5-3ccdfed9b5bf",
    "plate": "TEST-CASCADE-8814",
    "deletedCounts": {
      "taskActivityLogs": 2,
      "tasks": 2,
      "checksheetLogs": 1,
      "checkSheets": 1,
      "vehicleImages": 1,
      "vehicleDocuments": 1,
      "moveLogs": 1,
      "vehicleWorkflowLogs": 1,
      "activityLogs": 1,
      "notifications": 1
    },
    "storageCleanup": {
      "totalKeys": 4,
      "deletedKeys": 4,
      "errors": 0
    }
  }
}
✅ TEST 2 PASSED: Admin xóa xe thành công qua API.

--- TEST 3: KIỂM TRA ZERO ORPHANS TRONG NEON POSTGRESQL ---
- Bảng vehicles                           : 0 bản ghi
- Bảng check_sheets                       : 0 bản ghi
- Bảng checksheet_logs                    : 0 bản ghi
- Bảng tasks                              : 0 bản ghi
- Bảng task_activity_logs                 : 0 bản ghi
- Bảng vehicle_images                     : 0 bản ghi
- Bảng vehicle_documents                  : 0 bản ghi
- Bảng move_logs                          : 0 bản ghi
- Bảng vehicle_workflow_logs              : 0 bản ghi
- Bảng notifications (data->>vehicle_id)  : 0 bản ghi
✅ TEST 3 PASSED: 100% bản ghi phụ thuộc đã được dọn sạch hoàn toàn, không có orphan.

--- TEST 4: KIỂM TRA AUDIT LOG GHI NHẬN HÀNH ĐỘNG XÓA ---
Audit log entry: {
  action: 'delete',
  entity_type: 'vehicle',
  entity_id: '710c3c3a-c8be-451c-91e5-3ccdfed9b5bf',
  description: 'Quản trị viên đã xóa vĩnh viễn xe TEST-CASCADE-8814 (Mazda CX-5 Test Cascade Deletion) cùng toàn bộ dữ liệu lịch sử và media.',
  metadata: {
    model: 'Mazda CX-5 Test Cascade Deletion',
    plate: 'TEST-CASCADE-8814',
    deletedBy: {
      id: '5952c302-6998-4804-8121-80a663c81fb5',
      name: 'LƯU VĂN VIỆT',
      email: 'luuviet2810@gmail.com'
    },
    deletedCounts: {
      tasks: 2,
      moveLogs: 1,
      checkSheets: 1,
      activityLogs: 1,
      notifications: 1,
      vehicleImages: 1,
      checksheetLogs: 1,
      taskActivityLogs: 2,
      vehicleDocuments: 1,
      vehicleWorkflowLogs: 1
    }
  }
}
✅ TEST 4 PASSED: Audit log ghi nhận đầy đủ hành động xóa của Admin.

--- TEST 5: KIỂM TRA TOÀN VẸN CÁC XE THẬT KHÁC ---
Số lượng xe thật trước test: 110 xe
Số lượng xe thật sau test:  110 xe
✅ TEST 5 PASSED: Toàn bộ xe thật của khách hàng còn nguyên vẹn 100%.

--- TEST 6: XÓA XE ĐÃ XÓA (Kỳ vọng 404 Not Found) ---
Second DELETE HTTP Status: 404
✅ TEST 6 PASSED: Trả về HTTP 404 Not Found chính xác.

========================================================
🎉 TẤT CẢ 6/6 BÀI KIỂM THỬ CASCADE DELETE ĐỀU ĐẠT 100%!
========================================================
```

---

## 6. DANH SÁCH CÁC FILE THAY ĐỔI

1. `gara-bot-server/src/controllers/vehicles.controller.ts`:
   - Gỡ bỏ điều kiện chặn cứng HTTP 400.
   - Thêm logic bóc tách R2 key cho ảnh, tài liệu và ảnh checksheet.
   - Triển khai Database Transaction nguyên tử dọn dẹp 11 bảng.
   - Ghi audit log vào `activity_logs`.
   - Dọn dẹp Cloudflare R2 sau khi commit.
2. `src/components/DeleteVehicleModal.tsx`:
   - Tạo mới Modal xác nhận xóa xe an toàn, yêu cầu nhập 4 số cuối biển số xe.
3. `src/pages/VehicleDetail.tsx`:
   - Tích hợp `DeleteVehicleModal`.
   - Tự động điều hướng về `/xe` khi xóa thành công.
4. `src/pages/PriceList.tsx`:
   - Tích hợp `DeleteVehicleModal` để thay thế `confirm()` mặc định của trình duyệt.
5. `src/services/vehicle.service.ts`:
   - Cập nhật hàm `deleteVehicle` trả về kiểu `DeleteVehicleResponse`.
6. `src/store/useStore.ts`:
   - Cập nhật hàm `deleteVehicle`: xóa xe, xóa linked tasks, checksheets, moveLogs.
   - Đồng bộ tức thì LocalStorage cache `vtauto_store_cache_v2`.
7. `src/types.ts`:
   - Bổ sung `'vehicle_deleted'` và `'success'` vào kiểu `NotificationType`.
8. `scripts/test-vehicle-cascade-delete.mjs`:
   - Bộ kiểm thử tự động 6 bước xác minh tính toàn vẹn và phân quyền.

---

## 7. TRẠNG THÁI BUILD VÀ TUÂN THỦ NGUYÊN TẮC

- **Frontend TypeScript (`tsc -b`)**: Đạt (0 lỗi).
- **Frontend Vite Build (`npm run build`)**: Đạt (0 lỗi, tạo bundle `dist/` thành công trong 7.97s).
- **Backend TypeScript (`gara-bot-server build`)**: Đạt (0 lỗi).
- **Máy chủ Backend**: Đang chạy bình thường trên cổng 3001, kết nối Neon PostgreSQL.
- **Cam kết**: Tuyệt đối không commit, không push, không deploy, và không có bất kỳ kết nối nào quay lại Supabase.
