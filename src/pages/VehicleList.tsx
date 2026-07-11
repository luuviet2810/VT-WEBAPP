// ====== VEHICLE LIST PAGE ======

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, User, ListChecks, ClipboardList, Fuel, Monitor, Camera, AlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal } from '../components/ui'
import VehicleFilterBar from '../components/VehicleFilterBar'
import { formatCurrency } from '../utils/format'
import { VehicleStatus, FuelLevel } from '../types'
import { getVehicleWorkflowStatus, WORKFLOW_STATUS_TONE, WORKFLOW_STATUS_LABEL } from '../utils/vehicleWorkflow'

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

const FUEL_LABELS: Record<FuelLevel, string> = {
  empty: 'Cạn',
  quarter: '1/4',
  half: '1/2',
  full: 'Đầy',
}

export default function VehicleList() {
  const vehicles = useStore((s) => s.vehicles)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const checkSheets = useStore((s) => s.checkSheets)
  const tasks = useStore((s) => s.tasks)
  const [filters, setFilters] = useState({
    query: '',
    status: 'all',
    positionId: 'all',
    assigneeId: 'all',
  })
  const [previewSheet, setPreviewSheet] = useState<typeof checkSheets[0] | null>(null)
  const [previewType, setPreviewType] = useState<'in' | 'out'>('in')

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return vehicles
      .filter((v) => {
        const matchesQuery = !q || v.plate.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
        const matchesPosition = filters.positionId === 'all' || v.positionId === filters.positionId
        const matchesStatus = filters.status === 'all' || v.status === filters.status
        const matchesAssignee =
          filters.assigneeId === 'all' ||
          (filters.assigneeId === 'unassigned' && !v.assigneeId) ||
          v.assigneeId === filters.assigneeId
        return matchesQuery && matchesPosition && matchesStatus && matchesAssignee
      })
      .sort((a, b) => a.plate.localeCompare(b.plate))
  }, [vehicles, tasks, filters])

  // Get latest check sheets for a vehicle
  const getLatestCheckSheets = (vehicleId: string) => {
    const vehicleSheets = checkSheets.filter((c) => c.vehicleId === vehicleId)
    const latestIn = vehicleSheets.filter((c) => c.type === 'in').sort((a, b) => (a.checkDate < b.checkDate ? 1 : -1))[0]
    const latestOut = vehicleSheets.filter((c) => c.type === 'out').sort((a, b) => (a.checkDate < b.checkDate ? 1 : -1))[0]
    return { latestIn, latestOut }
  }

  const handleOpenPreview = (vehicleId: string, type: 'in' | 'out') => {
    const sheets = getLatestCheckSheets(vehicleId)
    setPreviewSheet(type === 'in' ? sheets.latestIn : sheets.latestOut)
    setPreviewType(type)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Danh sách xe</h1>
        <p className="mt-1 text-sm text-slate-500">
          {vehicles.length} xe trong hệ thống — thêm xe mới tại{' '}
          <Link to="/bang-gia" className="text-brand-600 hover:underline">
            Bảng giá
          </Link>
        </p>
      </div>

      <VehicleFilterBar onFilterChange={setFilters} />

      {/* Vehicle Grid */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Car size={36} />} title="Không tìm thấy xe nào" subtitle="Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 2xl:grid-cols-5">
          {filtered.map((v) => {
            const position = positions.find((p) => p.id === v.positionId)
            const assignee = employees.find((e) => e.id === v.assigneeId)
            const { latestIn, latestOut } = getLatestCheckSheets(v.id)
            const hasCheckSheet = !!latestIn || !!latestOut
            const vehicleSheets = checkSheets.filter((c) => c.vehicleId === v.id)
            const vehicleTasks = tasks.filter((t) => t.vehicleId === v.id)
            const workflowStatus = getVehicleWorkflowStatus(v, vehicleTasks, vehicleSheets)

            return (
              <Link
                key={v.id}
                to={`/xe/${v.id}`}
                className="card group overflow-hidden transition hover:shadow-md hover:-translate-y-0.5 text-sm"
              >
                {/* Vehicle Image */}
                <div className="aspect-[16/9] max-h-44 w-full overflow-hidden bg-slate-100">
                  {v.images[0] ? (
                    <img src={v.images[0]} alt={v.model} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Car size={40} />
                    </div>
                  )}
                </div>
                
                {/* Vehicle Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-bold text-slate-900">{v.plate || '—'}</span>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={WORKFLOW_STATUS_TONE[workflowStatus]}>{WORKFLOW_STATUS_LABEL[workflowStatus]}</Badge>
                      <Badge tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                      {hasCheckSheet && (
                        <div className="flex items-center gap-1 text-xs text-brand-600">
                          <ListChecks size={12} />
                          <span>Đã kiểm tra</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">{v.model}</div>
                  
                  {/* Position */}
                  {position && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-brand-600">{position.name}</span>
                    </div>
                  )}
                  
                  {/* Assignee */}
                  {assignee ? (
                    <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                      <User size={12} />
                      {assignee.name}
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <User size={12} />
                      Chưa phân công
                    </div>
                  )}
                  
                  {/* Price */}
                  {v.sellPrice !== undefined && (
                    <div className="mt-1 text-sm font-bold text-slate-700">{formatCurrency(v.sellPrice)} đ</div>
                  )}
                  
                  {/* Quick CheckSheet Preview */}
                  {hasCheckSheet && (
                    <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                      {latestIn && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleOpenPreview(v.id, 'in') }}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                        >
                          <ClipboardList size={12} />
                          Đầu vào
                        </button>
                      )}
                      {latestOut && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleOpenPreview(v.id, 'out') }}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-purple-50 px-2 py-1.5 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-100"
                        >
                          <ClipboardList size={12} />
                          Đầu ra
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* CheckSheet Preview Modal */}
      <Modal
        open={!!previewSheet}
        onClose={() => setPreviewSheet(null)}
        title={previewType === 'in' ? 'CheckSheet Đầu vào' : 'CheckSheet Đầu ra'}
      >
        {previewSheet ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-500">
              Ngày: {previewSheet.checkDate} • 
              {previewSheet.checkerId && ` Người kiểm tra: ${employees.find((e) => e.id === previewSheet.checkerId)?.name || '—'}`}
            </div>

            {/* Fuel Level */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
              <Fuel size={16} className="text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Nhiên liệu:</span>
              <span className="text-sm text-slate-600">{FUEL_LABELS[previewSheet.fuelLevel]}</span>
            </div>

            {/* Status Items */}
            <div className="space-y-2">
              {[
                { label: 'Màn hình/Bluetooth', value: previewSheet.screen, icon: Monitor },
                { label: 'Camera lùi', value: previewSheet.rearCamera, icon: Camera },
                { label: 'Hipass', value: previewSheet.hipass, icon: AlertCircle },
                { label: 'Cảm biến', value: previewSheet.rearSensor, icon: AlertCircle },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <item.icon size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    (item.value as string) === 'ok' || (item.value as string) === 'normal' || (item.value as string) === 'android' || (item.value as string) === 'mirror' || (item.value as string) === 'device' || (item.value as string) === 'good' ? 'text-green-600' :
                    (item.value as string) === 'error' || (item.value as string) === 'broken' || (item.value as string) === 'blurry' ? 'text-red-600' :
                    'text-slate-400'
                  }`}>
                    {(item.value as string) === 'ok' || (item.value as string) === 'normal' || (item.value as string) === 'android' || (item.value as string) === 'mirror' || (item.value as string) === 'device' || (item.value as string) === 'good' ? 'OK' :
                     (item.value as string) === 'error' || (item.value as string) === 'broken' || (item.value as string) === 'blurry' ? 'Lỗi' : 'Không có'}
                  </span>
                </div>
              ))}
            </div>

            {/* OutCheck if exists */}
            {previewType === 'out' && previewSheet.outCheck && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700">Kiểm tra đầu ra:</div>
                {Object.entries(previewSheet.outCheck).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="text-sm text-slate-700">{key}</span>
                    <span className={`text-sm font-medium ${
                      value.status === 'ok' ? 'text-green-600' :
                      value.status === 'error' ? 'text-red-600' :
                      'text-slate-400'
                    }`}>
                      {value.status === 'ok' ? 'OK' : value.status === 'error' ? 'Lỗi' : 'Không có'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Read-only notice */}
            <div className="text-center text-xs text-slate-400">
              Chỉ có thể xem. Không thể chỉnh sửa.
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400">
            Chưa có dữ liệu CheckSheet.
          </div>
        )}
      </Modal>
    </div>
  )
}
