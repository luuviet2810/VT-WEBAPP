-- Seed thông tin thật hiện tại (idempotent)
INSERT INTO website_settings (
  id, office_address_1, office_address_2,
  phone_display, phone_raw,
  tiktok_url, tiktok_display
) VALUES (
  1,
  'CS1: 대전광역시 유성구 유성대로 510, 339호',
  'CS2: 경기 수원시 권선구 세화로 49, 8호',
  '010-2592-5885 (Tiến)',
  '+821025925885',
  'https://www.tiktok.com/@viettienauto',
  '@viettienauto'
)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
