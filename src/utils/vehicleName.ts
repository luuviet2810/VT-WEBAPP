/**
 * Normalize Korean/raw vehicle model names to standardized English names.
 * Handles variants from Excel imports, API data, and user input.
 *
 * Strategy:
 * 1. Keyword matching first — catches unlisted variants (e.g. "싼타페 TM", "크루즈 LT")
 * 2. Exact dictionary fallback — catches specific edge cases
 * 3. Return original if no match
 */

const KEYWORD_MAP: [string, string][] = [
  ['싼타페', 'SantaFe'],
  ['카니발', 'Carnival'],
  ['그랜저', 'Grandeur'],
  ['크루즈', 'Cruze'],
  ['말리부', 'Malibu'],
  ['아반떼', 'Avante'],
  ['소나타', 'Sonata'],
  ['쏘나타', 'Sonata'],
  ['투싼', 'Tucson'],
  ['투산', 'Tucson'],
  ['스포티지', 'Sportage'],
  ['쏘렌토', 'Sorento'],
  ['모닝', 'Morning'],
  ['레이', 'Ray'],
  ['코나', 'Kona'],
  ['셀토스', 'Seltos'],
  ['니로', 'Niro'],
  ['팰리세이드', 'Palisade'],
  ['모하비', 'Mohave'],
  ['베뉴', 'Venue'],
  ['스파크', 'Spark'],
  ['카이엔', 'Cayenne'],
]

const EXACT_MAP: Record<string, string> = {
  'Sm5': 'SM5',
  'CANIVAL 8인승 SEATS': 'Carnival',
  '그랜드 카니': 'Grand Carnival',
  'K5 하이브리': 'K5 Hybrid',
  '말리부 2.0': 'Malibu',
  '말리부 2.0 D': 'Malibu',
  '크루즈 1.4': 'Cruze',
  '크루즈 1.6 D': 'Cruze',
  '크루즈 1.8 D': 'Cruze',
  '크루즈 2.0': 'Cruze',
  'K5': 'K5',
  'K7': 'K7',
  'K3': 'K3',
  'SM3': 'SM3',
  'SM5': 'SM5',
}

export function normalizeVehicleName(name: string): string {
  if (!name) return ''
  const trimmed = name.trim()
  if (!trimmed) return ''

  // 1. Try exact match first
  if (EXACT_MAP[trimmed]) return EXACT_MAP[trimmed]

  // 2. Try keyword match (catch variants like "싼타페 2.0", "크루즈 LT")
  for (const [keyword, normalized] of KEYWORD_MAP) {
    if (trimmed.includes(keyword)) return normalized
  }

  // 3. Return original if no match
  return trimmed
}
