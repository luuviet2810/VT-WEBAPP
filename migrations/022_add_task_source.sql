-- ============================================================
-- Migration: Add source column to tasks table
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE tasks ALTER COLUMN source SET DEFAULT 'manual';

UPDATE tasks SET source = 'rule_engine' WHERE rule_id IS NOT NULL AND source IS NULL;
UPDATE tasks SET source = 'manual' WHERE rule_id IS NULL AND source IS NULL;
