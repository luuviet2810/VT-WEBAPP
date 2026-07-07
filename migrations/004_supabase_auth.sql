-- ============================================================
-- GARA MANAGER — Migration 004: Supabase Auth
-- Goal: make `public.users` the canonical identity store,
-- keep existing employee data, and clean legacy auth-only fields.
-- ============================================================

BEGIN;

-- 1. Backfill `auth_id` for existing users that only have local auth data.
--    We cannot join `auth.users` from SQL here, so this creates stable
--    deterministic IDs from email+name using MD5. The app migration
--    should later replace these with real `auth.uid()` values after
--    users sign in with Supabase Auth.
UPDATE public.users
SET auth_id = 'legacy-' || md5(LOWER(COALESCE(email, '')) || '|' || name)
WHERE auth_id IS NULL
  AND email IS NOT NULL
  AND name IS NOT NULL;

-- 2. Ensure legacy rows without email still have an auth_id.
UPDATE public.users
SET auth_id = 'legacy-' || id::text
WHERE auth_id IS NULL;

-- 3. Remove the custom password hash field so future auth goes through
--    `auth.users`. Keep `passkey_enabled` as a soft flag for now; the
--    migration keeps it until the frontend WebAuthn integration is
--    fully removed.
ALTER TABLE public.users
  DROP COLUMN IF EXISTS password_hash;

-- 4. Tighten uniqueness/indexing for Supabase Auth lookups.
CREATE INDEX IF NOT EXISTS idx_users_auth_id
  ON public.users (auth_id);

-- 5. Preserve a migration note for operators.
COMMENT ON TABLE public.users IS
  'Canonical employee profile table. auth_id links to auth.users(id) after migration to Supabase Auth.';

COMMIT;
