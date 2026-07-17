/**
 * Rule-to-CheckSheet field mapping for Auto-sync.
 *
 * When an Auto task (generated from a CheckSheet rule) is moved to Done,
 * the corresponding CheckSheet field is automatically updated to reflect
 * the completed repair — no confirmation dialog, no manual step.
 *
 * Only rules with a meaningful CheckSheet field to update are mapped here.
 * Rules like interior cleaning or paint touch-up have no single field to flip,
 * so they return null (no auto-sync).
 */
import type { CheckSheet, CheckOutCheck, CheckOutItem } from '../types'

type SheetMapper = (sheet: CheckSheet) => Partial<CheckSheet> | null

function patchOutCheck(sheet: CheckSheet, patch: Partial<CheckOutCheck>): Partial<CheckSheet> {
  return {
    outCheck: { ...sheet.outCheck, ...patch } as CheckOutCheck,
  }
}

const RULE_FIELD_MAP: Record<string, SheetMapper> = {
  // ===== INPUT RULES =====
  in_interior_dirty: () => null,
  in_interior_torn: () => null,
  in_dieuhoa_need_gas: () => ({ inputDieuHoa: { status: 'good' } }),
  in_suoi_ghe_broken: () => ({ inputSuoiGhe: { status: 'good' } }),
  in_rear_camera_broken: () => ({ rearCamera: 'ok' }),
  in_rear_sensor_broken: () => ({ rearSensor: 'ok' }),
  in_rear_sensor_none: () => ({ rearSensor: 'ok' }),
  in_dashcam_maybe: () => ({ dashcam: 'good' }),
  in_dashcam_none: () => ({ dashcam: 'good' }),
  in_battery_soc_low: () => null,
  in_tire_bad: () => ({ inputTireState: { status: 'ok' } as CheckOutItem }),
  in_screen_broken: () => ({ screen: 'normal' }),
  in_paint_needed: () => null,
  in_fuel_empty: () => ({ fuelLevel: 'full' }),

  // ===== SONG NƯNG RULES =====
  song_nung_needed: () => ({ songNungResultStatus: 'draft' }),
  song_nung_draft: () => ({ songNungResultStatus: 'printed' }),

  // ===== KEY STATUS RULES =====
  in_smartkey_damaged: () => ({ smartkeyStatus: 'two' }),
  out_smartkey_damaged: () => ({ outSmartkeyStatus: 'two' }),

  // ===== OUTPUT RULES =====
  out_dau_may_empty: (s) => patchOutCheck(s, { dauMay: { status: 'good' } }),
  out_nuoc_lam_mat_empty: (s) => patchOutCheck(s, { nuocLamMat: { status: 'good' } }),
  out_dieuhoa_need_gas: (s) => patchOutCheck(s, { dieuHoa: { status: 'good' } }),
  out_suoi_ghe_broken: (s) => patchOutCheck(s, { suoiGhe: { status: 'good' } }),
  out_con_seongnyeong_can_repair: (s) => patchOutCheck(s, { conSeongnyeong: { status: 'con' } }),
  out_tire_bad: (s) => patchOutCheck(s, { tinhTrangLop: { status: 'ok' } as CheckOutItem }),

  // ===== GENERIC OUTPUT RULES =====
  out_check_camHanhTrinh: (s) => patchOutCheck(s, { camHanhTrinh: { status: 'ok' } }),
  out_check_manHinhBluetooth: (s) => patchOutCheck(s, { manHinhBluetooth: { status: 'ok' } }),
  out_check_cameraLui: (s) => patchOutCheck(s, { cameraLui: { status: 'ok' } }),
  out_check_denPhaCot: (s) => patchOutCheck(s, { denPhaCot: { status: 'ok' } }),
  out_check_motorGuongNutBam: (s) => patchOutCheck(s, { motorGuongNutBam: { status: 'ok' } }),
  out_check_cuaSo: (s) => patchOutCheck(s, { cuaSo: { status: 'ok' } }),
  out_check_gheChinhDien: (s) => patchOutCheck(s, { gheChinhDien: { status: 'ok' } }),
}

/**
 * Given a ruleId and the current CheckSheet, return the partial patch
 * to apply when the task is completed. Returns null when no check sheet
 * field corresponds to this rule (e.g. interior cleaning, paint).
 */
export function getAutoSyncPatch(ruleId: string, sheet: CheckSheet): Partial<CheckSheet> | null {
  const mapper = RULE_FIELD_MAP[ruleId]
  if (!mapper) return null
  return mapper(sheet)
}
