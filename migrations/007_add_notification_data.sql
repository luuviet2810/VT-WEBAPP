-- Migration: 007_add_notification_data.sql
-- Adds a JSONB data column to notifications for deep-link metadata.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS data JSONB;

NOTIFY pgrst, 'reload schema';
