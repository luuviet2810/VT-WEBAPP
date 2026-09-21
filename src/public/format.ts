/** Formatters riêng cho Public Web (không dùng formatCurrency 'đ' của Admin). */

export const PUBLIC_FUEL_LABELS: Record<string, string> = {
  gasoline: 'Xăng',
  diesel: 'Dầu',
  lpg: 'LPG',
  hybrid: 'Hybrid',
}

/**
 * Format giá Public Web — DÙNG CHUNG toàn bộ public components
 * (Home card, Banner, Vehicle Detail, Pre-Web card).
 *   3800000 -> "3.800.000 ₩"   (Intl vi-VN: dấu chấm ngăn nghìn, ₩ ở cuối)
 *   0/null  -> "Liên hệ"
 * Không dùng dạng rút gọn M/K.
 */
const KRW_FORMATTER = new Intl.NumberFormat('vi-VN')

export function formatKRW(price?: number | null): string {
  if (price == null || price <= 0) return 'Liên hệ'
  return `${KRW_FORMATTER.format(price)} ₩`
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
