-- ============================================================
-- Migration: Convert urgent → high (reduce to 3-level priority)
-- ============================================================

UPDATE tasks SET priority = 'high' WHERE priority = 'urgent';
