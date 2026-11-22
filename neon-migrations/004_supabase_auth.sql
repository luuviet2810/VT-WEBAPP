-- Migration 004: Schema update for Neon
BEGIN;
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users (auth_id);
COMMENT ON TABLE public.users IS 'Canonical employee profile table. auth_id links to auth identity.';
COMMIT;
