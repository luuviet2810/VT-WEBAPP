import type { CheckSheet } from '../types'

export type BatteryStatus = 'normal' | 'needs_charge' | 'unchecked'

/**
 * SOH/SOC input battery classification.
 * Missing means unchecked; exactly 50 is healthy; only <50 needs charge.
 */
export function getInputBatteryStatus(sheet: Pick<CheckSheet, 'inputAcquySOH' | 'inputAcquySOC'> | null | undefined): BatteryStatus {
  const soh = sheet?.inputAcquySOH
  const soc = sheet?.inputAcquySOC
  if (typeof soh !== 'number' || !Number.isFinite(soh) || typeof soc !== 'number' || !Number.isFinite(soc)) {
    return 'unchecked'
  }
  return soh < 50 || soc < 50 ? 'needs_charge' : 'normal'
}

export function isInputBatteryNeedsCharge(sheet: Pick<CheckSheet, 'inputAcquySOH' | 'inputAcquySOC'> | null | undefined): boolean {
  return getInputBatteryStatus(sheet) === 'needs_charge'
}
