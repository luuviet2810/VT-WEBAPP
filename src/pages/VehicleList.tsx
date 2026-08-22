// ====== VEHICLE LIST PAGE ======

import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, LogIn, LogOut, Fuel, Monitor, Camera, AlertCircle, Wrench, CheckCircle2, XCircle, Minus, StickyNote, ExternalLink, X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal } from '../components/ui'
import VehicleFilterBar from '../components/VehicleFilterBar'
import { formatCurrency } from '../utils/format'
import { VehicleStatus, FuelLevel, CheckSheet, Vehicle } from '../types'
import { classifyStatus, statusLabel } from '../utils/statusClassification'
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

// ===== TEMP RENDER INSTRUMENTATION [PERF] — remove after measuring =====
// Flip this to true to render cards WITHOUT images and compare FPS/jank.
const DEV_DISABLE_IMAGES = false
let gVlRender = 0
let gLastScrollAt = 0
const gCardRenders = new Map<string, number>()
const gRenderTimings: number[] = []
if (typeof window !== 'undefined') {
  console.log('[PERF] VehicleList module loaded — scroll listener attached')
  window.addEventListener('scroll', () => { gLastScrollAt = performance.now() }, { passive: true })
}

// ===== VEHICLE CARD (React.memo — prevents unnecessary re-renders) =====
const VehicleCard = memo(function VehicleCard({
  vehicle: v,
  positionName,
  hasIn,
  hasOut,
  pendingCount,
  highPriorityPending,
  onTaskClick,
  onPreviewIn,
  onPreviewOut,
  onImageClick,
}: {
  vehicle: Vehicle
  positionName: string | null
  hasIn: boolean
  hasOut: boolean
  pendingCount: number
  highPriorityPending: boolean
  onTaskClick: (id: string) => void
  onPreviewIn: (id: string) => void
  onPreviewOut: (id: string) => void
  onImageClick: (id: string, index: number) => void
}) {
  // [PERF] card render counter
  if (DEV_DISABLE_IMAGES) {
    gCardRenders.set(v.id, (gCardRenders.get(v.id) || 0) + 1)
    const cardSeq = gCardRenders.get(v.id)!
    if (cardSeq <= 5) {
      console.log(`[PERF] Card render ${v.plate} #${cardSeq} (list render #${gVlRender})`)
    }
  }

  return (
    <Link key={v.id} to={`/xe/${v.id}`} className="card group overflow-hidden transition-transform hover:-translate-y-0.5 text-sm">
      {/* Vehicle Image — clickable for preview */}
      <div className="aspect-[4/2.2] w-full overflow-hidden bg-slate-100 cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onImageClick(v.id, 0) }}>
        {!DEV_DISABLE_IMAGES && v.images[0] ? (
          <img src={v.thumbnails?.[v.images[0]] ?? v.images[0]} alt={v.model} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Car size={24} />
          </div>
        )}
      </div>

      {/* Vehicle Info — 2-column layout */}
      <div className="p-2.5 sm:p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm font-semibold text-slate-800">{v.model}</div>
            <div className="mt-0.5 text-xs font-bold text-slate-700">
              {v.sellPrice != null ? `${formatCurrency(v.sellPrice)} đ` : '—'}
            </div>
            <div className="mt-0.5 truncate text-xs text-brand-600">📍 {positionName ?? '—'}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-bold text-slate-900">{v.plate || '—'}</div>
            <div className="mt-0.5">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[v.status] === 'green' ? 'bg-green-100 text-green-700' : STATUS_TONE[v.status] === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                {STATUS_LABEL[v.status]}
              </span>
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">{v.yardPosition || '—'}</div>
          </div>
        </div>

        {/* Quick Actions — icon only, 3 equal columns */}
        <div className="mt-2 grid min-w-0 grid-cols-3 gap-1.5 border-t border-slate-100 pt-2">
          <button
            onClick={(e) => { e.preventDefault(); onTaskClick(v.id) }}
            className={`flex h-10 items-center justify-center overflow-hidden rounded-lg transition-colors ${
              pendingCount === 0
                ? 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                : highPriorityPending
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            }`}
            aria-label="Nhiệm vụ" title="Nhiệm vụ"
          >
            <Wrench size={17} className="shrink-0" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onPreviewIn(v.id) }}
            className={`flex h-10 items-center justify-center overflow-hidden rounded-lg transition-colors ${
              hasIn ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
            aria-label="Đầu vào" title="Đầu vào"
          >
            <LogIn size={17} className="shrink-0" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onPreviewOut(v.id) }}
            className={`flex h-10 items-center justify-center overflow-hidden rounded-lg transition-colors ${
              hasOut ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
            aria-label="Đầu ra" title="Đầu ra"
          >
            <LogOut size={17} className="shrink-0" />
          </button>
        </div>
      </div>
    </Link>
  )
})

// ===== IMAGE PREVIEW LIGHTBOX =====

function ImagePreviewModal({ images, plate, model, initialIndex, onClose }: {
  images: string[]
  plate: string
  model: string
  initialIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIndex)
  const currentUrl = images[idx]

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && idx > 0) setIdx(idx - 1)
      if (e.key === 'ArrowRight' && idx < images.length - 1) setIdx(idx + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [idx, images.length, onClose])

  // Touch swipe
  const touchStart = useRef(0)
  const touchEnd = useRef(0)

  async function downloadCurrent() {
    try {
      const response = await fetch(currentUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${plate}_${String(idx + 1).padStart(2, '0')}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {}
  }

  if (!currentUrl) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={onClose}>
      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X size={20} />
          </button>
          <span className="text-sm font-medium">{plate} — {model}</span>
        </div>
        <div className="flex items-center gap-3">
          {images.length > 1 && (
            <span className="text-xs text-white/60">{idx + 1} / {images.length}</span>
          )}
          <button onClick={downloadCurrent} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" title="Tải ảnh">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-2"
        onTouchStart={(e) => { touchStart.current = e.touches[0].clientX }}
        onTouchMove={(e) => { touchEnd.current = e.touches[0].clientX }}
        onTouchEnd={() => {
          const diff = touchStart.current - touchEnd.current
          if (Math.abs(diff) > 60) {
            if (diff > 0 && idx < images.length - 1) setIdx(idx + 1)
            if (diff < 0 && idx > 0) setIdx(idx - 1)
          }
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentUrl}
          alt={`${plate} ${idx + 1}`}
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Bottom nav */}
      {images.length > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-6 px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <button
            disabled={idx === 0}
            onClick={() => setIdx(idx - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="text-sm text-white/80">{idx + 1} / {images.length}</span>
          <button
            disabled={idx >= images.length - 1}
            onClick={() => setIdx(idx + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      )}
    </div>
  )
}

// ===== END VEHICLE CARD =====

export default function VehicleList() {
  const vehicles = useStore((s) => s.vehicles)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
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
  const [previewSheet, setPreviewSheet] = useState<CheckSheet | null>(null)
  const [previewType, setPreviewType] = useState<'in' | 'out'>('in')
  const [selectedTaskVehicleId, setSelectedTaskVehicleId] = useState<string | null>(null)
  const [previewVehicleId, setPreviewVehicleId] = useState<string | null>(null)
  const [previewImageIndex, setPreviewImageIndex] = useState(0)
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
  }, [vehicles, filters])

  // Get latest check sheets for a vehicle (reads Zustand directly, avoids stale closure)
  const getLatestCheckSheets = (vehicleId: string) => {
    const cs = useStore.getState().checkSheets
    const vehicleSheets = cs.filter((c) => c.vehicleId === vehicleId)
    const byCreatedAt = (a: typeof cs[0], b: typeof cs[0]) => (a.createdAt < b.createdAt ? 1 : -1)
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

  // Stable callbacks for VehicleCard memo
  const handleTaskClick = useCallback((id: string) => setSelectedTaskVehicleId(id), [])
  const handlePreviewIn = useCallback((id: string) => handleOpenPreview(id, 'in'), [])
  const handlePreviewOut = useCallback((id: string) => handleOpenPreview(id, 'out'), [])
  const handleImageClick = useCallback((id: string, idx: number) => { setPreviewVehicleId(id); setPreviewImageIndex(idx) }, [])

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

  // [PERF] render counter + reason tracker
  gVlRender++
  const renderStart = performance.now()
  const prev = useRef<Record<string, unknown>>({})
  const reasons: string[] = []
  const check = (label: string, val: unknown) => {
    if (gVlRender === 1) { prev.current[label] = val; return }
    if (prev.current[label] !== val) {
      reasons.push(label)
      prev.current[label] = val
    }
  }
  check('vehicles.len', vehicles.length)
  check('positions.len', positions.length)
  check('employees.len', employees.length)
  check('checkSheets.len', useStore.getState().checkSheets.length)
  check('tasks.len', tasks.length)
  check('filters', filters)
  check('previewSheet', previewSheet ? previewSheet?.id : null)
  check('previewType', previewType)
  check('selectedTaskVehicleId', selectedTaskVehicleId)

  if (gVlRender <= 100) {
    const nowMs = performance.now()
    const reasonLog = reasons.length ? reasons : (gVlRender === 1 ? '(initial mount)' : '(PARENT re-render — no local state changed)')
    console.log(`[PERF] VehicleList render #${gVlRender}`, {
      totalVehicles: vehicles.length,
      shown: filtered.length,
      withImage: filtered.filter((v) => v.images[0]).length,
      msSinceLastScroll: gLastScrollAt ? Math.round(nowMs - gLastScrollAt) : null,
      reasons: reasonLog,
      DEV_DISABLE_IMAGES,
    })
  }

  // [PERF] measure render-to-commit duration
  useEffect(() => {
    const elapsed = performance.now() - renderStart
    gRenderTimings.push(elapsed)
    if (gVlRender <= 100) {
      console.log(`[PERF] VehicleList render #${gVlRender} commit duration: ${elapsed.toFixed(1)}ms`)
    }
  })

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
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5" style={{ contentVisibility: 'auto' }}>
          {filtered.map((v) => {
            // [PERF] per-card render counter
            gCardRenders.set(v.id, (gCardRenders.get(v.id) || 0) + 1)
            const cardSeq = gCardRenders.get(v.id)!
            if (cardSeq <= 5) {
              console.log(`[PERF] Card render ${v.plate} #${cardSeq} (list render #${gVlRender})`)
            }

            const positionName = positions.find((p) => p.id === v.positionId)?.name ?? null
            const vehicleTasks = tasks.filter((t) => t.vehicleId === v.id)
            const pendingCount = vehicleTasks.filter((t) => t.status !== 'done').length
            const highPriorityPending = vehicleTasks.some((t) => t.status !== 'done' && (t.priority === 'high' || t.priority === 'urgent'))
            const { latestIn, latestOut } = getLatestCheckSheets(v.id)

            return (
              <VehicleCard
                key={v.id}
                vehicle={v}
                positionName={positionName}
                hasIn={!!latestIn}
                hasOut={!!latestOut}
                pendingCount={pendingCount}
                highPriorityPending={highPriorityPending}
                onTaskClick={handleTaskClick}
                onPreviewIn={handlePreviewIn}
                onPreviewOut={handlePreviewOut}
                onImageClick={handleImageClick}
              />
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

      {/* Image Preview Lightbox */}
      {previewVehicleId && (() => {
        const v = vehicles.find((x) => x.id === previewVehicleId)
        if (!v || !v.images.length) return null
        return (
          <ImagePreviewModal
            images={v.images}
            plate={v.plate}
            model={v.model}
            initialIndex={Math.min(previewImageIndex, v.images.length - 1)}
            onClose={() => { setPreviewVehicleId(null); setPreviewImageIndex(0) }}
          />
        )
      })()}
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
        { label: 'Kiểm tra gầm', status: sheet.undercarriageStatus },
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
        { label: 'Kiểm tra gầm', status: sheet.undercarriageStatus },
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
