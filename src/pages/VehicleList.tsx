// ====== VEHICLE LIST PAGE ======

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, User, ListChecks, ClipboardList, Fuel, Monitor, Camera, AlertCircle, Wrench, CheckCircle2, XCircle, Minus, StickyNote, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal } from '../components/ui'
import VehicleFilterBar from '../components/VehicleFilterBar'
import { formatCurrency } from '../utils/format'
import { VehicleStatus, FuelLevel, CheckSheet } from '../types'
import { classifyStatus } from '../utils/statusClassification'
import { getVehicleWorkflowStatus, WORKFLOW_STATUS_TONE, WORKFLOW_STATUS_LABEL } from '../utils/vehicleWorkflow'
import TaskDrawer from '../components/tasks/TaskDrawer'
import type { VehicleGroup } from '../components/tasks/VehicleTaskCard'

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
  const [selectedTaskVehicleId, setSelectedTaskVehicleId] = useState<string | null>(null)
  const toggleTaskChecklistItem = useStore((s) => s.toggleTaskChecklistItem)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const addTask = useStore((s) => s.addTask)

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

  // Build group for TaskDrawer
  const taskDrawerGroup = useMemo<VehicleGroup | null>(() => {
    if (!selectedTaskVehicleId) return null
    const v = vehicles.find((x) => x.id === selectedTaskVehicleId)
    if (!v) return null
    const vehicleTasks = tasks.filter((t) => t.vehicleId === v.id)
    const total = vehicleTasks.length
    const done = vehicleTasks.filter((t) => t.status === 'done').length
    const pos = positions.find((p) => p.id === v.positionId)
    return {
      vehicleId: v.id,
      vehicle: { plate: v.plate, model: v.model, positionId: v.positionId, images: v.images },
      positionName: pos?.name ?? null,
      tasks: vehicleTasks,
      total,
      done,
      section: 'todo' as const,
    }
  }, [selectedTaskVehicleId, vehicles, tasks, positions])

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
                  
                  {/* Quick Actions */}
                  <div className="mt-3 flex gap-1.5 border-t border-slate-100 pt-3">
                    {/* Nhiệm vụ */}
                    <button
                      onClick={(e) => { e.preventDefault(); setSelectedTaskVehicleId(v.id) }}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                        vehicleTasks.length === 0
                          ? 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                          : vehicleTasks.every((t) => t.status === 'done')
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : vehicleTasks.some((t) => t.status !== 'done' && (t.priority === 'high' || t.priority === 'urgent'))
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      <Wrench size={12} />
                      Nhiệm vụ
                      {vehicleTasks.filter((t) => t.status !== 'done').length > 0 && (
                        <span>({vehicleTasks.filter((t) => t.status !== 'done').length})</span>
                      )}
                    </button>
                    {/* Đầu vào */}
                    <button
                      onClick={(e) => { e.preventDefault(); handleOpenPreview(v.id, 'in') }}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                        latestIn ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <ClipboardList size={12} />
                      Đầu vào
                    </button>
                    {/* Đầu ra */}
                    <button
                      onClick={(e) => { e.preventDefault(); handleOpenPreview(v.id, 'out') }}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                        latestOut ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <ClipboardList size={12} />
                      Đầu ra
                    </button>
                  </div>
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
        subtitle={previewSheet ? (
          <span className="text-sm text-slate-400">
            {previewSheet.checkDate}
            {previewSheet.checkerId && (
              <> • {employees.find((e) => e.id === previewSheet.checkerId)?.name || '—'}</>
            )}
          </span>
        ) : undefined}
      >
        {previewSheet && previewType === 'in' ? (
          <InCheckSheetPreview sheet={previewSheet} employees={employees} vehicleId={previewSheet.vehicleId} />
        ) : previewSheet && previewType === 'out' ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-500">
              Ngày: {previewSheet.checkDate} •
              {previewSheet.checkerId && ` Người kiểm tra: ${employees.find((e) => e.id === previewSheet.checkerId)?.name || '—'}`}
            </div>
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

      <TaskDrawer
        open={!!selectedTaskVehicleId && !!taskDrawerGroup}
        onClose={() => setSelectedTaskVehicleId(null)}
        selectedVehicleId={selectedTaskVehicleId}
        groups={taskDrawerGroup ? [taskDrawerGroup] : []}
        onToggleChecklist={toggleTaskChecklistItem}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
        onAddTask={addTask}
        employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        vehicles={vehicles.map((v) => ({ id: v.id, plate: v.plate }))}
        positionName={taskDrawerGroup?.positionName ?? null}
      />
    </div>
  )
}

// ====== INPUT CHECKSHEET PREVIEW ======

function InCheckSheetPreview({ sheet, employees, vehicleId }: { sheet: CheckSheet; employees: { id: string; name: string }[]; vehicleId: string }) {
  const navigate = useNavigate()

  // Collect all inspection items with their statuses and labels
  const items: { label: string; status: string; good: boolean }[] = []

  // Options
  items.push({ label: 'Màn hình', status: sheet.screen, good: ['normal', 'android'].includes(sheet.screen) })
  items.push({ label: 'Camera lùi', status: sheet.rearCamera, good: sheet.rearCamera === 'ok' })
  items.push({ label: 'Cảm biến lùi', status: sheet.rearSensor, good: sheet.rearSensor === 'ok' })
  items.push({ label: 'Camera hành trình', status: sheet.dashcam, good: sheet.dashcam === 'good' })
  items.push({ label: 'Điều hòa', status: sheet.inputDieuHoa?.status || 'good', good: sheet.inputDieuHoa?.status === 'good' })
  items.push({ label: 'Sưởi ghế', status: sheet.inputSuoiGhe?.status || 'none', good: sheet.inputSuoiGhe?.status === 'good' || sheet.inputSuoiGhe?.status === 'none' })
  items.push({ label: 'Tình trạng lốp', status: sheet.inputTireState?.status || 'ok', good: sheet.inputTireState?.status === 'ok' })

  // Interior
  const seatLabels: Record<string, string> = { driverSeat: 'Ghế lái', passengerSeat: 'Ghế phụ', rearSeat: 'Hàng ghế sau' }
  for (const [key, val] of Object.entries(sheet.interior || {})) {
    const v = val as { condition?: string }
    items.push({ label: seatLabels[key] || key, status: v?.condition || 'good', good: v?.condition === 'good' })
  }

  // Exterior
  const spotLabels: Record<string, string> = { frontBumper: 'Cản trước', rearBumper: 'Cản sau', leftFender: 'Càng A trái', rightFender: 'Càng A phải', driverDoor: 'Cửa lái', passengerDoor: 'Cửa phụ', rearLeftDoor: 'Cửa sau trái', rearRightDoor: 'Cửa sau phải' }
  for (const [key, val] of Object.entries(sheet.exterior || {})) {
    const v = val as { condition?: string }
    items.push({ label: spotLabels[key] || key, status: v?.condition || 'good', good: v?.condition === 'good' || v?.condition === 'polish' || v?.condition === 'touchup' })
  }

  // Calculate summary
  let ok = 0, bad = 0, install = 0, noteCount = 0
  for (const item of items) {
    const c = classifyStatus(item.status)
    if (c === 'ok') ok++
    else if (c === 'bad') bad++
    else if (c === 'install') { bad++; install++ }
  }

  // Abnormal items (not good)
  const abnormal = items.filter((i) => !i.good)

  // Fuel label
  const fuelLabels: Record<string, string> = { empty: 'Báo vàng', quarter: 'Trên vạch đỏ', half: '2 vạch to (Nửa bình)', full: 'Đầy bình' }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: ok, label: 'OK', color: '#34c759', bg: 'rgba(52,199,89,0.1)' },
          { value: bad, label: 'Hỏng', color: '#ff3b30', bg: 'rgba(255,59,48,0.1)' },
          { value: install, label: 'Cần lắp', color: '#ff9500', bg: 'rgba(255,149,0,0.1)' },
          { value: noteCount, label: 'Ghi chú', color: '#8e8e93', bg: 'rgba(0,0,0,0.04)' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: stat.bg }}>
            <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[10px] font-medium mt-0.5" style={{ color: stat.color, opacity: 0.7 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* General Info */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Thông tin chung</div>
        <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.02)' }}>
          <span className="text-sm text-slate-600">Nhiên liệu</span>
          <span className="text-sm font-semibold text-slate-800">{fuelLabels[sheet.fuelLevel] || sheet.fuelLevel}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.02)' }}>
          <span className="text-sm text-slate-600">Hi-Pass</span>
          <span className="text-sm font-semibold text-slate-800">
            {sheet.hipass === 'mirror' ? 'Gương' : sheet.hipass === 'device' ? 'Thiết bị' : 'Không có'}
          </span>
        </div>
      </div>

      {/* Abnormal Items */}
      {abnormal.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Hạng mục cần xử lý ({abnormal.length})</div>
          {abnormal.map((item) => {
            const cl = classifyStatus(item.status)
            const dotColor = cl === 'bad' ? '#ff3b30' : cl === 'install' ? '#ff9500' : '#34c759'
            return (
              <div key={item.label} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.02)' }}>
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: dotColor }} />
                  <span className="text-sm text-slate-700">{item.label}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: dotColor }}>{item.status}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl px-4 py-6 text-center" style={{ background: 'rgba(52,199,89,0.06)' }}>
          <span className="text-sm font-medium text-emerald-700">✅ Không phát hiện hạng mục bất thường.</span>
        </div>
      )}

      {/* Bottom summary */}
      <div className="text-center text-xs text-slate-400">
        {abnormal.length > 0
          ? `Đã phát hiện ${abnormal.length} hạng mục cần xử lý`
          : 'Không có hạng mục cần xử lý'}
      </div>

      {/* Action button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { navigate(`/xe/${vehicleId}?tab=checksheet`) }}
          className="btn-primary"
        >
          <ExternalLink size={15} /> Xem chi tiết
        </button>
      </div>
    </div>
  )
}
