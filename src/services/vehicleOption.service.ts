import { apiGet, apiPost, apiPut, apiDelete } from './api.client'
import type { VehicleOptionDef } from '../types'

/**
 * Vehicle option catalog ("Option xe").
 *
 * Master list nằm trong bảng vehicle_option_defs qua Express API + Neon PostgreSQL.
 */
export async function getVehicleOptionDefs(): Promise<VehicleOptionDef[]> {
  const data = await apiGet<any[]>('/api/vehicle-options')
  return (data ?? []).map((r) => ({
    id: r.id as string,
    groupKey: (r.groupKey || r.group_key) as string,
    groupLabel: (r.groupLabel || r.group_label) as string,
    key: r.key as string,
    label: r.label as string,
    sortOrder: Number(r.sortOrder ?? r.sort_order ?? 0),
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

// ====== WRITE — chỉ Admin Option Manager gọi ======

export async function createOptionDef(
  groupKey: string,
  groupLabel: string,
  label: string,
  sortOrder: number
): Promise<void> {
  await apiPost('/api/vehicle-options', {
    groupKey,
    groupLabel,
    key: slugKey(label),
    label,
    sortOrder,
  })
}

export async function updateOptionDefLabel(id: string, label: string): Promise<void> {
  await apiPut(`/api/vehicle-options/${id}`, { label })
}

export async function deleteOptionDef(id: string): Promise<void> {
  await apiDelete(`/api/vehicle-options/${id}`)
}
