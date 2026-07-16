-- ============================================================
-- Migration: Add yard_position column to vehicles table
-- ============================================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS yard_position TEXT;
