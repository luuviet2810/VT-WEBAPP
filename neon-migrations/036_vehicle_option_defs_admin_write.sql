-- ============================================================
-- Migration: quyền ghi vehicle_option_defs cho Admin (Option Manager)
-- ============================================================
-- Migration 031 mới chỉ cấp SELECT (mọi role). Option Manager trong
-- Admin (tab "Option xe") cần INSERT / UPDATE / DELETE catalog nên
-- thêm policy cho role 'admin' (check qua users.auth_id = auth.uid()).
--
-- Staff và anon: vẫn CHỈ đọc → Public Web và checkbox của staff
-- không đổi hành vi.
--
-- Không đụng: vehicles, vehicle_images, public_vehicles,
-- public_vehicle_images, public_sort_order, is_public, status, 034.

DROP POLICY IF EXISTS "Allow admin insert vehicle_option_defs" ON vehicle_option_defs;
CREATE POLICY "Allow admin insert vehicle_option_defs" ON vehicle_option_defs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) = 'admin');

DROP POLICY IF EXISTS "Allow admin update vehicle_option_defs" ON vehicle_option_defs;
CREATE POLICY "Allow admin update vehicle_option_defs" ON vehicle_option_defs
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) = 'admin');

DROP POLICY IF EXISTS "Allow admin delete vehicle_option_defs" ON vehicle_option_defs;
CREATE POLICY "Allow admin delete vehicle_option_defs" ON vehicle_option_defs
  FOR DELETE TO authenticated
  USING ((SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) = 'admin');

NOTIFY pgrst, 'reload schema';
