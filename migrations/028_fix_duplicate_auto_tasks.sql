-- ============================================================
-- Fix duplicate auto tasks
-- 1. Remove duplicate tasks with same (vehicle_id, rule_id)
-- 2. Add unique index to prevent future duplicates
-- ============================================================

-- Step 1: Identify and clean up duplicate auto tasks.
-- For each (vehicle_id, rule_id) pair, keep the most advanced task:
--   priority: done > doing > todo
--   if same status, keep the one created most recently.
-- Note: tasks table has no updated_at column, so we use created_at.

WITH duplicates AS (
  SELECT
    id,
    vehicle_id,
    rule_id,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY vehicle_id, rule_id
      ORDER BY
        CASE status
          WHEN 'done' THEN 0
          WHEN 'doing' THEN 1
          WHEN 'todo' THEN 2
          ELSE 3
        END,
        created_at DESC
    ) AS rn
  FROM tasks
  WHERE rule_id IS NOT NULL
),
to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM tasks WHERE id IN (SELECT id FROM to_delete);

-- Step 2: Add unique index to prevent future duplicates.
-- Only applies to auto-generated tasks (rule_id IS NOT NULL).
-- Manual tasks (rule_id IS NULL) are not affected.

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_vehicle_rule
  ON tasks (vehicle_id, rule_id)
  WHERE rule_id IS NOT NULL;