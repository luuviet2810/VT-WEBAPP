-- ============================================================
-- Migration: Remove default values from checksheet columns
-- so new sheets start with NULL instead of pre-selected values.
-- Run AFTER migration 013.
-- ============================================================

ALTER TABLE check_sheets
  ALTER COLUMN song_nung_result_status DROP DEFAULT;
