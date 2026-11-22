-- ============================================================
-- Migration: Public Web (Phase 2) — brand column + public views
-- ============================================================
-- 1) vehicles.brand — "Hãng xe" (Hyundai, Kia, ...). Nullable,
--    additive; existing rows are untouched (NULL until Admin fills it).
--
-- 2) public_vehicles / public_vehicle_images — read-only views for the
--    Public Web. They expose ONLY customer-safe columns and only rows
--    that are public AND not sold. Internal data (cost_price, note,
--    position, assignee, plate, tasks, checksheets...) is NOT reachable
--    through these views.
--
--    Base tables keep their current grants/RLS — Admin is unaffected.
--    Views are owned by postgres (runs with BYPASSRLS), so anon can
--    SELECT them without touching base-table permissions.
--
-- Public Web contract: READ-ONLY. No write path exists in its code.

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS brand TEXT;

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
  updated_at
FROM vehicles
WHERE is_public = true
  AND status <> 'sold';

CREATE OR REPLACE VIEW public_vehicle_images AS
SELECT
  i.id,
  i.vehicle_id,
  i.url,
  i.thumbnail,
  i.sort_order
FROM vehicle_images i
JOIN vehicles v ON v.id = i.vehicle_id
WHERE i.category = 'website'
  AND v.is_public = true
  AND v.status <> 'sold';

GRANT SELECT ON public_vehicles, public_vehicle_images TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
