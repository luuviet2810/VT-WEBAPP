-- Adds missing input fields to check_sheets.
-- The initial schema only included:
--   input_acquy_soh
--   input_acquy_soc
--
-- But the frontend CheckSheetForm now writes:
--   input_dieu_hoa
--   input_suoi_ghe
--   input_tire_state
--   input_notes
--
-- Without these columns, Supabase PostgREST returns 400:
-- Could not find the 'input_dieu_hoa' column of 'check_sheets' in the schema cache

ALTER TABLE check_sheets
  ADD COLUMN IF NOT EXISTS input_dieu_hoa JSONB,
  ADD COLUMN IF NOT EXISTS input_suoi_ghe JSONB,
  ADD COLUMN IF NOT EXISTS input_tire_state JSONB,
  ADD COLUMN IF NOT EXISTS input_notes TEXT;

-- Forces PostgREST to drop its cached schema so the new columns are picked up
-- immediately. Without this, the first request after migration may return 400
-- with code PGRST204 until PostgREST re-reads the schema on its own.
NOTIFY pgrst, 'reload schema';
