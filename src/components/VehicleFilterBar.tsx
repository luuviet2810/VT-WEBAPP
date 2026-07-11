import { useMemo, useState } from 'react'
import { Search, RotateCcw } from 'lucide-react'
import { useStore } from '../store/useStore'
import { VehicleStatus } from '../types'

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
    const next: Filters = {
      query: '',
      status: 'all',
      positionId: 'all',
      assigneeId: 'all',
    }
    setFilters(next)
    onFilterChange?.(next)
  }

  return (
    <div className="card mt-8 px-6 py-4">
      <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap">
        {/* Search — grows naturally */}
        <div className="relative min-w-0 flex-1 lg:min-w-[400px]">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input h-10 pl-10"
            placeholder="Tìm biển số hoặc dòng xe..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
          />
        </div>

        {/* Status */}
        <select className="input h-10 w-full min-w-0 sm:min-w-[180px] sm:w-auto" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Location */}
        <select className="input h-10 w-full min-w-0 sm:min-w-[180px] sm:w-auto" value={filters.positionId} onChange={(e) => updateFilter('positionId', e.target.value)}>
          {positionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Assigned Staff */}
        <select className="input h-10 w-full min-w-0 sm:min-w-[220px] sm:w-auto" value={filters.assigneeId} onChange={(e) => updateFilter('assigneeId', e.target.value)}>
          {assigneeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Reset */}
        <button type="button" onClick={resetFilters} className="btn-secondary flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-5">
          <RotateCcw size={15} />
          Đặt lại
        </button>
      </div>
    </div>
  )
}
