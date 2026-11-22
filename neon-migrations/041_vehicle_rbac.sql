-- ============================================================
-- Migration 041: enforce vehicle CRUD by authenticated user role
-- ============================================================
-- Admin: SELECT / INSERT / UPDATE / DELETE
-- Staff: SELECT / INSERT / UPDATE
-- Existing permissive policies may still grant other operations; inspect live policies.
--
-- Role is resolved from public.users.auth_id = auth.jwt()->>'sub'.
-- This migration is intentionally not executed automatically.

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles authenticated read" ON vehicles;
CREATE POLICY "vehicles authenticated read" ON vehicles
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) IN ('admin', 'staff')
  );

DROP POLICY IF EXISTS "vehicles admin staff insert" ON vehicles;
CREATE POLICY "vehicles admin staff insert" ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) IN ('admin', 'staff')
  );

DROP POLICY IF EXISTS "vehicles admin staff update" ON vehicles;
CREATE POLICY "vehicles admin staff update" ON vehicles
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) IN ('admin', 'staff')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) IN ('admin', 'staff')
  );

DROP POLICY IF EXISTS "vehicles admin delete" ON vehicles;
CREATE POLICY "vehicles admin delete" ON vehicles
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) = 'admin'
  );

-- A restrictive guard also applies when other permissive DELETE/ALL policies
-- exist. BYPASSRLS roles (including service_role) remain outside RLS.
DROP POLICY IF EXISTS "vehicles delete admin guard" ON vehicles;
CREATE POLICY "vehicles delete admin guard" ON vehicles
  AS RESTRICTIVE FOR DELETE TO PUBLIC
  USING (
    (SELECT role FROM users WHERE auth_id = (auth.jwt() ->> 'sub')) = 'admin'
  );

NOTIFY pgrst, 'reload schema';
