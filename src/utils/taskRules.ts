/**
 * Task Generation Rules Engine
 *
 * Given a CheckSheet, evaluates all rules and returns GeneratedTask[].
 * Each rule checks a specific condition on the checksheet and returns
 * a task to create if the condition is met.
 */

import type { CheckSheet } from '../types'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'doing' | 'done'

export interface GeneratedTask {
  id: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  vehicleId: string
  checklist: { id: string; text: string; done: boolean }[]
  ruleId: string
  source: 'rule_engine'
  createdAt: string
}

export interface RuleContext {
  sheet: CheckSheet
  vehiclePlate: string
}

export interface Rule {
  id: string
  title: string
  description: string
  priority: TaskPriority
  evaluate(ctx: RuleContext): boolean
  /** Dynamic title override — e.g. "Bọc lại 3 ghế" instead of static "Bọc lại ghế" */
  generateTitle?(ctx: RuleContext): string
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// ====== INTERIOR RULES ======

function countDirtySeats(ctx: RuleContext): number {
  const { interior } = ctx.sheet
  if (!interior) return 0
  return [interior.driverSeat?.condition, interior.passengerSeat?.condition, interior.rearSeat?.condition]
    .filter((c) => c === 'dirty').length
}

function countTornSeats(ctx: RuleContext): number {
  const { interior } = ctx.sheet
  if (!interior) return 0
  return [interior.driverSeat?.condition, interior.passengerSeat?.condition, interior.rearSeat?.condition]
    .filter((c) => c === 'torn').length
}

const ruleInteriorDirty: Rule = {
  id: 'in_interior_dirty',
  title: 'Vệ sinh nội thất',
  description: 'Nội thất xe bẩn cần được vệ sinh',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    return countDirtySeats(ctx) > 0
  },
}

const ruleInteriorTorn: Rule = {
  id: 'in_interior_torn',
  title: 'Bọc lại ghế',
  description: 'Ghế xe bị rách cần được bọc lại',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    return countTornSeats(ctx) > 0
  },
  generateTitle(ctx: RuleContext) {
    const n = countTornSeats(ctx)
    return n > 1 ? `Bọc lại ${n} ghế` : 'Bọc lại ghế'
  },
}

// ====== ĐIỀU HÒA RULES ======

const ruleDieuHoaNeedGas: Rule = {
  id: 'in_dieuhoa_need_gas',
  title: 'Đổ ga điều hòa',
  description: 'Điều hòa hết gas cần được nạp ga',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.inputDieuHoa?.status === 'need_gas'
  },
}

// ====== SƯỞI GHẾ RULES ======

const ruleSuoiGheBroken: Rule = {
  id: 'in_suoi_ghe_broken',
  title: 'Sửa nút sưởi ghế',
  description: 'Nút sưởi ghế bị hỏng cần được sửa',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.inputSuoiGhe?.status === 'broken'
  },
}

// ====== CAMERA RULES ======

const ruleRearCameraBroken: Rule = {
  id: 'in_rear_camera_broken',
  title: 'Kiểm tra camera lùi',
  description: 'Camera lùi bị hỏng cần được kiểm tra/sửa',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.rearCamera === 'broken'
  },
}

const ruleRearSensorBroken: Rule = {
  id: 'in_rear_sensor_broken',
  title: 'Sửa cảm biến lùi',
  description: 'Cảm biến lùi bị hỏng cần được sửa',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.rearSensor === 'broken'
  },
}

const ruleRearSensorNone: Rule = {
  id: 'in_rear_sensor_none',
  title: 'Lắp cảm biến lùi',
  description: 'Xe chưa có cảm biến lùi cần được lắp đặt',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.rearSensor === 'none'
  },
}

// ====== DASHCAM RULES ======

const ruleDashcamMaybe: Rule = {
  id: 'in_dashcam_maybe',
  title: 'Lắp thẻ nhớ camera hành trình',
  description: 'Camera hành trình cần thẻ nhớ để hoạt động',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.dashcam === 'maybe'
  },
}

const ruleDashcamNone: Rule = {
  id: 'in_dashcam_none',
  title: 'Lắp camera hành trình',
  description: 'Xe chưa có camera hành trình cần được lắp đặt',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.dashcam === 'none'
  },
}

// ====== BATTERY RULES ======

const ruleAcquySOCLow: Rule = {
  id: 'in_battery_soc_low',
  title: 'Sạc pin',
  description: 'SOC acquy đầu vào dưới 20%, cần sạc pin',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return (ctx.sheet.inputAcquySOC ?? 100) < 20
  },
}

// ====== TIRE RULES ======

const ruleTireBad: Rule = {
  id: 'in_tire_bad',
  title: 'Kiểm tra lốp',
  description: 'Lốp xe mòn hoặc hỏng cần được kiểm tra',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.inputTireState?.status === 'none'
  },
}

// ====== SCREEN RULES ======

const ruleScreenBroken: Rule = {
  id: 'in_screen_broken',
  title: 'Sửa màn hình',
  description: 'Màn hình xe bị hỏng cần được sửa',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.screen === 'broken'
  },
}

// ====== EXTERIOR PAINT RULES ======

function countPaintIssues(ctx: RuleContext): number {
  const { exterior } = ctx.sheet
  if (!exterior) return 0
  return Object.values(exterior).filter((v) => v?.condition === 'dent' || v?.condition === 'discolor').length
}

const rulePaintNeeded: Rule = {
  id: 'in_paint_needed',
  title: 'Cần sơn',
  description: 'Ngoại thất có vết móp hoặc đổi màu cần sơn lại',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return countPaintIssues(ctx) > 0
  },
  generateTitle(ctx: RuleContext) {
    const n = countPaintIssues(ctx)
    return n > 1 ? `Cần sơn ${n} tấm` : 'Cần sơn'
  },
}

// ====== FUEL RULES ======

const ruleFuelEmpty: Rule = {
  id: 'in_fuel_empty',
  title: 'Đổ nhiên liệu',
  description: 'Mức nhiên liệu thấp cần được đổ thêm',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.fuelLevel === 'empty'
  },
}

// ====== SONG NƯNG RULES ======

const ruleSongNungNeeded: Rule = {
  id: 'song_nung_needed',
  title: 'Đi song nưng ngay',
  description: 'Song nưng chưa có kết quả, cần đi kiểm định',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    return ctx.sheet.songNungResultStatus === 'none'
  },
}

const ruleSongNungDraft: Rule = {
  id: 'song_nung_draft',
  title: 'Cần in Song nưng Final',
  description: 'Đã có bản nháp song nưng, cần in bản chính',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    return ctx.sheet.songNungResultStatus === 'draft'
  },
}

// ====== KEY STATUS RULES ======

const ruleSmartkeyDamaged: Rule = {
  id: 'in_smartkey_damaged',
  title: 'Kiểm tra chìa khóa hỏng',
  description: 'Chìa khóa thông minh bị hỏng cần được kiểm tra và thay thế',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.smartkeyStatus === 'damaged'
  },
}

const ruleOutSmartkeyDamaged: Rule = {
  id: 'out_smartkey_damaged',
  title: 'Kiểm tra chìa khóa hỏng',
  description: 'Chìa khóa đầu ra bị hỏng cần được kiểm tra và thay thế',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outSmartkeyStatus === 'damaged'
  },
}

// ====== ĐẦU RA RULES ======

const ruleOutDauMayEmpty: Rule = {
  id: 'out_dau_may_empty',
  title: 'Bổ sung dầu máy',
  description: 'Dầu máy hết cần được bổ sung',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outCheck?.dauMay?.status === 'empty'
  },
}

const ruleOutNuocLamMatEmpty: Rule = {
  id: 'out_nuoc_lam_mat_empty',
  title: 'Bổ sung nước làm mát',
  description: 'Nước làm mát hết cần được bổ sung',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outCheck?.nuocLamMat?.status === 'empty'
  },
}

const ruleOutDieuHoaNeedGas: Rule = {
  id: 'out_dieuhoa_need_gas',
  title: 'Đổ ga điều hòa',
  description: 'Điều hòa đầu ra hết gas cần được nạp ga',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outCheck?.dieuHoa?.status === 'need_gas'
  },
}

const ruleOutSuoiGheBroken: Rule = {
  id: 'out_suoi_ghe_broken',
  title: 'Sửa nút sưởi ghế',
  description: 'Nút sưởi ghế đầu ra bị hỏng cần được sửa',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outCheck?.suoiGhe?.status === 'broken'
  },
}

const ruleOutConSeongnyeongCanRepair: Rule = {
  id: 'out_con_seongnyeong_can_repair',
  title: 'Song nưng xe',
  description: 'Cần sửa song nưng xe',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outCheck?.conSeongnyeong?.status === 'can_repair'
  },
}

const ruleOutTireBad: Rule = {
  id: 'out_tire_bad',
  title: 'Kiểm tra lốp',
  description: 'Lốp xe đầu ra mòn hoặc hỏng cần được kiểm tra',
  priority: 'low',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    const tire = ctx.sheet.outCheck?.tinhTrangLop
    return tire?.status === 'none' || tire?.status === 'error'
  },
}

// ====== OUT CHECK GENERIC ITEMS ======

function buildOutCheckGenericRules(): Rule[] {
  const items: { key: keyof NonNullable<CheckSheet['outCheck']>; label: string; priority: TaskPriority }[] = [
    { key: 'camHanhTrinh', label: 'Kiểm tra camera hành trình', priority: 'low' },
    { key: 'manHinhBluetooth', label: 'Kiểm tra màn hình & Bluetooth', priority: 'low' },
    { key: 'cameraLui', label: 'Kiểm tra camera lùi', priority: 'low' },
    { key: 'denPhaCot', label: 'Kiểm tra đèn pha cốt', priority: 'low' },
    { key: 'motorGuongNutBam', label: 'Kiểm tra motor gương & nút bấm', priority: 'low' },
    { key: 'cuaSo', label: 'Kiểm tra cửa sổ', priority: 'low' },
    { key: 'gheChinhDien', label: 'Kiểm tra ghế chỉnh điện', priority: 'low' },
  ]

  return items.map(({ key, label, priority }) => ({
    id: `out_check_${key}`,
    title: label,
    description: `${label} — phát hiện lỗi khi kiểm tra đầu ra`,
    priority,
    evaluate(ctx: RuleContext) {
      if (ctx.sheet.type !== 'out') return false
      return ctx.sheet.outCheck?.[key]?.status === 'error'
    },
  }))
}

const OUT_CHECK_GENERIC_RULES = buildOutCheckGenericRules()

// ====== ALL RULES REGISTRY ======

const ALL_RULES: Rule[] = [
  // Đầu vào
  ruleInteriorDirty,
  ruleInteriorTorn,
  ruleDieuHoaNeedGas,
  ruleSuoiGheBroken,
  ruleRearCameraBroken,
  ruleRearSensorBroken,
  ruleRearSensorNone,
  ruleDashcamMaybe,
  ruleDashcamNone,
  ruleAcquySOCLow,
  ruleTireBad,
  ruleScreenBroken,
  rulePaintNeeded,
  ruleFuelEmpty,
  // Song nưng
  ruleSongNungNeeded,
  ruleSongNungDraft,
  // Chìa khóa
  ruleSmartkeyDamaged,
  // Đầu ra
  ruleOutDauMayEmpty,
  ruleOutNuocLamMatEmpty,
  ruleOutDieuHoaNeedGas,
  ruleOutSuoiGheBroken,
  ruleOutConSeongnyeongCanRepair,
  ruleOutTireBad,
  ruleOutSmartkeyDamaged,
  // Đầu ra generic
  ...OUT_CHECK_GENERIC_RULES,
]

// ====== MAIN EXPORT ======

export function generateTasks(sheet: CheckSheet, vehiclePlate: string): GeneratedTask[] {
  const ctx: RuleContext = { sheet, vehiclePlate }

  const triggered = ALL_RULES.filter((rule) => {
    const result = rule.evaluate(ctx)
    if (result) {
    }
    return result
  })

  const result = triggered.map((rule) => ({
    id: uid('task'),
    title: rule.generateTitle ? rule.generateTitle(ctx) : rule.title,
    description: rule.description,
    priority: rule.priority,
    status: 'todo' as TaskStatus,
    vehicleId: sheet.vehicleId,
    checklist: [],
    ruleId: rule.id,
    source: 'rule_engine' as const,
    createdAt: new Date().toISOString(),
  }))

  return result
}
