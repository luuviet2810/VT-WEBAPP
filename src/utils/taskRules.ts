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
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// ====== INTERIOR RULES ======

const ruleInteriorDirty: Rule = {
  id: 'in_interior_dirty',
  title: 'Vệ sinh nội thất',
  description: 'Nội thất xe bẩn cần được vệ sinh',
  priority: 'medium',
  evaluate(ctx: RuleContext) {
    const { interior } = ctx.sheet
    if (!interior) return false
    return (
      interior.driverSeat?.condition === 'dirty' ||
      interior.passengerSeat?.condition === 'dirty' ||
      interior.rearSeat?.condition === 'dirty'
    )
  },
}

const ruleInteriorTorn: Rule = {
  id: 'in_interior_torn',
  title: 'Bọc lại ghế',
  description: 'Ghế xe bị rách cần được bọc lại',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    const { interior } = ctx.sheet
    if (!interior) return false
    return (
      interior.driverSeat?.condition === 'torn' ||
      interior.passengerSeat?.condition === 'torn' ||
      interior.rearSeat?.condition === 'torn'
    )
  },
}

// ====== ĐIỀU HÒA RULES ======

const ruleDieuHoaNeedGas: Rule = {
  id: 'in_dieuhoa_need_gas',
  title: 'Đổ ga điều hòa',
  description: 'Điều hòa hết gas cần được nạp ga',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.inputDieuHoa?.status === 'need_gas'
  },
}

const ruleDieuHoaBroken: Rule = {
  id: 'in_dieuhoa_broken',
  title: 'Kiểm tra điều hòa',
  description: 'Điều hòa không hoạt động bình thường',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.inputDieuHoa?.status !== 'good'
  },
}

// ====== SƯỞI GHẾ RULES ======

const ruleSuoiGheBroken: Rule = {
  id: 'in_suoi_ghe_broken',
  title: 'Sửa nút sưởi ghế',
  description: 'Nút sưởi ghế bị hỏng cần được sửa',
  priority: 'medium',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.inputSuoiGhe?.status === 'broken'
  },
}

// ====== CAMERA RULES ======

const ruleRearCameraBroken: Rule = {
  id: 'in_rear_camera_broken',
  title: 'Kiểm tra camera',
  description: 'Camera lùi bị hỏng cần được kiểm tra/sửa',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.rearCamera === 'broken'
  },
}

const ruleRearSensorBroken: Rule = {
  id: 'in_rear_sensor_broken',
  title: 'Sửa cảm biến lùi',
  description: 'Cảm biến lùi bị hỏng cần được sửa',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.rearSensor === 'broken'
  },
}

const ruleRearSensorNone: Rule = {
  id: 'in_rear_sensor_none',
  title: 'Lắp cảm biến lùi',
  description: 'Xe chưa có cảm biến lùi cần được lắp đặt',
  priority: 'medium',
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
  priority: 'medium',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.dashcam === 'none'
  },
}

// ====== HIPASS RULES ======

const ruleHipassNone: Rule = {
  id: 'in_hipass_none',
  title: 'Kiểm tra Hipass',
  description: 'Xe chưa có Hipass cần được kiểm tra/lắp đặt',
  priority: 'medium',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.hipass === 'none'
  },
}

// ====== BATTERY RULES ======

const ruleAcquySOCLow: Rule = {
  id: 'in_battery_soc_low',
  title: 'Sạc pin',
  description: 'SOC acquy đầu vào dưới 20%, cần sạc pin',
  priority: 'high',
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
  priority: 'high',
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
  priority: 'high',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.screen === 'broken'
  },
}

// ====== FUEL RULES ======

const ruleFuelEmpty: Rule = {
  id: 'in_fuel_empty',
  title: 'Đổ nhiên liệu',
  description: 'Mức nhiên liệu thấp cần được đổ thêm',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'in') return false
    return ctx.sheet.fuelLevel === 'empty'
  },
}

// ====== ĐẦU RA RULES ======

const ruleOutDauMayEmpty: Rule = {
  id: 'out_dau_may_empty',
  title: 'Bổ sung dầu máy',
  description: 'Dầu máy hết cần được bổ sung',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outCheck?.dauMay?.status === 'empty'
  },
}

const ruleOutNuocLamMatEmpty: Rule = {
  id: 'out_nuoc_lam_mat_empty',
  title: 'Bổ sung nước làm mát',
  description: 'Nước làm mát hết cần được bổ sung',
  priority: 'medium',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outCheck?.nuocLamMat?.status === 'empty'
  },
}

const ruleOutDieuHoaNeedGas: Rule = {
  id: 'out_dieuhoa_need_gas',
  title: 'Đổ ga điều hòa',
  description: 'Điều hòa đầu ra hết gas cần được nạp ga',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outCheck?.dieuHoa?.status === 'need_gas'
  },
}

const ruleOutSuoiGheBroken: Rule = {
  id: 'out_suoi_ghe_broken',
  title: 'Sửa nút sưởi ghế',
  description: 'Nút sưởi ghế đầu ra bị hỏng cần được sửa',
  priority: 'medium',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outCheck?.suoiGhe?.status === 'broken'
  },
}

const ruleOutConSeongnyeongCanRepair: Rule = {
  id: 'out_con_seongnyeong_can_repair',
  title: 'Song nưng xe',
  description: 'Cần sửa song nưng xe',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    return ctx.sheet.outCheck?.conSeongnyeong?.status === 'can_repair'
  },
}

const ruleOutTireBad: Rule = {
  id: 'out_tire_bad',
  title: 'Kiểm tra lốp',
  description: 'Lốp xe đầu ra mòn hoặc hỏng cần được kiểm tra',
  priority: 'high',
  evaluate(ctx: RuleContext) {
    if (ctx.sheet.type !== 'out') return false
    const tire = ctx.sheet.outCheck?.tinhTrangLop
    return tire?.status === 'none' || tire?.status === 'error'
  },
}

// ====== OUT CHECK GENERIC ITEMS ======

function buildOutCheckGenericRules(): Rule[] {
  const items: { key: keyof NonNullable<CheckSheet['outCheck']>; label: string; priority: TaskPriority }[] = [
    { key: 'camHanhTrinh', label: 'Kiểm tra camera hành trình', priority: 'high' },
    { key: 'manHinhBluetooth', label: 'Kiểm tra màn hình & Bluetooth', priority: 'high' },
    { key: 'cameraLui', label: 'Kiểm tra camera lùi', priority: 'high' },
    { key: 'denPhaCot', label: 'Kiểm tra đèn pha cốt', priority: 'high' },
    { key: 'motorGuongNutBam', label: 'Kiểm tra motor gương & nút bấm', priority: 'medium' },
    { key: 'cuaSo', label: 'Kiểm tra cửa sổ', priority: 'medium' },
    { key: 'gheChinhDien', label: 'Kiểm tra ghế chỉnh điện', priority: 'medium' },
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
  ruleDieuHoaBroken,
  ruleSuoiGheBroken,
  ruleRearCameraBroken,
  ruleRearSensorBroken,
  ruleRearSensorNone,
  ruleDashcamMaybe,
  ruleDashcamNone,
  ruleHipassNone,
  ruleAcquySOCLow,
  ruleTireBad,
  ruleScreenBroken,
  ruleFuelEmpty,
  // Đầu ra
  ruleOutDauMayEmpty,
  ruleOutNuocLamMatEmpty,
  ruleOutDieuHoaNeedGas,
  ruleOutSuoiGheBroken,
  ruleOutConSeongnyeongCanRepair,
  ruleOutTireBad,
  // Đầu ra generic
  ...OUT_CHECK_GENERIC_RULES,
]

// ====== MAIN EXPORT ======

export function generateTasks(sheet: CheckSheet, vehiclePlate: string): GeneratedTask[] {
  console.log('🔵 [taskRules] GENERATE TASKS — sheet:', sheet.id, 'type:', sheet.type, 'vehicle:', vehiclePlate)
  const ctx: RuleContext = { sheet, vehiclePlate }

  const triggered = ALL_RULES.filter((rule) => {
    const result = rule.evaluate(ctx)
    if (result) {
      console.log(`  🟡 Rule triggered: [${rule.id}] "${rule.title}"`)
    }
    return result
  })

  console.log(`  🟢 [taskRules] Total rules triggered: ${triggered.length}`)

  return triggered.map((rule) => ({
    id: uid('task'),
    title: rule.title,
    description: rule.description,
    priority: rule.priority,
    status: 'todo' as TaskStatus,
    vehicleId: sheet.vehicleId,
    checklist: [],
    ruleId: rule.id,
    createdAt: new Date().toISOString(),
  }))
}
