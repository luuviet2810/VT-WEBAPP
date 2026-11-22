-- Step 1: Clean up duplicates (extracted)
WITH duplicates AS (
  SELECT id, vehicle_id, rule_id, status, created_at,
    ROW_NUMBER() OVER (
      PARTITION BY vehicle_id, rule_id
      ORDER BY
        CASE status WHEN 'done' THEN 0 WHEN 'doing' THEN 1 WHEN 'todo' THEN 2 ELSE 3 END,
        created_at DESC
    ) AS rn
  FROM tasks WHERE rule_id IS NOT NULL
), to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM tasks WHERE id IN (SELECT id FROM to_delete);
