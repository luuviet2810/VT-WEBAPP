-- ============================================================
-- Migration: website_settings — cấu hình liên hệ GLOBAL của Public Web
-- ============================================================
-- Lưu thông tin Footer / Contact Bubble (địa chỉ, phone, kakao, tiktok,
-- facebook, messenger). Admin sửa trong Pre-Web → Public Web đọc sau
-- refresh. KHÔNG dùng localStorage (mọi thiết bị phải thấy giống nhau).
--
-- Bảng 1 dòng (id = 1, CHECK constraint) — global website config.
-- KHÔNG đụng: vehicles, vehicle_images, public_vehicles,
-- public_vehicle_images, public_sort_order, is_public, status.
--
-- RLS:
--   * SELECT: mọi role (Public Web đọc bằng anon key)
--   * UPDATE: chỉ authenticated có role 'admin' trong bảng users
--     (khớp auth.uid() → users.auth_id) — enforce cả ở tầng DB,
--     không chỉ route guard của Pre-Web
--   * Không INSERT/DELETE policy: row duy nhất seed bởi migration này
--     (chạy bằng postgres → bypass RLS)

CREATE TABLE IF NOT EXISTS website_settings (
  id              INTEGER      PRIMARY KEY DEFAULT 1,
  office_address_1 TEXT        NOT NULL DEFAULT '',
  office_address_2 TEXT        NOT NULL DEFAULT '',
  phone_display   TEXT         NOT NULL DEFAULT '',
  phone_raw       TEXT         NOT NULL DEFAULT '',
  kakao_url       TEXT         NOT NULL DEFAULT '',
  tiktok_url      TEXT         NOT NULL DEFAULT '',
  tiktok_display  TEXT         NOT NULL DEFAULT '',
  facebook_url    TEXT         NOT NULL DEFAULT '',
  messenger_url   TEXT         NOT NULL DEFAULT '',
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT website_settings_single_row CHECK (id = 1)
);

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read website_settings" ON website_settings;
CREATE POLICY "Allow read website_settings" ON website_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin update website_settings" ON website_settings;
CREATE POLICY "Allow admin update website_settings" ON website_settings
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) = 'admin');

NOTIFY pgrst, 'reload schema';
