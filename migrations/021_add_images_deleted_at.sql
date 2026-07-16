-- ============================================================
-- Migration: Add images_deleted_at column to vehicles table
-- ============================================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS images_deleted_at TIMESTAMPTZ;
