// ====== VEHICLE LIST PAGE ======

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, ListChecks, ClipboardList, Fuel, Monitor, Camera, AlertCircle, Wrench, CheckCircle2, XCircle, Minus, StickyNote, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal } from '../components/ui'
import VehicleFilterBar from '../components/VehicleFilterBar'
import { formatCurrency } from '../utils/format'
import { VehicleStatus, FuelLevel, CheckSheet } from '../types'
import { classifyStatus, statusLabel } from '../utils/statusClassification'
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
    sortBy: 'default' as 'default' | 'price_asc' | 'price_desc',
    priceMin: 0,
    priceMax: 110000000,
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
        if (v.status === 'sold') return false
        const matchesQuery = !q || v.plate.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
        const matchesPosition = filters.positionId === 'all' || v.positionId === filters.positionId
        const matchesStatus = filters.status === 'all' || v.status === filters.status
        const matchesAssignee =
          filters.assigneeId === 'all' ||
          v.assigneeId === filters.assigneeId
        const price = v.sellPrice ?? 0
        const matchesPrice = price >= filters.priceMin && price <= filters.priceMax
        return matchesQuery && matchesPosition && matchesStatus && matchesAssignee && matchesPrice
      })
      .sort((a, b) => {
        if (filters.sortBy === 'price_asc') return (a.sellPrice ?? 0) - (b.sellPrice ?? 0)
        if (filters.sortBy === 'price_desc') return (b.sellPrice ?? 0) - (a.sellPrice ?? 0)
        return a.plate.localeCompare(b.plate)
      })
  }, [vehicles, tasks, filters])

  // Get latest check sheets for a vehicle
  const getLatestCheckSheets = (vehicleId: string) => {
    const vehicleSheets = checkSheets.filter((c) => c.vehicleId === vehicleId)
    const byCreatedAt = (a: typeof checkSheets[0], b: typeof checkSheets[0]) => (a.createdAt < b.createdAt ? 1 : -1)
    const latestIn = vehicleSheets.filter((c) => c.type === 'in').sort(byCreatedAt)[0]
    const latestOut = vehicleSheets.filter((c) => c.type === 'out').sort(byCreatedAt)[0]
    return { latestIn, latestOut }
  }

  const handleOpenPreview = (vehicleId: string, type: 'in' | 'out') => {
    const sheets = getLatestCheckSheets(vehicleId)
    const picked = type === 'in' ? sheets.latestIn : sheets.latestOut
    console.log('🔍 handleOpenPreview:', { vehicleId, type, pickedId: picked?.id, pickedVehicle: picked?.vehicleId, checkDate: picked?.checkDate, createdAt: picked?.createdAt })
    setPreviewSheet(picked)
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
          {filtered.length} xe
          <span className="ml-2 text-slate-400">— thêm xe mới tại{' '}
          <Link to="/bang-gia" className="text-brand-600 hover:underline">
            Bảng giá
          </Link></span>
        </p>
      </div>

      <VehicleFilterBar onFilterChange={setFilters} />

      {/* Vehicle Grid */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Car size={36} />} title="Không tìm thấy xe nào" subtitle="Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-[390px]:grid-cols-2 min-[391px]:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5">
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
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {v.images[0] ? (
                    <img src={v.images[0]} alt={v.model} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Car size={24} />
                    </div>
                  )}
                </div>

                {/* Vehicle Info */}
                <div className="p-2.5 pb-2 sm:p-3 sm:pb-2.5">
                  <div className="flex items-start justify-between gap-1">
                    <span className="truncate text-sm font-bold text-slate-900 sm:text-base">{v.plate || '—'}</span>
                    <Badge tone={WORKFLOW_STATUS_TONE[workflowStatus]}>{WORKFLOW_STATUS_LABEL[workflowStatus]}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 sm:text-sm">{v.model}</div>

                  {/* Price */}
                  {v.sellPrice != null && (
                    <div className="mt-0.5 text-xs font-bold text-slate-700 sm:text-sm">{formatCurrency(v.sellPrice)} đ</div>
                  )}

                  {/* Badges row — hidden on very small screens */}
                  <div className="mt-1 hidden flex-wrap items-center gap-1 sm:flex">
                    <Badge tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                    {hasCheckSheet && (
                      <span className="flex items-center gap-0.5 text-[10px] text-brand-600">
                        <ListChecks size={9} />
                        Đã kiểm tra
                      </span>
                    )}
                  </div>

                  {/* Quick Actions — 3 equal columns, never overflow */}
                  <div className="mt-2 grid min-w-0 grid-cols-3 gap-1.5 border-t border-slate-100 pt-2 sm:mt-2.5 sm:flex sm:pt-2.5">
                    {/* Nhiệm vụ */}
                    <button
                      onClick={(e) => { e.preventDefault(); setSelectedTaskVehicleId(v.id) }}
                      className={`flex min-w-0 items-center justify-center overflow-hidden rounded-lg text-xs font-medium transition-colors sm:min-h-[44px] sm:flex-1 sm:gap-1.5 sm:px-3 ${
                        vehicleTasks.length === 0
                          ? 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                          : vehicleTasks.every((t) => t.status === 'done')
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : vehicleTasks.some((t) => t.status !== 'done' && (t.priority === 'high' || t.priority === 'urgent'))
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                      aria-label="Nhiệm vụ"
                    >
                      <Wrench size={14} className="shrink-0" />
                      <span className="hidden sm:inline truncate">Nhiệm vụ</span>
                      {vehicleTasks.filter((t) => t.status !== 'done').length > 0 && (
                        <span className="hidden sm:inline shrink-0">({vehicleTasks.filter((t) => t.status !== 'done').length})</span>
                      )}
                    </button>
                    {/* Đầu vào */}
                    <button
                      onClick={(e) => { e.preventDefault(); handleOpenPreview(v.id, 'in') }}
                      className={`flex min-w-0 items-center justify-center overflow-hidden rounded-lg text-xs font-medium transition-colors sm:min-h-[44px] sm:flex-1 sm:gap-1.5 sm:px-3 ${
                        latestIn ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                      aria-label="Đầu vào"
                    >
                      <ClipboardList size={14} className="shrink-0" />
                      <span className="hidden sm:inline truncate">Đầu vào</span>
                    </button>
                    {/* Đầu ra */}
                    <button
                      onClick={(e) => { e.preventDefault(); handleOpenPreview(v.id, 'out') }}
                      className={`flex min-w-0 items-center justify-center overflow-hidden rounded-lg text-xs font-medium transition-colors sm:min-h-[44px] sm:flex-1 sm:gap-1.5 sm:px-3 ${
                        latestOut ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                      aria-label="Đầu ra"
                    >
                      <ClipboardList size={14} className="shrink-0" />
                      <span className="hidden sm:inline truncate">Đầu ra</span>
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
        {previewSheet ? (
          <CheckSheetPreview sheet={previewSheet} mode={previewType} employees={employees} vehicleId={previewSheet.vehicleId} />
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

// ====== UNIFIED CHECKSHEET PREVIEW ======

function CheckSheetPreview({ sheet, mode, employees, vehicleId }: { sheet: CheckSheet; mode: 'in' | 'out'; employees: { id: string; name: string }[]; vehicleId: string }) {
  const navigate = useNavigate()

  const seatLabels: Record<string, string> = { driverSeat: 'Ghế lái', passengerSeat: 'Ghế phụ', rearSeat: 'Hàng ghế sau' }
  const spotLabels: Record<string, string> = {
    frontBumper: 'Cản trước', rearBumper: 'Cản sau', leftFender: 'Càng A trái', rightFender: 'Càng A phải',
    driverDoor: 'Cửa lái', passengerDoor: 'Cửa phụ', rearLeftDoor: 'Cửa sau trái', rearRightDoor: 'Cửa sau phải',
  }

  const items: { label: string; status: string | null | undefined }[] = mode === 'in'
    ? [
        { label: 'Nhiên liệu', status: sheet.fuelLevel },
        { label: 'Màn hình', status: sheet.screen },
        { label: 'Camera lùi', status: sheet.rearCamera },
        { label: 'Hi-Pass', status: sheet.hipass },
        { label: 'Cảm biến lùi', status: sheet.rearSensor },
        { label: 'Camera hành trình', status: sheet.dashcam },
        { label: 'Điều hòa', status: sheet.inputDieuHoa?.status },
        { label: 'Sưởi ghế', status: sheet.inputSuoiGhe?.status },
        { label: 'Tình trạng lốp', status: sheet.inputTireState?.status },
        { label: 'Song nưng', status: sheet.songNungResultStatus },
        ...Object.entries(sheet.interior || {}).map(([key, val]) => ({ label: seatLabels[key] || key, status: (val as any)?.condition })),
        ...Object.entries(sheet.exterior || {}).map(([key, val]) => ({ label: spotLabels[key] || key, status: (val as any)?.condition })),
        { label: 'Ắc quy SOH', status: sheet.inputAcquySOH != null ? String(sheet.inputAcquySOH) : null },
        { label: 'Ắc quy SOC', status: sheet.inputAcquySOC != null ? String(sheet.inputAcquySOC) : null },
        { label: 'Chìa khóa', status: sheet.keyType },
        { label: 'Số lượng chìa', status: sheet.smartkeyStatus },
      ]
    : (() => {
        const oc = sheet.outCheck
        return [
          { label: 'Còn Song nưng không?', status: oc?.conSeongnyeong?.status },
          { label: 'Dầu máy', status: oc?.dauMay?.status },
          { label: 'Nước làm mát', status: oc?.nuocLamMat?.status },
          { label: 'Cam hành trình', status: oc?.camHanhTrinh?.status },
          { label: 'Màn hình, Bluetooth', status: oc?.manHinhBluetooth?.status },
          { label: 'Camera lùi', status: oc?.cameraLui?.status },
          { label: 'Đèn (Pha, Cốt, Cảnh báo, Phanh)', status: oc?.denPhaCot?.status },
          { label: 'Motor gương, nút bấm', status: oc?.motorGuongNutBam?.status },
          { label: 'Điều hòa', status: oc?.dieuHoa?.status },
          { label: 'Sưởi ghế', status: oc?.suoiGhe?.status },
          { label: 'Cửa sổ', status: oc?.cuaSo?.status },
          { label: 'Ghế chỉnh điện', status: oc?.gheChinhDien?.status },
          { label: 'Tình trạng lốp', status: oc?.tinhTrangLop?.status },
          { label: 'Lốp xe', status: sheet.outTireState?.status },
          { label: 'Ắc quy SOH', status: sheet.acquySOH != null ? String(sheet.acquySOH) : null },
          { label: 'Ắc quy SOC', status: sheet.acquySOC != null ? String(sheet.acquySOC) : null },
          { label: 'Chìa khóa', status: sheet.outKeyType },
          { label: 'Số lượng chìa', status: sheet.outSmartkeyStatus },
          { label: 'Song nưng', status: sheet.songNungResultStatus },
        ]
      })()

  // Summary — Hi-Pass is informational only, never counted
  let ok = 0, bad = 0, install = 0, unchecked = 0
  for (const item of items) {
    if (item.label === 'Hi-Pass') continue
    if (item.label === 'Số lượng chìa') {
      if (item.status === 'one' || item.status === 'two') ok++
      else if (item.status === 'damaged') bad++
      else if (!item.status) unchecked++
      continue
    }
    if (!item.status) { unchecked++; continue }
    if (!isNaN(Number(item.status))) { ok++; continue }
    const c = classifyStatus(item.status)
    if (c === 'ok') ok++
    else if (c === 'bad') bad++
    else if (c === 'install') { bad++; install++ }
  }

  const abnormal = items.filter((i) => {
    if (i.label === 'Hi-Pass') return false
    if (i.label === 'Số lượng chìa') return i.status === 'damaged'
    if (!i.status) return false
    if (!isNaN(Number(i.status))) return false
    const c = classifyStatus(i.status)
    return c === 'bad' || c === 'install'
  }).slice(0, 5)

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        <SummaryPill value={ok} label="OK" color="#34c759" />
        <SummaryPill value={bad} label="Hỏng" color="#ff3b30" />
        <SummaryPill value={install} label="Cần lắp" color="#ff9500" />
        <SummaryPill value={unchecked} label="Chưa check" color="#94a3b8" />
      </div>

      {/* All Inspection Items */}
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {items.map((item) => {
          const isBatteryNum = !!(item.status && !isNaN(Number(item.status)))
          const c = item.status && !isBatteryNum ? classifyStatus(item.status) : null
          const isUnchecked = !item.status
          const dotColor = isUnchecked ? '#cbd5e1' : c === 'ok' || isBatteryNum ? '#34c759' : c === 'bad' ? '#ff3b30' : c === 'install' ? '#ff9500' : '#cbd5e1'
          const textColor = isUnchecked ? '#94a3b8' : c === 'ok' || isBatteryNum ? '#34c759' : c === 'bad' ? '#ff3b30' : c === 'install' ? '#ff9500' : '#334155'
          const display = isBatteryNum ? `${item.status}%` : statusLabel(item.status)
          return (
            <div key={item.label} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor }} />
                <span className="text-sm text-slate-700">{item.label}</span>
              </div>
              <span className="text-sm font-medium" style={{ color: textColor }}>{display}</span>
            </div>
          )
        })}
      </div>

      {/* Abnormal items summary */}
      {abnormal.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm font-semibold text-red-700">{abnormal.length} hạng mục cần xử lý</div>
          <ul className="mt-1 space-y-0.5">
            {abnormal.map((item) => (
              <li key={item.label} className="text-xs text-red-600">• {item.label}: {statusLabel(item.status)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
          ✅ Không phát hiện hạng mục bất thường
        </div>
      )}

      {/* Action button */}
      <div className="flex justify-end">
        <button type="button" onClick={() => { navigate(`/xe/${vehicleId}?tab=checksheet`) }} className="btn-primary">
          <ExternalLink size={15} /> Xem chi tiết
        </button>
      </div>
    </div>
  )
}

// ====== SUMMARY PILL ======

function SummaryPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: `${color}1a` }}>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] font-medium mt-0.5" style={{ color, opacity: 0.7 }}>{label}</div>
    </div>
  )
}
