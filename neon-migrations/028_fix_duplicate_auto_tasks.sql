-- Step 2: Add unique index to prevent future duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_vehicle_rule
  ON tasks (vehicle_id, rule_id)
  WHERE rule_id IS NOT NULL;
