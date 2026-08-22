-- Add expiry date fields to vehicles table for Song nưng and registration
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS song_nung_expiry_date DATE NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_expiry_date DATE NULL;