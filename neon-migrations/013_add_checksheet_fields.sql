-- ============================================================
-- Migration: Add song_nung_result, key_type, smartkey_status
-- to check_sheets table
-- ============================================================

ALTER TABLE check_sheets
  ADD COLUMN IF NOT EXISTS song_nung_result_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS key_type TEXT,
  ADD COLUMN IF NOT EXISTS smartkey_status TEXT;
