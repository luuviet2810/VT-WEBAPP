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
