/**
 * Public Web data layer — READ-ONLY.
 *
 * Đọc qua Express Backend + Neon PostgreSQL (view an toàn):
 *   /api/public/vehicles       — is_public = true AND status <> 'sold' AND status <> 'deposited'
 *   /api/public/images         — toàn bộ ảnh category 'website' đã ký URL R2
 *   /api/public/vehicles/:id   — chi tiết 1 xe
 *   /api/public/vehicles/:id/images — ảnh của 1 xe
 *
 * KHÔNG gọi trực tiếp Supabase (tránh lỗi quota/CORS).
 * KHÔNG có bất kỳ lệnh ghi (insert/update/delete) nào trong file này.
 */
import { apiGet } from '../services/api.client'

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
  publicSortOrder?: number | null
  isComingSoon?: boolean
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
    fuelType: (r.fuelType || r.fuel_type) as string ?? null,
    mileage: (r.mileage as string) ?? null,
    color: (r.color as string) ?? null,
    sellPrice: (r.sellPrice != null ? Number(r.sellPrice) : (r.sell_price != null ? Number(r.sell_price) : null)),
    options: (r.options as string[]) ?? null,
    publicSortOrder: (r.publicSortOrder != null ? Number(r.publicSortOrder) : (r.public_sort_order != null ? Number(r.public_sort_order) : null)),
    isComingSoon: Boolean(r.isComingSoon ?? r.is_coming_soon ?? false),
    updatedAt: (r.updatedAt || r.updated_at) as string ?? '',
  }
}

function mapImage(r: Row): PublicVehicleImage {
  return {
    id: r.id as string,
    vehicleId: (r.vehicleId || r.vehicle_id) as string,
    url: r.url as string,
    thumbnail: (r.thumbnail as string) ?? null,
    sortOrder: Number(r.sortOrder ?? r.sort_order ?? 0),
  }
}

export async function getPublicVehicles(): Promise<PublicVehicle[]> {
  try {
    const data = await apiGet<any[]>('/api/public/vehicles')
    return (data ?? []).map((r) => mapVehicle(r as Row))
  } catch (err) {
    console.error('[PublicApi] getPublicVehicles failed:', err)
    return []
  }
}

export async function getPublicVehicle(id: string): Promise<PublicVehicle | null> {
  try {
    const data = await apiGet<any>(`/api/public/vehicles/${id}`)
    return data ? mapVehicle(data as Row) : null
  } catch (err) {
    console.error('[PublicApi] getPublicVehicle failed:', err)
    return null
  }
}

/** Toàn bộ ảnh website của MỌI xe public — 1 query duy nhất,
 *  dùng cho banner + ảnh bìa card (ảnh đầu theo sort_order mỗi xe). */
export async function getAllPublicImages(): Promise<PublicVehicleImage[]> {
  try {
    const data = await apiGet<any[]>('/api/public/images')
    return (data ?? []).map((r) => mapImage(r as Row))
  } catch (err) {
    console.error('[PublicApi] getAllPublicImages failed:', err)
    return []
  }
}

export async function getPublicVehicleImages(vehicleId: string): Promise<PublicVehicleImage[]> {
  try {
    const data = await apiGet<any[]>(`/api/public/vehicles/${vehicleId}/images`)
    return (data ?? []).map((r) => mapImage(r as Row))
  } catch (err) {
    console.error('[PublicApi] getPublicVehicleImages failed:', err)
    return []
  }
}

export async function getPublicOptionDefs(): Promise<any[]> {
  try {
    const data = await apiGet<any[]>('/api/public/options')
    return data ?? []
  } catch (err) {
    console.error('[PublicApi] getPublicOptionDefs failed:', err)
    return []
  }
}
