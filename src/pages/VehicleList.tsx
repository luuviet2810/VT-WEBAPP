// ====== VEHICLE LIST PAGE ======

import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, LogIn, LogOut, Fuel, Monitor, Camera, AlertCircle, Wrench, CheckCircle2, XCircle, Minus, StickyNote, ExternalLink, X, ChevronLeft, ChevronRight, Download, ListChecks, Globe, EyeOff, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal } from '../components/ui'
import VehicleFilterBar from '../components/VehicleFilterBar'
import { formatCurrency } from '../utils/format'
import { VehicleStatus, FuelLevel, CheckSheet, Vehicle } from '../types'
import { classifyStatus, statusLabel } from '../utils/statusClassification'
import * as vehicleMediaService from '../services/vehicleMedia.service'

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
  publicPending,
  onTaskClick,
  onPreviewIn,
  onPreviewOut,
  onNoteClick,
  onTogglePublic,
}: {
  vehicle: Vehicle
  positionName: string | null
  hasIn: boolean
  hasOut: boolean
  pendingCount: number
  highPriorityPending: boolean
  publicPending: boolean
  onTaskClick: (id: string) => void
  onPreviewIn: (id: string) => void
  onPreviewOut: (id: string) => void
  onNoteClick?: (id: string) => void
  onTogglePublic: (id: string) => void
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
      {/* Vehicle Image — click navigates to Vehicle Detail */}
      <div className="relative aspect-[4/2.2] w-full overflow-hidden bg-slate-100">
        {!DEV_DISABLE_IMAGES && v.images[0] ? (
          <img src={v.thumbnails?.[v.images[0]] ?? v.images[0]} alt={v.model} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Car size={24} />
          </div>
        )}
        {/* Public Web toggle — overlay góc trên phải, không đổi layout card */}
        <button
          type="button"
          title={v.isPublic ? 'Đang hiển thị trên website' : 'Đưa xe lên website'}
          aria-label={v.isPublic ? 'Đang hiển thị trên website' : 'Đưa xe lên website'}
          aria-pressed={!!v.isPublic}
          disabled={publicPending}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onTogglePublic(v.id)
          }}
          className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-colors disabled:cursor-wait disabled:opacity-70 ${
            v.isPublic
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-slate-900/55 text-slate-200 hover:bg-slate-900/75'
          }`}
        >
          {publicPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : v.isPublic ? (
            <Globe size={15} />
          ) : (
            <EyeOff size={15} />
          )}
        </button>
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

        {/* Note link — fixed height area to keep card layout stable */}
        <div className="h-5 px-1 flex items-center">
          {v.note ? (
            <button
              onClick={(e) => { e.preventDefault(); onNoteClick?.(v.id) }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600 transition-colors"
            >
              <StickyNote size={12} />
              Xem ghi chú
            </button>
          ) : null}
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

  // ====== PUBLIC WEB TOGGLE (nút trên mỗi card) ======
  const updateVehicle = useStore((s) => s.updateVehicle)
  const [pendingPublicId, setPendingPublicId] = useState<string | null>(null)
  const pendingPublicRef = useRef<string | null>(null)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((kind: 'success' | 'error', text: string) => {
    setToast({ kind, text })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  // Bật/tắt vehicles.is_public qua store action hiện có (optimistic update +
  // persist Supabase qua vehicleService.updateVehicle — không state riêng lẻ).
  // Trước khi BẬT: bắt buộc xe có ít nhất 1 ảnh category 'website'.
  // TẮT: luôn cho phép.
  const handleTogglePublic = useCallback(async (id: string) => {
    if (pendingPublicRef.current) return
    const v = useStore.getState().vehicles.find((x) => x.id === id)
    if (!v) return
    const next = !v.isPublic

    pendingPublicRef.current = id
    setPendingPublicId(id)
    try {
      if (next) {
        const rows = await vehicleMediaService.getVehicleImages(id)
        if (!rows.some((r) => r.category === 'website')) {
          showToast('error', 'Xe chưa có ảnh trên website. Hãy thêm ảnh trước khi đăng.')
          return
        }
      }
      await updateVehicle(id, { isPublic: next })
      const after = useStore.getState().vehicles.find((x) => x.id === id)
      if (after?.isPublic === next) {
        showToast(
          'success',
          next
            ? `Đã đăng ${v.model} (${v.plate || '—'}) lên website`
            : `Đã ẩn ${v.model} (${v.plate || '—'}) khỏi website`
        )
      }
      // Nếu lưu thất bại: store đã tự rollback + thông báo lỗi riêng
    } catch (err) {
      console.error('[VehicleList] Toggle is_public failed:', err)
      showToast('error', 'Không thể cập nhật hiển thị website. Vui lòng thử lại.')
    } finally {
      pendingPublicRef.current = null
      setPendingPublicId(null)
    }
  }, [showToast, updateVehicle])
  const [taskSummaryVehicleId, setTaskSummaryVehicleId] = useState<string | null>(null)
  const [notePreviewVehicleId, setNotePreviewVehicleId] = useState<string | null>(null)

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
  const handleTaskClick = useCallback((id: string) => setTaskSummaryVehicleId(id), [])
  const handlePreviewIn = useCallback((id: string) => handleOpenPreview(id, 'in'), [])
  const handlePreviewOut = useCallback((id: string) => handleOpenPreview(id, 'out'), [])
  const handleNoteClick = useCallback((id: string) => setNotePreviewVehicleId(id), [])

  // Build group for TaskDrawer
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
                publicPending={pendingPublicId === v.id}
                onTaskClick={handleTaskClick}
                onPreviewIn={handlePreviewIn}
                onPreviewOut={handlePreviewOut}
                onNoteClick={handleNoteClick}
                onTogglePublic={handleTogglePublic}
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

      {/* Task Summary Modal */}
      {taskSummaryVehicleId && (() => {
        const v = vehicles.find((x) => x.id === taskSummaryVehicleId)
        if (!v) return null
        const vehicleTasks = tasks.filter((t) => t.vehicleId === v.id)
        const todoTasks = vehicleTasks.filter((t) => t.status === 'todo' && !t.deferred)
        const deferredTasks = vehicleTasks.filter((t) => t.status === 'todo' && t.deferred)
        const doingTasks = vehicleTasks.filter((t) => t.status === 'doing')
        const doneTasks = vehicleTasks.filter((t) => t.status === 'done')
        const sections = [
          { label: 'Chưa làm', count: todoTasks.length, tasks: todoTasks, icon: '🔧', color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Chưa cần làm ngay', count: deferredTasks.length, tasks: deferredTasks, icon: '📌', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Đang làm', count: doingTasks.length, tasks: doingTasks, icon: '🟡', color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Đã làm', count: doneTasks.length, tasks: doneTasks, icon: '🟢', color: 'text-green-600', bg: 'bg-green-50' },
        ]
        const pos = positions.find((p) => p.id === v.positionId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTaskSummaryVehicleId(null)}>
            <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b px-5 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Nhiệm vụ xe {v.plate || '—'}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{v.model} · {pos?.name || '—'}</p>
                </div>
                <button onClick={() => setTaskSummaryVehicleId(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[65vh] overflow-y-auto space-y-4 px-5 py-4">
                {sections.map((s) => (
                  <div key={s.label}>
                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${s.bg}`}>
                      <span className={`text-sm font-semibold ${s.color}`}>{s.icon} {s.label}</span>
                      <span className={`text-sm font-bold ${s.color}`}>{s.count}</span>
                    </div>
                    {s.tasks.length > 0 && (
                      <div className="mt-1.5 space-y-1 pl-3">
                        {s.tasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                            {t.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {vehicleTasks.length === 0 && (
                  <div className="py-8 text-center text-sm text-slate-400">Chưa có nhiệm vụ nào</div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Note Preview Modal */}
      {notePreviewVehicleId && (() => {
        const v = vehicles.find((x) => x.id === notePreviewVehicleId)
        if (!v || !v.note) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNotePreviewVehicleId(null)}>
            <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b px-5 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Ghi chú xe</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{v.model} - {v.plate || '—'}</p>
                </div>
                <button onClick={() => setNotePreviewVehicleId(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap px-5 py-4 text-sm text-slate-700 leading-relaxed">
                {v.note}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Toast cho toggle "Hiển thị trên website" (pattern toast hiện có của project) */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.kind === 'success' ? 'bg-slate-800' : 'bg-red-600'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}

// ====== UNIFIED CHECKSHEET PREVIEW ======

// A4 portrait at 96dpi (210×297mm) — used to size the Đầu ra JPG export
const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123

function CheckSheetPreview({ sheet, mode, employees, vehicleId }: { sheet: CheckSheet; mode: 'in' | 'out'; employees: { id: string; name: string }[]; vehicleId: string }) {
  const navigate = useNavigate()
  const exportRef = useRef<HTMLDivElement>(null)
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const vehicles = useStore((s) => s.vehicles)
  const vehicle = vehicles.find((v) => v.id === vehicleId)

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
        { label: 'Bơm lốp chưa?', status: sheet.inputTireInflated },
        { label: 'Kiểm tra lọc gió trong', status: sheet.cabinAirFilter },
        { label: 'Kiểm tra dầu máy', status: sheet.engineOilLevel },
        { label: 'Kiểm tra lọc gió dầu máy', status: sheet.engineAirFilter },
        { label: 'Đèn (Pha, Cốt, Cảnh báo, Phanh)', status: sheet.inputDenPhaCot },
        { label: 'Motor Gương, Nút bấm', status: sheet.inputMotorGuongNutBam },
        { label: 'Cửa sổ', status: sheet.inputCuaSo },
        { label: 'Ghế chỉnh điện', status: sheet.inputGheChinhDien },
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
          { label: 'Bơm lốp chưa?', status: sheet.outputTireInflated },
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

  // Expiry info helpers
  function expiryStatus(dateStr: string | null | undefined): { label: string; color: string; dot: string } {
    if (!dateStr) return { label: 'Chưa cập nhật', color: '#94a3b8', dot: '#94a3b8' }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(dateStr)
    expiry.setHours(0, 0, 0, 0)
    if (expiry < today) return { label: 'Đã hết hạn', color: '#dc2626', dot: '#dc2626' }
    return { label: 'Còn hạn', color: '#16a34a', dot: '#16a34a' }
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('vi-VN')
  }

  // UI grouping (presentation only — no data change)
  // Export-specific grouping (not used by live preview) — per mode so the
  // JPG sections match the actual checklist of each checksheet type.
  const IN_EXPORT_GROUP_MAP: Record<string, string[]> = {
    'Nhiên liệu & Song nưng & Kiểm tra gầm': ['Nhiên liệu', 'Song nưng', 'Kiểm tra gầm'],
    'Hệ thống điện & giải trí': ['Màn hình', 'Camera lùi', 'Hi-Pass', 'Camera hành trình', 'Ắc quy SOH', 'Ắc quy SOC'],
    'An toàn & hỗ trợ lái': ['Cảm biến lùi', 'Điều hòa', 'Sưởi ghế', 'Chìa khóa', 'Số lượng chìa'],
    'Nội thất': Object.values(seatLabels),
    'Ngoại thất & thân vỏ': [...Object.values(spotLabels), 'Tình trạng lốp', 'Bơm lốp chưa?'],
    'Bảo dưỡng động cơ': ['Kiểm tra lọc gió trong', 'Kiểm tra dầu máy', 'Kiểm tra lọc gió dầu máy'],
    'Thiết bị đầu vào': [
      'Đèn (Pha, Cốt, Cảnh báo, Phanh)',
      'Motor Gương, Nút bấm',
      'Cửa sổ',
      'Ghế chỉnh điện',
    ],
  }
  const OUT_EXPORT_GROUP_MAP: Record<string, string[]> = {
    'Song nưng & gầm': ['Còn Song nưng không?', 'Song nưng', 'Kiểm tra gầm'],
    'Dầu máy & nước làm mát': ['Dầu máy', 'Nước làm mát'],
    'Hệ thống điện & giải trí': ['Cam hành trình', 'Màn hình, Bluetooth', 'Camera lùi', 'Đèn (Pha, Cốt, Cảnh báo, Phanh)', 'Ắc quy SOH', 'Ắc quy SOC'],
    'Thân xe & nội thất': ['Motor gương, nút bấm', 'Điều hòa', 'Sưởi ghế', 'Cửa sổ', 'Ghế chỉnh điện', 'Chìa khóa', 'Số lượng chìa'],
    'Lốp': ['Tình trạng lốp', 'Lốp xe', 'Bơm lốp chưa?'],
  }
  const EXPORT_GROUP_MAP = mode === 'in' ? IN_EXPORT_GROUP_MAP : OUT_EXPORT_GROUP_MAP
  const allExportLabels = new Set(Object.values(EXPORT_GROUP_MAP).flat())
  const leftoverItems = items.filter((i) => !allExportLabels.has(i.label) && i.label !== 'Hi-Pass')
  const exportGrouped = Object.entries(EXPORT_GROUP_MAP).map(([groupName, labels]) => {
    const groupItems = labels.map((lbl) => items.find((i) => i.label === lbl)).filter(Boolean) as typeof items
    return { name: groupName, items: groupItems }
  }).filter((g) => g.items.length > 0)
  if (leftoverItems.length > 0) {
    exportGrouped.push({ name: 'Khác', items: leftoverItems })
  }

  function itemDisplay(item: typeof items[0]) {
    const isBatteryNum = !!(item.status && !isNaN(Number(item.status)))
    const c = item.status && !isBatteryNum ? classifyStatus(item.status) : null
    const isUnchecked = !item.status
    const dotColor = isUnchecked ? '#cbd5e1' : c === 'ok' || isBatteryNum ? '#34c759' : c === 'bad' ? '#ff3b30' : c === 'install' ? '#ff9500' : '#cbd5e1'
    const textColor = isUnchecked ? '#94a3b8' : c === 'ok' || isBatteryNum ? '#34c759' : c === 'bad' ? '#ff3b30' : c === 'install' ? '#ff9500' : '#334155'
    const display = isBatteryNum ? `${item.status}%` : statusLabel(item.status)
    return { dotColor, textColor, display }
  }

  async function handleExport() {
    if (!exportRef.current || exportStatus === 'loading') return
    setExportStatus('loading')
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
      })
      // Đầu ra: compose onto an exact A4-portrait canvas (210×297mm).
      // Content shorter than A4 → white margin at the bottom; content taller
      // → scaled down to fit so nothing is cut off. Đầu vào: unchanged.
      let outCanvas = canvas
      if (mode === 'out') {
        const EXPORT_SCALE = 2
        const targetW = A4_WIDTH_PX * EXPORT_SCALE   // 1588
        const targetH = A4_HEIGHT_PX * EXPORT_SCALE  // 2246
        const a4 = document.createElement('canvas')
        a4.width = targetW
        a4.height = targetH
        const ctx = a4.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, targetW, targetH)
          const fit = Math.min(targetW / canvas.width, targetH / canvas.height)
          const drawW = Math.round(canvas.width * fit)
          const drawH = Math.round(canvas.height * fit)
          ctx.drawImage(canvas, Math.round((targetW - drawW) / 2), 0, drawW, drawH)
          outCanvas = a4
        }
      }
      const blob = await new Promise<Blob>((resolve) => outCanvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9))
      const plate = vehicle?.plate || 'unknown'
      const date = sheet.checkDate || new Date().toISOString().slice(0, 10)
      const filename = `VTAUTO_CheckSheet_${mode === 'in' ? 'Input' : 'Output'}_${plate}_${date}.jpg`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setExportStatus('success')
      setTimeout(() => setExportStatus('idle'), 1500)
    } catch (err) {
      console.error('Export failed:', err)
      setExportStatus('error')
      setTimeout(() => setExportStatus('idle'), 2000)
    }
  }

  // Unified layout for BOTH modes ('in' and 'out') — same summary cards,
  // same item rows, same export mechanism. Only the data source (items),
  // export section grouping, title and filename differ by mode.
  return (
    <div className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <button onClick={handleExport} disabled={exportStatus === 'loading'}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50">
          <Download size={16} />
          {exportStatus === 'loading' ? 'Đang tạo ảnh...' : exportStatus === 'success' ? '✓ Đã tải' : exportStatus === 'error' ? 'Không thể tải ảnh' : 'Tải ảnh'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'OK', value: ok, color: '#34c759', bg: '#e8f8ef' },
          { label: 'Hỏng', value: bad, color: '#ff3b30', bg: '#ffe8e7' },
          { label: 'Cần lắp', value: install, color: '#ff9500', bg: '#fff4e5' },
          { label: 'Chưa check', value: unchecked, color: '#94a3b8', bg: '#f1f5f9' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: s.bg }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="mt-0.5 text-xs font-medium" style={{ color: s.color, opacity: 0.7 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Expiry info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-center">
          <div className="text-xs font-semibold text-slate-600">Hạn Song nưng</div>
          <div className="mt-1 text-sm font-medium text-slate-800">{formatDate(vehicle?.songNungExpiryDate)}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: expiryStatus(vehicle?.songNungExpiryDate).dot }} />
            <span className="text-xs font-medium" style={{ color: expiryStatus(vehicle?.songNungExpiryDate).color }}>{expiryStatus(vehicle?.songNungExpiryDate).label}</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-center">
          <div className="text-xs font-semibold text-slate-600">Hạn đăng kiểm</div>
          <div className="mt-1 text-sm font-medium text-slate-800">{formatDate(vehicle?.registrationExpiryDate)}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: expiryStatus(vehicle?.registrationExpiryDate).dot }} />
            <span className="text-xs font-medium" style={{ color: expiryStatus(vehicle?.registrationExpiryDate).color }}>{expiryStatus(vehicle?.registrationExpiryDate).label}</span>
          </div>
        </div>
      </div>

      {/* All inspection items — flat list */}
      <div className="divide-y divide-slate-50 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {items.map((item) => {
          const d = itemDisplay(item)
          return (
            <div key={item.label} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.dotColor }} />
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: d.textColor }}>{d.display}</span>
            </div>
          )
        })}
      </div>

      {/* Abnormal items */}
      {abnormal.length > 0 ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="text-sm font-semibold text-red-700">{abnormal.length} hạng mục cần xử lý</div>
          <ul className="mt-1.5 space-y-0.5">
            {abnormal.map((item) => (
              <li key={item.label} className="text-xs text-red-600">• {item.label}: {statusLabel(item.status)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-center text-sm font-medium text-emerald-700">
          ✅ Không phát hiện hạng mục bất thường
        </div>
      )}

      {/* Action button */}
      <div className="flex justify-end">
        <button type="button" onClick={() => navigate(`/xe/${vehicleId}?tab=checksheet`)} className="btn-primary">
          <ExternalLink size={15} /> Xem chi tiết
        </button>
      </div>

      {/* Hidden export layout — captured by html2canvas for JPG download.
          Đầu ra: A4 portrait proportions (794×1123 CSS px, flex column so the
          footer sits at the page bottom). Đầu vào: original 800px flow layout. */}
      <div ref={exportRef} style={{ position: 'fixed', left: '-9999px', top: 0, width: mode === 'out' ? A4_WIDTH_PX : 800, minHeight: mode === 'out' ? A4_HEIGHT_PX : undefined, display: mode === 'out' ? 'flex' : 'block', flexDirection: 'column', padding: '20px 24px', background: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif', zIndex: -1, color: '#1e293b' }}>
        {/* ===== HEADER ===== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e293b', paddingBottom: 8, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#2563eb' }}>VTAUTO</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>Xe cũ tại Hàn Quốc</div>
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', paddingTop: 2 }}>Kiểm tra kỹ – Bán xe chất lượng</div>
        </div>

        {/* ===== TITLE ===== */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{mode === 'in' ? 'CheckSheet Đầu vào' : 'CheckSheet Đầu ra'}</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{mode === 'in' ? 'Vehicle Input Inspection' : 'Vehicle Output Inspection'}</div>
        </div>

        {/* ===== VEHICLE INFO ===== */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
          {vehicle?.images[0] ? (
            <div style={{ width: 200, height: 150, borderRadius: 4, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
              <img src={vehicle.images[0]} alt={vehicle.model} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
          ) : null}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#0f172a', letterSpacing: '0.02em', lineHeight: 1.1 }}>{vehicle?.plate || '—'}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#334155', marginTop: 4 }}>{vehicle?.model || '—'}</div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#475569', lineHeight: '1.5' }}>
              {vehicle?.year ? <span><span style={{ color: '#94a3b8' }}>Năm SX:</span> {vehicle.year} &nbsp;·&nbsp; </span> : null}
              <span><span style={{ color: '#94a3b8' }}>Ngày:</span> {sheet.checkDate || '—'}</span>
              {sheet.checkerId ? <> &nbsp;·&nbsp; <span><span style={{ color: '#94a3b8' }}>NV:</span> {employees.find((e) => e.id === sheet.checkerId)?.name || '—'}</span></> : null}
              {(() => { const pos = useStore.getState().positions.find((p) => p.id === vehicle?.positionId); return pos ? <> &nbsp;·&nbsp; <span><span style={{ color: '#94a3b8' }}>Vị trí:</span> {pos.name}</span></> : null })()}
            </div>
          </div>
        </div>

        {/* ===== SUMMARY ===== */}
        <div style={{ display: 'flex', gap: 1, marginBottom: 16, background: '#e2e8f0', border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
          {[
            { label: 'OK', value: ok, color: '#16a34a' },
            { label: 'Hỏng', value: bad, color: '#dc2626' },
            { label: 'Cần lắp', value: install, color: '#ea580c' },
            { label: 'Chưa check', value: unchecked, color: '#94a3b8' },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: '#ffffff' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ===== EXPIRY INFO ===== */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 11, textAlign: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#64748b', fontWeight: 600, marginBottom: 2 }}>Hạn Song nưng</div>
            <div style={{ color: '#334155', fontWeight: 500 }}>{formatDate(vehicle?.songNungExpiryDate)}</div>
            <div style={{ color: expiryStatus(vehicle?.songNungExpiryDate).color, fontWeight: 600, marginTop: 1 }}>{expiryStatus(vehicle?.songNungExpiryDate).label}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#64748b', fontWeight: 600, marginBottom: 2 }}>Hạn đăng kiểm</div>
            <div style={{ color: '#334155', fontWeight: 500 }}>{formatDate(vehicle?.registrationExpiryDate)}</div>
            <div style={{ color: expiryStatus(vehicle?.registrationExpiryDate).color, fontWeight: 600, marginTop: 1 }}>{expiryStatus(vehicle?.registrationExpiryDate).label}</div>
          </div>
        </div>

        {/* ===== 2-COLUMN SECTIONS — auto-balanced ===== */}
        {(() => {
          if (exportGrouped.length === 0) return null

          // Estimate section heights for balanced distribution
          const HEADING_H = 38
          const ITEM_H = 24
          const heights = exportGrouped.map((g) => HEADING_H + g.items.length * ITEM_H + 4)
          const totalH = heights.reduce((a, b) => a + b, 0)

          // Find best split point that preserves section order
          let bestSplit = exportGrouped.length
          let bestDiff = Infinity
          let running = 0
          for (let i = 0; i < exportGrouped.length - 1; i++) {
            running += heights[i]
            const col2H = totalH - running
            const diff = Math.abs(running - col2H)
            if (diff < bestDiff) { bestDiff = diff; bestSplit = i + 1 }
          }

          const col1 = exportGrouped.slice(0, bestSplit)
          const col2 = exportGrouped.slice(bestSplit)

          function renderSection(group: any, globalIdx: number) {
            return (
              <div key={group.name} style={{ marginBottom: 10, border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', padding: '7px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {globalIdx + 1}. {group.name}
                </div>
                <div style={{ padding: '2px 0' }}>
                  {group.items.map((item: any) => {
                    const d = itemDisplay(item)
                    return (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 10px', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.dotColor, display: 'inline-block' }} />
                          <span style={{ fontSize: 12, color: '#334155' }}>{item.label}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: d.textColor }}>{d.display}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }

          return (
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {col1.map((group: any, gi: number) => renderSection(group, gi))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {col2.map((group: any, gi: number) => renderSection(group, gi + bestSplit))}
              </div>
            </div>
          )
        })()}

        {/* ===== ABNORMAL ITEMS ===== */}
        {abnormal.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '2px solid #1e293b', paddingTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Các hạng mục cần xử lý</div>
            {abnormal.map((item: any) => {
              const d = itemDisplay(item)
              return (
                <div key={item.label} style={{ fontSize: 12, color: '#334155', padding: '3px 0 3px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <span>• {item.label}</span>
                  <span style={{ color: d.textColor, fontWeight: 600 }}>{d.display}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* ===== FOOTER ===== */}
        <div style={{ marginTop: mode === 'out' ? 'auto' : 16, paddingTop: 8, borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: 9, color: '#94a3b8' }}>
          VTAUTO — Xe cũ tại Hàn Quốc
        </div>
      </div>
    </div>
  )
}
