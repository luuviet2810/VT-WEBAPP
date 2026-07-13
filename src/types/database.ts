// ============================================================
// GARA MANAGER — Database Types
// Auto-generated from migrations/001_initial_schema.sql v2.0
// ============================================================

// ============================================================
// ENUMS (matching PostgreSQL enum types)
// ============================================================

export type VehicleStatus = 'available' | 'deposited' | 'sold';

export type TaskPriority = 'urgent' | 'priority' | 'normal';

export type TaskStatus = 'todo' | 'doing' | 'done';

export type UserRole = 'admin' | 'staff';

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

export type ChecksheetType = 'in' | 'out';

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'register'
  | 'check_in'
  | 'check_out'
  | 'move_vehicle'
  | 'check_sheet_in'
  | 'check_sheet_out'
  | 'approve'
  | 'reject'
  | 'enable'
  | 'disable';

// ============================================================
// JSONB SHAPES
// ============================================================

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export type SeatCondition = 'good' | 'dirty' | 'torn';

export interface SeatConditionDetail {
  condition: SeatCondition;
  note?: string;
}

export type ExteriorCondition = 'good' | 'scratch' | 'dent' | 'discolor' | 'needpaint';

export interface ExteriorConditionDetail {
  condition: ExteriorCondition;
  note?: string;
}

export type FuelLevel = 'empty' | 'quarter' | 'half' | 'full';

export type ScreenCondition = 'normal' | 'android' | 'broken';

export type RearCameraCondition = 'ok' | 'blurry' | 'broken';

export type HipassCondition = 'mirror' | 'device' | 'none';

export type RearSensorCondition = 'ok' | 'broken' | 'none';

export type DashcamCondition = 'good' | 'maybe' | 'none';

export type ConSeongnyeongStatus = 'con' | 'can_repair';

export type DauMayStatus = 'replacing' | 'good' | 'empty';

export type NuocLamMatStatus = 'replacing' | 'good' | 'empty';

export type DieuHoaStatus = 'good' | 'need_gas';

export type SuoiGheStatus = 'good' | 'broken' | 'none';

export type OutCheckItemStatus = 'ok' | 'error' | 'none';

export interface OutCheckItemDetail {
  status: OutCheckItemStatus;
  detail?: string;
}

export interface OutCheck {
  conSeongnyeong?: { status: ConSeongnyeongStatus };
  dauMay?: { status: DauMayStatus };
  nuocLamMat?: { status: NuocLamMatStatus };
  camHanhTrinh?: OutCheckItemDetail;
  manHinhBluetooth?: OutCheckItemDetail;
  cameraLui?: OutCheckItemDetail;
  denPhaCot?: OutCheckItemDetail;
  motorGuongNutBam?: OutCheckItemDetail;
  dieuHoa?: { status: DieuHoaStatus };
  suoiGhe?: { status: SuoiGheStatus };
  cuaSo?: OutCheckItemDetail;
  gheChinhDien?: OutCheckItemDetail;
  tinhTrangLop?: OutCheckItemDetail;
}

// Exterior spot keys (theo EXTERIOR_SPOTS)
export type ExteriorSpotKey =
  | 'frontBumper'
  | 'rearBumper'
  | 'leftFender'
  | 'rightFender'
  | 'driverDoor'
  | 'passengerDoor'
  | 'rearLeftDoor'
  | 'rearRightDoor';

// ============================================================
// TABLES
// ============================================================

// ---------- 1. USERS ----------
export interface User {
  id: string;
  auth_id: string | null;       // Supabase Auth link
  name: string;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  role: UserRole;
  is_admin: boolean;            // legacy, synced with role
  status: UserStatus;
  disabled: boolean;
  password_hash: string | null; // null when fully on Supabase Auth
  passkey_enabled: boolean;
  created_at: string;          // ISO 8601
  updated_at: string;          // ISO 8601
}

// ---------- 2. PASSKEYS ----------
export interface Passkey {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name: string;
  created_at: string;
}

// ---------- 3. POSITIONS ----------
export interface Position {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---------- 4. VEHICLES ----------
export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  year: number | null;
  fuel_type: 'gasoline' | 'diesel' | 'lpg' | 'hybrid' | null;
  displacement: string | null;
  mileage: string | null;
  color: string | null;
  cost_price: number;
  sell_price: number;
  status: VehicleStatus;
  position_id: string | null;
  assignee_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- 5. VEHICLE_IMAGES ----------
export interface VehicleImage {
  id: string;
  vehicle_id: string;
  path: string;          // Supabase Storage path
  bucket: string;        // default: 'vehicle-images'
  url: string;           // full public URL
  thumbnail: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  sort_order: number;
  created_at: string;
}

// ---------- 6. VEHICLE_DOCUMENTS ----------
export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  label: string | null;  // e.g. "Đăng ký", "Bảo hiểm"
  path: string;          // Supabase Storage path
  bucket: string;        // default: 'vehicle-documents'
  url: string;           // full public URL
  size_bytes: number | null;
  mime_type: string | null;
  sort_order: number;
  created_at: string;
}

// ---------- 7. TASKS ----------
export interface Task {
  id: string;
  title: string;
  description: string | null;
  checklist: ChecklistItem[];
  priority: TaskPriority;
  status: TaskStatus;
  assignee_id: string | null;
  vehicle_id: string | null;
  due_date: string | null;  // YYYY-MM-DD
  due_time: string | null;   // HH:MM:SS
  created_at: string;
}

// ---------- 8. TASK_ACTIVITY_LOGS ----------
export interface TaskActivityLog {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  created_at: string;
}

// ---------- 9. MOVE_LOGS ----------
export interface MoveLog {
  id: string;
  vehicle_id: string;
  from_position_id: string | null;
  to_position_id: string;
  user_id: string | null;
  created_at: string;
}

// ---------- 10. ATTENDANCE ----------
export interface Attendance {
  id: string;
  user_id: string;
  date: string;         // YYYY-MM-DD
  check_in: string | null;  // HH:MM:SS
  check_out: string | null;  // HH:MM:SS
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- 11. CHECK_SHEETS ----------
export interface CheckSheet {
  id: string;
  vehicle_id: string;
  type: ChecksheetType;
  checker_id: string | null;
  check_date: string;    // YYYY-MM-DD
  fuel_level: FuelLevel;
  screen: ScreenCondition;
  rear_camera: RearCameraCondition;
  hipass: HipassCondition;
  rear_sensor: RearSensorCondition;
  dashcam: DashcamCondition;
  interior: Record<string, SeatConditionDetail>;
  exterior: Record<string, ExteriorConditionDetail>;
  exterior_photos: Record<string, string[]> | null;
  out_check: OutCheck | null;
  out_notes: string | null;
  input_acquy_soh: number | null;
  input_acquy_soc: number | null;
  acquy_soh: number | null;
  acquy_soc: number | null;
  created_at: string;
  updated_at: string;
}

// ---------- 12. CHECKSHEET_LOGS ----------
export interface ChecksheetLog {
  id: string;
  checksheet_id: string;
  editor_id: string | null;
  field: string;
  old_value: unknown | null;  // JSONB
  new_value: unknown | null;  // JSONB
  created_at: string;
}

// ---------- 13. NOTIFICATIONS ----------
export type NotificationType =
  | 'task_created'
  | 'task_done'
  | 'vehicle_added'
  | 'vehicle_status'
  | 'attendance_edited'
  | 'system'
  | 'user_registered'
  | 'user_approved'
  | 'user_rejected';

export interface Notification {
  id: string;
  user_id: string | null;   // null = system notification
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

// ---------- 14. ACTIVITY_LOGS ----------
export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: ActivityAction;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---------- 15. SETTINGS ----------
export interface Settings {
  id: string;
  work_start_hour: string;           // HH:MM:SS
  work_end_hour: string;             // HH:MM:SS
  work_hours_per_day: number;
  gps_radius_meters: number;
  overtime_multiplier: number;       // e.g. 1.50
  night_overtime_multiplier: number; // e.g. 2.00
  late_penalty_30min: boolean;
  company_name: string;
  company_phone: string;
  created_at: string;
  updated_at: string;
}

// ---------- 16. LOCATIONS ----------
export interface Location {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// SUPPLEMENTARY TYPES
// ============================================================

/** Vehicle với relations đã expand (dùng với Supabase join) */
export type VehicleWithRelations = Vehicle & {
  position?: Position | null;
  assignee?: User | null;
  images?: VehicleImage[];
  documents?: VehicleDocument[];
};

/** CheckSheet với relations đã expand */
export type CheckSheetWithRelations = CheckSheet & {
  vehicle?: Vehicle | null;
  checker?: User | null;
  images?: VehicleImage[];
};

/** Attendance với user đã expand */
export type AttendanceWithRelations = Attendance & {
  user?: User | null;
};

/** Task với relations đã expand */
export type TaskWithRelations = Task & {
  assignee?: User | null;
  vehicle?: Vehicle | null;
};

/** MoveLog với relations đã expand */
export type MoveLogWithRelations = MoveLog & {
  vehicle?: Vehicle | null;
  from_position?: Position | null;
  to_position?: Position | null;
  user?: User | null;
};

// ============================================================
// INSERT / UPDATE PAYLOADS (dùng cho Supabase insert/update)
// ============================================================

export type UserInsert = Omit<User, 'created_at' | 'updated_at'>;
export type UserUpdate = Partial<Omit<User, 'id' | 'created_at'>>;

export type VehicleInsert = Omit<Vehicle, 'created_at' | 'updated_at'>;
export type VehicleUpdate = Partial<Omit<Vehicle, 'id' | 'created_at'>>;

export type VehicleImageInsert = Omit<VehicleImage, 'id' | 'created_at'>;
export type VehicleImageUpdate = Partial<Omit<VehicleImage, 'id' | 'created_at'>>;

export type VehicleDocumentInsert = Omit<VehicleDocument, 'id' | 'created_at'>;
export type VehicleDocumentUpdate = Partial<Omit<VehicleDocument, 'id' | 'created_at'>>;

export type TaskInsert = Omit<Task, 'id' | 'created_at'>;
export type TaskUpdate = Partial<Omit<Task, 'id' | 'created_at'>>;

export type AttendanceInsert = Omit<Attendance, 'id' | 'created_at' | 'updated_at'>;
export type AttendanceUpdate = Partial<Omit<Attendance, 'id' | 'created_at'>>;

export type CheckSheetInsert = Omit<CheckSheet, 'id' | 'created_at' | 'updated_at'>;
export type CheckSheetUpdate = Partial<Omit<CheckSheet, 'id' | 'created_at'>>;

export type ChecksheetLogInsert = Omit<ChecksheetLog, 'id' | 'created_at'>;
export type ChecksheetLogUpdate = Partial<Omit<ChecksheetLog, 'id' | 'created_at'>>;

export type NotificationInsert = Omit<Notification, 'id' | 'created_at'>;
export type NotificationUpdate = Partial<Omit<Notification, 'id' | 'created_at'>>;

export type ActivityLogInsert = Omit<ActivityLog, 'id' | 'created_at'>;
export type ActivityLogUpdate = Partial<Omit<ActivityLog, 'id' | 'created_at'>>;

export type PositionInsert = Omit<Position, 'id' | 'created_at' | 'updated_at'>;
export type PositionUpdate = Partial<Omit<Position, 'id' | 'created_at'>>;

export type LocationInsert = Omit<Location, 'id' | 'created_at' | 'updated_at'>;
export type LocationUpdate = Partial<Omit<Location, 'id' | 'created_at'>>;

export type MoveLogInsert = Omit<MoveLog, 'id' | 'created_at'>;

export type SettingsInsert = Omit<Settings, 'id' | 'created_at' | 'updated_at'>;
export type SettingsUpdate = Partial<Omit<Settings, 'id' | 'created_at'>>;
