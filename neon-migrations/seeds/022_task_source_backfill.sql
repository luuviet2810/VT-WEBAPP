UPDATE tasks SET source = 'rule_engine' WHERE rule_id IS NOT NULL AND source IS NULL;
UPDATE tasks SET source = 'manual' WHERE rule_id IS NULL AND source IS NULL;
