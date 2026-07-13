/**
 * Central status classification for checksheet inspection items.
 *
 * Every status value in the system maps to exactly one classification:
 * - "ok"         → item is fine (increment ok count)
 * - "bad"        → item needs repair/replacement (increment hỏng count)
 * - "install"    → item is missing, needs installation (increment both hỏng + cần lắp)
 * - "unselected" → no value chosen yet (do not count)
 *
 * Usage:
 *   const clazz = classifyStatus("Móp")  // → "bad"
 *   const clazz = classifyStatus(null)    // → "unselected"
 */

const CLASSIFICATION: Record<string, 'ok' | 'bad' | 'install'> = {
  // === OK ===
  'normal': 'ok',
  'android': 'ok',
  'ok': 'ok',
  'good': 'ok',
  'mirror': 'ok',
  'device': 'ok',
  'con': 'ok',
  'replacing': 'ok',
  'half': 'ok',
  'quarter': 'ok',
  'full': 'ok',

  // === BAD (needs repair) ===
  'broken': 'bad',
  'blurry': 'bad',
  'error': 'bad',
  'empty': 'bad',
  'need_gas': 'bad',
  'can_repair': 'bad',
  'dirty': 'bad',
  'torn': 'bad',
  'dent': 'bad',
  'discolor': 'bad',
  'needpaint': 'bad',
  'scratch': 'bad',
  'worn': 'bad',
  'badd': 'bad',

  // === INSTALL (missing, needs installation) ===
  'none': 'install',
  'maybe': 'install',
}

/**
 * Returns the classification for a given status string.
 * null / undefined → "unselected" (not counted)
 */
export function classifyStatus(status: string | undefined | null): 'ok' | 'bad' | 'install' | 'unselected' {
  if (!status) return 'unselected'
  const key = status.toLowerCase().trim()
  return CLASSIFICATION[key] ?? 'ok'
}

/**
 * Returns summary counts for a list of status values.
 * "unselected" values are skipped.
 * Install items count toward both "hỏng" and "cần lắp".
 */
export function summarizeStatuses(statuses: (string | undefined | null)[]): { ok: number; bad: number; install: number } {
  let ok = 0, bad = 0, install = 0
  for (const s of statuses) {
    const clazz = classifyStatus(s)
    if (clazz === 'ok') ok++
    else if (clazz === 'bad') bad++
    else if (clazz === 'install') { bad++; install++ }
    // unselected → skip
  }
  return { ok, bad, install }
}

/** Human-readable labels for each classification. */
export const CLASSIFICATION_LABEL: Record<string, string> = {
  ok: 'OK',
  bad: 'Hỏng',
  install: 'Cần lắp',
}

/**
 * Maps a raw status value to its display label for the preview.
 * null/undefined → "Chưa check"
 */
const STATUS_LABELS: Record<string, string> = {
  normal: 'Thường',
  android: 'Android',
  ok: 'OK',
  good: 'Tốt',
  blurry: 'Mờ',
  broken: 'Hỏng',
  mirror: 'Gương',
  device: 'Thiết bị',
  none: 'Không có',
  maybe: 'Thiếu thẻ nhớ',
  empty: 'Báo vàng',
  quarter: 'Trên vạch đỏ',
  half: '2 vạch to (Nửa bình)',
  full: 'Đầy bình',
  con: 'Còn',
  can_repair: 'Cần song nưng lại',
  replacing: 'Đang đi thay',
  need_gas: 'Cần đổ ga',
  error: 'Lỗi',
  dirty: 'Bẩn',
  torn: 'Rách',
  polish: 'Chỉ cần đánh bóng',
  dent: 'Móp',
  discolor: 'Đổi màu',
  touchup: 'Lấy sơn tự vá',
  worn: 'Hơi mòn',
  badd: 'Mòn lắm',
  // Song nưng result
  draft: 'Bản nháp',
  printed: 'Đã in',
  // Key type
  smartkey: 'Smartkey',
  mechanical: 'Khóa cơ',
  both: 'Cả 2',
  // Smartkey status
  one: '1 chìa',
  two: '2 chìa',
  damaged: 'Có chìa hỏng',
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Chưa check'
  return STATUS_LABELS[status] ?? status
}
