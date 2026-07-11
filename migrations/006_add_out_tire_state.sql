-- Migration: 006_add_out_tire_state.sql
-- Adds the missing out_tire_state column to check_sheets.
-- The frontend has been sending this column but it was never added to the schema.
-- TypeScript interface and service already reference out_tire_state.

ALTER TABLE check_sheets
  ADD COLUMN IF NOT EXISTS out_tire_state JSONB;

NOTIFY pgrst, 'reload schema';
