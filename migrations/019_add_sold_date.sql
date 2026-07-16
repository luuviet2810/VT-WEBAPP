-- ============================================================
-- Migration: Add sold_date column to vehicles table
-- ============================================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sold_date DATE;

UPDATE vehicles SET sold_date = created_at::DATE WHERE status = 'sold' AND sold_date IS NULL;
