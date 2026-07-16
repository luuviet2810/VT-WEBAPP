import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, Car, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatCurrency, todayISO } from '../utils/format'
import { Badge, EmptyState, ConfirmDialog } from '../components/ui'
import VehicleFilterBar from '../components/VehicleFilterBar'
import VehicleFormModal from './VehicleFormModal'
import { useIsAdminMode, useIsStaffMode } from '../hooks/useAuthRole'
import { Vehicle, VehicleStatus } from '../types'

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

type Filters = {
  query: string
  status: string
  positionId: string
  assigneeId: string
  sortBy: 'default' | 'price_asc' | 'price_desc'
  priceMin: number
  priceMax: number
}

type SortKey = 'model' | 'plate' | 'sellPrice'

export default function PriceList() {
  const vehicles = useStore((s) => s.vehicles)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const updateVehicle = useStore((s) => s.updateVehicle)
  const deleteVehicle = useStore((s) => s.deleteVehicle)

  // Use auth-based role check (respects viewMode for UI)
  const isAdminMode = useIsAdminMode()
  const isStaffMode = useIsStaffMode()
  const canEdit = isAdminMode && !isStaffMode // Only actual admin can edit (not previewing staff)

  const [modalOpen, setModalOpen] = useState(false)
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('plate')
  const [sortAsc, setSortAsc] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    query: '', status: 'all', positionId: 'all', assigneeId: 'all',
    sortBy: 'default', priceMin: 0, priceMax: 110000000,
  })
  const [confirmSoldId, setConfirmSoldId] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<VehicleStatus | null>(null)

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return vehicles.filter((v) => {
      if (v.status === 'sold') return false
      const matchesQuery = !q || v.plate.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
      const matchesStatus = filters.status === 'all' || v.status === filters.status
      const matchesPosition = filters.positionId === 'all' || v.positionId === filters.positionId
      const matchesAssignee = filters.assigneeId === 'all' || v.assigneeId === filters.assigneeId
      const price = v.sellPrice ?? 0
      const matchesPrice = price >= filters.priceMin && price <= filters.priceMax
      return matchesQuery && matchesStatus && matchesPosition && matchesAssignee && matchesPrice
    })
  }, [vehicles, filters])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return copy
  }, [filtered, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function handleDelete(id: string) {
    if (confirm('Xoá xe này khỏi hệ thống?')) deleteVehicle(id)
  }

  function openAddModal() {
    if (!canEdit) return
    setEditVehicleId(null)
    setModalOpen(true)
  }

  function openEditModal(id: string) {
    setEditVehicleId(id)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditVehicleId(null)
  }

  return (
    <div className="pb-16 md:pb-0">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bảng giá xe</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} xe
            {isStaffMode && !isAdminMode && ' — chỉ xem thông tin'}
          </p>
        </div>
        {canEdit && (
          <button className="btn-primary hidden md:flex" onClick={openAddModal}>
            <Plus size={16} />
            Thêm xe
          </button>
        )}
      </div>

      {/* Reuse VehicleFilterBar */}
      <VehicleFilterBar onFilterChange={setFilters} />

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Car size={36} />} title="Không tìm thấy xe nào" subtitle="Thử thay đổi bộ lọc" />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 800 }}>
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <Th label="Dòng xe" onClick={() => toggleSort('model')} sortKey={sortKey} sortAsc={sortAsc} current="model" />
                <Th label="Biển số" onClick={() => toggleSort('plate')} sortKey={sortKey} sortAsc={sortAsc} current="plate" />
                <th className="px-3 py-3 whitespace-nowrap">Năm</th>
                <Th label="Giá xe" onClick={() => toggleSort('sellPrice')} sortKey={sortKey} sortAsc={sortAsc} current="sellPrice" />
                <th className="px-3 py-3 whitespace-nowrap">Đã chạy</th>
                <th className="px-3 py-3 whitespace-nowrap">Nhiên liệu</th>
                <th className="px-3 py-3 whitespace-nowrap">Màu</th>
                <th className="px-3 py-3 whitespace-nowrap">Dung tích</th>
                {canEdit && <th className="px-3 py-3 whitespace-nowrap">Giá nhập</th>}
                <th className="px-3 py-3 whitespace-nowrap">Tình trạng</th>
                <th className="px-3 py-3 whitespace-nowrap">Ảnh</th>
                {canEdit && <th className="px-3 py-3" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((v) => (
                <PriceRow
                  key={v.id}
                  vehicle={v}
                  canEdit={canEdit}
                  onEdit={() => openEditModal(v.id)}
                  onDelete={() => handleDelete(v.id)}
                  onStatusChange={(status) => {
                    if (status === 'sold') {
                      setConfirmSoldId(v.id)
                      setPendingStatus(status)
                    } else {
                      updateVehicle(v.id, { status })
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile FAB */}
      {canEdit && (
        <button
          className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-brand-700 hover:shadow-xl active:scale-95 md:hidden animate-fade-in"
          onClick={openAddModal}
          title="Thêm xe"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}

      <VehicleFormModal open={modalOpen} onClose={closeModal} editVehicleId={editVehicleId} />

      <ConfirmDialog
        open={confirmSoldId !== null}
        title="Đánh dấu xe đã bán"
        message="Xe sẽ không còn hiển thị trong Danh sách xe và Bảng giá. Bạn có chắc muốn tiếp tục?"
        confirmLabel="Xác nhận"
        cancelLabel="Huỷ"
        variant="default"
        onConfirm={() => {
          if (confirmSoldId && pendingStatus) updateVehicle(confirmSoldId, { status: pendingStatus, soldDate: todayISO() })
          setConfirmSoldId(null)
          setPendingStatus(null)
        }}
        onCancel={() => {
          setConfirmSoldId(null)
          setPendingStatus(null)
        }}
      />
    </div>
  )
}

function Th({ label, onClick, sortKey, sortAsc, current }: { label: string; onClick: () => void; sortKey: string; sortAsc: boolean; current: string }) {
  const isActive = sortKey === current
  return (
    <th className="px-3 py-3 whitespace-nowrap">
      <button onClick={onClick} className={`flex items-center gap-1 hover:text-slate-600 ${isActive ? 'text-brand-600' : ''}`}>
        {label}
        <ArrowUpDown size={11} />
      </button>
    </th>
  )
}

function PriceRow({
  vehicle,
  canEdit,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  vehicle: Vehicle
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: VehicleStatus) => void
}) {
  return (
    <tr
      className={`border-b border-slate-50 transition-colors duration-150 last:border-0 hover:bg-slate-50/70 ${
        canEdit ? 'cursor-pointer' : ''
      }`}
      onClick={canEdit ? onEdit : undefined}
    >
      <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{vehicle.model}</td>
      <td className="px-3 py-2.5 font-medium text-brand-600 whitespace-nowrap">{vehicle.plate || '—'}</td>
      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{vehicle.year || '—'}</td>
      <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(vehicle.sellPrice)}</td>
      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{vehicle.mileage || '—'}</td>
      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{vehicle.fuelType || '—'}</td>
      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{vehicle.color || '—'}</td>
      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{vehicle.displacement || '—'}</td>
      {canEdit && <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatCurrency(vehicle.costPrice)}</td>}
      <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        {canEdit ? (
          <select
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs transition-colors hover:border-brand-400 focus:border-brand-500 focus:outline-none"
            value={vehicle.status}
            onChange={(e) => onStatusChange(e.target.value as VehicleStatus)}
          >
            <option value="available">Chưa bán</option>
            <option value="deposited">Đã cọc</option>
            <option value="sold">Đã bán</option>
          </select>
        ) : (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            vehicle.status === 'available' ? 'bg-slate-100 text-slate-600' :
            vehicle.status === 'deposited' ? 'bg-orange-100 text-orange-700' :
            'bg-green-100 text-green-700'
          }`}>
            {STATUS_LABEL[vehicle.status]}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="h-10 w-14 overflow-hidden rounded-lg bg-slate-100">
          {vehicle.images[0] ? (
            <img src={vehicle.images[0]} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <Car size={16} />
            </div>
          )}
        </div>
      </td>
      {canEdit && (
        <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 active:scale-95"
              onClick={onEdit}
              title="Chỉnh sửa"
            >
              <Pencil size={15} />
            </button>
            <button
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 active:scale-95"
              onClick={onDelete}
              title="Xoá"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}
