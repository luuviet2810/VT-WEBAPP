# VT AUTO – PRODUCTION GALLERY DUPLICATE INVESTIGATION & RESOLUTION REPORT

**Ngày kiểm tra:** 23/11/2026  
**Môi trường:** Production Neon PostgreSQL + Cloudflare R2 + Express Backend + React Vite Frontend  
**Đối tượng kiểm tra chính:** Xe biển số **0123** (KIA K3)  

---

## PHẦN 1 – KIỂM TRA DỮ LIỆU XE 0123

### 1. Thông tin định danh xe 0123 trên Production Neon
- **Vehicle UUID:** `74cd5ba2-3c93-4148-9748-c3de2a10afa5`
- **Biển số (`plate`):** `0123`
- **Hãng / Dòng xe / Năm:** KIA K3 (2012)
- **Trạng thái:** `available`
- **Thời gian tạo xe:** `2026-11-22T11:28:13.114Z`

### 2 & 3. Toàn bộ danh sách 27 bản ghi trong bảng `vehicle_images` cho xe 0123

Truy vấn trực tiếp cơ sở dữ liệu Neon PostgreSQL và API `GET /api/vehicles/:id/images`:
Tổng số bản ghi ghi nhận: **27 bản ghi**.

| STT | UUID (`id`) | Phân loại | Tên file / Path R2 | Thumbnail col | Category | Sort | Dung lượng | Created At |
|:---:|:---|:---:|:---|:---|:---:|:---:|:---:|:---|
| 1 | `9116840b-df0e-4080-bf4e-70ac31426596` | **Thumbnail** | `..._thumb_619515296_18545743096060.jpg` | `null` | website | 0 | 19.8 KB | 2026-11-22 15:03:01 |
| 2 | `5747319c-4864-412b-b1ae-c8761c9977c7` | **Ảnh gốc** | `..._619515296_18545743096060074_43.jpg` | *Trỏ về path STT 1* | website | 0 | 163.0 KB | 2026-11-22 15:03:01 |
| 3 | `eed97051-1910-4925-aabf-7724ce897e7f` | **Thumbnail** | `..._thumb_682430695_13757339879316.jpg` | `null` | website | 2 | 32.5 KB | 2026-11-22 15:03:02 |
| 4 | `b2a5d018-3886-4d76-b8e2-ca9873e36ae1` | **Ảnh gốc** | `..._682430695_1375733987931685_516.jpg` | *Trỏ về path STT 3* | website | 2 | 463.6 KB | 2026-11-22 15:03:03 |
| 5 | `2ecde099-f236-4ff4-a6cd-890d71ee584d` | **Ảnh gốc** | `..._682430695_1375733987931685_516.png` | `null` | website | 3 | 5.48 MB | 2026-11-22 15:03:04 |
| 6 | `0c76f2f6-74cd-445d-bb96-17e71bfbccce` | **Thumbnail** | `..._thumb_14004320260514_107586282.jpg` | `null` | website | 4 | 28.5 KB | 2026-11-22 15:03:05 |
| 7 | `92f8489e-2de7-4a85-9dab-9d102e508ca1` | **Ảnh gốc** | `..._14004320260514_107586282_76725.jpg` | *Trỏ về path STT 6* | website | 4 | 697.2 KB | 2026-11-22 15:03:06 |
| 8 | `97782a3b-25e1-4a6e-880a-9e91a4ddbae8` | **Thumbnail** | `..._thumb_14004320260514_135807582.jpg` | `null` | website | 5 | 20.3 KB | 2026-11-22 15:03:05 |
| 9 | `b1cbf992-f183-4b6a-ba6a-b8a6effd8029` | **Ảnh gốc** | `..._14004320260514_135807582_53881.jpg` | *Trỏ về path STT 8* | website | 5 | 617.6 KB | 2026-11-22 15:03:05 |
| 10 | `e16196bb-ba47-4519-9b9c-4113ac4bf536` | **Thumbnail** | `..._thumb_14004320260514_146524088.jpg` | `null` | website | 6 | 20.3 KB | 2026-11-22 15:03:07 |
| 11 | `8e3caa8b-a403-481b-9e6d-09515329629c` | **Ảnh gốc** | `..._14004320260514_146524088_70412.jpg` | *Trỏ về path STT 10* | website | 6 | 422.6 KB | 2026-11-22 15:03:07 |
| 12 | `b9fa5654-c6d7-460b-97c8-20207de93769` | **Thumbnail** | `..._thumb_14004320260514_209009091.jpg` | `null` | website | 7 | 20.3 KB | 2026-11-22 15:03:08 |
| 13 | `a1415b0a-ddbc-4c77-8f52-bde1d71028a5` | **Ảnh gốc** | `..._14004320260514_209009091_45988.jpg` | *Trỏ về path STT 12* | website | 7 | 625.3 KB | 2026-11-22 15:03:08 |
| 14 | `53b1b23e-5dae-4b21-be72-b4af77d45e61` | **Thumbnail** | `..._thumb_14004320260514_292212337.jpg` | `null` | website | 8 | 19.4 KB | 2026-11-22 15:03:08 |
| 15 | `9e7ea04b-ce8a-47e9-89bf-e404cae9eef3` | **Ảnh gốc** | `..._14004320260514_292212337_39930.jpg` | *Trỏ về path STT 14* | website | 8 | 528.0 KB | 2026-11-22 15:03:09 |
| 16 | `f9bd2e06-e818-40e7-9223-818a45f3a393` | **Thumbnail** | `..._thumb_14004320260514_311617097.jpg` | `null` | website | 9 | 27.2 KB | 2026-11-22 15:03:09 |
| 17 | `11cf2f85-76b3-4c4e-b23a-f0cb62db1f73` | **Ảnh gốc** | `..._14004320260514_311617097_96678.jpg` | *Trỏ về path STT 16* | website | 9 | 691.5 KB | 2026-11-22 15:03:09 |
| 18 | `f6447ece-3a5b-4fc3-b18b-122eb6f15996` | **Thumbnail** | `..._thumb_14004320260514_389262647.jpg` | `null` | website | 10 | 24.8 KB | 2026-11-22 15:03:10 |
| 19 | `ca8daad1-fa53-40bd-82e3-569d9637ba82` | **Ảnh gốc** | `..._14004320260514_389262647_99719.jpg` | *Trỏ về path STT 18* | website | 10 | 627.3 KB | 2026-11-22 15:03:11 |
| 20 | `4a72ffb8-b7c2-4c7d-bcb8-365eaefba1de` | **Thumbnail** | `..._thumb_14004320260514_430974749.jpg` | `null` | website | 11 | 18.9 KB | 2026-11-22 15:03:10 |
| 21 | `bc7c2385-c8cf-49f2-ad76-b514b6310508` | **Ảnh gốc** | `..._14004320260514_430974749_44390.jpg` | *Trỏ về path STT 20* | website | 11 | 398.0 KB | 2026-11-22 15:03:11 |
| 22 | `4645b5a7-0ba1-4c9f-a6ef-3e54a76f8f72` | **Thumbnail** | `..._thumb_14004320260514_441537559.jpg` | `null` | website | 12 | 27.7 KB | 2026-11-22 15:03:12 |
| 23 | `bd6814a2-2fd8-40ee-b052-a443e340b799` | **Ảnh gốc** | `..._14004320260514_441537559_81620.jpg` | *Trỏ về path STT 22* | website | 12 | 692.9 KB | 2026-11-22 15:03:12 |
| 24 | `bf90028c-a7fa-44ba-82ba-7fc506267b9b` | **Thumbnail** | `..._thumb_14004320260514_511178724.jpg` | `null` | website | 13 | 25.4 KB | 2026-11-22 15:03:12 |
| 25 | `80cb9157-239a-4f99-b76f-cd53bdbf919b` | **Ảnh gốc** | `..._14004320260514_511178724_43763.jpg` | *Trỏ về path STT 24* | website | 13 | 681.5 KB | 2026-11-22 15:03:12 |
| 26 | `d80acdca-9770-4f39-a18e-222c149730aa` | **Thumbnail** | `..._thumb_14004320260514_718471346.jpg` | `null` | website | 14 | 33.7 KB | 2026-11-22 15:03:13 |
| 27 | `64463563-1229-4d64-b43c-0c0d1c1954a3` | **Ảnh gốc** | `..._14004320260514_718471346_17829.jpg` | *Trỏ về path STT 26* | website | 14 | 806.4 KB | 2026-11-22 15:03:14 |

### 4 & 5. Phân tích nội dung và mối quan hệ giữa các ảnh
- **Số ảnh vật lý thực tế:** 14 ảnh (13 ảnh JPG chụp xe + 1 ảnh PNG dung lượng 5.48MB).
- **Hiện tượng:** 13 ảnh JPG đều có **đúng 2 bản ghi riêng biệt** trong database:
  1. Một bản ghi thumbnail (`path` chứa `_thumb_`, dung lượng 18KB - 33KB).
  2. Một bản ghi ảnh gốc (`path` gốc, dung lượng 163KB - 806KB).
  Cả 2 bản ghi này có cùng giá trị `sort_order` và cùng danh mục `category = 'website'`. Cột `thumbnail` của bản ghi ảnh gốc trỏ thẳng tới chính file thumbnail ở bản ghi thumbnail.
- **Thumbnail có bị coi là một ảnh riêng không:** **CÓ**. Do bug của luồng upload cũ lúc 15:03:01 UTC ngày 22/11/2026 (trước khi triển khai tách hàm `uploadThumbnailToR2`), mỗi ảnh đã bị gọi `confirmUpload` 2 lần liên tiếp, ghi vào cơ sở dữ liệu 2 hàng riêng biệt với 2 UUID khác nhau.

### 6. So sánh số lượng bản ghi DB và số card trên giao diện trước khi sửa
- **Số bản ghi DB:** 27 bản ghi.
- **Số card thực tế trên giao diện cũ:** 27 cards (13 cặp giống hệt nhau xếp liền kề + 1 card ảnh PNG).

---

## PHẦN 2 – KIỂM TRA FRONTEND

1. **Nguồn dữ liệu vào Gallery:**
   Component [VehicleDetailTabs.tsx](file:///d:/Download%20D/gara-manager/src/components/VehicleDetailTabs.tsx) (`CategorizedPhotoViewer`) lấy dữ liệu từ một nguồn duy nhất: `vehicleMediaService.getVehicleImages(vehicle.id)`. Không có nguồn thứ hai.
2. **Merge dữ liệu:**
   Không có hiện tượng gọi `getWebsiteImages` để merge trùng lặp với `getVehicleImages`.
3. **`useEffect` và `loadImages`:**
   `loadImages` thực hiện thay thế hoàn toàn (`setImageRows(uniqueRows)`), không thực hiện append (`[...prev, ...uniqueRows]`). Việc F5 hoặc render lại không tự nhân bản dữ liệu nếu dữ liệu đầu vào không bị trùng.
4. **React key:**
   Key sử dụng `row.clientKey ?? row.id`. Do mỗi bản ghi có một UUID riêng nên React gán 2 key độc lập cho 2 card.
5. **Tại sao deduplication theo `id` / `path` trước đó bị vô hiệu hóa?**
   - Bản ghi thumbnail có `id = 9116840b...` và `path = ..._thumb_619515296...`
   - Bản ghi ảnh gốc có `id = 5747319c...` và `path = ...6195152960074_43.jpg`
   - Vì 2 bản ghi này có **ID khác nhau** và **Path khác nhau**, bộ lọc `seenIds.has(r.id)` và `seenPaths.has(r.path)` không thể phát hiện chúng là cùng một bức ảnh!
   - Thêm vào đó, điều kiện lọc thumbnail cũ trong `byCategory`:
     ```typescript
     if (rowPath && (rowPath.includes('/thumb_') || rowPath.startsWith('thumb_'))) continue
     ```
     Định dạng file thực tế trên R2 là `vehicles/<uuid>/<timestamp>_<hash>_thumb_<filename>.jpg`. Chuỗi này chứa `_thumb_`, **không chứa `/thumb_`** và **không bắt đầu bằng `thumb_`**. Do đó điều kiện `if` trên trả về `false`, cho phép toàn bộ 13 bản ghi thumbnail vượt qua và hiển thị lên UI.

---

## PHẦN 3 – KẾT LUẬN NGUYÊN NHÂN

Phân loại chính xác:
- **Nguyên nhân gốc (A & D):**
  - **A (Duplicate records trong Neon):** Cơ sở dữ liệu Neon chứa 27 dòng cho xe 0123 (13 bản ghi thumbnail thừa được tạo ra từ bug upload cũ lúc 15:03:01 ngày 22/11).
  - **D (Ảnh gốc và thumbnail bị hiển thị thành hai card):** Bản ghi thumbnail và bản ghi gốc cùng mang `category = 'website'` và cùng `sort_order`, nằm thành từng cặp trong bảng `vehicle_images`.
- **Nguyên nhân kích hoạt trên giao diện:**
  - Backend `getVehicleImages` trước đây chưa lọc bản ghi thumbnail.
  - Frontend deduplication dùng sai pattern (`/thumb_` thay vì `_thumb_`).

---

## PHẦN 4 – CÁC BƯỚC KHẮC PHỤC TRIỂN KHAI

### 1. Backend [vehicleMedia.controller.ts](file:///d:/Download%20D/gara-manager/gara-bot-server/src/controllers/vehicleMedia.controller.ts)
- Bổ sung hàm kiểm tra bản ghi thumbnail:
  ```typescript
  export function isThumbnailRow(r: any): boolean {
    const p = String(r.path || r.url || '');
    return p.includes('_thumb_') || p.includes('/thumb_') || p.startsWith('thumb_');
  }
  ```
- Trong `getVehicleImages` và `getWebsiteImages`:
  - Phân tách `physicalRows` (ảnh gốc thực tế) và `thumbRows` (bản ghi thumbnail thừa do bug cũ).
  - Tự động liên kết thumbnail cho ảnh gốc nếu trường thumbnail chưa có.
  - **Chỉ trả về danh sách ảnh gốc thực tế (`physicalRows`)** cho Frontend. Đối với xe 0123, API chỉ trả về đúng **14 ảnh duy nhất**.
- Trong `deleteVehicleImage`:
  - Khi xóa ảnh gốc, tự động xóa thumbnail trên R2 và xóa luôn bản ghi thumbnail thừa tương ứng trong Neon DB (nếu có).

### 2. Frontend [VehicleDetailTabs.tsx](file:///d:/Download%20D/gara-manager/src/components/VehicleDetailTabs.tsx) & [VehicleGallery.tsx](file:///d:/Download%20D/gara-manager/src/components/VehicleGallery.tsx)
- Cập nhật hàm `loadImages` và `byCategory`:
  - Lọc bỏ triệt để các bản ghi thumbnail với pattern chuẩn: `_thumb_`, `/thumb_`, `startsWith('thumb_')`.
  - Đảm bảo mỗi ảnh vật lý chỉ xuất hiện trên đúng 1 card duy nhất.
  - Ảnh đại diện website (Cover), phân loại, đổi vị trí kéo thả và xóa ảnh hoạt động bình thường trên 14 ảnh gốc.

---

## PHẦN 5 – BẢNG ĐỀ XUẤT XỬ LÝ DỮ LIỆU TRÙNG LẶP TRONG NEON

> [!IMPORTANT]
> **Tuân thủ chỉ thị:** Chúng tôi **KHÔNG tự ý xóa bất kỳ bản ghi nào trong Neon DB**. Hiện tại hệ thống Backend và Frontend đã tự động lọc và hiển thị chính xác 14 ảnh mà không cần can thiệp DB. Dưới đây là danh sách chi tiết 13 bản ghi thừa để Quý quản trị xem xét:

### Danh sách 13 UUID bản ghi thumbnail thừa đề xuất dọn dẹp (nếu muốn làm sạch DB)

```sql
-- SCRIPT ĐỀ XUẤT DỌN DẸP 13 BẢN GHI THUMBNAIL THỪA CỦA XE 0123 (CHỈ CHẠY KHI ĐƯỢC PHÊ DUYỆT):
DELETE FROM vehicle_images 
WHERE id IN (
  '9116840b-df0e-4080-bf4e-70ac31426596', -- thumb của 5747319c-4864-412b-b1ae-c8761c9977c7 (Sort 0)
  'eed97051-1910-4925-aabf-7724ce897e7f', -- thumb của b2a5d018-3886-4d76-b8e2-ca9873e36ae1 (Sort 2)
  '0c76f2f6-74cd-445d-bb96-17e71bfbccce', -- thumb của 92f8489e-2de7-4a85-9dab-9d102e508ca1 (Sort 4)
  '97782a3b-25e1-4a6e-880a-9e91a4ddbae8', -- thumb của b1cbf992-f183-4b6a-ba6a-b8a6effd8029 (Sort 5)
  'e16196bb-ba47-4519-9b9c-4113ac4bf536', -- thumb của 8e3caa8b-a403-481b-9e6d-09515329629c (Sort 6)
  'b9fa5654-c6d7-460b-97c8-20207de93769', -- thumb của a1415b0a-ddbc-4c77-8f52-bde1d71028a5 (Sort 7)
  '53b1b23e-5dae-4b21-be72-b4af77d45e61', -- thumb của 9e7ea04b-ce8a-47e9-89bf-e404cae9eef3 (Sort 8)
  'f9bd2e06-e818-40e7-9223-818a45f3a393', -- thumb của 11cf2f85-76b3-4c4e-b23a-f0cb62db1f73 (Sort 9)
  'f6447ece-3a5b-4fc3-b18b-122eb6f15996', -- thumb của ca8daad1-fa53-40bd-82e3-569d9637ba82 (Sort 10)
  '4a72ffb8-b7c2-4c7d-bcb8-365eaefba1de', -- thumb của bc7c2385-c8cf-49f2-ad76-b514b6310508 (Sort 11)
  '4645b5a7-0ba1-4c9f-a6ef-3e54a76f8f72', -- thumb của bd6814a2-2fd8-40ee-b052-a443e340b799 (Sort 12)
  'bf90028c-a7fa-44ba-82ba-7fc506267b9b', -- thumb của 80cb9157-239a-4f99-b76f-cd53bdbf919b (Sort 13)
  'd80acdca-9770-4f39-a18e-222c149730aa'  -- thumb của 64463563-1229-4d64-b43c-0c0d1c1954a3 (Sort 14)
);
```

---

## PHẦN 6 – KẾT QUẢ KIỂM THỬ XÁC MINH

### 1. Test Suite `tests/test-production-gallery-fix.mjs` (20/20 PASS)
- **Kiểm tra xe 0123 qua API:** Trả về chính xác **14 ảnh** (thay vì 27). 0 bản ghi thumbnail bị lẫn vào. 14 ID và 14 Path là duy nhất.
- **Tải ảnh:** Cả ảnh gốc và thumbnail qua URL ký đều trả về HTTP 200.
- **Giả lập giao diện Frontend:** Render đúng **14 cards** trong mục "Ảnh trên website". Ảnh đầu tiên (Cover) là ảnh gốc chính xác (`5747319c...`).
- **Kiểm tra F5 liên tục:** Giả lập refresh 5 lần liên tiếp, số lượng card luôn giữ ổn định 14 card, không bị nhấp nháy hay nhân đôi.
- **Kiểm tra chéo xe khác (Xe 8737):** Trả về đầy đủ 24 ảnh legacy, 0 ID trùng lặp, chứng minh giải pháp mang tính hệ thống, không hardcode cho xe 0123.
- **Bảo toàn dữ liệu:**
  - 749 ảnh legacy Supabase: Nguyên vẹn 100% (749/749).
  - 27 bản ghi của xe 0123 trong DB: Giữ nguyên (chưa xóa).
  - Tổng số bản ghi trong `vehicle_images`: 776 bản ghi nguyên vẹn.

### 2. Build Verification
- **Backend build:** `npm --prefix gara-bot-server run build` $\rightarrow$ Exit code 0 (0 lỗi TypeScript).
- **Frontend build:** `npm run build` $\rightarrow$ Exit code 0 (Vite built production bundle thành công trong 6.97s).
- **Trạng thái Git:** Chưa commit, chưa push, chưa deploy.
