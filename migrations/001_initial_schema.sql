-- ============================================================
-- GARA MANAGER — Database Migration
-- Version: 2.0 (Optimized)
-- ============================================================
-- Changes from v1:
--   + Separated vehicle_images, vehicle_documents (Supabase Storage)
--   + Merged employees + users → users (Supabase Auth ready)
--   + Added activity_logs (system-wide audit)
--   + Added checksheet_logs (checksheet history)
--   + Kept JSONB for interior, exterior, out_check
--   + Prepared for Supabase Storage buckets
-- ============================================================

BEGIN;

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM ('available', 'deposited', 'sold');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'doing', 'done');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE checksheet_type AS ENUM ('in', 'out');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_action AS ENUM (
    'create', 'update', 'delete',
    'login', 'logout', 'register',
    'check_in', 'check_out',
    'move_vehicle', 'check_sheet_in', 'check_sheet_out',
    'approve', 'reject', 'enable', 'disable'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 1. USERS  (merged: employees + users)
-- Mục đích: Thống nhất nhân viên & tài khoản
--   - Thay thế hoàn toàn bảng employees và users cũ
--   - Chuẩn bị cho Supabase Auth:
--       auth_id  → link đến auth.users.id (nullable, điền sau khi migrate)
--       password_hash → null khi đã chuyển hoàn toàn sang Supabase Auth
-- FK:  none (auth_id trỏ đến auth.users sau)
-- Rel: users.id → tasks.assignee_id, attendance.user_id,
--                   move_logs.user_id, check_sheets.checker_id,
--                   notifications.user_id, activity_logs.user_id,
--                   passkeys.user_id
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Link đến Supabase Auth (điền sau khi Supabase Auth tạo user)
  auth_id          TEXT        UNIQUE,
  -- Thông tin cá nhân
  name             TEXT        NOT NULL,
  phone            TEXT,
  email            TEXT        UNIQUE,
  avatar           TEXT,
  -- Phân quyền
  role             user_role   NOT NULL DEFAULT 'staff',
  is_admin         BOOLEAN     NOT NULL DEFAULT false,  -- legacy, đồng bộ với role
  -- Trạng thái tài khoản
  status           user_status NOT NULL DEFAULT 'pending',
  disabled         BOOLEAN     NOT NULL DEFAULT false,
  -- Xác thực (legacy — điền khi dùng client-side auth, null khi chuyển Supabase Auth)
  password_hash    TEXT,
  passkey_enabled  BOOLEAN     NOT NULL DEFAULT false,
  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_auth_id    ON users(auth_id);
CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_status     ON users(status);
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_disabled   ON users(disabled);
CREATE INDEX idx_users_is_admin   ON users(is_admin);

-- ============================================================
-- 2. PASSKEYS  (moved up: users cần tồn tại trước)
-- Mục đích: Passkey (WebAuthn) cho đăng nhập không mật khẩu
-- FK:  user_id → users.id (ON DELETE CASCADE)
-- ============================================================
CREATE TABLE IF NOT EXISTS passkeys (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT        NOT NULL UNIQUE,
  public_key    TEXT        NOT NULL,
  counter       BIGINT      NOT NULL DEFAULT 0,
  device_name   TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_passkeys_user_id ON passkeys(user_id);

-- ============================================================
-- 3. POSITIONS
-- Mục đích: Vị trí đỗ xe trong bãi
-- FK:  none
-- Rel: positions.id → vehicles.position_id,
--                   move_logs.from_position_id / to_position_id
-- ============================================================
CREATE TABLE IF NOT EXISTS positions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_positions_sort_order ON positions(sort_order);

-- ============================================================
-- 4. VEHICLES
-- Mục đích: Thông tin xe (biển số, dòng xe, giá, trạng thái)
-- FK:  position_id → positions.id (nullable)
--       assignee_id → users.id    (nullable)
-- Rel: vehicles.id → check_sheets.vehicle_id,
--                   tasks.vehicle_id, move_logs.vehicle_id,
--                   vehicle_images.vehicle_id, vehicle_documents.vehicle_id
-- Thay đổi v2: Xoá images/documents JSONB → tách ra bảng riêng
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  plate         TEXT           NOT NULL,
  model         TEXT           NOT NULL,
  year          INTEGER,
  fuel_type     TEXT           CHECK (fuel_type IN ('gasoline', 'diesel', 'lpg', 'hybrid')),
  displacement  TEXT,
  mileage       TEXT,
  color         TEXT,
  cost_price    BIGINT         DEFAULT 0,
  sell_price    BIGINT         DEFAULT 0,
  status        vehicle_status NOT NULL DEFAULT 'available',
  position_id   UUID           REFERENCES positions(id) ON DELETE SET NULL,
  assignee_id   UUID           REFERENCES users(id) ON DELETE SET NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_status      ON vehicles(status);
CREATE INDEX idx_vehicles_position_id ON vehicles(position_id);
CREATE INDEX idx_vehicles_assignee_id ON vehicles(assignee_id);
CREATE INDEX idx_vehicles_created_at  ON vehicles(created_at DESC);

-- ============================================================
-- 5. VEHICLE_IMAGES
-- Mục đích: Ảnh xe — Supabase Storage ready
-- FK:  vehicle_id → vehicles.id (ON DELETE CASCADE)
-- Storage: bucket = 'vehicle-images'
--   URL format: ${SUPABASE_URL}/storage/v1/object/public/vehicle-images/{path}
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_images (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  -- Supabase Storage path (ví dụ: "vehicles/uuid/image-1.jpg")
  path        TEXT        NOT NULL,
  -- Storage bucket name
  bucket      TEXT        NOT NULL DEFAULT 'vehicle-images',
  -- Full public URL (tạo từ path khi đọc)
  url         TEXT        NOT NULL,
  -- Thumbnail URL (nullable, cho ảnh lớn)
  thumbnail   TEXT,
  -- Kích thước file (bytes)
  size_bytes  BIGINT,
  -- MIME type
  mime_type   TEXT,
  -- Thứ tự hiển thị
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);
CREATE INDEX idx_vehicle_images_sort_order ON vehicle_images(sort_order);

-- ============================================================
-- 6. VEHICLE_DOCUMENTS
-- Mục đích: Giấy tờ xe — Supabase Storage ready
-- FK:  vehicle_id → vehicles.id (ON DELETE CASCADE)
-- Storage: bucket = 'vehicle-documents'
--   URL format: ${SUPABASE_URL}/storage/v1/object/public/vehicle-documents/{path}
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  -- Tên loại giấy tờ (Đăng ký, Bảo hiểm, ...)
  label       TEXT,
  -- Supabase Storage path
  path        TEXT        NOT NULL,
  -- Storage bucket name
  bucket      TEXT        NOT NULL DEFAULT 'vehicle-documents',
  -- Full public URL
  url         TEXT        NOT NULL,
  -- Kích thước file (bytes)
  size_bytes  BIGINT,
  -- MIME type
  mime_type   TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_documents_sort_order ON vehicle_documents(sort_order);

-- ============================================================
-- 7. TASKS
-- Mục đích: Nhiệm vụ công việc (Kanban board)
-- FK:  assignee_id → users.id    (nullable)
--       vehicle_id  → vehicles.id (nullable)
-- Rel: tasks.id → task_activity_logs.task_id
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT           NOT NULL,
  description TEXT,
  -- Checklist items: Array<{ id: string, text: string, done: boolean }>
  checklist   JSONB          NOT NULL DEFAULT '[]',
  priority    task_priority   NOT NULL DEFAULT 'medium',
  status      task_status     NOT NULL DEFAULT 'todo',
  assignee_id UUID           REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id  UUID           REFERENCES vehicles(id) ON DELETE SET NULL,
  due_date    DATE,
  due_time    TIME,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_status      ON tasks(status);
CREATE INDEX idx_tasks_priority   ON tasks(priority);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_vehicle_id ON tasks(vehicle_id);
CREATE INDEX idx_tasks_due_date    ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- ============================================================
-- 8. TASK_ACTIVITY_LOGS
-- Mục đích: Lịch sử hoạt động trên task (ai làm gì, lúc nào)
-- FK:  task_id  → tasks.id    (ON DELETE CASCADE)
--       user_id  → users.id    (nullable)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_activity_logs_task_id      ON task_activity_logs(task_id);
CREATE INDEX idx_task_activity_logs_user_id     ON task_activity_logs(user_id);
CREATE INDEX idx_task_activity_logs_created_at  ON task_activity_logs(created_at DESC);

-- ============================================================
-- 9. MOVE_LOGS
-- Mục đích: Lịch sử di chuyển xe giữa các vị trí
-- FK:  vehicle_id       → vehicles.id   (ON DELETE CASCADE)
--       from_position_id → positions.id  (nullable)
--       to_position_id   → positions.id
--       user_id          → users.id      (nullable)
-- ============================================================
CREATE TABLE IF NOT EXISTS move_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  from_position_id UUID        REFERENCES positions(id) ON DELETE SET NULL,
  to_position_id   UUID        NOT NULL REFERENCES positions(id) ON DELETE SET NULL,
  user_id          UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_move_logs_vehicle_id ON move_logs(vehicle_id);
CREATE INDEX idx_move_logs_created_at ON move_logs(created_at DESC);

-- ============================================================
-- 10. ATTENDANCE
-- Mục đích: Chấm công nhân viên (giờ vào, giờ ra)
-- FK:  user_id → users.id (ON DELETE CASCADE)
-- Note: Đổi employee_id → user_id để align với bảng users hợp nhất
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  check_in    TIME,
  check_out   TIME,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date   ON attendance(date DESC);

-- ============================================================
-- 11. CHECK_SHEETS
-- Mục đích: Phiếu kiểm tra xe đầu vào / đầu ra
-- FK:  vehicle_id → vehicles.id (ON DELETE CASCADE)
--       checker_id → users.id    (nullable)
-- Giữ nguyên JSONB cho interior, exterior, out_check, exterior_photos
-- ============================================================
CREATE TABLE IF NOT EXISTS check_sheets (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID            NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type            checksheet_type NOT NULL,
  checker_id      UUID            REFERENCES users(id) ON DELETE SET NULL,
  check_date      DATE            NOT NULL,
  -- Mức nhiên liệu
  fuel_level      TEXT            NOT NULL DEFAULT 'half'
                                CHECK (fuel_level IN ('empty', 'quarter', 'half', 'full')),
  -- Option xe — Đầu vào
  screen          TEXT            NOT NULL DEFAULT 'normal'
                                CHECK (screen IN ('normal', 'android', 'broken')),
  rear_camera     TEXT            NOT NULL DEFAULT 'ok'
                                CHECK (rear_camera IN ('ok', 'blurry', 'broken')),
  hipass          TEXT            NOT NULL DEFAULT 'none'
                                CHECK (hipass IN ('mirror', 'device', 'none')),
  rear_sensor     TEXT            NOT NULL DEFAULT 'ok'
                                CHECK (rear_sensor IN ('ok', 'broken', 'none')),
  dashcam         TEXT            NOT NULL DEFAULT 'none'
                                CHECK (dashcam IN ('good', 'maybe', 'none')),
  -- Nội thất — 3 ghế (JSONB)
  -- { driverSeat: { condition: 'good'|'dirty'|'torn', note?: string }, ... }
  interior        JSONB           NOT NULL DEFAULT
    '{"driverSeat":{"condition":"good"},"passengerSeat":{"condition":"good"},"rearSeat":{"condition":"good"}}',
  -- Ngoại thất — 8 vị trí (JSONB)
  -- { frontBumper: { condition, note? }, rearBumper: { condition, note? }, ... }
  exterior        JSONB           NOT NULL DEFAULT '{}',
  -- Ảnh chụp ngoại thất theo từng vị trí (JSONB)
  -- { frontBumper: ["url1","url2"], rearBumper: [...] }
  exterior_photos JSONB,
  -- Đầu ra — 12 hạng mục kiểm tra (JSONB)
  -- {
  --   conSeongnyeong: { status: 'con'|'can_repair' },
  --   dauMay:         { status: 'replacing'|'good'|'empty' },
  --   nuocLamMat:      { status: 'replacing'|'good'|'empty' },
  --   camHanhTrinh:   { status: 'ok'|'error'|'none', detail?: string },
  --   manHinhBluetooth:{ status: 'ok'|'error'|'none', detail?: string },
  --   cameraLui:      { status: 'ok'|'error'|'none', detail?: string },
  --   denPhaCot:      { status: 'ok'|'error'|'none', detail?: string },
  --   motorGuongNutBam:{ status: 'ok'|'error'|'none', detail?: string },
  --   dieuHoa:        { status: 'good'|'need_gas' },
  --   suoiGhe:        { status: 'good'|'broken'|'none' },
  --   cuaSo:          { status: 'ok'|'error'|'none', detail?: string },
  --   gheChinhDien:   { status: 'ok'|'error'|'none', detail?: string },
  --   tinhTrangLop:   { status: 'ok'|'error'|'none', detail?: string }
  -- }
  out_check       JSONB,
  out_notes       TEXT,
  -- Battery — Đầu vào
  input_acquy_soh INTEGER         CHECK (input_acquy_soh >= 0 AND input_acquy_soh <= 100),
  input_acquy_soc INTEGER         CHECK (input_acquy_soc >= 0 AND input_acquy_soc <= 100),
  -- Battery — Đầu ra
  acquy_soh       INTEGER         CHECK (acquy_soh >= 0 AND acquy_soh <= 100),
  acquy_soc       INTEGER         CHECK (acquy_soc >= 0 AND acquy_soc <= 100),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_check_sheets_vehicle_id ON check_sheets(vehicle_id);
CREATE INDEX idx_check_sheets_type      ON check_sheets(type);
CREATE INDEX idx_check_sheets_checker_id ON check_sheets(checker_id);
CREATE INDEX idx_check_sheets_check_date ON check_sheets(check_date DESC);
CREATE INDEX idx_check_sheets_created_at ON check_sheets(created_at DESC);

-- ============================================================
-- 12. CHECKSHEET_LOGS
-- Mục đích: Lịch sử chỉnh sửa checksheet (audit trail)
-- FK:  checksheet_id → check_sheets.id (ON DELETE CASCADE)
--       editor_id    → users.id        (nullable)
-- Ghi nhận: ai sửa gì, lúc nào, giá trị cũ và mới
-- ============================================================
CREATE TABLE IF NOT EXISTS checksheet_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  checksheet_id UUID        NOT NULL REFERENCES check_sheets(id) ON DELETE CASCADE,
  editor_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  -- Tên field bị thay đổi (ví dụ: 'fuel_level', 'interior', 'out_check', 'out_notes')
  field         TEXT        NOT NULL,
  -- Giá trị cũ (JSON string)
  old_value    JSONB,
  -- Giá trị mới (JSON string)
  new_value    JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checksheet_logs_checksheet_id ON checksheet_logs(checksheet_id);
CREATE INDEX idx_checksheet_logs_editor_id    ON checksheet_logs(editor_id);
CREATE INDEX idx_checksheet_logs_created_at    ON checksheet_logs(created_at DESC);

-- ============================================================
-- 13. NOTIFICATIONS
-- Mục đích: Thông báo hệ thống
-- FK:  user_id → users.id (nullable — null = system notification)
-- type: task_created | task_done | vehicle_added | vehicle_status |
--       attendance_edited | system | user_registered |
--       user_approved | user_rejected
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  read        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id     ON notifications(user_id);
CREATE INDEX idx_notifications_read        ON notifications(read);
CREATE INDEX idx_notifications_created_at  ON notifications(created_at DESC);

-- ============================================================
-- 14. ACTIVITY_LOGS
-- Mục đích: Log toàn bộ hoạt động hệ thống (system-wide audit)
-- FK:  user_id → users.id (nullable — null = system event)
-- Ghi nhận mọi action: tạo/sửa/xoá, login/logout, check-in/out...
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID             REFERENCES users(id) ON DELETE SET NULL,
  action       activity_action  NOT NULL,
  entity_type  TEXT             NOT NULL,
  -- entity_id: ID của bản ghi bị ảnh hưởng (tasks, vehicles, attendance...)
  entity_id    UUID,
  -- description: mô tả human-readable (ví dụ: "Tạo task mới", "Đổi trạng thái xe")
  description  TEXT,
  -- metadata: dữ liệu bổ sung (JSON)
  metadata     JSONB,
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_user_id      ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action       ON activity_logs(action);
CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_entity_id   ON activity_logs(entity_id);
CREATE INDEX idx_activity_logs_created_at  ON activity_logs(created_at DESC);

-- ============================================================
-- 15. SETTINGS
-- Mục đích: Cấu hình hệ thống (1 bản ghi duy nhất)
-- FK:  none
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_start_hour           TIME        NOT NULL DEFAULT '08:30',
  work_end_hour             TIME        NOT NULL DEFAULT '17:30',
  work_hours_per_day        INTEGER     NOT NULL DEFAULT 8,
  gps_radius_meters         INTEGER     NOT NULL DEFAULT 200,
  overtime_multiplier       NUMERIC(3,2) NOT NULL DEFAULT 1.50,
  night_overtime_multiplier NUMERIC(3,2) NOT NULL DEFAULT 2.00,
  late_penalty_30min        BOOLEAN     NOT NULL DEFAULT true,
  company_name              TEXT        NOT NULL DEFAULT 'Gara xe của tôi',
  company_phone             TEXT        NOT NULL DEFAULT '',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 16. LOCATIONS
-- Mục đích: Địa điểm / bãi xe
-- FK:  none
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_sort_order ON locations(sort_order);

-- ============================================================
-- MIGRATION: Merge employees → users (chỉ chạy nếu bảng cũ tồn tại)
-- ============================================================
-- Chạy block này chỉ khi database cũ có bảng employees.
-- Database mới (fresh) sẽ bỏ qua hoàn toàn block này.
-- ============================================================

DO $$
BEGIN
  -- Kiểm tra bảng employees có tồn tại không
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'employees'
  ) THEN
    -- Migrate employees → users (với id giữ nguyên để không break FK)
    INSERT INTO users (id, name, phone, role, is_admin, status, disabled, created_at, updated_at)
    SELECT
      id,
      name,
      COALESCE(phone, ''),
      CASE WHEN is_admin THEN 'admin'::user_role ELSE 'staff'::user_role END,
      is_admin,
      CASE WHEN disabled THEN 'disabled'::user_status ELSE 'approved'::user_status END,
      disabled,
      created_at,
      updated_at
    FROM employees
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Migrated data from employees table.';
  ELSE
    RAISE NOTICE 'employees table not found — skipping migration block.';
  END IF;
END $$;

-- ============================================================
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
