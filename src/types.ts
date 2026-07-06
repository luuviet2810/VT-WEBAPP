export type VehicleStatus = 'available' | 'deposited' | 'sold'

export interface Vehicle {
  id: string
  plate: string // 4 số cuối biển số
  model: string // Dòng xe
  year?: number
  fuelType?: 'gasoline' | 'diesel' | 'lpg' | 'hybrid'
  displacement?: string
  mileage?: string
  color?: string
  costPrice?: number
  sellPrice?: number
  status: VehicleStatus
  positionId?: string | null
  assigneeId?: string | null
  note?: string
  images: string[]
  documents: string[]
  createdAt: string
  updatedAt: string
}

export interface Position {
  id: string
  name: string
  order: number
}

export interface MoveLog {
  id: string
  vehicleId: string
  fromPositionId: string | null
  toPositionId: string
  employeeId: string | null
  createdAt: string
}

export type TimelineItemType =
  | 'vehicle_created'
  | 'check_sheet_created'
  | 'task_generated'
  | 'task_status_changed'
  | 'move_log'
  | 'vehicle_status_changed'
  | 'custom'

export interface TimelineItem {
  id: string
  time: string
  type: TimelineItemType
  title: string
  description: string
  user?: string
  userId?: string | null
  vehicleId?: string
  checkSheetId?: string
  taskId?: string
  moveLogId?: string
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'doing' | 'done'

export interface TaskChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface TaskActivityLogEntry {
  id: string
  taskId: string
  action: string
  employeeId: string | null
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  checklist: TaskChecklistItem[]
  priority: TaskPriority
  status: TaskStatus
  assigneeId?: string | null
  vehicleId?: string | null
  dueDate?: string | null
  dueTime?: string | null
  createdAt: string
}

export interface Employee {
  id: string
  name: string
  phone?: string
  isAdmin: boolean
  disabled: boolean
}

export interface AttendanceEntry {
  id: string
  employeeId: string
  date: string
  checkIn?: string | null
  checkOut?: string | null
  note?: string
}

export interface Settings {
  workStartHour: string
  workEndHour: string
  workHoursPerDay: number
  gpsRadiusMeters: number
  overtimeMultiplier: number
  nightOvertimeMultiplier: number
  latePenalty30Min: boolean
  companyName: string
  companyPhone: string
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
}

export type FuelLevel = 'empty' | 'quarter' | 'half' | 'full'

export type ScreenState = 'normal' | 'android' | 'broken'
export type CameraState = 'ok' | 'blurry' | 'broken'
export type HipassState = 'mirror' | 'device' | 'none'
export type SensorState = 'ok' | 'broken' | 'none'
export type DashcamState = 'good' | 'maybe' | 'none'
export type FuelType = 'gasoline' | 'diesel' | 'lpg' | 'hybrid'

export type InteriorCondition = 'good' | 'dirty' | 'torn'
export type ExteriorCondition = 'good' | 'scratch' | 'dent' | 'discolor' | 'needpaint'

export interface ConditionEntry<T extends string> {
  condition: T
  note?: string
}

export interface InteriorCheck {
  driverSeat: ConditionEntry<InteriorCondition>
  passengerSeat: ConditionEntry<InteriorCondition>
  rearSeat: ConditionEntry<InteriorCondition>
}

export const EXTERIOR_SPOTS = [
  ['frontBumper', 'Cản trước'],
  ['rearBumper', 'Cản sau'],
  ['leftFender', 'Càng A trái'],
  ['rightFender', 'Càng A phải'],
  ['driverDoor', 'Cửa lái'],
  ['passengerDoor', 'Cửa phụ'],
  ['rearLeftDoor', 'Cửa sau trái'],
  ['rearRightDoor', 'Cửa sau phải'],
] as const

export type ExteriorSpotKey = (typeof EXTERIOR_SPOTS)[number][0]

export type ExteriorCheck = Record<ExteriorSpotKey, ConditionEntry<ExteriorCondition>>

// Check out items - 12 items from the paper form
export type CheckOutStatus = 'ok' | 'error' | 'none'

export interface CheckOutItem {
  status: CheckOutStatus
  detail?: string
}

// Còn Song nưng: con | can_repair
export type ConSeongnyeongStatus = 'con' | 'can_repair'

// Dầu máy: replacing | good | empty
export type DauMayStatus = 'replacing' | 'good' | 'empty'

// Nước làm mát: replacing | good | empty
export type NuocLamMatStatus = 'replacing' | 'good' | 'empty'

// Điều hòa: good | need_gas
export type DieuHoaStatus = 'good' | 'need_gas'

// Sưởi ghế: good | broken | none
export type SuoiGheStatus = 'good' | 'broken' | 'none'

export interface ConSeongnyeongItem {
  status: ConSeongnyeongStatus
}

export interface DauMayItem {
  status: DauMayStatus
}

export interface NuocLamMatItem {
  status: NuocLamMatStatus
}

export interface DieuHoaItem {
  status: DieuHoaStatus
}

export interface SuoiGheItem {
  status: SuoiGheStatus
}

export type TireCondition = 'good' | 'worn' | 'badd' // Còn ngon | Hơi mòn | Mòn lắm

export interface CheckOutCheck {
  conSeongnyeong: ConSeongnyeongItem        // Còn Song nưng không?
  dauMay: DauMayItem                       // Dầu máy
  nuocLamMat: NuocLamMatItem               // Nước làm mát
  camHanhTrinh: CheckOutItem               // Cam hành trình
  manHinhBluetooth: CheckOutItem          // Màn hình, Bluetooth
  cameraLui: CheckOutItem                  // Camera lùi
  denPhaCot: CheckOutItem                  // Đèn (Pha, Cốt, Cảnh báo, Phanh)
  motorGuongNutBam: CheckOutItem           // Motor Gương, Nút bấm (Cụp mở, chỉnh điện)
  dieuHoa: DieuHoaItem                      // Điều hòa
  suoiGhe: SuoiGheItem                     // Sưởi ghế
  cuaSo: CheckOutItem                      // Cửa sổ (Tất cả các cửa)
  gheChinhDien: CheckOutItem               // Ghế chỉnh điện
  tinhTrangLop: CheckOutItem               // Tình trạng lốp
}

export interface CheckSheet {
  id: string
  vehicleId: string
  type: 'in' | 'out'
  checkerId?: string | null
  checkDate: string
  fuelLevel: FuelLevel
  screen: ScreenState
  rearCamera: CameraState
  hipass: HipassState
  rearSensor: SensorState
  dashcam: DashcamState
  interior: InteriorCheck
  exterior: ExteriorCheck
  exteriorPhotos?: Partial<Record<ExteriorSpotKey, string[]>>
  // Đầu vào - các field riêng cho input
  inputDieuHoa?: DieuHoaItem
  inputSuoiGhe?: SuoiGheItem
  inputTireState?: CheckOutItem
  // Đầu ra - kiểm tra theo checklist 12 hạng mục
  outCheck?: CheckOutCheck
  outNotes?: string
  // Ghi chú đầu vào
  inputNotes?: string
  createdAt: string
}

// ====== AUTH TYPES ======

export type UserRole = 'admin' | 'staff'
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'disabled'

export interface User {
  id: string
  fullName: string
  email: string
  passwordHash: string
  role: UserRole
  status: UserStatus
  passkeyEnabled: boolean
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface Passkey {
  id: string
  userId: string
  credentialId: string
  publicKey: string
  counter: number
  deviceName: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Legacy Employee type - kept for backwards compatibility
export interface Employee {
  id: string
  name: string
  phone?: string
  isAdmin: boolean
  disabled: boolean
}

// Notification types
export type NotificationType =
  | 'task_created'
  | 'task_done'
  | 'vehicle_added'
  | 'vehicle_status'
  | 'attendance_edited'
  | 'system'
  | 'user_registered'   // New user registered - for admin
  | 'user_approved'     // User account approved
  | 'user_rejected'     // User account rejected
