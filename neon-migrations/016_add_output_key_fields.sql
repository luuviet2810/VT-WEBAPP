-- ============================================================
-- Migration: Add output key type and smartkey status columns
-- ============================================================

ALTER TABLE check_sheets
  ADD COLUMN IF NOT EXISTS out_key_type TEXT,
  ADD COLUMN IF NOT EXISTS out_smartkey_status TEXT;
