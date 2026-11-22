-- Add song_nung_expiry_date to vehicle_images for tracking expiry of Song nưng photos
ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS song_nung_expiry_date DATE NULL;