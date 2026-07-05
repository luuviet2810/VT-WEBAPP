import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Car, User, ListChecks } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState } from '../components/ui'
import { formatCurrency } from '../utils/format'
import { VehicleStatus } from '../types'

const STATUS_LABEL: Record<VehicleStatus, string> = {
  available: 'Chưa bán',
  deposited: 'Đã cọc',
  sold: 'Đã bán',
}
const STATUS_TONE: Record<VehicleStatus, 'slate' | 'orange' | 'green'> = {
  available: 'slate',
  deposited: 'orange',
  sold: 'green',
}

export default function VehicleList() {
  const vehicles = useStore((s) => s.vehicles)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const checkSheets = useStore((s) => s.checkSheets)
  const [query, setQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const q = query.trim().toLowerCase()
      const matchesQuery = !q || v.plate.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
      const matchesPosition = positionFilter === 'all' || v.positionId === positionFilter
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter
      return matchesQuery && matchesPosition && matchesStatus
    })
  }, [vehicles, query, positionFilter, statusFilter])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Danh sách xe</h1>
        <p className="mt-1 text-sm text-slate-500">
          {vehicles.length} xe trong hệ thống — thêm xe mới tại{' '}
          <Link to="/bang-gia" className="text-brand-600 hover:underline">
            Bảng giá
          </Link>
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Tìm biển số hoặc dòng xe..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="input sm:w-52" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
          <option value="all">Tất cả vị trí</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="input sm:w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tất cả tình trạng</option>
          <option value="available">Chưa bán</option>
          <option value="deposited">Đã cọc</option>
          <option value="sold">Đã bán</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Car size={36} />} title="Không tìm thấy xe nào" subtitle="Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => {
            const position = positions.find((p) => p.id === v.positionId)
            const assignee = employees.find((e) => e.id === v.assigneeId)
            return (
              <Link
                key={v.id}
                to={`/xe/${v.id}`}
                className="card group overflow-hidden transition hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  {v.images[0] ? (
                    <img src={v.images[0]} alt={v.model} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Car size={40} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-lg font-bold text-slate-900">{v.plate || '—'}</span>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                      {checkSheets.some((c) => c.vehicleId === v.id) && (
                        <div className="flex items-center gap-1 text-xs text-brand-600">
                          <ListChecks size={12} />
                          <span>Đã kiểm tra</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">{v.model}</div>
                  {position && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-brand-600">{position.name}</span>
                    </div>
                  )}
                  {assignee && (
                    <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                      <User size={12} />
                      {assignee.name}
                    </div>
                  )}
                  {v.sellPrice !== undefined && (
                    <div className="mt-2 text-sm font-semibold text-slate-700">{formatCurrency(v.sellPrice)} đ</div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
