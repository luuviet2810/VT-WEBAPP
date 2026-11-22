# VT AUTO — PRODUCTION BACKUP & DISASTER RECOVERY PLAN
**Ngày ban hành:** 22/11/2026  
**Hệ thống:** VT AUTO Garage Management System  
**Phạm vi:** Neon PostgreSQL, Cloudflare R2, Legacy Supabase Backup, Vercel Hosting  

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC VẬN HÀNH

Tài liệu này xác định các quy trình bảo toàn dữ liệu, sao lưu định kỳ và khôi phục hoạt động sau thảm họa (Disaster Recovery & Business Continuity) cho toàn bộ nền tảng VT AUTO.

### Mục tiêu chỉ số dịch vụ (SLA)
- **RPO (Recovery Point Objective):** $\le 5$ phút (mất mát dữ liệu tối đa không quá 5 phút thao tác).
- **RTO (Recovery Time Objective):** $\le 15$ phút (thời gian khôi phục toàn bộ hệ thống trở lại hoạt động bình thường).
- **Tính toàn vẹn dữ liệu (Data Integrity):** Bảo toàn $100\%$ dữ liệu 109 xe, 116 phiếu kiểm tra, 213 nhiệm vụ, tài khoản nhân sự và metadata lưu trữ.

---

## 2. SAO LƯU VÀ KHÔI PHỤC NEON POSTGRESQL

Neon Serverless PostgreSQL sử dụng kiến trúc phân tách Compute và Storage (Page Server & Safekeeper WAL logs), cung cấp khả năng sao lưu liên tục và khôi phục tức thời.

### A. Point-in-time Recovery (PITR) & Branching
Neon tự động lưu trữ WAL log liên tục. Khi phát sinh sự cố (lỗi thao tác người dùng, hỏng logic nghiệp vụ hoặc thảm họa hạ tầng):
1. **Khôi phục tức thời không gián đoạn:**
   Có thể tạo một branch mới từ trạng thái cơ sở dữ liệu tại bất kỳ mốc thời gian cụ thể nào trong quá khứ:
   ```bash
   # Tạo branch phục hồi từ thời điểm trước khi xảy ra sự cố (VD: 2026-11-22T14:00:00Z)
   neon branch create --name recovery-branch --parent production --timestamp 2026-11-22T14:00:00Z
   ```
2. **Chuyển đổi Production:**
   - Cập nhật biến môi trường `DATABASE_URL` trên Backend trỏ sang branch mới.
   - Thời gian hoàn tất: dưới 2 phút, không làm dừng database gốc.

### B. Quy trình xuất Logical Backup định kỳ (`pg_dump`)
Thực hiện sao lưu logical dump hàng tuần hoặc trước mỗi đợt bảo trì lớn:
```bash
# Xuất toàn bộ dữ liệu nghiệp vụ ra tệp nén (loại trừ logs không cần thiết nếu muốn)
pg_dump "$DATABASE_URL" -F c -b -v -f "vtauto_backup_$(date +%Y%m%d_%H%M%S).dump"

# Phục hồi vào một cơ sở dữ liệu mới khi cần
pg_restore -d "$NEW_DATABASE_URL" -v "vtauto_backup_YYYYMMDD_HHMMSS.dump"
```

---

## 3. SAO LƯU VÀ AN TOÀN DỮ LIỆU CLOUDFLARE R2

Toàn bộ hình ảnh xe, tài liệu và ảnh phiếu kiểm tra được lưu trữ trên 3 bucket tiêu chuẩn của Cloudflare R2:
- `vehicle-images`
- `vehicle-documents`
- `checksheet-photos`

### A. Độ bền vững và sẵn sàng hạ tầng
- Cloudflare R2 cung cấp độ bền dữ liệu $99.999999999\%$ (11 số 9) và tự động sao chép đa vùng địa lý (multi-region geographic redundancy).
- Dữ liệu không bị xóa tự động, không tính phí egress khi truyền tải.

### B. Quy trình đồng bộ bản sao lưu ngoại vi (Off-site Cold Backup)
Để đảm bảo an toàn tuyệt đối trước mọi rủi ro tài khoản đám mây, sử dụng công cụ chuẩn S3 (`rclone` hoặc AWS CLI) để sao lưu định kỳ dữ liệu R2 về kho lưu trữ lạnh (Cold Storage):
```bash
# Ví dụ sao lưu toàn bộ bucket vehicle-images về ổ đĩa cục bộ hoặc máy chủ lưu trữ dự phòng
rclone sync r2:vehicle-images /backup/r2/vehicle-images --progress
```

---

## 4. BẢO TỒN VÀ KHAI THÁC SUPABASE CŨ (LEGACY BACKUP)

Dự án Supabase `obhamybvdpgremtofvvb` được duy trì như một **Kho lưu trữ lịch sử bất biến (Immutable Cold Archive)**:

### A. Quy định quản lý Supabase cũ
1. **Tuyệt đối không can thiệp:** Không xóa project, không xóa database schema, không xóa API keys và không xóa 3 bucket lưu trữ trên Supabase.
2. **Không kết nối runtime:** Admin Web trên Vercel không gửi bất kỳ yêu cầu đọc/ghi nào tới Supabase trong quá trình vận hành thông thường.
3. **Mục đích:** Là bằng chứng đối soát lịch sử (audit trail) và là kho dự phòng dữ liệu gốc tại thời điểm di chuyển (22/11/2026).

### B. Kế hoạch trích xuất khẩn cấp từ Supabase cũ
Nếu trong tình huống bất khả kháng cực đoan cần tham chiếu lại dữ liệu gốc từ Supabase:
- Kết nối trực tiếp qua Supabase SQL Editor hoặc `psql` với connection string cũ.
- Dữ liệu bảng `auth.users` và các bảng `vehicles`, `check_sheets`, `tasks` tại commit di chuyển vẫn còn nguyên vẹn.

---

## 5. KẾ HOẠCH PHẢN ỨNG SỰ CỐ (INCIDENT RESPONSE PLAYBOOK)

| Kịch bản sự cố | Mức độ | Quy trình xử lý | Thời gian khắc phục (RTO) |
| :--- | :---: | :--- | :---: |
| **Trang Vercel sập hoặc lỗi deploy** | **P2** | 1. Rollback về deployment ổn định trước đó trên giao diện Vercel Dashboard.<br>2. Kiểm tra `VITE_API_URL` và logs deploy. | $\le 5$ phút |
| **Backend Express API gián đoạn** | **P1** | 1. Kiểm tra health check tại `/health`.<br>2. Kiểm tra restart process qua PM2 hoặc restart container trên máy chủ hosting backend. | $\le 5$ phút |
| **Dữ liệu Neon bị ghi sai hoặc xóa nhầm** | **P1** | 1. Xác định thời điểm xảy ra lỗi.<br>2. Dùng Neon PITR tạo branch mới tại `t - 1 phút`.<br>3. Cập nhật `DATABASE_URL` và khởi động lại Backend. | $\le 10$ phút |
| **Lỗi quyền truy cập R2 Presigned URL** | **P2** | 1. Kiểm tra Cloudflare Dashboard -> R2 API Tokens.<br>2. Đảm bảo token có quyền `Object Read & Write`.<br>3. Cập nhật `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` trên backend. | $\le 10$ phút |

---

## 6. DANH MỤC KIỂM TRA ĐỊNH KỲ (MAINTENANCE CHECKLIST)

- [ ] **Hàng tuần:** Kiểm tra dung lượng lưu trữ Neon qua lệnh `SELECT pg_size_pretty(pg_database_size(current_database()));` (đảm bảo nằm trong ngưỡng dung lượng an toàn).
- [ ] **Hàng tháng:** Xuất 1 bản `pg_dump` lưu trữ offline có mật khẩu mã hóa.
- [ ] **Hàng quý:** Thử nghiệm tạo branch phục hồi trên Neon và xác nhận dữ liệu toàn vẹn.
- [ ] **Bất biến:** Giữ nguyên trạng thái tài khoản Supabase cũ ở chế độ lưu trữ an toàn.
