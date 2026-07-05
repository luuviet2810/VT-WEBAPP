import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, Car, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatCurrency } from '../utils/format'
import { Badge, EmptyState } from '../components/ui'
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

const FUEL_LABEL: Record<string, string> = {
  gasoline: 'Xăng',
  diesel: 'Dầu',
  lpg: 'LPG',
  hybrid: 'Hybrid',
}

type SortKey = 'model' | 'plate' | 'sellPrice'

export default function PriceList() {
  const vehicles = useStore((s) => s.vehicles)
  const updateVehicle = useStore((s) => s.updateVehicle)
  const deleteVehicle = useStore((s) => s.deleteVehicle)
  
  // Use auth-based role check (respects viewMode for UI)
  const isAdminMode = useIsAdminMode()
  const isStaffMode = useIsStaffMode()
  const canEdit = isAdminMode && !isStaffMode // Only actual admin can edit (not previewing staff)
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const sorted = useMemo(() => {
    if (!sortKey) return vehicles
    const copy = [...vehicles]
    copy.sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return copy
  }, [vehicles, sortKey, sortAsc])

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
            {vehicles.length} xe
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

      {vehicles.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Car size={36} />} title="Chưa có xe nào" subtitle='"Thêm xe" để bắt đầu' />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Ảnh</th>
                <th className="px-4 py-3">Tình trạng</th>
                <Th label="Dòng xe" onClick={() => toggleSort('model')} />
                <Th label="Biển số" onClick={() => toggleSort('plate')} />
                <th className="px-4 py-3">Năm</th>
                <th className="px-4 py-3">Nhiên liệu</th>
                <th className="px-4 py-3">Dung tích</th>
                <th className="px-4 py-3">Đã chạy</th>
                <th className="px-4 py-3">Màu</th>
                {canEdit && <th className="px-4 py-3">Giá nhập</th>}
                <Th label="Giá bán" onClick={() => toggleSort('sellPrice')} />
                {canEdit && <th className="px-4 py-3" />}
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
                  onStatusChange={(status) => updateVehicle(v.id, { status })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile FAB - Floating Action Button */}
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
    </div>
  )
}

function Th({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-4 py-3">
      <button onClick={onClick} className="flex items-center gap-1 hover:text-slate-600">
        {label}
        <ArrowUpDown size={12} />
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
      <td className="px-4 py-2.5">
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
      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
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
      <td className="px-4 py-2.5 font-medium text-slate-800">{vehicle.model}</td>
      <td className="px-4 py-2.5 font-medium text-brand-600">{vehicle.plate || '—'}</td>
      <td className="px-4 py-2.5 text-slate-500">{vehicle.year || '—'}</td>
      <td className="px-4 py-2.5 text-slate-500">{vehicle.fuelType ? FUEL_LABEL[vehicle.fuelType] : '—'}</td>
      <td className="px-4 py-2.5 text-slate-500">{vehicle.displacement || '—'}</td>
      <td className="px-4 py-2.5 text-slate-500">{vehicle.mileage || '—'}</td>
      <td className="px-4 py-2.5 text-slate-500">{vehicle.color || '—'}</td>
      {canEdit && <td className="px-4 py-2.5 text-slate-500">{formatCurrency(vehicle.costPrice)}</td>}
      <td className="px-4 py-2.5 font-semibold text-slate-800">{formatCurrency(vehicle.sellPrice)}</td>
      {canEdit && (
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
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
