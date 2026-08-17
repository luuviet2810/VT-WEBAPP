-- ============================================================
-- Migration: Add deferred column to tasks table
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deferred BOOLEAN DEFAULT FALSE;