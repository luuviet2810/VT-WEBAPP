-- Remove all column defaults and NOT NULL constraints from check_sheets
-- so new rows start with NULL instead of pre-selected values.
-- Previously saved data is NOT modified.

ALTER TABLE check_sheets
  ALTER COLUMN fuel_level  DROP NOT NULL,
  ALTER COLUMN fuel_level  DROP DEFAULT,
  ALTER COLUMN screen      DROP NOT NULL,
  ALTER COLUMN screen      DROP DEFAULT,
  ALTER COLUMN rear_camera DROP NOT NULL,
  ALTER COLUMN rear_camera DROP DEFAULT,
  ALTER COLUMN hipass      DROP NOT NULL,
  ALTER COLUMN hipass      DROP DEFAULT,
  ALTER COLUMN rear_sensor DROP NOT NULL,
  ALTER COLUMN rear_sensor DROP DEFAULT,
  ALTER COLUMN dashcam     DROP NOT NULL,
  ALTER COLUMN dashcam     DROP DEFAULT,
  ALTER COLUMN interior    DROP NOT NULL,
  ALTER COLUMN interior    DROP DEFAULT,
  ALTER COLUMN exterior    DROP NOT NULL,
  ALTER COLUMN exterior    DROP DEFAULT;
