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

-- Seed the initial catalog (idempotent)
INSERT INTO vehicle_option_defs (group_key, group_label, key, label, sort_order) VALUES
  -- TIỆN NGHI
  ('comfort',   'Tiện nghi',              'smart_key',         'Smart Key',            1),
  ('comfort',   'Tiện nghi',              'start_button',      'Nút bấm khởi động',    2),
  ('comfort',   'Tiện nghi',              'av_screen',         'Màn hình AV',          3),
  ('comfort',   'Tiện nghi',              'auto_ac',           'Điều hòa tự động',     4),
  ('comfort',   'Tiện nghi',              'cruise_control',    'Cruise Control',       5),
  -- GHẾ / NỘI THẤT
  ('interior',  'Ghế / Nội thất',         'leather_seats',     'Ghế da',               6),
  ('interior',  'Ghế / Nội thất',         'power_seats',       'Ghế điện',             7),
  ('interior',  'Ghế / Nội thất',         'seat_heater',       'Sưởi ghế',             8),
  ('interior',  'Ghế / Nội thất',         'seat_ventilation',  'Làm mát ghế',          9),
  ('interior',  'Ghế / Nội thất',         'heated_steering',   'Vô lăng sưởi',        10),
  -- AN TOÀN / HỖ TRỢ
  ('safety',    'An toàn / Hỗ trợ',       'rear_camera',       'Camera lùi',          11),
  ('safety',    'An toàn / Hỗ trợ',       'rear_sensor',       'Cảm biến lùi',        12),
  ('safety',    'An toàn / Hỗ trợ',       'front_sensor',      'Cảm biến trước',      13),
  -- NGOẠI THẤT
  ('exterior',  'Ngoại thất',             'sunroof',           'Cửa sổ trời',         14),
  ('exterior',  'Ngoại thất',             'power_trunk',       'Cốp điện',            15),
  ('exterior',  'Ngoại thất',             'power_mirrors',     'Gương điện',          16)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
