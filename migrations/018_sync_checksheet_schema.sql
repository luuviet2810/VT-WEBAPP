-- ============================================================
-- Migration: Sync checksheet schema — add all missing columns
-- ============================================================

ALTER TABLE check_sheets
  ADD COLUMN IF NOT EXISTS song_nung_result_status TEXT,
  ADD COLUMN IF NOT EXISTS key_type TEXT,
  ADD COLUMN IF NOT EXISTS smartkey_status TEXT,
  ADD COLUMN IF NOT EXISTS out_key_type TEXT,
  ADD COLUMN IF NOT EXISTS out_smartkey_status TEXT;
