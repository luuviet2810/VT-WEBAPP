-- ============================================================
-- Migration: Sold-vehicle task Kanban support
-- ============================================================
-- Additive task metadata:
--   sold_handled              = user deliberately moved this task out
--                                of the sold-vehicle column.
--   vehicle_model_snapshot    = preserves display if vehicle is deleted.
--   vehicle_plate_snapshot    = preserves display if vehicle is deleted.
--
-- Existing task status/deferred/activities remain unchanged.
-- No task, vehicle, checksheet, image or activity data is deleted.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS sold_handled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vehicle_model_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_plate_snapshot TEXT;

-- Backfill display snapshots for existing linked tasks without changing
-- task status or any operational data.
UPDATE tasks t
SET
  vehicle_model_snapshot = COALESCE(t.vehicle_model_snapshot, v.model),
  vehicle_plate_snapshot = COALESCE(t.vehicle_plate_snapshot, v.plate)
FROM vehicles v
WHERE t.vehicle_id = v.id
  AND (t.vehicle_model_snapshot IS NULL OR t.vehicle_plate_snapshot IS NULL);

NOTIFY pgrst, 'reload schema';
