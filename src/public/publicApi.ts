/**
 * Public Web data layer — READ-ONLY.
 *
 * Chỉ đọc qua 2 view an toàn (migration 032):
 *   public_vehicles       — is_public = true AND status <> 'sold',
 *                           chỉ chứa cột an toàn cho khách (không cost_price,
 *                           không note, không position/assignee...).
 *   public_vehicle_images — chỉ ảnh category 'website' của xe public, chưa bán.
 * Và bảng vehicle_option_defs (RLS select cho mọi role) để lấy label option —
 * không hard-code option trong Public Web.
 *
 * KHÔNG có bất kỳ lệnh ghi (insert/update/delete) nào trong file này.
 */
import { supabase } from '../lib/supabase'

export interface PublicVehicle {
  id: string
  model: string
  brand?: string | null
  year?: number | null
  fuelType?: string | null
  mileage?: string | null
  color?: string | null
  sellPrice?: number | null
  options?: string[] | null
  updatedAt: string
}

export interface PublicVehicleImage {
  id: string
  vehicleId: string
  url: string
  thumbnail?: string | null
  sortOrder: number
}

type Row = Record<string, unknown>

function mapVehicle(r: Row): PublicVehicle {
  return {
    id: r.id as string,
    model: (r.model as string) || '',
    brand: (r.brand as string) ?? null,
    year: (r.year as number) ?? null,
    fuelType: (r.fuel_type as string) ?? null,
    mileage: (r.mileage as string) ?? null,
    color: (r.color as string) ?? null,
    sellPrice: (r.sell_price as number) ?? null,
    options: (r.options as string[]) ?? null,
    updatedAt: (r.updated_at as string) ?? '',
  }
}

function mapImage(r: Row): PublicVehicleImage {
  return {
    id: r.id as string,
    vehicleId: r.vehicle_id as string,
    url: r.url as string,
    thumbnail: (r.thumbnail as string) ?? null,
    sortOrder: (r.sort_order as number) ?? 0,
  }
}

export async function getPublicVehicles(): Promise<PublicVehicle[]> {
  const { data, error } = await supabase
    .from('public_vehicles')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapVehicle)
}

export async function getPublicVehicle(id: string): Promise<PublicVehicle | null> {
  const { data, error } = await supabase
    .from('public_vehicles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? mapVehicle(data as Row) : null
}

/** Toàn bộ ảnh website của MỌI xe public — 1 query duy nhất,
 *  dùng cho banner + ảnh bìa card (ảnh đầu theo sort_order mỗi xe). */
export async function getAllPublicImages(): Promise<PublicVehicleImage[]> {
  const { data, error } = await supabase
    .from('public_vehicle_images')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapImage)
}

export async function getPublicVehicleImages(vehicleId: string): Promise<PublicVehicleImage[]> {
  const { data, error } = await supabase
    .from('public_vehicle_images')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapImage)
}
