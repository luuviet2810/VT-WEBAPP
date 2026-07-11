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

// ====== FUEL NORMALIZATION ======

const FUEL_CSV_MAP: Record<string, string> = {
  gasoline: 'Xăng',
  gaso: 'Xăng',
  petrol: 'Xăng',
  xăng: 'Xăng',
  diesel: 'Dầu',
  dies: 'Dầu',
  dầu: 'Dầu',
  lpg: 'Ga',
  ga: 'Ga',
  hybrid: 'Hybrid',
  ev: 'Điện',
  electric: 'Điện',
  điện: 'Điện',
}

export function normalizeFuel(value: string): string {
  const key = value.trim().toLowerCase()
  return FUEL_CSV_MAP[key] || value.trim()
}

// ====== COLOR NORMALIZATION ======

const COLOR_MAP: Record<string, string> = {
  white: 'Trắng',
  trắng: 'Trắng',
  black: 'Đen',
  đen: 'Đen',
  silver: 'Bạc',
  bạc: 'Bạc',
  'dark silver': 'Xám đậm',
  'light silver': 'Bạc sáng',
  gray: 'Xám',
  grey: 'Xám',
  xám: 'Xám',
  'dark gray': 'Xám đậm',
  'dark grey': 'Xám đậm',
  'xám đậm': 'Xám đậm',
  red: 'Đỏ',
  đỏ: 'Đỏ',
  'dark red': 'Đỏ đậm',
  blue: 'Xanh',
  xanh: 'Xanh',
  'navy blue': 'Xanh navy',
  'navy': 'Xanh navy',
  'light blue': 'Xanh nhạt',
  'sky blue': 'Xanh da trời',
  green: 'Xanh lá',
  'xanh lá': 'Xanh lá',
  'dark green': 'Xanh lá đậm',
  yellow: 'Vàng',
  vàng: 'Vàng',
  gold: 'Vàng kim',
  'vàng kim': 'Vàng kim',
  brown: 'Nâu',
  nâu: 'Nâu',
  beige: 'Be',
  be: 'Be',
  cream: 'Kem',
  kem: 'Kem',
  orange: 'Cam',
  cam: 'Cam',
  purple: 'Tím',
  tím: 'Tím',
  bronze: 'Đồng',
  đồng: 'Đồng',
  champagne: 'Champagne',
  titan: 'Titan',
  'pearl white': 'Trắng ngọc',
  'trắng ngọc': 'Trắng ngọc',
  'cream white': 'Trắng kem',
}

export function normalizeColor(value: string): string {
  const key = value.trim().toLowerCase()
  // Try full match first
  if (COLOR_MAP[key]) return COLOR_MAP[key]
  // Try word-by-word (e.g. "Dark Silver" → check "dark" then "silver")
  const words = key.split(/\s+/)
  if (words.length >= 2) {
    // Check the full phrase again after combining
    const phrase = words.join(' ')
    if (COLOR_MAP[phrase]) return COLOR_MAP[phrase]
  }
  // Check each word independently
  const parts = words.map((w) => COLOR_MAP[w] || w)
  return parts.join(' ')
}
