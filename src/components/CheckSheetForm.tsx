// ====== CHECKSHEET FORM COMPONENT ======

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CheckCircle2, XCircle, Minus, StickyNote, Wrench, Plus, Minus as MinusIcon } from 'lucide-react'
import { useStore } from '../store/useStore'
import {
  CheckOutCheck,
  CheckOutItem,
  CheckOutStatus,
  CheckSheet,
  DashcamState,
  EXTERIOR_SPOTS,
  ExteriorCheck,
  ExteriorCondition,
  ExteriorSpotKey,
  FuelLevel,
  HipassState,
  InteriorCheck,
  InteriorCondition,
  ScreenState,
  SensorState,
  Vehicle,
  CameraState,
} from '../types'
import { CollapsibleCard, Modal, SegButton, WheelPicker } from './ui'
import { emptyExteriorCheck } from '../store/useStore'
import { uid } from '../utils/format'
import PhotoUploader from './PhotoUploader'

// ====== CONSTANTS ======

const FUEL_OPTIONS: { value: FuelLevel; label: string }[] = [
  { value: 'empty', label: 'Báo vàng' },
  { value: 'quarter', label: '1 vạch' },
  { value: 'half', label: 'Nửa bình' },
  { value: 'full', label: 'Đầy bình' },
]

const INTERIOR_OPTIONS: { value: InteriorCondition; label: string }[] = [
  { value: 'good', label: 'Sạch' },
  { value: 'dirty', label: 'Bẩn' },
  { value: 'torn', label: 'Rách' },
]

const EXTERIOR_OPTIONS: { value: ExteriorCondition; label: string }[] = [
  { value: 'good', label: 'Tốt' },
  { value: 'scratch', label: 'Cần đánh bóng' },
  { value: 'dent', label: 'Móp' },
  { value: 'discolor', label: 'Đổi màu sơn' },
  { value: 'needpaint', label: 'Cần sơn dặm' },
]

const OUT_STATUS_OPTIONS: { value: CheckOutStatus; label: string }[] = [
  { value: 'ok', label: 'OK' },
  { value: 'error', label: 'Lỗi' },
  { value: 'none', label: 'Không có' },
]

// 12 hạng mục kiểm tra đầu ra
const OUT_CHECK_ITEMS: { key: keyof CheckOutCheck; label: string; taskPrefix: string }[] = [
  { key: 'conSeongnyeong', label: 'Còn性能 không?', taskPrefix: 'Kiểm tra Còn性能' },
  { key: 'dauMay', label: 'Dầu máy', taskPrefix: 'Kiểm tra dầu máy' },
  { key: 'nuocLamMat', label: 'Nước làm mát', taskPrefix: 'Kiểm tra nước làm mát' },
  { key: 'camHanhTrinh', label: 'Cam hành trình', taskPrefix: 'Sửa Cam hành trình' },
  { key: 'manHinhBluetooth', label: 'Màn hình, Bluetooth', taskPrefix: 'Sửa Màn hình/Bluetooth' },
  { key: 'cameraLui', label: 'Camera lùi', taskPrefix: 'Sửa Camera lùi' },
  { key: 'denPhaCot', label: 'Đèn (Pha, Cốt, Cảnh báo, Phanh)', taskPrefix: 'Sửa Đèn' },
  { key: 'motorGuongNutBam', label: 'Motor Gương, Nút bấm', taskPrefix: 'Sửa Motor Gương/Nút bấm' },
  { key: 'dieuHoaSuGhe', label: 'Điều hòa / Sưởi ghế', taskPrefix: 'Sửa Điều hòa/Sưởi ghế' },
  { key: 'cuaSo', label: 'Cửa sổ', taskPrefix: 'Sửa Cửa sổ' },
  { key: 'gheChinhDien', label: 'Ghế chỉnh điện', taskPrefix: 'Sửa Ghế chỉnh điện' },
  { key: 'doAcQuy', label: 'Đo ắc quy', taskPrefix: 'Kiểm tra ắc quy' },
]

// ====== HELPERS ======

function defaultInterior(): InteriorCheck {
  return {
    driverSeat: { condition: 'good' },
    passengerSeat: { condition: 'good' },
    rearSeat: { condition: 'good' },
  }
}

function defaultOutCheck(): CheckOutCheck {
  const out: CheckOutCheck = {} as CheckOutCheck
  OUT_CHECK_ITEMS.forEach(({ key }) => {
    out[key] = { status: 'ok' }
  })
  return out
}

// ====== NUMBER PICKER COMPONENT ======

function NumberPicker({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  const increment = () => onChange(Math.min(max, value + 1))
  const decrement = () => onChange(Math.max(min, value - 1))

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">{label}:</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={decrement}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
          disabled={value <= min}
        >
          <MinusIcon size={14} />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
          className="input w-16 text-center"
        />
        <button
          type="button"
          onClick={increment}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
          disabled={value >= max}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

// ====== MAIN COMPONENT ======

export default function CheckSheetForm({
  vehicle,
  type,
  onCancel,
  onSaved,
}: {
  vehicle: Vehicle
  type: 'in' | 'out'
  onCancel: () => void
  onSaved: () => void
}) {
  const addTask = useStore((s) => s.addTask)
  const updateTask = useStore((s) => s.updateTask)
  const tasks = useStore((s) => s.tasks)
  const employees = useStore((s) => s.employees)
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)
  const addCheckSheet = useStore((s) => s.addCheckSheet)
  const updateCheckSheet = useStore((s) => s.updateCheckSheet)
  const addNotification = useStore((s) => s.addNotification)
  const checkSheets = useStore((s) => s.checkSheets)

  // Tìm existing sheet
  const existingSheet = useMemo(() => {
    return checkSheets.find((c) => c.vehicleId === vehicle.id && c.type === type)
  }, [checkSheets, vehicle.id, type])

  // ====== STATE ĐẦU VÀO =====
  const [checkerId, setCheckerId] = useState(currentEmployeeId)
  const [checkDate, setCheckDate] = useState(new Date().toISOString().slice(0, 10))
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>('half')
  const [screen, setScreen] = useState<ScreenState>('normal')
  const [rearCamera, setRearCamera] = useState<CameraState>('ok')
  const [hipass, setHipass] = useState<HipassState>('none')
  const [rearSensor, setRearSensor] = useState<SensorState>('ok')
  const [dashcam, setDashcam] = useState<DashcamState>('none')
  const [interior, setInterior] = useState<InteriorCheck>(defaultInterior())
  const [exterior, setExterior] = useState<ExteriorCheck>(emptyExteriorCheck())
  const [exteriorPhotoModal, setExteriorPhotoModal] = useState<ExteriorSpotKey | null>(null)
  const [exteriorPhotos, setExteriorPhotos] = useState<Partial<Record<ExteriorSpotKey, string[]>>>({})

  // ====== STATE ĐẦU RA =====
  const [outCheck, setOutCheck] = useState<CheckOutCheck>(defaultOutCheck())
  const [outNotes, setOutNotes] = useState('')
  
  // ====== ẮC QUY STATE (cho Đầu ra) =====
  const [acquySOH, setAcquySOH] = useState(100)
  const [acquySOC, setAcquySOC] = useState(100)
  const [acquyPickerOpen, setAcquyPickerOpen] = useState<'soh' | 'soc' | null>(null)

  // ====== SUMMARY COUNTS =====
  const summaryCounts = useMemo(() => {
    if (type === 'in') {
      let ok = 0
      let error = 0
      let none = 0
      let noteCount = 0

      if (screen === 'normal' || screen === 'android') ok++
      else if (screen === 'broken') error++

      if (rearCamera === 'ok') ok++
      else if (rearCamera === 'blurry') error++

      if (hipass === 'mirror' || hipass === 'device') ok++
      else if (hipass === 'none') none++

      if (rearSensor === 'ok') ok++
      else if (rearSensor === 'broken') error++

      if (dashcam === 'good' || dashcam === 'maybe') ok++
      else if (dashcam === 'none') none++

      Object.values(interior).forEach((v) => {
        if (v.condition === 'good') ok++
        else error++
        if (v.note) noteCount++
      })

      Object.values(exterior).forEach((v) => {
        if (v.condition === 'good') ok++
        else error++
        if (v.note) noteCount++
      })

      return { ok, error, none, noteCount }
    } else {
      // Đầu ra
      let ok = 0
      let error = 0
      let none = 0

      Object.values(outCheck).forEach((v) => {
        if (v.status === 'ok') ok++
        else if (v.status === 'error') error++
        else none++
      })

      return { ok, error, none, noteCount: outNotes ? 1 : 0 }
    }
  }, [type, screen, rearCamera, hipass, rearSensor, dashcam, interior, exterior, outCheck, outNotes])

  // Paint count
  const paintCount = useMemo(() => {
    return EXTERIOR_SPOTS.filter(([key]) => exterior[key]?.condition === 'needpaint').length
  }, [exterior])

  // Reference for exterior scroll
  const exteriorRef = useRef<HTMLDivElement>(null)

  // Update interior
  function updateInterior(key: keyof InteriorCheck, patch: Partial<InteriorCheck[keyof InteriorCheck]>) {
    setInterior((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  // Update exterior
  function updateExterior(key: ExteriorSpotKey, patch: Partial<ExteriorCheck[keyof ExteriorCheck]>) {
    setExterior((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  // Update out check
  function updateOutCheck(key: keyof CheckOutCheck, patch: Partial<CheckOutItem>) {
    setOutCheck((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  // Generate tasks from Đầu vào
  const allChecklistItems = useMemo(() => {
    if (type !== 'in') return []
    const items: { id: string; text: string; done: boolean }[] = []

    if (screen === 'broken') items.push({ id: uid('chk'), text: 'Sửa màn hình', done: false })
    if (rearCamera === 'broken') items.push({ id: uid('chk'), text: 'Sửa camera lùi', done: false })
    if (rearSensor === 'broken') items.push({ id: uid('chk'), text: 'Sửa cảm biến lùi', done: false })
    if (dashcam === 'none') items.push({ id: uid('chk'), text: 'Lắp camera hành trình', done: false })
    if (dashcam === 'maybe') items.push({ id: uid('chk'), text: 'Mua thẻ nhớ cho cam hành trình', done: false })

    const seats: { key: keyof InteriorCheck; label: string }[] = [
      { key: 'driverSeat', label: 'Ghế lái' },
      { key: 'passengerSeat', label: 'Ghế phụ' },
      { key: 'rearSeat', label: 'Hàng ghế sau' },
    ]
    seats.forEach(({ key, label }) => {
      if (interior[key].condition === 'dirty') items.push({ id: uid('chk'), text: `Vệ sinh ${label}`, done: false })
      if (interior[key].condition === 'torn') items.push({ id: uid('chk'), text: `Bọc lại ${label}`, done: false })
    })

    if (paintCount > 0) items.push({ id: uid('chk'), text: `Sơn lại (${paintCount} tấm)`, done: false })

    const hasPolish = EXTERIOR_SPOTS.some(([key]) => exterior[key]?.condition === 'scratch')
    if (hasPolish) items.push({ id: uid('chk'), text: 'Đánh bóng', done: false })

    return items
  }, [type, screen, rearCamera, rearSensor, dashcam, interior, exterior, paintCount])

  // Generate tasks from Đầu ra errors
  const outErrorTasks = useMemo(() => {
    if (type !== 'out') return []
    return OUT_CHECK_ITEMS
      .filter(({ key }) => outCheck[key]?.status === 'error')
      .map(({ key, label }) => ({
        id: uid('task'),
        title: `Sửa xe ${vehicle.plate}: ${label}`,
        prefix: `${vehicle.plate} - ${label}`,
      }))
  }, [type, outCheck, vehicle.plate])

  // Issue labels cho Đầu vào
  const issueLabels = useMemo(() => {
    if (type !== 'in') return []
    const labels: { text: string; bold: boolean }[] = []
    if (screen === 'broken') labels.push({ text: 'Màn hình', bold: true })
    if (rearCamera === 'broken') labels.push({ text: 'Cam lùi', bold: true })
    if (rearSensor === 'broken') labels.push({ text: 'Cảm biến lùi', bold: true })
    if (dashcam === 'good' || dashcam === 'maybe') labels.push({ text: 'Thiếu thẻ nhớ', bold: true })
    if (dashcam === 'none') labels.push({ text: 'Cam hành trình', bold: true })
    const seats: { key: keyof InteriorCheck; label: string }[] = [
      { key: 'driverSeat', label: 'Ghế lái' },
      { key: 'passengerSeat', label: 'Ghế phụ' },
      { key: 'rearSeat', label: 'Hàng ghế sau' },
    ]
    seats.forEach(({ key, label }) => {
      if (interior[key].condition === 'dirty') labels.push({ text: `${label} bẩn`, bold: true })
      if (interior[key].condition === 'torn') labels.push({ text: `${label} rách`, bold: true })
    })
    if (paintCount > 0) labels.push({ text: `${paintCount} tấm sơn`, bold: true })
    if (EXTERIOR_SPOTS.some(([key]) => exterior[key]?.condition === 'scratch')) labels.push({ text: 'Trầy cần đánh bóng', bold: true })
    return labels
  }, [type, screen, rearCamera, rearSensor, dashcam, interior, exterior, paintCount])

  // Issue labels cho Đầu ra
  const outIssueLabels = useMemo(() => {
    if (type !== 'out') return []
    return OUT_CHECK_ITEMS
      .filter(({ key }) => outCheck[key]?.status === 'error')
      .map(({ label, key }) => ({
        text: `${label}: ${outCheck[key]?.detail || 'Lỗi'}`,
        bold: true,
      }))
  }, [type, outCheck])

  function scrollToExterior() {
    exteriorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ====== SAVE ======
  function handleSave() {
    if (!vehicle?.id) {
      console.error('❌ Cannot save: vehicle ID missing')
      return null
    }

    const commonData = {
      vehicleId: vehicle.id,
      type,
      checkerId,
      checkDate,
      fuelLevel,
      screen,
      rearCamera,
      hipass,
      rearSensor,
      dashcam,
      interior,
      exterior,
      exteriorPhotos,
    }

    const sheetData = type === 'out'
      ? { ...commonData, outCheck, outNotes }
      : { ...commonData, outCheck: undefined, outNotes: undefined }

    console.log('🔵 [CheckSheetForm] Saving sheetData:', JSON.stringify(sheetData, null, 2))

    if (existingSheet) {
      updateCheckSheet(existingSheet.id, sheetData)
      console.log('🔵 [CheckSheetForm] Updated existing sheet:', existingSheet.id)
      return existingSheet.id
    } else {
      addCheckSheet(sheetData)
      const newSheet = checkSheets.find((c) => c.vehicleId === vehicle.id && c.type === type)
      console.log('🔵 [CheckSheetForm] Created new sheet:', newSheet?.id)
      return newSheet?.id
    }
  }

  // ====== TASK GENERATION ======
  function handleCreateOrUpdateTasks() {
    if (type === 'in' && allChecklistItems.length > 0) {
      // Đầu vào: tạo/update task checklist
      const taskTitle = `Kiểm tra xe ${vehicle.plate}`
      const existingTask = tasks.find((t) => t.vehicleId === vehicle.id && t.title.includes(vehicle.plate))

      if (existingTask) {
        // Merge checklist
        const mergedChecklist = [
          ...existingTask.checklist,
          ...allChecklistItems.filter(
            (newItem) => !existingTask.checklist.some((existing) => existing.text === newItem.text)
          ),
        ]
        updateTask(existingTask.id, { checklist: mergedChecklist })
      } else {
        addTask({
          id: uid('task'),
          title: taskTitle,
          checklist: allChecklistItems,
          priority: 'medium',
          status: 'todo',
          vehicleId: vehicle.id,
          createdAt: new Date().toISOString(),
        })
      }
    }

    if (type === 'out' && outErrorTasks.length > 0) {
      // Đầu ra: tạo/update task cho từng lỗi
      outErrorTasks.forEach(({ title, prefix }) => {
        // Tìm task có cùng prefix (không tạo trùng)
        const existingTask = tasks.find((t) => 
          t.title.includes(prefix) && t.vehicleId === vehicle.id
        )

        if (existingTask) {
          // Task đã tồn tại, không làm gì (không update)
          console.log('🔵 [CheckSheet] Task already exists:', existingTask.title)
        } else {
          // Tạo task mới
          addTask({
            id: uid('task'),
            title,
            checklist: [],
            priority: 'high',
            status: 'todo',
            vehicleId: vehicle.id,
            createdAt: new Date().toISOString(),
          })
          console.log('🔵 [CheckSheet] Created new task:', title)
        }
      })
    }
  }

  function handleSaveAndClose() {
    console.log('🔵 [handleSaveAndClose] Bắt đầu - type:', type)

    // 1. Tạo/Cập nhật Tasks
    handleCreateOrUpdateTasks()

    // 2. Lưu CheckSheet
    handleSave()

    // 3. Notification
    addNotification({
      type: 'task_done',
      title: 'Lưu thành công',
      body: `Đã lưu phiếu ${type === 'in' ? 'đầu vào' : 'đầu ra'} cho xe ${vehicle.plate}`,
    })

    // 4. Gọi callback để đóng popup
    onSaved()
  }

  // ====== RENDER ======
  return (
    <>
      <div className="flex flex-col" style={{ maxHeight: 'calc(100dvh - 160px)' }}>
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* Form kiểm tra - Người check, Ngày check, Mức nhiên liệu */}
          <CollapsibleCard title="Thông tin kiểm tra">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Người check</label>
                <select className="input" value={checkerId} onChange={(e) => setCheckerId(e.target.value)}>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Ngày check</label>
                <input type="date" className="input" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Mức nhiên liệu</label>
              <SegButton options={FUEL_OPTIONS} value={fuelLevel} onChange={(v) => setFuelLevel(v as FuelLevel)} />
            </div>
          </CollapsibleCard>

          {/* Summary Card - Tổng quan kiểm tra */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat
              icon={<CheckCircle2 size={18} />}
              label="OK"
              count={summaryCounts.ok}
              tone="green"
            />
            <SummaryStat
              icon={<XCircle size={18} />}
              label="Lỗi"
              count={summaryCounts.error}
              tone="red"
            />
            <SummaryStat
              icon={<Minus size={18} />}
              label="Không có"
              count={summaryCounts.none}
              tone="slate"
            />
            <SummaryStat
              icon={<StickyNote size={18} />}
              label="Ghi chú"
              count={summaryCounts.noteCount}
              tone="brand"
            />
          </div>

          {/* ĐẦU VÀO - Kiểm tra Option xe & Nội/Ngoại thất */}
          {type === 'in' && (
            <>
              <CollapsibleCard title="Option xe">
                <div className="space-y-4">
                  <OptionRow label="Màn hình" value={screen} onChange={(v) => setScreen(v as ScreenState)} options={[
                    { value: 'normal', label: 'Thường' },
                    { value: 'android', label: 'Android' },
                    { value: 'broken', label: 'Hỏng' },
                  ]} />
                  <OptionRow label="Camera lùi" value={rearCamera} onChange={(v) => setRearCamera(v as CameraState)} options={[
                    { value: 'ok', label: 'OK' },
                    { value: 'blurry', label: 'Mờ' },
                    { value: 'broken', label: 'Hỏng' },
                  ]} />
                  <OptionRow label="Hi-Pass" value={hipass} onChange={(v) => setHipass(v as HipassState)} options={[
                    { value: 'mirror', label: 'Gương' },
                    { value: 'device', label: 'Thiết bị' },
                    { value: 'none', label: 'Không có' },
                  ]} />
                  <OptionRow label="Cảm biến lùi" value={rearSensor} onChange={(v) => setRearSensor(v as SensorState)} options={[
                    { value: 'ok', label: 'OK' },
                    { value: 'broken', label: 'Hỏng' },
                    { value: 'none', label: 'Không có' },
                  ]} />
                  <OptionRow label="Camera hành trình" value={dashcam} onChange={(v) => setDashcam(v as DashcamState)} options={[
                    { value: 'good', label: 'Có thẻ nhớ' },
                    { value: 'maybe', label: 'Thiếu thẻ nhớ' },
                    { value: 'none', label: 'Không lắp' },
                  ]} />
                </div>
              </CollapsibleCard>

              <CollapsibleCard title="Kiểm tra nội thất & ngoại thất">
                <div className="space-y-5">
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Nội thất</div>
                    <InteriorRow label="Ghế lái" entry={interior.driverSeat} onChange={(p) => updateInterior('driverSeat', p)} />
                    <InteriorRow label="Ghế phụ" entry={interior.passengerSeat} onChange={(p) => updateInterior('passengerSeat', p)} />
                    <InteriorRow label="Hàng ghế sau" entry={interior.rearSeat} onChange={(p) => updateInterior('rearSeat', p)} />
                  </div>

                  {paintCount > 0 && (
                    <button
                      onClick={scrollToExterior}
                      className="w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-700 transition-all hover:border-amber-400 hover:bg-amber-100 active:scale-98"
                    >
                      {paintCount} tấm cần sơn - Click để xem chi tiết
                    </button>
                  )}

                  <div ref={exteriorRef}>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Ngoại thất</div>
                    {EXTERIOR_SPOTS.map(([key, spotLabel]) => (
                      <ExteriorRow
                        key={key}
                        label={spotLabel}
                        entry={exterior[key]}
                        photos={exteriorPhotos[key] || []}
                        onChange={(p) => updateExterior(key, p)}
                        onAddPhoto={() => setExteriorPhotoModal(key)}
                      />
                    ))}
                  </div>
                </div>
              </CollapsibleCard>

              {issueLabels.length > 0 && (
                <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <Wrench size={16} />
                    Nhiệm vụ phát hiện ({issueLabels.length})
                  </div>
                  <ul className="space-y-1">
                    {issueLabels.map((label, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-blue-600">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        {label.bold ? <strong>{label.text}</strong> : label.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* ĐẦU RA - 12 hạng mục kiểm tra + Ắc quy */}
          {type === 'out' && (
            <>
              <CollapsibleCard title="Kiểm tra xe">
                <div className="space-y-4">
                  {OUT_CHECK_ITEMS.map(({ key, label }) => (
                    <OutCheckRow
                      key={key}
                      label={label}
                      entry={outCheck[key]}
                      onChange={(p) => updateOutCheck(key, p)}
                    />
                  ))}
                </div>
              </CollapsibleCard>

              {/* Ắc quy - Compact với Wheel Picker Popup */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-medium text-slate-700">Đo ắc quy</div>
                
                {/* Default view: SOH & SOC values */}
                <div className="grid grid-cols-2 gap-4">
                  {/* SOH */}
                  <div>
                    <div className="mb-1 text-center text-xs text-slate-500">SOH</div>
                    <button
                      onClick={() => setAcquyPickerOpen('soh')}
                      className="w-full rounded-lg border border-slate-200 bg-white py-3 text-center text-lg font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 active:bg-brand-100"
                    >
                      {acquySOH}%
                    </button>
                  </div>
                  {/* SOC */}
                  <div>
                    <div className="mb-1 text-center text-xs text-slate-500">SOC</div>
                    <button
                      onClick={() => setAcquyPickerOpen('soc')}
                      className="w-full rounded-lg border border-slate-200 bg-white py-3 text-center text-lg font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 active:bg-brand-100"
                    >
                      {acquySOC}%
                    </button>
                  </div>
                </div>

                {/* Wheel Picker Popup - Desktop */}
                {acquyPickerOpen === 'soh' && (
                  <div className="relative mt-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                      <div className="mb-2 text-center text-xs font-medium text-slate-500">SOH (%)</div>
                      <WheelPicker
                        value={acquySOH}
                        onChange={setAcquySOH}
                        min={0}
                        max={100}
                        unit="%"
                      />
                      <div className="mt-2 flex justify-center">
                        <button
                          onClick={() => setAcquyPickerOpen(null)}
                          className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 active:bg-brand-700"
                        >
                          Xong
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {acquyPickerOpen === 'soc' && (
                  <div className="relative mt-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                      <div className="mb-2 text-center text-xs font-medium text-slate-500">SOC (%)</div>
                      <WheelPicker
                        value={acquySOC}
                        onChange={setAcquySOC}
                        min={0}
                        max={100}
                        unit="%"
                      />
                      <div className="mt-2 flex justify-center">
                        <button
                          onClick={() => setAcquyPickerOpen(null)}
                          className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 active:bg-brand-700"
                        >
                          Xong
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status - chỉ đánh giá theo SOC */}
                <div className={`mt-3 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  acquySOC >= 50 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {acquySOC >= 50 ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Bình thường
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Cần sạc
                    </>
                  )}
                </div>
              </div>

              {/* Ghi chú đầu ra */}
              <CollapsibleCard title="Ghi chú thêm">
                <textarea
                  className="input min-h-[80px] w-full resize-none"
                  placeholder="Ngoài ra còn lỗi gì không?"
                  value={outNotes}
                  onChange={(e) => setOutNotes(e.target.value)}
                />
              </CollapsibleCard>

              {/* Tổng kết Đầu ra */}
              {outIssueLabels.length > 0 && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
                    <Wrench size={16} />
                    Lỗi phát hiện ({outIssueLabels.length}) - Tự động tạo Task
                  </div>
                  <ul className="space-y-1">
                    {outIssueLabels.map((label, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-600">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                        {label.bold ? <strong>{label.text}</strong> : label.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="flex shrink-0 gap-3 border-t border-slate-200 bg-white pt-4">
          <button className="btn-secondary flex-1" onClick={onCancel} type="button">
            Huỷ
          </button>
          <button className="btn-primary flex-1" onClick={handleSaveAndClose} type="button">
            Lưu {type === 'in' ? 'đầu vào' : 'đầu ra'}
          </button>
        </div>
      </div>

      {/* Modal chụp ảnh ngoại thất */}
      <Modal
        open={exteriorPhotoModal !== null}
        onClose={() => setExteriorPhotoModal(null)}
        title={exteriorPhotoModal ? `Chụp ảnh ${EXTERIOR_SPOTS.find(([k]) => k === exteriorPhotoModal)?.[1]}` : ''}
      >
        <PhotoUploader
          images={exteriorPhotoModal ? (exteriorPhotos[exteriorPhotoModal] || []) : []}
          onChange={(photos) => {
            if (exteriorPhotoModal) {
              setExteriorPhotos((prev) => ({ ...prev, [exteriorPhotoModal]: photos }))
            }
          }}
        />
      </Modal>
    </>
  )
}

// ====== HELPER COMPONENTS ======

function OptionRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <SegButton options={options} value={value} onChange={onChange} />
    </div>
  )
}

function InteriorRow({
  label,
  entry,
  onChange,
}: {
  label: string
  entry: InteriorCheck[keyof InteriorCheck]
  onChange: (p: Partial<InteriorCheck[keyof InteriorCheck]>) => void
}) {
  return (
    <div className="mb-3">
      <label className="label">{label}</label>
      <SegButton options={INTERIOR_OPTIONS} value={entry.condition} onChange={(v) => onChange({ condition: v as InteriorCondition })} />
      <input
        className="input mt-2"
        placeholder="Ghi chú (tuỳ chọn)"
        value={entry.note || ''}
        onChange={(e) => onChange({ note: e.target.value })}
      />
    </div>
  )
}

function ExteriorRow({
  label,
  entry,
  photos,
  onChange,
  onAddPhoto,
}: {
  label: string
  entry: { condition: ExteriorCondition; note?: string }
  photos: string[]
  onChange: (p: Partial<{ condition: ExteriorCondition; note: string }>) => void
  onAddPhoto: () => void
}) {
  const hasIssue = entry.condition !== 'good'

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <label className="label">{label}</label>
        {hasIssue && (
          <button
            onClick={onAddPhoto}
            className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600 active:scale-95"
          >
            <Camera size={12} />
            Chụp ảnh
          </button>
        )}
      </div>
      <SegButton options={EXTERIOR_OPTIONS} value={entry.condition} onChange={(v) => onChange({ condition: v as ExteriorCondition })} />
      {hasIssue && (
        <input
          className="input mt-2"
          placeholder="Ghi chú riêng cho vị trí này"
          value={entry.note || ''}
          onChange={(e) => onChange({ note: e.target.value })}
        />
      )}
    </div>
  )
}

function OutCheckRow({
  label,
  entry,
  onChange,
}: {
  label: string
  entry: CheckOutItem
  onChange: (p: Partial<CheckOutItem>) => void
}) {
  const hasError = entry?.status === 'error'

  return (
    <div>
      <label className="label">{label}</label>
      <SegButton
        options={OUT_STATUS_OPTIONS}
        value={entry?.status || 'ok'}
        onChange={(v) => onChange({ status: v as CheckOutStatus })}
      />
      {hasError && (
        <input
          className="input mt-2"
          placeholder="Chi tiết lỗi..."
          value={entry?.detail || ''}
          onChange={(e) => onChange({ detail: e.target.value })}
        />
      )}
    </div>
  )
}

function SummaryStat({
  icon,
  label,
  count,
  tone,
}: {
  icon: React.ReactNode
  label: string
  count: number
  tone: 'green' | 'red' | 'slate' | 'brand'
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-green-50 text-green-600'
      : tone === 'red'
      ? 'bg-red-50 text-red-600'
      : tone === 'brand'
      ? 'bg-brand-50 text-brand-600'
      : 'bg-slate-50 text-slate-600'
  return (
    <div className={`flex items-center gap-2 rounded-xl p-3 ${toneClass}`}>
      <span className="shrink-0">{icon}</span>
      <div>
        <div className="text-xl font-bold">{count}</div>
        <div className="text-xs opacity-80">{label}</div>
      </div>
    </div>
  )
}
