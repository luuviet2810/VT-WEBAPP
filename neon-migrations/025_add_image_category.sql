-- ============================================================
-- Migration: Add category/subtype/resolved to vehicle_images
-- ============================================================

ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'vehicle';
ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS subtype TEXT;
ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_vehicle_images_category ON vehicle_images(category);