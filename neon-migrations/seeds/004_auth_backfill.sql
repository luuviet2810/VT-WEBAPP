-- Migration 004: Data backfill (extracted)
UPDATE public.users
SET auth_id = 'legacy-' || md5(LOWER(COALESCE(email, '')) || '|' || name)
WHERE auth_id IS NULL AND email IS NOT NULL AND name IS NOT NULL;

UPDATE public.users
SET auth_id = 'legacy-' || id::text
WHERE auth_id IS NULL;
