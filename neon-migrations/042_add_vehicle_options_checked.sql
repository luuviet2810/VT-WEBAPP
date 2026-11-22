-- ============================================================
-- Migration 042: Add options_checked column to vehicles table
-- ============================================================
-- Adds `options_checked` BOOLEAN NOT NULL DEFAULT FALSE to `vehicles`.
-- Tracks whether vehicle options have been confirmed/inspected.
-- Existing vehicles default to FALSE without modifying `options` array.
--
-- This migration is created but NOT executed automatically on Supabase.

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS options_checked BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
