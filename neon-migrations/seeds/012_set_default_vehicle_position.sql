-- ============================================================
-- Migration: Set default position for new vehicles
--
-- Song nưng Bãi lớn (fixed UUID: 00000000-0000-0000-0000-000000000001)
-- is the default starting position for all new vehicles.
-- ============================================================

UPDATE vehicles
SET position_id = '00000000-0000-0000-0000-000000000001'
WHERE position_id IS NULL;
