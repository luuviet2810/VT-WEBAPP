-- ============================================================
-- Migration: Public Web chỉ hiển thị xe CÒN HÀNG (Phase 2.1)
-- ============================================================
-- Status enum thực tế của project (migration 001):
--   vehicle_status = ('available', 'deposited', 'sold')
--   available = "Chưa bán" (còn hàng)
--   deposited = "Đã cọc"
--   sold      = "Đã bán"
--
-- Public Web trước đây: is_public = true AND status <> 'sold'
-- Nay loại thêm xe ĐÃ CỌC: chỉ xe còn hàng ('available')
-- được xuất hiện. KHÔNG xoá/sửa dữ liệu xe — chỉ đổi điều
-- kiện filter của view.
--
-- Danh sách cột giữ NGUYÊN thứ tự hiện tại của view live
-- (id ... updated_at, public_sort_order) nên CREATE OR REPLACE
-- VIEW hợp lệ, không cần DROP, GRANT được giữ + khẳng định lại.

CREATE OR REPLACE VIEW public_vehicles AS
SELECT
  id,
  model,
  brand,
  year,
  fuel_type,
  mileage,
  color,
  sell_price,
  options,
  created_at,
  updated_at,
  public_sort_order
FROM vehicles
WHERE is_public = true
  AND status <> 'sold'
  AND status <> 'deposited';

GRANT SELECT ON public_vehicles TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
