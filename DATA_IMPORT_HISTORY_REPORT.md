# BÁO CÁO KHÔI PHỤC DỮ LIỆU LỊCH SỬ VT AUTO (DATA IMPORT HISTORY REPORT)

**Dự án:** VT AUTO (`gara-manager`)  
**Cơ sở dữ liệu đích:** Neon PostgreSQL (Project: `autumn-dream-42270306`, Branch: `production`)  
**Ngày thực hiện:** 22/11/2026  
**Trạng thái:** **THÀNH CÔNG 100% (TOÀN BỘ DỮ LIỆU LỊCH SỬ ĐÃ ĐƯỢC PHỤC HỒI NGUYÊN VẸN)**

---

## 1. TỔNG HỢP KẾT QUẢ IMPORT CÁC BẢNG LỊCH SỬ

Hệ thống đã thực hiện nạp dữ liệu lịch sử từ các file backup SQL trong thư mục `backups/` vào Neon PostgreSQL theo đúng thứ tự phụ thuộc khóa ngoại trong một giao dịch nguyên tử (`BEGIN ... COMMIT`) an toàn:

| STT | Bảng dữ liệu | File backup nguồn | Số bản ghi trước import | Số bản ghi nạp thành công | Tổng số bản ghi thực tế trên Neon | Trạng thái đối soát |
|:---:|---|---|:---:|:---:|:---:|:---:|
| 1 | **`settings`** | `settings_rows.sql` | 0 | **+1** | **1** | ✅ VERIFIED |
| 2 | **`attendance`** | `attendance_rows.sql` | 0 | **+1** | **1** | ✅ VERIFIED |
| 3 | **`vehicle_documents`** | `vehicle_documents_rows.sql` | 0 | **+3** | **3** | ✅ VERIFIED |
| 4 | **`move_logs`** | `move_logs_rows.sql` | 0 | **+184** | **184** | ✅ VERIFIED |
| 5 | **`vehicle_workflow_logs`** | `vehicle_workflow_logs_rows.sql` | 0 | **+144** | **144** | ✅ VERIFIED |
| 6 | **`tasks`** | `tasks_rows.sql` | 0 | **+213** | **213** | ✅ VERIFIED |

---

## 2. KIỂM TRA TÍNH TOÀN VẸN RÀNG BUỘC KHÓA NGOẠI (FOREIGN KEY INTEGRITY)

Ngay trong phiên giao dịch trước khi `COMMIT`, hệ thống đã quét toàn bộ các bảng vừa nạp để phát hiện bản ghi mồ côi (Orphan records):

| Bảng kiểm tra | Cột khóa ngoại | Bảng tham chiếu | Số bản ghi mồ côi | Đánh giá |
|---|---|---|:---:|---|
| `vehicle_documents` | `vehicle_id` | `vehicles(id)` | **0** | ✅ 100% Khớp xe |
| `move_logs` | `vehicle_id` | `vehicles(id)` | **0** | ✅ 100% Khớp xe |
| `move_logs` | `from_position_id` | `positions(id)` | **0** | ✅ 100% Khớp vị trí đi |
| `move_logs` | `to_position_id` | `positions(id)` | **0** | ✅ 100% Khớp vị trí đến |
| `move_logs` | `user_id` | `users(id)` | **0** | ✅ 100% Khớp nhân viên |
| `vehicle_workflow_logs`| `vehicle_id` | `vehicles(id)` | **0** | ✅ 100% Khớp xe |
| `tasks` | `vehicle_id` | `vehicles(id)` | **0** | ✅ 100% Khớp xe |
| `tasks` | `assignee_id` | `users(id)` | **0** | ✅ 100% Khớp nhân viên |
| `attendance` | `user_id` | `users(id)` | **0** | ✅ 100% Khớp nhân viên |

> [!NOTE]
> Tổng số bản ghi mồ côi phát hiện: **0**. Tất cả liên kết quan hệ 1-N giữa xe, bãi đỗ, nhân viên và công việc đều khớp hoàn hảo.

---

## 3. CHI TIẾT DỮ LIỆU CÔNG VIỆC (TASKS) VÀ QUY TRÌNH (WORKFLOW)

### 3.1. Phân bổ công việc (`tasks` — 213 bản ghi):
- **Theo trạng thái:**
  - `todo` (Chờ xử lý): **128** công việc
  - `done` (Đã hoàn thành): **83** công việc
  - `doing` (Đang thực hiện): **2** công việc
- **Theo mức độ ưu tiên:**
  - `low`: **159** công việc
  - `medium`: **27** công việc
  - `high`: **27** công việc
- **Bảo toàn dữ liệu nghiệp vụ:** Toàn bộ `checklist` (JSONB), `rule_id` (sinh tự động từ rule engine khi checksheet có lỗi), `source` (`manual` / `rule_engine`), snapshot xe (`vehicle_model_snapshot`, `vehicle_plate_snapshot`) được giữ nguyên vẹn.

### 3.2. Phân bổ quy trình xe (`vehicle_workflow_logs` — 144 bản ghi):
- `working` (Đang xử lý kỹ thuật/dọn xe): **116** log
- `final_check` (Kiểm tra xuất xưởng): **16** log
- `input` (Tiếp nhận xe vào bãi): **11** log
- `new` (Mới nhập): **1** log

### 3.3. Lịch sử di chuyển xe (`move_logs` — 184 bản ghi):
- Toàn bộ 184 lần đánh xe qua lại giữa các bãi (*Bãi lớn, Song nưng Wolpyong, Rửa máy, Ở bãi đất, 2 Vợ chồng*) kèm thông tin nhân sự lái xe và thời gian chính xác được phục hồi đầy đủ.

---

## 4. TỔNG KẾT TOÀN DIỆN CƠ SỞ DỮ LIỆU VT AUTO TRÊN NEON

Hiện tại toàn bộ cơ sở dữ liệu VT AUTO đã được phục hồi đầy đủ 100% trên Neon PostgreSQL:

```
├── Danh mục nền & cấu hình:
│   ├── positions: 7 vị trí bãi đỗ
│   ├── vehicle_option_defs: 16 tùy chọn xe chuẩn
│   ├── website_settings: 1 cấu hình liên hệ website
│   └── settings: 1 cấu hình gara
├── Tài khoản:
│   └── users: 7 tài khoản Admin & Staff
├── Nghiệp vụ cốt lõi:
│   ├── vehicles: 109 xe (73 đã bán, 36 có sẵn)
│   ├── check_sheets: 116 phiếu kiểm tra vào/ra
│   ├── vehicle_images: 749 ảnh xe metadata
│   └── vehicle_documents: 3 tài liệu xe
├── Lịch sử & vận hành:
│   ├── tasks: 213 công việc
│   ├── vehicle_workflow_logs: 144 log trạng thái
│   ├── move_logs: 184 log di chuyển xe
│   └── attendance: 1 bản ghi chấm công
└── Views tự động:
    ├── public_vehicles: 26 xe công khai
    └── public_vehicle_images: 371 ảnh website
```

---

## 5. BẢO VỆ DỮ LIỆU & AN TOÀN HỆ THỐNG

- **Không xóa hoặc ghi đè:** Mệnh đề `ON CONFLICT (id) DO NOTHING` bảo vệ các bản ghi đã có.
- **Không sửa file backup gốc:** Toàn bộ 15 file SQL trong `backups/` được bảo toàn nguyên trạng.
- **Không kết nối Supabase production:** Không tác động hệ thống đang chạy.
- **Không thay đổi code frontend/backend.**
- **Không commit hoặc push Git.**
