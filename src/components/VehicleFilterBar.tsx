import { useMemo, useState } from 'react'
import { Search, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
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
      { value: 'unassigned', label: 'Chưa phân công' },
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
    <div className="card mb-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Tìm biển số hoặc dòng xe..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
          />
        </div>
        <select className="input" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select className="input" value={filters.positionId} onChange={(e) => updateFilter('positionId', e.target.value)}>
          {positionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select className="input" value={filters.assigneeId} onChange={(e) => updateFilter('assigneeId', e.target.value)}>
          {assigneeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          Bộ lọc hoạt động theo thời gian thực trên danh sách xe đang hiển thị.
        </div>
        <button type="button" onClick={resetFilters} className={clsx('btn-secondary flex items-center gap-1.5')}>
          <RotateCcw size={16} />
          Đặt lại bộ lọc
        </button>
      </div>
    </div>
  )
}
