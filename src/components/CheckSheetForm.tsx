import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CheckCircle2, XCircle, Minus, StickyNote, Wrench } from 'lucide-react'
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
import { CollapsibleCard, Modal, SegButton } from './ui'
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

// 12 hạng mục kiểm tra đầu ra - theo biểu mẫu
const OUT_CHECK_ITEMS: { key: keyof CheckOutCheck; label: string }[] = [
  { key: 'conSeongnyeong', label: 'Còn性能 không?' },
  { key: 'dauMay', label: 'Dầu máy' },
  { key: 'nuocLamMat', label: 'Nước làm mát' },
  { key: 'camHanhTrinh', label: 'Cam hành trình' },
  { key: 'manHinhBluetooth', label: 'Màn hình, Bluetooth' },
  { key: 'cameraLui', label: 'Camera lùi' },
  { key: 'denPhaCot', label: 'Đèn (Pha, Cốt, Cảnh báo, Phanh)' },
  { key: 'motorGuongNutBam', label: 'Motor Gương, Nút bấm (Cụp mở, chỉnh điện)' },
  { key: 'dieuHoaSuGhe', label: 'Điều hòa / Sưởi ghế' },
  { key: 'cuaSo', label: 'Cửa sổ (Tất cả các cửa)' },
  { key: 'gheChinhDien', label: 'Ghế chỉnh điện' },
  { key: 'doAcQuy', label: 'Đo ắc quy' },
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

  // ====== STATE ĐẦU VÀO ======
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

  // ====== STATE ĐẦU RA ======
  const [outCheck, setOutCheck] = useState<CheckOutCheck>(defaultOutCheck())
  const [outNotes, setOutNotes] = useState('')

  // ====== SUMMARY COUNTS ======
  const summaryCounts = useMemo(() => {
    if (type === 'in') {
      let ok = 0
      let error = 0
      let none = 0
      let noteCount = 0

      // Options
      if (screen === 'normal' || screen === 'android') ok++
      else if (screen === 'broken') error++

      if (rearCamera === 'ok') ok++
      else if (rearCamera === 'blurry') error++
      else none++

      if (rearSensor === 'ok') ok++
      else if (rearSensor === 'broken') error++
      else none++

      if (hipass === 'mirror' || hipass === 'device') ok++
      else none++

      if (dashcam === 'good') ok++
      else if (dashcam === 'maybe') error++
      else none++

      // Interior
      const seats: (keyof InteriorCheck)[] = ['driverSeat', 'passengerSeat', 'rearSeat']
      seats.forEach((key) => {
        if (interior[key].condition === 'good') ok++
        else error++
        if (interior[key].note) noteCount++
      })

      // Exterior
      EXTERIOR_SPOTS.forEach(([key]) => {
        if (exterior[key].condition === 'good') ok++
        else error++
        if (exterior[key].note) noteCount++
      })

      return { ok, error, none, noteCount }
    } else {
      let ok = 0
      let error = 0
      let none = 0
      let noteCount = 0

      OUT_CHECK_ITEMS.forEach(({ key }) => {
        const status = outCheck[key]?.status
        if (status === 'ok') ok++
        else if (status === 'error') error++
        else if (status === 'none') none++
        if (outCheck[key]?.detail) noteCount++
      })

      if (outNotes.trim()) noteCount++

      return { ok, error, none, noteCount }
    }
  }, [type, screen, rearCamera, hipass, rearSensor, dashcam, interior, exterior, outCheck, outNotes])

  const exteriorRef = useRef<HTMLDivElement>(null)

  // ====== LOAD DATA ======
  useEffect(() => {
    console.log('🔵 [CheckSheetForm] Loading data - type:', type, 'vehicleId:', vehicle.id)
    console.log('🔵 [CheckSheetForm] existingSheet:', existingSheet ? existingSheet.id : 'null')

    if (existingSheet) {
      // Load dữ liệu từ sheet có sẵn
      setCheckerId(existingSheet.checkerId || currentEmployeeId)
      setCheckDate(existingSheet.checkDate || new Date().toISOString().slice(0, 10))
      setFuelLevel(existingSheet.fuelLevel || 'half')
      setScreen(existingSheet.screen || 'normal')
      setRearCamera(existingSheet.rearCamera || 'ok')
      setHipass(existingSheet.hipass || 'none')
      setRearSensor(existingSheet.rearSensor || 'ok')
      setDashcam(existingSheet.dashcam || 'none')

      if (existingSheet.interior) setInterior(existingSheet.interior)
      if (existingSheet.exterior) setExterior(existingSheet.exterior)
      if (existingSheet.exteriorPhotos) setExteriorPhotos(existingSheet.exteriorPhotos)

      // Đầu ra
      if (existingSheet.outCheck) setOutCheck(existingSheet.outCheck)
      if (existingSheet.outNotes) setOutNotes(existingSheet.outNotes)

      console.log('🔵 [CheckSheetForm] Loaded from existing sheet:', existingSheet.id)
    } else {
      // Reset về mặc định
      setCheckerId(currentEmployeeId)
      setCheckDate(new Date().toISOString().slice(0, 10))
      setFuelLevel('half')
      setScreen('normal')
      setRearCamera('ok')
      setHipass('none')
      setRearSensor('ok')
      setDashcam('none')
      setInterior(defaultInterior())
      setExterior(emptyExteriorCheck())
      setExteriorPhotos({})
      setOutCheck(defaultOutCheck())
      setOutNotes('')

      console.log('🔵 [CheckSheetForm] Reset to defaults - no existing sheet')
    }
  }, [vehicle.id, type]) // eslint-disable-line

  // ====== HELPERS ======
  function updateInterior(key: keyof InteriorCheck, patch: Partial<{ condition: InteriorCondition; note: string }>) {
    setInterior((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function updateExterior(key: ExteriorSpotKey, patch: Partial<{ condition: ExteriorCondition; note: string }>) {
    setExterior((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function updateOutCheck(key: keyof CheckOutCheck, patch: Partial<CheckOutItem>) {
    setOutCheck((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  const paintCount = useMemo(() => {
    let count = 0
    EXTERIOR_SPOTS.forEach(([key]) => {
      const c = exterior[key].condition
      if (c === 'dent' || c === 'discolor' || c === 'needpaint') count++
    })
    return count
  }, [exterior])

  // Checklist items cho Đầu vào (tạo Task)
  const allChecklistItems = useMemo(() => {
    if (type !== 'in') return []
    const items: { id: string; text: string; done: boolean }[] = []

    if (screen === 'broken') {
      items.push({ id: uid('chk'), text: 'Sửa màn hình', done: false })
    }

    if (rearCamera === 'broken') {
      items.push({ id: uid('chk'), text: 'Lắp cam lùi', done: false })
    }

    if (rearSensor === 'broken') {
      items.push({ id: uid('chk'), text: 'Lắp cảm biến lùi', done: false })
    }

    if (dashcam === 'good' || dashcam === 'maybe') {
      items.push({ id: uid('chk'), text: 'Lắp thẻ nhớ', done: false })
    }

    if (dashcam === 'none') {
      items.push({ id: uid('chk'), text: 'Lắp cam hành trình', done: false })
    }

    const seats: { key: keyof InteriorCheck; label: string }[] = [
      { key: 'driverSeat', label: 'Ghế lái' },
      { key: 'passengerSeat', label: 'Ghế phụ' },
      { key: 'rearSeat', label: 'Hàng ghế sau' },
    ]

    seats.forEach(({ key, label }) => {
      if (interior[key].condition === 'dirty') {
        items.push({ id: uid('chk'), text: `Vệ sinh ${label}`, done: false })
      }
      if (interior[key].condition === 'torn') {
        items.push({ id: uid('chk'), text: `Bọc lại ${label}`, done: false })
      }
    })

    if (paintCount > 0) {
      items.push({ id: uid('chk'), text: `Sơn lại (${paintCount} tấm)`, done: false })
    }

    const hasPolish = EXTERIOR_SPOTS.some(([key]) => exterior[key].condition === 'scratch')
    if (hasPolish) {
      items.push({ id: uid('chk'), text: 'Đánh bóng', done: false })
    }

    return items
  }, [type, screen, rearCamera, rearSensor, dashcam, interior, exterior, paintCount])

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
    if (EXTERIOR_SPOTS.some(([key]) => exterior[key].condition === 'scratch')) labels.push({ text: 'Trầy cần đánh bóng', bold: true })
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
      // Update bản ghi hiện có
      updateCheckSheet(existingSheet.id, sheetData)
      console.log('🔵 [CheckSheetForm] Updated existing sheet:', existingSheet.id)
      return existingSheet.id
    } else {
      // Tạo bản ghi mới
      addCheckSheet(sheetData)
      const newSheet = checkSheets.find((c) => c.vehicleId === vehicle.id && c.type === type)
      console.log('🔵 [CheckSheetForm] Created new sheet:', newSheet?.id)
      return newSheet?.id
    }
  }

  function handleSaveAndClose() {
    console.log('🔵 [handleSaveAndClose] Bắt đầu - type:', type)

    // Chỉ tạo Task cho Đầu vào
    if (type === 'in' && allChecklistItems.length > 0) {
      const taskTitle = `Kiểm tra xe ${vehicle.plate}`
      const existingTask = tasks.find((t) => t.vehicleId === vehicle.id && t.title.includes(vehicle.plate))

      if (existingTask) {
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

    // Lưu check sheet
    handleSave()

    // Notification
    addNotification({
      type: 'task_done',
      title: 'Lưu thành công',
      body: `Đã lưu phiếu ${type === 'in' ? 'đầu vào' : 'đầu ra'} cho xe ${vehicle.plate}`,
    })

    onSaved()
  }

  // ====== RENDER ======
  return (
    <>
      <div className="flex flex-col" style={{ maxHeight: 'calc(100dvh - 160px)' }}>
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* Thông tin xe - chung cho cả 2 loại */}
          <CollapsibleCard title="Thông tin xe" subtitle={`${vehicle.plate} - ${vehicle.model}`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ReadonlyField label="Biển số" value={vehicle.plate || '-'} />
              <ReadonlyField label="Dòng" value={vehicle.model || '-'} />
              <ReadonlyField label="Năm" value={vehicle.year ? String(vehicle.year) : '-'} />
              <ReadonlyField label="Màu" value={vehicle.color || '-'} />
              <ReadonlyField label="Số km" value={vehicle.mileage || '-'} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          {/* ĐẦU RA - 12 hạng mục kiểm tra */}
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
                    Lỗi phát hiện ({outIssueLabels.length})
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
        title="Chụp ảnh vị trí lỗi"
        subtitle={exteriorPhotoModal ? EXTERIOR_SPOTS.find(([k]) => k === exteriorPhotoModal)?.[1] : ''}
      >
        {exteriorPhotoModal && (
          <div className="space-y-3">
            <PhotoUploader
              images={exteriorPhotos[exteriorPhotoModal] || []}
              onChange={(imgs) => setExteriorPhotos((prev) => ({ ...prev, [exteriorPhotoModal]: imgs }))}
              label="Tải ảnh vị trí lỗi"
              emptyText="Chưa có ảnh"
            />
            <button className="btn-secondary w-full" onClick={() => setExteriorPhotoModal(null)}>
              Đóng
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}

// ====== HELPER COMPONENTS ======

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-700">{value}</div>
    </div>
  )
}

function OptionRow<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <SegButton options={options} value={value} onChange={(v) => onChange(v as T)} />
    </div>
  )
}

function InteriorRow({
  label,
  entry,
  onChange,
}: {
  label: string
  entry: { condition: InteriorCondition; note?: string }
  onChange: (p: Partial<{ condition: InteriorCondition; note: string }>) => void
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

// Component cho hạng mục kiểm tra đầu ra
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

// Summary Stat Card component
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
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    slate: 'bg-slate-50 border-slate-200 text-slate-500',
    brand: 'bg-brand-50 border-brand-200 text-brand-600',
  }

  const textColors = {
    green: 'text-green-700',
    red: 'text-red-700',
    slate: 'text-slate-700',
    brand: 'text-brand-700',
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${colors[tone]}`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className={`text-2xl font-bold ${textColors[tone]}`}>{count}</div>
        <div className={`text-xs font-medium ${tone === 'slate' ? 'text-slate-500' : `text-${tone}-600`}`}>{label}</div>
      </div>
    </div>
  )
}
