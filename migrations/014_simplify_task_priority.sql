-- ============================================================
-- Migration: Convert old task priority values to new 3-level system
--
-- Old            → New
-- critical/urgent → urgent
-- high           → priority
-- medium/low     → normal
-- ============================================================

UPDATE tasks SET priority = 'urgent'   WHERE priority IN ('critical', 'urgent');
UPDATE tasks SET priority = 'priority' WHERE priority = 'high';
UPDATE tasks SET priority = 'normal'   WHERE priority IN ('medium', 'low');
