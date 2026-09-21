/** Formatters riêng cho Public Web (không dùng formatCurrency 'đ' của Admin). */

export const PUBLIC_FUEL_LABELS: Record<string, string> = {
  gasoline: 'Xăng',
  diesel: 'Dầu',
  lpg: 'LPG',
  hybrid: 'Hybrid',
}

/** ₩8.000.000 — theo ví dụ spec; null/0 → "Liên hệ" */
export function formatKRW(price?: number | null): string {
  if (price == null || price <= 0) return 'Liên hệ'
  return `₩${price.toLocaleString('vi-VN')}`
}

/** Giá rút gọn cho card 3 cột trên mobile: ₩3.8M */
export function formatKRWCompact(price?: number | null): string {
  if (price == null || price <= 0) return 'Liên hệ'
  if (price >= 1_000_000) {
    const m = price / 1_000_000
    return `₩${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  return `₩${price.toLocaleString('vi-VN')}`
}

export function fuelLabel(fuelType?: string | null): string | null {
  if (!fuelType) return null
  return PUBLIC_FUEL_LABELS[fuelType] ?? fuelType
}

/** mileage lưu dạng chuỗi "13" (vạn km) → "13 vạn km" */
export function mileageLabel(mileage?: string | null): string | null {
  if (!mileage) return null
  return `${mileage} vạn km`
}

export function formatDay(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString('vi-VN')
}
