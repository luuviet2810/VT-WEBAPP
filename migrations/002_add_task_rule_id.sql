-- Migration: 002_add_task_rule_id.sql
-- Adds rule_id column to tasks table for checksheet-driven task deduplication.
-- Without this column, rule-backed tasks will be re-created on every checksheet save,
-- breaking idempotent task generation.

BEGIN;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rule_id TEXT;

COMMENT ON COLUMN tasks.rule_id IS 'Stable identifier of the task-generation rule that created this task. Used for deduplication: matching rule_id + vehicle_id means the same logical task.';

COMMIT;
