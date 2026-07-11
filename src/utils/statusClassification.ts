/**
 * Central status classification for checksheet inspection items.
 *
 * Every status value in the system maps to exactly one classification:
 * - "ok"      → item is fine (increment ok count)
 * - "bad"     → item needs repair/replacement (increment hỏng count)
 * - "install" → item is missing, needs installation (increment both hỏng + cần lắp)
 *
 * Usage:
 *   const clazz = classifyStatus("Móp")  // → "bad"
 *   const clazz = classifyStatus("Không có")  // → "install"
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
 * Default: "ok" for unrecognized values (treat as normal).
 */
export function classifyStatus(status: string | undefined | null): 'ok' | 'bad' | 'install' {
  if (!status) return 'ok'
  const key = status.toLowerCase().trim()
  return CLASSIFICATION[key] ?? 'ok'
}

/**
 * Returns summary counts for a list of status values.
 * Install items count toward both "hỏng" and "cần lắp".
 */
export function summarizeStatuses(statuses: (string | undefined | null)[]): { ok: number; bad: number; install: number } {
  let ok = 0, bad = 0, install = 0
  for (const s of statuses) {
    const clazz = classifyStatus(s)
    if (clazz === 'ok') ok++
    else if (clazz === 'bad') bad++
    else if (clazz === 'install') { bad++; install++ }
  }
  return { ok, bad, install }
}

/** Human-readable labels for each classification. */
export const CLASSIFICATION_LABEL: Record<string, string> = {
  ok: 'OK',
  bad: 'Hỏng',
  install: 'Cần lắp',
}
