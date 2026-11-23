/**
 * Date normalization utilities for PostgreSQL DATE columns (YYYY-MM-DD).
 */

export function normalizeDateToYYYYMMDD(input: unknown): string | null {
  if (!input) return null;
  if (typeof input !== 'string') {
    if (input instanceof Date && !isNaN(input.getTime())) {
      const y = input.getFullYear();
      const m = String(input.getMonth() + 1).padStart(2, '0');
      const d = String(input.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return null;
  }
  const str = input.trim();
  if (!str) return null;

  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = str.match(/(?:^|[^0-9])(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:$|[^0-9])/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (year >= 1990 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/(?:^|[^0-9])(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:$|[^0-9])/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (year >= 1990 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Pattern 3: YYYYMMDD (8 digits)
  const compactMatch = str.match(/(?:^|[^0-9])(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:$|[^0-9])/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }

  // Pattern 4: ISO string with T, e.g. 2026-11-27T15:00:00.000Z
  if (str.includes('T')) {
    const prefix = str.split('T')[0];
    const prefixMatch = prefix.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (prefixMatch) {
      return prefix;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }

  return null;
}
