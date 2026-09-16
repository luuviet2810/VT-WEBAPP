-- ============================================================
-- Migration: Add "Bơm lốp chưa?" (tire inflated) check fields
-- ============================================================
-- Adds two independent TEXT columns to check_sheets:
--   input_tire_inflated  — Đầu vào tab ("Bơm lốp chưa?")
--   output_tire_inflated — Đầu ra tab ("Bơm lốp chưa?")
--
-- Allowed values (frontend TireInflatedStatus):
--   'ok'      = OK / Bình thường
--   'not_yet' = Chưa / Lỗi — classified as 'bad' by statusClassification
--   NULL      = chưa chọn

ALTER TABLE check_sheets
  ADD COLUMN IF NOT EXISTS input_tire_inflated TEXT,
  ADD COLUMN IF NOT EXISTS output_tire_inflated TEXT;

-- Forces PostgREST to drop its cached schema so the new columns are
-- picked up immediately (avoids PGRST204 on the first request).
NOTIFY pgrst, 'reload schema';
