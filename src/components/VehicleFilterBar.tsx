import { useMemo, useRef, useState } from 'react'
import { Search, RotateCcw, Filter, X } from 'lucide-react'
import { useStore } from '../store/useStore'

type VehicleFilterBarProps = {
  onFilterChange?: (filters: {
    query: string
    status: string
    positionId: string
    assigneeId: string
  }) => void
}

type Filters = {
  query: string
  status: string
  positionId: string
  assigneeId: string
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả tình trạng' },
  { value: 'available', label: 'Chưa bán' },
  { value: 'deposited', label: 'Đã cọc' },
  { value: 'sold', label: 'Đã bán' },
]

export default function VehicleFilterBar({ onFilterChange }: VehicleFilterBarProps) {
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const [filters, setFilters] = useState<Filters>({
    query: '',
    status: 'all',
    positionId: 'all',
    assigneeId: 'all',
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

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      onFilterChange?.(next)
      return next
    })
  }

  function resetFilters() {
    const next: Filters = { query: '', status: 'all', positionId: 'all', assigneeId: 'all' }
    setFilters(next)
    onFilterChange?.(next)
  }

  const hasActiveFilters = filters.status !== 'all' || filters.positionId !== 'all' || filters.assigneeId !== 'all'

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

        {/* Bộ lọc button */}
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex h-12 items-center gap-2 rounded-xl border px-4 text-base font-medium transition-colors ${
              hasActiveFilters
                ? 'border-brand-400 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            Bộ lọc
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {[filters.status !== 'all', filters.positionId !== 'all', filters.assigneeId !== 'all'].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Popover */}
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 z-40 mt-2 w-[320px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Bộ lọc</span>
                  <button onClick={() => setFilterOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Tình trạng</label>
                    <select className="input h-11 w-full text-sm" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Vị trí</label>
                    <select className="input h-11 w-full text-sm" value={filters.positionId} onChange={(e) => updateFilter('positionId', e.target.value)}>
                      {positionOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Người phụ trách</label>
                    <select className="input h-11 w-full text-sm" value={filters.assigneeId} onChange={(e) => updateFilter('assigneeId', e.target.value)}>
                      {assigneeOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Reset */}
        <button type="button" onClick={resetFilters} className="btn-secondary flex h-12 shrink-0 items-center gap-2 whitespace-nowrap px-5 text-base">
          <RotateCcw size={16} />
          Đặt lại
        </button>
      </div>
    </div>
  )
}
