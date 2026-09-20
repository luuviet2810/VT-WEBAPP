-- ============================================================
-- Migration: Public Web sort order (Phase 2) — FIXED
-- ============================================================
-- Lỗi cũ 42P16: CREATE OR REPLACE VIEW chèn public_sort_order vào
-- GIỮA danh sách cột (trước created_at). PostgreSQL chỉ cho phép
-- OR REPLACE THÊM cột mới ở CUỐI view; chèn giữa = bị hiểu là đổi
-- tên cột cũ → "cannot change name of view column".
--
-- Cách sửa an toàn:
--   * DROP VIEW IF EXISTS + CREATE VIEW trong MỘT transaction
--     (view không chứa dữ liệu nên DROP an toàn; KHÔNG đụng table)
--   * public_sort_order đặt ở CUỐI danh sách cột
--   * Giữ nguyên toàn bộ cột + điều kiện WHERE của migration 032
--   * Tạo lại GRANT SELECT ngay sau CREATE VIEW
--   * public_vehicle_images KHÔNG phụ thuộc view này (nó đọc trực
--     tiếp vehicle_images + vehicles) nên không bị ảnh hưởng
--   * Nếu có object bên ngoài phụ thuộc view, DROP sẽ BÁO LỖI
--     (không dùng CASCADE) → migration dừng an toàn, không phá gì
--
-- Backfill: CHỈ xe is_public = true AND status <> 'sold' AND
-- public_sort_order IS NULL, theo created_at DESC. Không overwrite.

BEGIN;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS public_sort_order INTEGER;

UPDATE vehicles v
SET public_sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
  FROM vehicles
  WHERE is_public = true
    AND status <> 'sold'
    AND public_sort_order IS NULL
) AS sub
WHERE v.id = sub.id;

DROP VIEW IF EXISTS public_vehicles;

CREATE VIEW public_vehicles AS
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
  AND status <> 'sold';

GRANT SELECT ON public_vehicles TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
