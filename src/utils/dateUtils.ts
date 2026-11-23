/**
 * Safe date utilities for vehicle dates (Song nưng, registration) and HTML5 date inputs.
 */

/**
 * Normalizes any date value (YYYY-MM-DD, DD/MM/YYYY, ISO timestamp, Date object)
 * into a clean HTML5 <input type="date"> value (YYYY-MM-DD).
 * Returns empty string '' if input is invalid or null/undefined.
 */
export function toInputDateFormat(val: unknown): string {
  if (!val) return ''
  if (typeof val !== 'string') {
    if (val instanceof Date && !isNaN(val.getTime())) {
      const y = val.getFullYear()
      const m = String(val.getMonth() + 1).padStart(2, '0')
      const d = String(val.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    return ''
  }

  const str = val.trim()
  if (!str) return ''

  // 1. Direct match YYYY-MM-DD
  const ymd = str.match(/(?:^|[^0-9])(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:$|[^0-9])/)
  if (ymd) {
    const y = parseInt(ymd[1], 10)
    const m = parseInt(ymd[2], 10)
    const d = parseInt(ymd[3], 10)
    if (y >= 1990 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  // 2. Direct match DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/(?:^|[^0-9])(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:$|[^0-9])/)
  if (dmy) {
    const d = parseInt(dmy[1], 10)
    const m = parseInt(dmy[2], 10)
    const y = parseInt(dmy[3], 10)
    if (y >= 1990 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  // 3. Compact YYYYMMDD
  const compact = str.match(/(?:^|[^0-9])(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:$|[^0-9])/)
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`
  }

  // 4. ISO timestamp with T
  if (str.includes('T')) {
    const prefix = str.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(prefix)) {
      return prefix
    }
    const d = new Date(str)
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  }

  return ''
}

/**
 * Formats a date string (e.g. 2026-11-28) into localized Vietnamese display format (28/11/2026).
 * Immune to client-side timezone shifts.
 */
export function formatDisplayDate(val: unknown): string {
  if (!val) return '—'
  const ymd = toInputDateFormat(val)
  if (!ymd) {
    try {
      const d = new Date(val as any)
      if (!isNaN(d.getTime())) return d.toLocaleDateString('vi-VN')
    } catch {}
    return '—'
  }
  const parts = ymd.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return ymd
}

/**
 * Extracts a date from filename, text or OCR output (e.g. 'sn_28-11-2026.jpg' -> '2026-11-28').
 */
export function extractDateFromString(str: string): string | null {
  if (!str) return null
  const res = toInputDateFormat(str)
  return res || null
}
