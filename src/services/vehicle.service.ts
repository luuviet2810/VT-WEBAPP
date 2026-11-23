import { apiGet, apiPost, apiPut, apiDelete } from './api.client'
import { useAuthStore } from '../store/useAuthStore'
import type { Vehicle } from '../types'
import { toInputDateFormat } from '../utils/dateUtils'

// ====== HELPERS ======

type VehicleRow = Record<string, unknown>

/** Canonical Vietnamese values; keep legacy English rows readable. */
export function fuelTypeFromDb(value: unknown): Vehicle['fuelType'] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const aliases: Record<string, Vehicle['fuelType']> = {
    gasoline: 'Xăng',
    diesel: 'Dầu',
    lpg: 'Ga',
    hybrid: 'Hybrid',
    electric: 'Điện',
  }
  return aliases[value.trim().toLowerCase()] ?? (value as Vehicle['fuelType'])
}

function mapVehicleRow(
  v: VehicleRow,
  images: string[] = [],
  documents: string[] = [],
  thumbnails?: Record<string, string>
): Vehicle {
  return {
    id: v.id as string,
    plate: v.plate as string,
    model: v.model as string,
    brand: (v.brand as string) ?? undefined,
    year: v.year as number | undefined,
    fuelType: fuelTypeFromDb(v.fuel_type ?? v.fuelType),
    displacement: (v.displacement as string) ?? undefined,
    mileage: (v.mileage as string) ?? undefined,
    color: (v.color as string) ?? undefined,
    costPrice: v.cost_price != null ? Number(v.cost_price) : v.costPrice != null ? Number(v.costPrice) : undefined,
    sellPrice: v.sell_price != null ? Number(v.sell_price) : v.sellPrice != null ? Number(v.sellPrice) : undefined,
    status: (v.status as Vehicle['status']) || 'available',
    positionId: (v.position_id as string) ?? (v.positionId as string) ?? null,
    assigneeId: (v.assignee_id as string) ?? (v.assigneeId as string) ?? null,
    note: (v.note as string) ?? undefined,
    images: (v.images as string[]) || images,
    thumbnails: (v.thumbnails as Record<string, string>) || thumbnails,
    documents: (v.documents as string[]) || documents,
    createdAt: (v.created_at as string) ?? (v.createdAt as string),
    updatedAt: (v.updated_at as string) ?? (v.updatedAt as string),
    soldDate: (v.sold_date as string) ?? (v.soldDate as string) ?? undefined,
    yardPosition: (v.yard_position as string) ?? (v.yardPosition as string) ?? undefined,
    imagesDeletedAt: (v.images_deleted_at as string) ?? (v.imagesDeletedAt as string) ?? undefined,
    songNungExpiryDate: toInputDateFormat(v.song_nung_expiry_date ?? v.songNungExpiryDate) || null,
    registrationExpiryDate: toInputDateFormat(v.registration_expiry_date ?? v.registrationExpiryDate) || null,
    isPublic: Boolean(v.is_public ?? v.isPublic ?? false),
    isComingSoon: Boolean(v.is_coming_soon ?? v.isComingSoon ?? false),
    publicSortOrder: (v.public_sort_order as number) ?? (v.publicSortOrder as number) ?? null,
    options: (v.options as string[]) ?? undefined,
    optionsChecked: (v.options_checked as boolean | null) ?? (v.optionsChecked as boolean | null) ?? null,
  }
}

// ====== READ ======

export async function getVehicles(): Promise<Vehicle[]> {
  const data = await apiGet<VehicleRow[]>('/api/vehicles')
  return (data || []).map((row) => mapVehicleRow(row))
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  try {
    const data = await apiGet<VehicleRow>(`/api/vehicles/${id}`)
    if (!data) return null
    return mapVehicleRow(data)
  } catch (err: any) {
    if (err.statusCode === 404) return null
    throw err
  }
}

/**
 * Compatibility lookup for legacy callers. Plates are no longer unique, so
 * this returns the most recently updated match. Prefer looking up by vehicle ID.
 */
export async function getVehicleByPlate(plate: string): Promise<Vehicle | null> {
  try {
    const data = await apiGet<VehicleRow>(`/api/vehicles/by-plate/${encodeURIComponent(plate.trim())}`)
    if (!data) return null
    return mapVehicleRow(data)
  } catch (err: any) {
    if (err.statusCode === 404) return null
    throw err
  }
}

// ====== CREATE ======

export async function createVehicle(
  vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> & { images?: string[]; documents?: string[] }
): Promise<Vehicle> {
  const data = await apiPost<VehicleRow>('/api/vehicles', vehicle)
  return mapVehicleRow(data)
}

// ====== UPDATE ======

export async function updateVehicle(id: string, patch: Partial<Vehicle>): Promise<Vehicle> {
  const data = await apiPut<VehicleRow>(`/api/vehicles/${id}`, patch)
  return mapVehicleRow(data)
}

// ====== DELETE ======

export async function assertCanDeleteVehicle(): Promise<void> {
  const currentUser = useAuthStore.getState().currentUser
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('Chỉ Admin được phép xóa xe.')
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  await assertCanDeleteVehicle()
  await apiDelete(`/api/vehicles/${id}`)
}

// Move vehicle to a position (wrapper)
export async function moveVehicle(vehicleId: string, toPositionId: string | null): Promise<Vehicle> {
  const data = await apiPost<VehicleRow>(`/api/vehicles/${vehicleId}/move`, { toPositionId })
  return mapVehicleRow(data)
}

// ====== IMPORT CREATE (legacy helper; plate is not unique) ======

export interface UpsertVehicleInput {
  plate: string
  model?: string | null
  year?: number | null
  fuelType?: string | null
  displacement?: string | null
  mileage?: string | null
  color?: string | null
  costPrice?: number | null
  sellPrice?: number | null
  status?: string | null
}

export async function upsertVehicle(data: UpsertVehicleInput): Promise<'inserted'> {
  await apiPost('/api/vehicles', data)
  return 'inserted'
}

export interface MediaStats {
  errorImages: { vehicleId: string; count: number }[]
  totalErrors: number
  categoryImages: { vehicle_id: string; vehicleId?: string; category: string }[]
}

export async function getVehicleMediaStats(): Promise<MediaStats> {
  const data = await apiGet<MediaStats>('/api/vehicles/media-stats')
  return data
}
