// ====== VEHICLE DATA NORMALIZATION ======
// Used by CSV import pipeline BEFORE preview.
// All normalization happens client-side — no DB triggers.

// ====== FUEL ======

const FUEL_MAP: Record<string, string> = {
  gasoline: 'Xăng',
  gaso: 'Xăng',
  petrol: 'Xăng',
  diesel: 'Dầu',
  dies: 'Dầu',
  lpg: 'Ga',
  gas: 'Ga',
  hybrid: 'Hybrid',
  electric: 'Điện',
  ev: 'Điện',
}

export function normalizeFuel(value: string): string {
  const key = value.trim().toLowerCase()
  return FUEL_MAP[key] ?? value.trim()
}

// ====== COLOR ======

const COLOR_MAP: Record<string, string> = {
  white: 'Trắng',
  black: 'Đen',
  silver: 'Bạc',
  'dark silver': 'Xám đậm',
  gray: 'Xám',
  grey: 'Xám',
  blue: 'Xanh dương',
  red: 'Đỏ',
  brown: 'Nâu',
  gold: 'Vàng',
  green: 'Xanh lá',
}

export function normalizeColor(value: string): string {
  const key = value.trim().toLowerCase()
  return COLOR_MAP[key] ?? value.trim()
}

// ====== MODEL ======

const MODEL_MAP: Record<string, string> = {
  'santa fe': 'SantaFe',
  'santafe': 'SantaFe',
  'granduer': 'Grandeur',
  'avante hd': 'Avante',
}

export function normalizeModel(value: string): string {
  const key = value.trim().toLowerCase()
  return MODEL_MAP[key] ?? value.trim()
}

// ====== VEHICLE ======

export interface RawVehicle {
  plate: string
  model: string
  year?: string
  fuelType?: string
  displacement?: string
  mileage?: string
  color?: string
  costPrice?: string
  sellPrice?: string
  status?: string
}

export function normalizeVehicle(raw: RawVehicle): RawVehicle {
  return {
    plate: raw.plate.trim(),
    model: normalizeModel(raw.model),
    year: raw.year?.trim() || undefined,
    fuelType: raw.fuelType ? normalizeFuel(raw.fuelType) : undefined,
    displacement: raw.displacement?.trim() || undefined,
    mileage: raw.mileage?.trim() || undefined,
    color: raw.color ? normalizeColor(raw.color) : undefined,
    costPrice: raw.costPrice?.trim() || undefined,
    sellPrice: raw.sellPrice?.trim() || undefined,
    status: raw.status?.trim() || undefined,
  }
}
