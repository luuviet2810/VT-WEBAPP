// ====== CHECKSHEET FORM COMPONENT ======

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CheckCircle2, XCircle, Minus, StickyNote, Wrench, Plus, Minus as MinusIcon } from 'lucide-react'
import { useStore } from '../store/useStore'
import {
  CheckOutCheck,
  CheckOutItem,
  CheckOutStatus,
  CheckSheet,
  ConSeongnyeongItem,
  ConSeongnyeongStatus,
  DauMayItem,
  DauMayStatus,
  DashcamState,
  DieuHoaItem,
  DieuHoaStatus,
  EXTERIOR_SPOTS,
  ExteriorCheck,
  ExteriorCondition,
  ExteriorSpotKey,
  FuelLevel,
  HipassState,
  InteriorCheck,
  InteriorCondition,
  NuocLamMatItem,
  NuocLamMatStatus,
  ScreenState,
  SensorState,
  SuoiGheItem,
  SuoiGheStatus,
  Vehicle,
  CameraState,
} from '../types'
import { CollapsibleCard, Modal, SegButton, WheelPicker, BatteryCheck } from './ui'
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

// Còn Song nưng options
const CON_SEONGNYEONG_OPTIONS: { value: ConSeongnyeongStatus; label: string }[] = [
  { value: 'con', label: 'Còn' },
  { value: 'can_repair', label: 'Cần song nưng lại' },
]

// Dầu máy options
const DAU_MAY_OPTIONS: { value: DauMayStatus; label: string }[] = [
  { value: 'replacing', label: 'Đang đi thay' },
  { value: 'good', label: 'Còn tốt' },
  { value: 'empty', label: 'Hết dầu rồi' },
]

// Nước làm mát options
const NUOC_LAM_MAT_OPTIONS: { value: NuocLamMatStatus; label: string }[] = [
  { value: 'replacing', label: 'Đang đi thay' },
  { value: 'good', label: 'Còn tốt' },
  { value: 'empty', label: 'Hết' },
]

// Điều hòa options
const DIEU_HOA_OPTIONS: { value: DieuHoaStatus; label: string }[] = [
  { value: 'good', label: 'Tốt' },
  { value: 'need_gas', label: 'Cần đổ ga' },
]

// Sưởi ghế options
const SUOI_GHE_OPTIONS: { value: SuoiGheStatus; label: string }[] = [
  { value: 'good', label: 'Tốt' },
  { value: 'broken', label: 'Hỏng nút' },
  { value: 'none', label: 'Không có' },
]

// 12 hạng mục kiểm tra đầu ra - chỉ các item generic (OK/Lỗi/Không có)
const OUT_CHECK_ITEMS: { key: keyof CheckOutCheck; label: string }[] = [
  { key: 'camHanhTrinh', label: 'Cam hành trình' },
  { key: 'manHinhBluetooth', label: 'Màn hình, Bluetooth' },
  { key: 'cameraLui', label: 'Camera lùi' },
  { key: 'denPhaCot', label: 'Đèn (Pha, Cốt, Cảnh báo, Phanh)' },
  { key: 'motorGuongNutBam', label: 'Motor Gương, Nút bấm' },
  { key: 'cuaSo', label: 'Cửa sổ' },
  { key: 'gheChinhDien', label: 'Ghế chỉnh điện' },
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
  return {
    conSeongnyeong: { status: 'con' },
    dauMay: { status: 'good' },
    nuocLamMat: { status: 'good' },
    camHanhTrinh: { status: 'ok' },
    manHinhBluetooth: { status: 'ok' },
    cameraLui: { status: 'ok' },
    denPhaCot: { status: 'ok' },
    motorGuongNutBam: { status: 'ok' },
    dieuHoa: { status: 'good' },
    suoiGhe: { status: 'none' },
    cuaSo: { status: 'ok' },
    gheChinhDien: { status: 'ok' },
    tinhTrangLop: { status: 'ok' },
  }
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

  // ====== BATTERY STATE (Đầu vào) =====
  const [inputAcquySOH, setInputAcquySOH] = useState(100)
  const [inputAcquySOC, setInputAcquySOC] = useState(100)
  const [inputAcquyPickerOpen, setInputAcquyPickerOpen] = useState<'soh' | 'soc' | null>(null)

  // ====== TIRE STATE (Đầu vào) =====
  const [inputTireState, setInputTireState] = useState<CheckOutItem>({ status: 'ok' })

  // ====== ĐIỀU HÒA & SƯỞI GHẾ STATE (Đầu vào) =====
  const [inputDieuHoa, setInputDieuHoa] = useState<DieuHoaItem>({ status: 'good' })
  const [inputSuoiGhe, setInputSuoiGhe] = useState<SuoiGheItem>({ status: 'none' })

  // ====== TIRE STATE (Đầu ra) =====
  const [outTireState, setOutTireState] = useState<CheckOutItem>({ status: 'ok' })

  // ====== BATTERY STATE (Đầu ra) =====
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

      // Hi-Pass: KHÔNG tính vào thống kê

      if (rearSensor === 'ok') ok++
      else if (rearSensor === 'broken') error++
      else if (rearSensor === 'none') none++

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

      // Còn Song nưng - "Cần song nưng lại" = Hỏng, "Còn" = OK
      if (outCheck.conSeongnyeong.status === 'can_repair') error++
      else ok++

      // Dầu máy - "Hết dầu rồi" = Hỏng, "Đang đi thay" hoặc "Còn tốt" = OK
      if (outCheck.dauMay.status === 'empty') error++
      else ok++

      // Nước làm mát - "Hết" = Hỏng, "Đang đi thay" hoặc "Còn tốt" = OK
      if (outCheck.nuocLamMat.status === 'empty') error++
      else ok++

      // Các item generic
      Object.values(outCheck).forEach((v) => {
        if (v.status === 'ok') ok++
        else if (v.status === 'error') error++
        else if (v.status === 'none') none++
      })

      // Điều hòa - "Cần đổ ga" = Hỏng
      if (outCheck.dieuHoa.status === 'need_gas') error++
      else ok++

      // Sưởi ghế - "Hỏng nút" = Hỏng, "Không có" = OK (không tính vào Cần lắp)
      if (outCheck.suoiGhe.status === 'broken') error++
      else ok++

      return { ok, error, none, noteCount: outNotes ? 1 : 0 }
    }
  }, [type, screen, rearCamera, rearSensor, dashcam, interior, exterior, outCheck, outNotes])

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

  function updateConSeongnyeong(patch: Partial<ConSeongnyeongItem>) {
    setOutCheck((prev) => ({ ...prev, conSeongnyeong: { ...prev.conSeongnyeong, ...patch } }))
  }

  function updateDauMay(patch: Partial<DauMayItem>) {
    setOutCheck((prev) => ({ ...prev, dauMay: { ...prev.dauMay, ...patch } }))
  }

  function updateNuocLamMat(patch: Partial<NuocLamMatItem>) {
    setOutCheck((prev) => ({ ...prev, nuocLamMat: { ...prev.nuocLamMat, ...patch } }))
  }

  function updateDieuHoa(patch: Partial<DieuHoaItem>) {
    setOutCheck((prev) => ({ ...prev, dieuHoa: { ...prev.dieuHoa, ...patch } }))
  }

  function updateSuoiGhe(patch: Partial<SuoiGheItem>) {
    setOutCheck((prev) => ({ ...prev, suoiGhe: { ...prev.suoiGhe, ...patch } }))
  }

  // Generate tasks from Đầu vào
  const allChecklistItems = useMemo(() => {
    if (type !== 'in') return []
    const items: { id: string; text: string; done: boolean }[] = []

    // Màn hình - chỉ Hỏng mới tạo
    if (screen === 'broken') items.push({ id: uid('chk'), text: 'Sửa màn hình', done: false })

    // Camera lùi - chỉ Hỏng mới tạo
    if (rearCamera === 'broken') items.push({ id: uid('chk'), text: 'Sửa camera lùi', done: false })

    // Cảm biến lùi - Hỏng hoặc Không có đều tạo (task khác nhau)
    if (rearSensor === 'broken') items.push({ id: uid('chk'), text: 'Sửa cảm biến lùi', done: false })
    if (rearSensor === 'none') items.push({ id: uid('chk'), text: 'Lắp cảm biến lùi', done: false })

    // Camera hành trình
    if (dashcam === 'maybe') items.push({ id: uid('chk'), text: 'Lắp thẻ nhớ camera hành trình', done: false })
    if (dashcam === 'none') items.push({ id: uid('chk'), text: 'Lắp camera hành trình', done: false })

    // Điều hòa - Đầu vào
    if (inputDieuHoa.status === 'need_gas') items.push({ id: uid('chk'), text: 'Đổ ga điều hòa', done: false })

    // Sưởi ghế - Đầu vào - chỉ "Hỏng nút" mới tạo
    if (inputSuoiGhe.status === 'broken') items.push({ id: uid('chk'), text: 'Sửa nút sưởi ghế', done: false })

    // Ghế - Bẩn hoặc Rách
    const seats: { key: keyof InteriorCheck; label: string }[] = [
      { key: 'driverSeat', label: 'Ghế lái' },
      { key: 'passengerSeat', label: 'Ghế phụ' },
      { key: 'rearSeat', label: 'Hàng ghế sau' },
    ]
    seats.forEach(({ key, label }) => {
      if (interior[key].condition === 'dirty') items.push({ id: uid('chk'), text: `Vệ sinh lại ghế`, done: false })
      if (interior[key].condition === 'torn') items.push({ id: uid('chk'), text: `Bọc lại ghế`, done: false })
    })

    // Ngoại thất - Móp hoặc Đổi màu sơn (cộng dồn)
    const exteriorIssues = EXTERIOR_SPOTS.filter(([key]) => {
      const cond = exterior[key]?.condition
      return cond === 'dent' || cond === 'discolor'
    })
    if (exteriorIssues.length > 0) {
      items.push({ id: uid('chk'), text: `Cần sơn ${exteriorIssues.length} tấm`, done: false })
    }

    // Mức nhiên liệu - Báo vàng (empty) mới tạo
    if (fuelLevel === 'empty') {
      const fuelText = vehicle.fuelType === 'diesel' ? 'Đổ dầu' : 'Đổ xăng'
      items.push({ id: uid('chk'), text: fuelText, done: false })
    }

    // Tình trạng lốp - chỉ "Mòn lắm" (none) mới tạo
    if (inputTireState.status === 'none') items.push({ id: uid('chk'), text: 'Thay lốp', done: false })

    return items
  }, [type, screen, rearCamera, rearSensor, dashcam, inputDieuHoa, inputSuoiGhe, interior, exterior, fuelLevel, vehicle.fuelType, inputTireState])

  // Generate tasks from Đầu ra errors
  const outErrorTasks = useMemo(() => {
    if (type !== 'out') return []
    const tasks: { id: string; title: string; prefix: string }[] = []

    // Còn Song nưng - chỉ "Cần song nưng lại" mới tạo
    if (outCheck.conSeongnyeong.status === 'can_repair') {
      tasks.push({
        id: uid('task'),
        title: `Sửa xe ${vehicle.plate}: Song nưng xe`,
        prefix: `${vehicle.plate} - Song nưng xe`,
      })
    }

    // Dầu máy - chỉ "Hết dầu rồi" mới tạo
    if (outCheck.dauMay.status === 'empty') {
      tasks.push({
        id: uid('task'),
        title: `Sửa xe ${vehicle.plate}: Thay dầu máy`,
        prefix: `${vehicle.plate} - Thay dầu máy`,
      })
    }

    // Nước làm mát - chỉ "Hết" mới tạo
    if (outCheck.nuocLamMat.status === 'empty') {
      tasks.push({
        id: uid('task'),
        title: `Sửa xe ${vehicle.plate}: Thay nước làm mát`,
        prefix: `${vehicle.plate} - Thay nước làm mát`,
      })
    }

    // Các item lỗi thông thường
    OUT_CHECK_ITEMS
      .filter(({ key }) => outCheck[key]?.status === 'error')
      .forEach(({ key, label }) => {
        tasks.push({
          id: uid('task'),
          title: `Sửa xe ${vehicle.plate}: ${label}`,
          prefix: `${vehicle.plate} - ${label}`,
        })
      })

    // Điều hòa - chỉ "Cần đổ ga" mới tạo
    if (outCheck.dieuHoa.status === 'need_gas') {
      tasks.push({
        id: uid('task'),
        title: `Sửa xe ${vehicle.plate}: Đổ ga điều hòa`,
        prefix: `${vehicle.plate} - Đổ ga điều hòa`,
      })
    }

    // Sưởi ghế - chỉ "Hỏng nút" mới tạo
    if (outCheck.suoiGhe.status === 'broken') {
      tasks.push({
        id: uid('task'),
        title: `Sửa xe ${vehicle.plate}: Sửa nút sưởi ghế`,
        prefix: `${vehicle.plate} - Sửa nút sưởi ghế`,
      })
    }

    // Tình trạng lốp Đầu ra - chỉ "Mòn lắm" (none) mới tạo task
    if (outTireState.status === 'none') {
      tasks.push({
        id: uid('task'),
        title: `Sửa xe ${vehicle.plate}: Thay lốp`,
        prefix: `${vehicle.plate} - Thay lốp`,
      })
    }
    return tasks
  }, [type, outCheck, outTireState, vehicle.plate])

  // Issue labels cho Đầu vào
  const issueLabels = useMemo(() => {
    if (type !== 'in') return []
    const labels: { text: string; bold: boolean }[] = []

    // Màn hình - chỉ Hỏng
    if (screen === 'broken') labels.push({ text: 'Màn hình', bold: true })

    // Camera lùi - chỉ Hỏng
    if (rearCamera === 'broken') labels.push({ text: 'Cam lùi', bold: true })

    // Cảm biến lùi - Hỏng hoặc Không có
    if (rearSensor === 'broken') labels.push({ text: 'Cảm biến lùi', bold: true })
    if (rearSensor === 'none') labels.push({ text: 'Chưa có cảm biến lùi', bold: true })

    // Camera hành trình
    if (dashcam === 'maybe') labels.push({ text: 'Thiếu thẻ nhớ', bold: true })
    if (dashcam === 'none') labels.push({ text: 'Chưa có cam hành trình', bold: true })

    // Điều hòa - Đầu vào
    if (inputDieuHoa.status === 'need_gas') labels.push({ text: 'Điều hòa cần đổ ga', bold: true })

    // Sưởi ghế - Đầu vào
    if (inputSuoiGhe.status === 'broken') labels.push({ text: 'Sưởi ghế hỏng nút', bold: true })

    // Ghế - Bẩn hoặc Rách
    const seats: { key: keyof InteriorCheck; label: string }[] = [
      { key: 'driverSeat', label: 'Ghế lái' },
      { key: 'passengerSeat', label: 'Ghế phụ' },
      { key: 'rearSeat', label: 'Hàng ghế sau' },
    ]
    seats.forEach(({ key, label }) => {
      if (interior[key].condition === 'dirty') labels.push({ text: `${label} bẩn`, bold: true })
      if (interior[key].condition === 'torn') labels.push({ text: `${label} rách`, bold: true })
    })

    // Ngoại thất - Móp hoặc Đổi màu sơn (cộng dồn)
    const exteriorIssues = EXTERIOR_SPOTS.filter(([key]) => {
      const cond = exterior[key]?.condition
      return cond === 'dent' || cond === 'discolor'
    })
    if (exteriorIssues.length > 0) {
      labels.push({ text: `${exteriorIssues.length} tấm cần sơn`, bold: true })
    }

    // Mức nhiên liệu - Báo vàng
    if (fuelLevel === 'empty') {
      labels.push({ text: 'Nhiên liệu gần hết', bold: true })
    }

    // Tình trạng lốp - chỉ "Mòn lắm" (none)
    if (inputTireState.status === 'none') labels.push({ text: 'Lốp mòn lắm', bold: true })

    return labels
  }, [type, screen, rearCamera, rearSensor, dashcam, inputDieuHoa, inputSuoiGhe, interior, exterior, fuelLevel, inputTireState])

  // Issue labels cho Đầu ra
  const outIssueLabels = useMemo(() => {
    if (type !== 'out') return []
    const labels: { text: string; bold: boolean }[] = []

    // Còn Song nưng - chỉ "Cần song nưng lại" mới hiển thị
    if (outCheck.conSeongnyeong.status === 'can_repair') {
      labels.push({ text: 'Cần song nưng lại', bold: true })
    }

    // Dầu máy - chỉ "Hết dầu rồi" mới hiển thị
    if (outCheck.dauMay.status === 'empty') {
      labels.push({ text: 'Hết dầu máy', bold: true })
    }

    // Nước làm mát - chỉ "Hết" mới hiển thị
    if (outCheck.nuocLamMat.status === 'empty') {
      labels.push({ text: 'Hết nước làm mát', bold: true })
    }

    // Các item lỗi thông thường
    OUT_CHECK_ITEMS
      .filter(({ key }) => outCheck[key]?.status === 'error')
      .forEach(({ label, key }) => {
        labels.push({
          text: `${label}: ${(outCheck[key] as CheckOutItem)?.detail || 'Lỗi'}`,
          bold: true,
        })
      })

    // Điều hòa - chỉ "Cần đổ ga" mới hiển thị
    if (outCheck.dieuHoa.status === 'need_gas') {
      labels.push({ text: 'Điều hòa cần đổ ga', bold: true })
    }

    // Sưởi ghế - chỉ "Hỏng nút" mới hiển thị
    if (outCheck.suoiGhe.status === 'broken') {
      labels.push({ text: 'Sưởi ghế hỏng nút', bold: true })
    }

    // Tình trạng lốp Đầu ra - chỉ "Mòn lắm" (none) mới hiển thị
    if (outTireState.status === 'none') {
      labels.push({ text: 'Lốp mòn lắm', bold: true })
    }
    return labels
  }, [type, outCheck, outTireState])

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

    // Đầu ra: Đồng bộ tasks với trạng thái lỗi hiện tại
    if (type === 'out') {
      // Tất cả các prefix task cần thiết (dựa trên trạng thái hiện tại)
      const requiredPrefixes: { prefix: string; title: string }[] = []

      // Còn Song nưng - "Cần song nưng lại" => cần task
      if (outCheck.conSeongnyeong.status === 'can_repair') {
        requiredPrefixes.push({
          prefix: `${vehicle.plate} - Song nưng xe`,
          title: `Sửa xe ${vehicle.plate}: Song nưng xe`,
        })
      }

      // Dầu máy - "Hết dầu rồi" => cần task
      if (outCheck.dauMay.status === 'empty') {
        requiredPrefixes.push({
          prefix: `${vehicle.plate} - Thay dầu máy`,
          title: `Sửa xe ${vehicle.plate}: Thay dầu máy`,
        })
      }

      // Nước làm mát - "Hết" => cần task
      if (outCheck.nuocLamMat.status === 'empty') {
        requiredPrefixes.push({
          prefix: `${vehicle.plate} - Bổ sung nước làm mát`,
          title: `Sửa xe ${vehicle.plate}: Bổ sung nước làm mát`,
        })
      }

      // Các item lỗi thông thường
      OUT_CHECK_ITEMS
        .filter(({ key }) => outCheck[key]?.status === 'error')
        .forEach(({ key, label }) => {
          requiredPrefixes.push({
            prefix: `${vehicle.plate} - ${label}`,
            title: `Sửa xe ${vehicle.plate}: ${label}`,
          })
        })

      // Điều hòa - "Cần đổ ga" => cần task
      if (outCheck.dieuHoa.status === 'need_gas') {
        requiredPrefixes.push({
          prefix: `${vehicle.plate} - Đổ ga điều hòa`,
          title: `Sửa xe ${vehicle.plate}: Đổ ga điều hòa`,
        })
      }

      // Sưởi ghế - "Hỏng nút" => cần task
      if (outCheck.suoiGhe.status === 'broken') {
        requiredPrefixes.push({
          prefix: `${vehicle.plate} - Sửa nút sưởi ghế`,
          title: `Sửa xe ${vehicle.plate}: Sửa nút sưởi ghế`,
        })
      }

      // Tình trạng lốp - "Mòn lắm" => cần task
      if (outTireState.status === 'none') {
        requiredPrefixes.push({
          prefix: `${vehicle.plate} - Thay lốp`,
          title: `Sửa xe ${vehicle.plate}: Thay lốp`,
        })
      }

      // Xóa tasks không còn cần thiết
      tasks
        .filter((t) => t.vehicleId === vehicle.id && t.title.includes(vehicle.plate))
        .forEach((t) => {
          // Kiểm tra xem task này có trong danh sách cần thiết không
          const isNeeded = requiredPrefixes.some((rp) => t.title.includes(rp.prefix))
          if (!isNeeded) {
            // Xóa task không cần thiết
            useStore.getState().deleteTask(t.id)
            console.log('🔵 [CheckSheet] Deleted task:', t.title)
          }
        })

      // Tạo tasks mới nếu chưa có
      requiredPrefixes.forEach(({ title, prefix }) => {
        const existingTask = tasks.find((t) =>
          t.title.includes(prefix) && t.vehicleId === vehicle.id
        )

        if (!existingTask) {
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
        {/* Form kiểm tra - Người check, Ngày check, Mức nhiên liệu */}
        <div className="px-1">
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
        </div>

        {/* Summary Card - Sticky */}
        <div className="sticky top-0 z-10 -mx-1 bg-white px-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-4">
            <SummaryStat
              icon={<CheckCircle2 size={18} />}
              label="OK"
              count={summaryCounts.ok}
              tone="green"
            />
            <SummaryStat
              icon={<XCircle size={18} />}
              label="Hỏng"
              count={summaryCounts.error}
              tone="red"
            />
            <SummaryStat
              icon={<Minus size={18} />}
              label="Cần lắp"
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
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-4 px-1">

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
                    { value: 'none', label: 'Chưa có' },
                  ]} />
                  {/* Điều hòa - Đầu vào */}
                  <DieuHoaRow
                    label="Điều hòa"
                    entry={inputDieuHoa}
                    onChange={(p: Partial<DieuHoaItem>) => setInputDieuHoa((prev: DieuHoaItem) => ({ ...prev, ...p }))}
                  />
                  {/* Sưởi ghế - Đầu vào */}
                  <SuoiGheRow
                    label="Sưởi ghế"
                    entry={inputSuoiGhe}
                    onChange={(p: Partial<SuoiGheItem>) => setInputSuoiGhe((prev: SuoiGheItem) => ({ ...prev, ...p }))}
                  />
                  {/* Tình trạng lốp - Đầu vào */}
                  <TireCheckRow
                    label="Tình trạng lốp"
                    entry={inputTireState}
                    onChange={(p) => setInputTireState((prev) => ({ ...prev, ...p }))}
                  />
                </div>
              </CollapsibleCard>

              {/* Battery Check - Đầu vào */}
              <BatteryCheck
                soh={inputAcquySOH}
                soc={inputAcquySOC}
                pickerOpen={inputAcquyPickerOpen}
                onSOHChange={setInputAcquySOH}
                onSOCChange={setInputAcquySOC}
                onPickerOpen={setInputAcquyPickerOpen}
              />

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
                  {/* Còn Song nưng không? */}
                  <ConSeongnyeongRow
                    label="Còn Song nưng không?"
                    entry={outCheck.conSeongnyeong}
                    onChange={(p) => updateConSeongnyeong(p)}
                  />

                  {/* Dầu máy */}
                  <DauMayRow
                    label="Dầu máy"
                    entry={outCheck.dauMay}
                    onChange={(p) => updateDauMay(p)}
                  />

                  {/* Nước làm mát */}
                  <NuocLamMatRow
                    label="Nước làm mát"
                    entry={outCheck.nuocLamMat}
                    onChange={(p) => updateNuocLamMat(p)}
                  />

                  {/* Các item generic */}
                  {OUT_CHECK_ITEMS.map(({ key, label }) => (
                    <OutCheckRow
                      key={key}
                      label={label}
                      entry={outCheck[key] as CheckOutItem}
                      onChange={(p) => updateOutCheck(key, p)}
                    />
                  ))}

                  {/* Điều hòa */}
                  <DieuHoaRow
                    label="Điều hòa"
                    entry={outCheck.dieuHoa}
                    onChange={(p) => updateDieuHoa(p)}
                  />

                  {/* Sưởi ghế */}
                  <SuoiGheRow
                    label="Sưởi ghế"
                    entry={outCheck.suoiGhe}
                    onChange={(p) => updateSuoiGhe(p)}
                  />

                  {/* Tình trạng lốp */}
                  <TireCheckRow
                    label="Tình trạng lốp"
                    entry={outTireState}
                    onChange={(p) => setOutTireState((prev) => ({ ...prev, ...p }))}
                  />
                </div>
              </CollapsibleCard>

              {/* Battery Check - Đầu ra */}
              <BatteryCheck
                soh={acquySOH}
                soc={acquySOC}
                pickerOpen={acquyPickerOpen}
                onSOHChange={setAcquySOH}
                onSOCChange={setAcquySOC}
                onPickerOpen={setAcquyPickerOpen}
              />

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

// Con Song nưng Row
function ConSeongnyeongRow({
  label,
  entry,
  onChange,
}: {
  label: string
  entry: ConSeongnyeongItem
  onChange: (p: Partial<ConSeongnyeongItem>) => void
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <SegButton
        options={CON_SEONGNYEONG_OPTIONS}
        value={entry?.status || 'con'}
        onChange={(v) => onChange({ status: v as ConSeongnyeongStatus })}
      />
    </div>
  )
}

// Dầu máy Row
function DauMayRow({
  label,
  entry,
  onChange,
}: {
  label: string
  entry: DauMayItem
  onChange: (p: Partial<DauMayItem>) => void
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <SegButton
        options={DAU_MAY_OPTIONS}
        value={entry?.status || 'good'}
        onChange={(v) => onChange({ status: v as DauMayStatus })}
      />
    </div>
  )
}

// Nước làm mát Row
function NuocLamMatRow({
  label,
  entry,
  onChange,
}: {
  label: string
  entry: NuocLamMatItem
  onChange: (p: Partial<NuocLamMatItem>) => void
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <SegButton
        options={NUOC_LAM_MAT_OPTIONS}
        value={entry?.status || 'good'}
        onChange={(v) => onChange({ status: v as NuocLamMatStatus })}
      />
    </div>
  )
}

// Điều hòa Row
function DieuHoaRow({
  label,
  entry,
  onChange,
}: {
  label: string
  entry: DieuHoaItem
  onChange: (p: Partial<DieuHoaItem>) => void
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <SegButton
        options={DIEU_HOA_OPTIONS}
        value={entry?.status || 'good'}
        onChange={(v) => onChange({ status: v as DieuHoaStatus })}
      />
    </div>
  )
}

// Sưởi ghế Row
function SuoiGheRow({
  label,
  entry,
  onChange,
}: {
  label: string
  entry: SuoiGheItem
  onChange: (p: Partial<SuoiGheItem>) => void
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <SegButton
        options={SUOI_GHE_OPTIONS}
        value={entry?.status || 'none'}
        onChange={(v) => onChange({ status: v as SuoiGheStatus })}
      />
    </div>
  )
}

// TIRE STATUS OPTIONS - 3 choices instead of 3
const TIRE_STATUS_OPTIONS: { value: CheckOutStatus; label: string }[] = [
  { value: 'ok', label: 'Còn ngon' },     // good
  { value: 'error', label: 'Hơi mòn' },   // worn
  { value: 'none', label: 'Mòn lắm' },    // badd
]

function TireCheckRow({
  label,
  entry,
  onChange,
}: {
  label: string
  entry: CheckOutItem
  onChange: (p: Partial<CheckOutItem>) => void
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <SegButton
        options={TIRE_STATUS_OPTIONS}
        value={entry?.status || 'ok'}
        onChange={(v) => onChange({ status: v as CheckOutStatus })}
      />
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
