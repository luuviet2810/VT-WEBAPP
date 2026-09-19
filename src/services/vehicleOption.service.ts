import { supabase } from '../lib/supabase'
import type { VehicleOptionDef } from '../types'

/**
 * Vehicle option catalog ("Option xe").
 *
 * The master list lives in table vehicle_option_defs so neither the Admin
 * UI nor the future Public Web hard-codes labels. Per-vehicle selections
 * are stored as a JSONB array of `key` strings in vehicles.options.
 */
export async function getVehicleOptionDefs(): Promise<VehicleOptionDef[]> {
  const { data, error } = await supabase
    .from('vehicle_option_defs')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    groupKey: r.group_key as string,
    groupLabel: r.group_label as string,
    key: r.key as string,
    label: r.label as string,
    sortOrder: r.sort_order as number,
  }))
}
