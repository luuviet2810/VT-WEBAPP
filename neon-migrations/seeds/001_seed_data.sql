-- SEED DATA
-- ============================================================

-- Default positions
INSERT INTO positions (id, name, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Song nưng dưới này',  0),
  ('00000000-0000-0000-0000-000000000002', 'Song nưng trên này',  1),
  ('00000000-0000-0000-0000-000000000003', 'Rửa máy',              2),
  ('00000000-0000-0000-0000-000000000004', 'Song nưng chốt',       3),
  ('00000000-0000-0000-0000-000000000005', 'Đánh bóng Wolpyong',   4)
ON CONFLICT DO NOTHING;

-- Default users (seed từ useStore — admin accounts)
INSERT INTO users (id, name, phone, role, is_admin, status, disabled) VALUES
  ('00000000-0000-0000-0001-000000000001', 'LƯU VĂN VIỆT', '01076565642', 'admin', true, 'approved', false),
  ('00000000-0000-0000-0001-000000000002', 'LINH THƯ',     '',            'admin', true, 'approved', false)
ON CONFLICT DO NOTHING;

-- Default settings
INSERT INTO settings (id) VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STORAGE BUCKETS (Supabase Storage)
-- ============================================================
-- Tạo trên Supabase Dashboard hoặc Supabase CLI:
--
-- 1. vehicle-images
--    Purpose: Ảnh xe (ngoại thất, nội thất)
--    Public:  true
--    File size limit: 10MB
--    Allowed MIME: image/jpeg, image/png, image/webp
--
-- 2. vehicle-documents
--    Purpose: Giấy tờ xe (đăng ký, bảo hiểm,...)
--    Public:  true
--    File size limit: 20MB
--    Allowed MIME: image/jpeg, image/png, application/pdf
--
-- 3. check-sheet-photos
--    Purpose: Ảnh kiểm tra checksheet (ngoại thất, chi tiết lỗi)
--    Public:  true
--    File size limit: 10MB
--    Allowed MIME: image/jpeg, image/png, image/webp
--
-- 4. avatars
--    Purpose: Ảnh đại diện người dùng
--    Public:  true
--    File size limit: 2MB
--    Allowed MIME: image/jpeg, image/png, image/webp
--
-- ============================================================

COMMIT;

-- ============================================================
-- NOTE: Sau khi chạy migration thành công, drop bảng cũ:
--   DROP TABLE IF EXISTS employees;
--   DROP TABLE IF EXISTS users;  -- (bảng users cũ, không phải bảng mới)
-- ============================================================
