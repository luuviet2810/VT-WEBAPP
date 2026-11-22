-- ============================================================
-- Migration: Add undercarriage_status column to check_sheets
-- ============================================================

ALTER TABLE check_sheets ADD COLUMN IF NOT EXISTS undercarriage_status TEXT;