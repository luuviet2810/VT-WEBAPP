-- ============================================================
-- Migration: Prepare vehicles for Public Web (Phase 1)
-- ============================================================
-- Adds two additive columns to vehicles:
--   is_public — Admin toggle "Hiển thị trên website".
--               DEFAULT FALSE so no vehicle is exposed until explicitly opted in.
--               OFF does NOT delete or alter the vehicle in Admin.
--   options   — JSONB array of vehicle_option_defs.key strings (equipment
--               selected per vehicle in the "Option xe" tab).
--               NULL for all existing vehicles — no fake data is created.
--
-- Public Web (Phase 2) will read: vehicles WHERE is_public AND status <> 'sold'.
-- vehicles_import remains a staging table and is NOT touched.

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS options   JSONB;

-- Index for the future public listing query
CREATE INDEX IF NOT EXISTS idx_vehicles_is_public ON vehicles(is_public);

NOTIFY pgrst, 'reload schema';
