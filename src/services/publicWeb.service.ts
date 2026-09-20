/**
 * Public Web management (ADMIN side) — Phase 2.
 *
 * Read + mutation helpers cho màn hình /pre-web:
 *   * đọc ảnh nhóm 'website' gộp theo xe (1 query)
 *   * đổi ảnh đại diện website = xếp lại sort_order trong nhóm
 *     (tái sử dụng vehicleMediaService — không tạo hệ thống mới)
 *
 * Mutation GIỚI HẠN ở: vehicle_images.sort_order.
 * (is_public / public_sort_order đi qua store.updateVehicle như mọi nơi khác.)
 * Không xoá ảnh, không đụng category khác, không đụng dữ liệu xe.
 */
import { supabase } from '../lib/supabase'
import * as vehicleMediaService from './vehicleMedia.service'
import type { VehicleImageRow } from './vehicleMedia.service'

type Row = Record<string, unknown>

function mapImageRow(r: Row): VehicleImageRow {
  return {
    id: r.id as string,
    vehicle_id: r.vehicle_id as string,
    path: r.path as string,
    bucket: r.bucket as string,
    url: r.url as string,
    thumbnail: (r.thumbnail as string) ?? null,
    category: (r.category as string) ?? undefined,
    subtype: (r.subtype as string) ?? null,
    resolved: (r.resolved as boolean) ?? undefined,
    song_nung_expiry_date: (r.song_nung_expiry_date as string) ?? null,
    size_bytes: (r.size_bytes as number) ?? null,
    mime_type: (r.mime_type as string) ?? null,
    sort_order: (r.sort_order as number) ?? 0,
    created_at: (r.created_at as string) ?? '',
  }
}

/** Toàn bộ ảnh category 'website' của MỌI xe, gộp theo vehicle_id,
 *  đã sắp theo sort_order — dùng render ảnh đại diện trong /pre-web. */
export async function getWebsiteImagesGrouped(): Promise<Record<string, VehicleImageRow[]>> {
  const { data, error } = await supabase
    .from('vehicle_images')
    .select('*')
    .eq('category', 'website')
    .order('sort_order', { ascending: true })
  if (error) throw error

  const map: Record<string, VehicleImageRow[]> = {}
  for (const r of (data ?? []) as Row[]) {
    const row = mapImageRow(r)
    if (!map[row.vehicle_id]) map[row.vehicle_id] = []
    map[row.vehicle_id].push(row)
  }
  return map
}

/**
 * Đặt ảnh đại diện website: ảnh được chọn nhận sort_order thấp nhất,
 * các ảnh còn lại giữ nguyên thứ tự tương đối. GIỮ toàn bộ ảnh,
 * không delete, không đổi category.
 */
export async function setWebsiteCover(vehicleId: string, imageId: string): Promise<void> {
  const rows = await vehicleMediaService.getVehicleImages(vehicleId)
  const website = rows
    .filter((r) => r.category === 'website')
    .sort((a, b) => a.sort_order - b.sort_order)
  const selected = website.find((r) => r.id === imageId)
  if (!selected) return

  const ordered = [selected, ...website.filter((r) => r.id !== imageId)]
  await Promise.all(
    ordered.map((r, i) => vehicleMediaService.updateVehicleImageOrder(r.id, i))
  )
}
