import { useMemo, useRef, useState, useCallback } from 'react'
import { Search, RotateCcw, Filter, X } from 'lucide-react'
import { useStore } from '../store/useStore'

type Filters = {
  query: string
  status: string
  positionId: string
  assigneeId: string
  sortBy: 'default' | 'price_asc' | 'price_desc'
  priceMin: number
  priceMax: number
}

type VehicleFilterBarProps = {
  onFilterChange?: (filters: Filters) => void
}

// Price step arrays — each entry is a position on the slider track.
// Slider goes from index 0 to steps.length-1 with step=1.
// The track has (steps.length-1) equal segments.
const STEPS_SHORT = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map((n) => n * 1000000)
const STEPS_EXTENDED = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110].map((n) => n * 1000000)

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả tình trạng' },
  { value: 'available', label: 'Chưa bán' },
  { value: 'deposited', label: 'Đã cọc' },
  { value: 'sold', label: 'Đã bán' },
]

const SORT_OPTIONS: { value: Filters['sortBy']; label: string }[] = [
  { value: 'default', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá: Thấp đến cao' },
  { value: 'price_desc', label: 'Giá: Cao đến thấp' },
]

export default function VehicleFilterBar({ onFilterChange }: VehicleFilterBarProps) {
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const [extendedRange, setExtendedRange] = useState(false)
  const steps = extendedRange ? STEPS_EXTENDED : STEPS_SHORT
  const maxIdx = steps.length - 1

  // Clamp a price to the nearest step value
  const nearestStep = (price: number) => {
    let closest = steps[0]
    let minDist = Infinity
    for (const s of steps) {
      const dist = Math.abs(s - price)
      if (dist < minDist) { minDist = dist; closest = s }
    }
    return closest
  }

  const [filters, setFilters] = useState<Filters>({
    query: '',
    status: 'all',
    positionId: 'all',
    assigneeId: 'all',
    sortBy: 'default',
    priceMin: 0,
    priceMax: 110000000, // show all vehicles by default; slider clamps to nearest step
  })

  const positionOptions = useMemo(() => {
    return [{ value: 'all', label: 'Tất cả vị trí' }, ...positions.map((p) => ({ value: p.id, label: p.name }))]
  }, [positions])

  const assigneeOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Mọi người' },
      ...employees.map((e) => ({ value: e.id, label: e.name })),
    ]
  }, [employees])

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      onFilterChange?.(next)
      return next
    })
  }, [onFilterChange])

  const toggleExtendedRange = useCallback(() => {
    setExtendedRange((prev) => {
      const next = !prev
      setFilters((f) => {
        // Keep priceMax at 110M so the unfiltered list always shows everything.
        // The slider visually clamps to the nearest step value.
        const nextFilters = { ...f, priceMin: 0, priceMax: 110000000 }
        onFilterChange?.(nextFilters)
        return nextFilters
      })
      return next
    })
  }, [onFilterChange])

  const resetFilters = useCallback(() => {
    const next: Filters = { query: '', status: 'all', positionId: 'all', assigneeId: 'all', sortBy: 'default', priceMin: 0, priceMax: 110000000 }
    setFilters(next)
    onFilterChange?.(next)
  }, [onFilterChange])

  const hasActiveFilters = filters.status !== 'all' || filters.positionId !== 'all' || filters.assigneeId !== 'all' || filters.sortBy !== 'default' || filters.priceMin > 0 || filters.priceMax < steps[maxIdx]

  // Format number with thousand separators
  const fmt = (v: number) => v.toLocaleString('vi-VN')

  return (
    <div className="card mt-8 px-6 py-5">
      <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap">
        {/* Search */}
        <div className="relative min-w-0 flex-1 lg:min-w-[400px]">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input h-12 pl-11 text-base"
            placeholder="Tìm biển số hoặc dòng xe..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
          />
        </div>

          {/* Bộ lọc button — icon only */}
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            title="Bộ lọc"
            className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${
              hasActiveFilters
                ? 'border-brand-400 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter size={18} />
            {hasActiveFilters && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {[
                  filters.status !== 'all',
                  filters.positionId !== 'all',
                  filters.assigneeId !== 'all',
                  filters.sortBy !== 'default',
                  filters.priceMin > 0 || filters.priceMax < steps[maxIdx],
                ].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Popover (unchanged) */}
          {filterOpen && (
            <div className="hidden md:block">
              <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 z-40 mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Bộ lọc</span>
                  <button onClick={() => setFilterOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
                <FilterContent
                  filters={filters}
                  updateFilter={updateFilter}
                  toggleExtendedRange={toggleExtendedRange}
                  extendedRange={extendedRange}
                  steps={steps}
                  maxIdx={maxIdx}
                  nearestStep={nearestStep}
                  fmt={fmt}
                  positionOptions={positionOptions}
                  assigneeOptions={assigneeOptions}
                  SORT_OPTIONS={SORT_OPTIONS}
                  STATUS_OPTIONS={STATUS_OPTIONS}
                />
              </div>
            </div>
          )}

          {/* Mobile full-screen drawer (hidden on desktop) */}
          {filterOpen && (
            <div className="md:hidden">
              <div className="fixed inset-0 z-50 animate-fade-in">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
                <div className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl animate-slide-in-right" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                  {/* Header */}
                  <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-800">Bộ lọc</h2>
                    <button type="button" className="btn-icon" onClick={() => setFilterOpen(false)}><X size={18} /></button>
                  </div>

                  {/* Scrollable content */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <FilterContent
                      filters={filters}
                      updateFilter={updateFilter}
                      toggleExtendedRange={toggleExtendedRange}
                      extendedRange={extendedRange}
                      steps={steps}
                      maxIdx={maxIdx}
                      nearestStep={nearestStep}
                      fmt={fmt}
                      positionOptions={positionOptions}
                      assigneeOptions={assigneeOptions}
                      SORT_OPTIONS={SORT_OPTIONS}
                      STATUS_OPTIONS={STATUS_OPTIONS}
                    />
                  </div>

                  {/* Footer */}
                  <div className="flex shrink-0 items-center gap-3 border-t border-slate-200 px-5 py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
                    <button type="button" onClick={() => { resetFilters(); setFilterOpen(false) }} className="btn-secondary flex-1 text-base">Đặt lại</button>
                    <button type="button" onClick={() => setFilterOpen(false)} className="btn-primary flex-1 text-base">Áp dụng</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reset — icon only */}
        <button type="button" title="Đặt lại" onClick={resetFilters} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50">
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  )
}

// ====== FILTER CONTENT (shared between desktop popover + mobile drawer) ======

function FilterContent({
  filters, updateFilter, toggleExtendedRange, extendedRange, steps, maxIdx, nearestStep, fmt, positionOptions, assigneeOptions, SORT_OPTIONS, STATUS_OPTIONS,
}: {
  filters: Filters
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  toggleExtendedRange: () => void
  extendedRange: boolean
  steps: number[]
  maxIdx: number
  nearestStep: (price: number) => number
  fmt: (v: number) => string
  positionOptions: { value: string; label: string }[]
  assigneeOptions: { value: string; label: string }[]
  SORT_OPTIONS: { value: Filters['sortBy']; label: string }[]
  STATUS_OPTIONS: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Sắp xếp</label>
        <select className="input h-11 w-full text-sm" value={filters.sortBy} onChange={(e) => updateFilter('sortBy', e.target.value as Filters['sortBy'])}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Tình trạng</label>
        <select className="input h-11 w-full text-sm" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Vị trí</label>
        <select className="input h-11 w-full text-sm" value={filters.positionId} onChange={(e) => updateFilter('positionId', e.target.value)}>
          {positionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Người phụ trách</label>
        <select className="input h-11 w-full text-sm" value={filters.assigneeId} onChange={(e) => updateFilter('assigneeId', e.target.value)}>
          {assigneeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500">Khoảng giá</label>
          <button type="button" onClick={toggleExtendedRange}
            className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-[10px] font-medium transition-colors ${
              extendedRange ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            &gt;20.000.000₩
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{fmt(filters.priceMin)}₩</span>
          <span>{fmt(filters.priceMax)}₩</span>
        </div>
        <div className="relative mt-2 h-6">
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-slate-200" />
          <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-400"
            style={{ left: `${(steps.indexOf(nearestStep(filters.priceMin)) / maxIdx) * 100}%`, width: `${((steps.indexOf(nearestStep(filters.priceMax)) - steps.indexOf(nearestStep(filters.priceMin))) / maxIdx) * 100}%` }} />
          <input type="range" min={0} max={maxIdx} step={1} value={steps.indexOf(nearestStep(filters.priceMin))}
            onChange={(e) => { const v = steps[Number(e.target.value)]; if (v <= filters.priceMax) updateFilter('priceMin', v) }}
            className="pointer-events-none absolute inset-0 z-10 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer" />
          <input type="range" min={0} max={maxIdx} step={1} value={steps.indexOf(nearestStep(filters.priceMax))}
            onChange={(e) => { const v = steps[Number(e.target.value)]; if (v >= filters.priceMin) updateFilter('priceMax', v) }}
            className="pointer-events-none absolute inset-0 z-20 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer" />
        </div>
      </div>
    </div>
  )
}
