-- ============================================================
-- Migration: Master catalog of vehicle options ("Option xe")
-- ============================================================
-- vehicle_option_defs is the single source of truth for option
-- groups/keys/labels. Admin UI renders checkboxes from this table;
-- Public Web (Phase 2) will read labels from here too — nothing is
-- hard-coded per client app.
--
-- Per-vehicle selections live in vehicles.options (JSONB array of
-- vehicle_option_defs.key) — added in migration 030.

CREATE TABLE IF NOT EXISTS vehicle_option_defs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key   TEXT    NOT NULL,
  group_label TEXT    NOT NULL,
  key         TEXT    NOT NULL UNIQUE,
  label       TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE vehicle_option_defs ENABLE ROW LEVEL SECURITY;

-- Readable by everyone (same permissive pattern as vehicle_workflow_logs);
-- writes only via migration/service role — no INSERT/UPDATE policy on purpose.
DROP POLICY IF EXISTS "Allow read vehicle_option_defs" ON vehicle_option_defs;
CREATE POLICY "Allow read vehicle_option_defs" ON vehicle_option_defs
  FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
