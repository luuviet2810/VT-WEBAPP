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

/** Slug ổn định từ label — dùng làm key lưu trong vehicles.options. */
function slugKey(label: string): string {
  const slug = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${slug || 'opt'}_${Date.now().toString(36)}`
}

// ====== WRITE — chỉ Admin Option Manager gọi (RLS migration 036) ======

export async function createOptionDef(
  groupKey: string,
  groupLabel: string,
  label: string,
  sortOrder: number
): Promise<void> {
  const { error } = await supabase.from('vehicle_option_defs').insert({
    group_key: groupKey,
    group_label: groupLabel,
    key: slugKey(label),
    label,
    sort_order: sortOrder,
  })
  if (error) throw error
}

export async function updateOptionDefLabel(id: string, label: string): Promise<void> {
  const { error } = await supabase.from('vehicle_option_defs').update({ label }).eq('id', id)
  if (error) throw error
}

export async function deleteOptionDef(id: string): Promise<void> {
  const { error } = await supabase.from('vehicle_option_defs').delete().eq('id', id)
  if (error) throw error
}
