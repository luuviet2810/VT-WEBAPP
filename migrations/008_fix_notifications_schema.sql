-- Migration: 008_fix_notifications_schema.sql
-- Adds the data column required by the new Notification Engine.
-- The TypeScript Notification interface has a data?: { vehicleId?, taskName?, ... } field,
-- but the database column never existed, causing all createEvent() calls to fail.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Reload PostgREST schema cache so new column is picked up immediately
NOTIFY pgrst, 'reload schema';
