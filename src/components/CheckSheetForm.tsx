// ====== CHECKSHEET FORM COMPONENT ======

import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Minus, StickyNote, Wrench, Plus, Minus as MinusIcon } from 'lucide-react'
import { useStore } from '../store/useStore'
import * as checksheetService from '../services/checksheet.service'
import { EMPTY_CHECK_SHEET } from '../services/checksheet.service'
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
import { CollapsibleCard, SegButton, WheelPicker, BatteryCheck, Badge } from './ui'
import { emptyExteriorCheck } from '../store/useStore'
import { uid } from '../utils/format'
import { generateTasks, GeneratedTask } from '../utils/taskRules'
import { classifyStatus } from '../utils/statusClassification'

const DEBOUNCE_MS = 500

// ====== CONSTANTS ======


const INTERIOR_OPTIONS: { value: InteriorCondition; label: string }[] = [
  { value: 'good', label: 'Sạch' },
  { value: 'dirty', label: 'Bẩn' },
  { value: 'torn', label: 'Rách' },
]

const EXTERIOR_OPTIONS: { value: ExteriorCondition; label: string }[] = [
  { value: 'good', label: 'Tốt' },
  { value: 'polish', label: 'Chỉ cần đánh bóng' },
  { value: 'dent', label: 'Móp' },
  { value: 'discolor', label: 'Đổi màu' },
  { value: 'touchup', label: 'Lấy sơn tự vá' },
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

// (empty helpers removed — centralized EMPTY_CHECK_SHEET in service layer)

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

  // Guard: prevent auto-save during initial data population
  const initRef = useRef(false)

  // ====== STATE — initialized from existing sheet or defaults ======
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [checkerId, setCheckerId] = useState(currentEmployeeId)
  const [checkDate, setCheckDate] = useState(new Date().toISOString().slice(0, 10))
  const FUEL_LEVEL_ITEMS = [
    { label: 'Báo vàng', value: 'empty' as FuelLevel },
    { label: 'Trên vạch đỏ', value: 'quarter' as FuelLevel },
    { label: '1 vạch to', value: 'quarter' as FuelLevel },
    { label: '2 vạch to (Nửa bình)', value: 'half' as FuelLevel },
    { label: '3 vạch to', value: 'full' as FuelLevel },
    { label: '4 vạch to (Đầy bình)', value: 'full' as FuelLevel },
  ]
  // Dùng index để đảm bảo single-select, không bị trùng value
  const [fuelLevelIdx, setFuelLevelIdx] = useState(-1)
  const fuelLevel = fuelLevelIdx >= 0 ? FUEL_LEVEL_ITEMS[fuelLevelIdx].value : undefined
  const [screen, setScreen] = useState<ScreenState | undefined>(undefined)
  const [rearCamera, setRearCamera] = useState<CameraState | undefined>(undefined)
  const [hipass, setHipass] = useState<HipassState | undefined>(undefined)
  const [rearSensor, setRearSensor] = useState<SensorState | undefined>(undefined)
  const [dashcam, setDashcam] = useState<DashcamState | undefined>(undefined)
  const [interior, setInterior] = useState<InteriorCheck>(EMPTY_CHECK_SHEET.interior)
  const [exterior, setExterior] = useState<ExteriorCheck>(emptyExteriorCheck())

  // ====== STATE ĐẦU RA ======
  const [outCheck, setOutCheck] = useState<CheckOutCheck>(EMPTY_CHECK_SHEET.outCheck)
  const [outNotes, setOutNotes] = useState('')

  // ====== BATTERY STATE (Đầu vào) ======
  const [inputAcquySOH, setInputAcquySOH] = useState(100)
  const [inputAcquySOC, setInputAcquySOC] = useState(100)
  const [inputAcquyPickerOpen, setInputAcquyPickerOpen] = useState<'soh' | 'soc' | null>(null)

  // ====== TIRE STATE (Đầu vào) ======
  const [inputTireState, setInputTireState] = useState<CheckOutItem>({ status: '' as CheckOutStatus })

  // ====== ĐIỀU HÒA & SƯỞI GHẾ STATE (Đầu vào) ======
  const [inputDieuHoa, setInputDieuHoa] = useState<DieuHoaItem>({ status: '' as DieuHoaStatus })
  const [inputSuoiGhe, setInputSuoiGhe] = useState<SuoiGheItem>({ status: '' as SuoiGheStatus })

  // ====== MEMO ĐẦU VÀO ======
  const [inputNotes, setInputNotes] = useState('')

  // ====== TIRE STATE (Đầu ra) ======
  const [outTireState, setOutTireState] = useState<CheckOutItem>({ status: '' as CheckOutStatus })

  // ====== BATTERY STATE (Đầu ra) ======
  const [acquySOH, setAcquySOH] = useState(100)
  const [acquySOC, setAcquySOC] = useState(100)
  const [acquyPickerOpen, setAcquyPickerOpen] = useState<'soh' | 'soc' | null>(null)

  // ====== SUGGESTED TASKS ======
  const [suggestedTasks, setSuggestedTasks] = useState<GeneratedTask[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [suggestionSource, setSuggestionSource] = useState<string>('rules')

  function buildSheetForRules(): CheckSheet {
    return {
      id: sheetId ?? uid('chk'),
      vehicleId: vehicle.id,
      type,
      checkerId,
      checkDate,
      fuelLevel: fuelLevel as FuelLevel,
      screen: screen as ScreenState,
      rearCamera: rearCamera as CameraState,
      hipass: hipass as HipassState,
      rearSensor: rearSensor as SensorState,
      dashcam: dashcam as DashcamState,
      interior,
      exterior,
      inputDieuHoa,
      inputSuoiGhe,
      inputTireState,
      inputNotes,
      outCheck,
      outNotes,
      inputAcquySOH,
      inputAcquySOC,
      acquySOH,
      acquySOC,
      createdAt: new Date().toISOString(),
    }
  }

  function refreshSuggestions(source: 'rules' | 'manual') {
    const generated = source === 'rules' ? generateTasks(buildSheetForRules(), vehicle.plate) : []
    const manual = source === 'manual' ? suggestedTasks.filter((task) => task.ruleId?.startsWith('manual_')) : []
    const combined = source === 'rules' ? generated : manual
    setSuggestedTasks(combined)
    setSelectedTaskIds(new Set(combined.map((task) => task.id)))
    setSuggestionSource(source)
  }

  function toggleSuggestedTask(id: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCreateSelectedTasks() {
    const selected = suggestedTasks.filter((task) => selectedTaskIds.has(task.id))
    if (selected.length === 0) return

    if (type === 'in') {
      // Mỗi suggested task được tạo thành một task riêng, không gộp vào checklist
      for (const task of selected) {
        const existing = tasks.find(
          (t) => t.vehicleId === vehicle.id && t.title === task.title
        )
        if (existing) continue
        addTask({
          id: uid('task'),
          title: task.title,
          checklist: task.checklist || [],
          priority: task.priority,
          status: task.status,
          vehicleId: vehicle.id,
          createdAt: task.createdAt,
          ruleId: task.ruleId,
        })
      }
    }

    if (type === 'out') {
      const requiredRuleIds = new Set(selected.map((task) => task.ruleId).filter(Boolean))
      const vehicleOutTasks = tasks.filter((task) => task.vehicleId === vehicle.id)
      const taskRuleIds = new Set(vehicleOutTasks.map((task) => task.ruleId).filter(Boolean))

      vehicleOutTasks.forEach((existingTask) => {
        if (!existingTask.ruleId || !taskRuleIds.has(existingTask.ruleId)) return
        if (existingTask.status === 'done') return
        if (!requiredRuleIds.has(existingTask.ruleId)) {
          useStore.getState().deleteTask(existingTask.id)
        }
      })

      selected.forEach((task) => {
        const existingTask = vehicleOutTasks.find((item) => item.ruleId === task.ruleId)
        if (!existingTask) {
          addTask({
            id: task.id,
            title: task.title,
            description: task.description,
            checklist: task.checklist,
            priority: task.priority,
            status: task.status,
            vehicleId: vehicle.id,
            createdAt: task.createdAt,
            ruleId: task.ruleId,
          })
        }
      })
    }
  }

  // ====== INIT: load existing sheet or create new one ======
  useEffect(() => {
    async function init() {
      try {
        const sheet = await checksheetService.getOrCreateCheckSheet(vehicle.id, type, {
          checkerId: currentEmployeeId,
        })
        setSheetId(sheet.id)
        setCheckerId(sheet.checkerId ?? currentEmployeeId)
        setCheckDate(sheet.checkDate)
        setFuelLevelIdx(() => {
          const idx = FUEL_LEVEL_ITEMS.findIndex((i) => i.value === sheet.fuelLevel)
          return idx >= 0 ? idx : -1
        })
        setScreen(sheet.screen)
        setRearCamera(sheet.rearCamera)
        setHipass(sheet.hipass)
        setRearSensor(sheet.rearSensor)
        setDashcam(sheet.dashcam)
        setInterior(sheet.interior)
        setExterior(Object.keys(sheet.exterior ?? {}).length > 0 ? sheet.exterior : emptyExteriorCheck())
        setOutCheck(sheet.outCheck ?? EMPTY_CHECK_SHEET.outCheck)
        setOutNotes(sheet.outNotes ?? '')
        setInputAcquySOH(sheet.inputAcquySOH ?? 100)
        setInputAcquySOC(sheet.inputAcquySOC ?? 100)
        setAcquySOH(sheet.acquySOH ?? 100)
        setAcquySOC(sheet.acquySOC ?? 100)
        setInputDieuHoa(sheet.inputDieuHoa ?? { status: '' as DieuHoaStatus })
        setInputSuoiGhe(sheet.inputSuoiGhe ?? { status: '' as SuoiGheStatus })
        setInputTireState(sheet.inputTireState ?? { status: '' as CheckOutStatus })
        setOutTireState(sheet.outTireState ?? { status: '' as CheckOutStatus })
        setInputNotes(sheet.inputNotes ?? '')
        // Mark init complete so auto-save can start
        initRef.current = true
      } catch (err) {
        console.error('[CheckSheetForm] Failed to load/create sheet:', err)
        addNotification({ type: 'error', title: 'Lỗi tải phiếu', body: 'Không thể tải dữ liệu phiếu kiểm tra.' })
      }
    }
    init()
  }, [vehicle.id, type])

  // ====== AUTO-SAVE DEBOUNCE ======
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function buildPatch(): Partial<CheckSheet> {
    const base: Partial<CheckSheet> = {
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
      inputDieuHoa,
      inputSuoiGhe,
      inputTireState,
      inputNotes,
    }
    if (type === 'out') {
      return { ...base, outCheck, outNotes, acquySOH, acquySOC, outTireState }
    }
    return { ...base, inputAcquySOH, inputAcquySOC }
  }

  function scheduleSave() {
    if (!sheetId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateCheckSheet(sheetId!, buildPatch()).catch((err) => {
        console.error('[CheckSheetForm] SAVE FAILED:', err)
        addNotification({ type: 'error', title: 'Lỗi lưu', body: 'Không thể lưu phiếu kiểm tra. Dữ liệu vẫn còn trên màn hình.' })
      })
    }, DEBOUNCE_MS)
  }

  function scheduleRefreshSuggestions() {
    if (!sheetId) return
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current)
    suggestionTimer.current = setTimeout(() => {
      refreshSuggestions('rules')
    }, DEBOUNCE_MS)
  }

  useEffect(() => {
    if (!sheetId || !initRef.current) return
    scheduleSave()
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [sheetId, checkerId, checkDate, fuelLevel, screen, rearCamera, hipass, rearSensor, dashcam, interior, exterior, inputDieuHoa, inputSuoiGhe, inputTireState, inputNotes, outCheck, outNotes, inputAcquySOH, inputAcquySOC, acquySOH, acquySOC])

  useEffect(() => {
    if (!sheetId || !initRef.current) return
    scheduleRefreshSuggestions()
  }, [sheetId, type, checkerId, checkDate, fuelLevel, screen, rearCamera, hipass, rearSensor, dashcam, interior, exterior, inputDieuHoa, inputSuoiGhe, inputTireState, inputNotes, outCheck, outNotes, inputAcquySOH, inputAcquySOC, acquySOH, acquySOC])

  // ====== SUMMARY COUNTS ======
  const summaryCounts = useMemo(() => {
    if (type === 'in') {
      let ok = 0
      let error = 0
      let none = 0
      let noteCount = 0

      // Màn hình
      const s = classifyStatus(screen)
      if (s === 'ok') ok++
      else if (s === 'bad') error++
      else if (s === 'install') { error++; none++ }

      // Camera lùi
      const r = classifyStatus(rearCamera)
      if (r === 'ok') ok++
      else if (r === 'bad') error++
      else if (r === 'install') { error++; none++ }

      // Hi-Pass: KHÔNG tính vào thống kê

      // Cảm biến lùi
      const rs = classifyStatus(rearSensor)
      if (rs === 'ok') ok++
      else if (rs === 'bad') error++
      else if (rs === 'install') { error++; none++ }

      // Camera hành trình
      const d = classifyStatus(dashcam)
      if (d === 'ok') ok++
      else if (d === 'bad') error++
      else if (d === 'install') { error++; none++ }

      // Điều hòa (Đầu vào)
      const dh = classifyStatus(inputDieuHoa?.status)
      if (dh === 'ok') ok++
      else if (dh === 'bad') error++
      else if (dh === 'install') { error++; none++ }

      // Sưởi ghế (Đầu vào)
      const sg = classifyStatus(inputSuoiGhe?.status)
      if (sg === 'ok') ok++
      else if (sg === 'bad') error++
      else if (sg === 'install') { error++; none++ }

      // Tình trạng lốp (Đầu vào)
      const tl = classifyStatus(inputTireState?.status)
      if (tl === 'ok') ok++
      else if (tl === 'bad') error++
      else if (tl === 'install') { error++; none++ }

      // Nhiên liệu
      if (fuelLevel) {
        const fl = classifyStatus(fuelLevel)
        if (fl === 'ok') ok++
        else if (fl === 'bad') error++
        else if (fl === 'install') { error++; none++ }
      }

      // SOC ắc quy < 50%
      if (inputAcquySOC >= 0 && inputAcquySOC < 50) error++
      else if (inputAcquySOC >= 50) ok++

      // Nội thất
      Object.values(interior).forEach((v) => {
        const c = classifyStatus(v.condition)
        if (c === 'ok') ok++
        else if (c === 'bad') error++
        else if (c === 'install') { error++; none++ }
        if (v.note) noteCount++
      })

      // Ngoại thất
      Object.values(exterior).forEach((v) => {
        const c = classifyStatus(v.condition)
        if (c === 'ok') ok++
        else if (c === 'bad') error++
        else if (c === 'install') { error++; none++ }
      })

      return { ok, error, none, noteCount }
    } else {
      // Đầu ra
      let ok = 0
      let error = 0
      let none = 0

      // Tất cả các mục kiểm tra đầu ra — mỗi mục chỉ được duyệt 1 lần
      Object.values(outCheck).forEach((v: any) => {
        const c = classifyStatus(v?.status)
        if (c === 'ok') ok++
        else if (c === 'bad') error++
        else if (c === 'install') { error++; none++ }
      })

      return { ok, error, none, noteCount: outNotes ? 1 : 0 }
    }
  }, [type, screen, rearCamera, rearSensor, dashcam, interior, exterior, outCheck, outNotes, inputDieuHoa, inputSuoiGhe, inputTireState, fuelLevel, inputAcquySOC])

  // Paint count
  const paintCount = useMemo(() => {
    return EXTERIOR_SPOTS.filter(([key]) => exterior[key]?.condition === 'dent' || exterior[key]?.condition === 'discolor').length
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

    // Camera lùi - Mờ hoặc Hỏng đều sinh Task
    if (rearCamera === 'blurry') items.push({ id: uid('chk'), text: 'Kiểm tra / Thay camera lùi', done: false })
    if (rearCamera === 'broken') items.push({ id: uid('chk'), text: 'Sửa camera lùi', done: false })

    // Cảm biến lùi - Hỏng hoặc Không có đều tạo (task khác nhau)
    if (rearSensor === 'broken') items.push({ id: uid('chk'), text: 'Sửa cảm biến lùi', done: false })
    if (rearSensor === 'none') items.push({ id: uid('chk'), text: 'Lắp cảm biến lùi', done: false })

    // Camera hành trình
    if (dashcam === 'maybe') items.push({ id: uid('chk'), text: 'Lắp thẻ nhớ camera hành trình', done: false })
    if (dashcam === 'none') items.push({ id: uid('chk'), text: 'Không có camera hành trình', done: false })

    // Điều hòa - Đầu vào
    if (inputDieuHoa.status === 'need_gas') items.push({ id: uid('chk'), text: 'Đổ ga điều hòa', done: false })

    // Hipass - Không sinh Task

    // Sưởi ghế - Đầu vào - chỉ "Hỏng nút" mới tạo
    if (inputSuoiGhe.status === 'broken') items.push({ id: uid('chk'), text: 'Sửa nút sưởi ghế', done: false })

    // Ghế - Bẩn hoặc Rách
    const seats: { key: keyof InteriorCheck; label: string }[] = [
      { key: 'driverSeat', label: 'Ghế lái' },
      { key: 'passengerSeat', label: 'Ghế phụ' },
      { key: 'rearSeat', label: 'Hàng ghế sau' },
    ]
    seats.forEach(({ key, label }) => {
      if (interior[key].condition === 'dirty') items.push({ id: uid('chk'), text: 'Vệ sinh nội thất', done: false })
      if (interior[key].condition === 'torn') items.push({ id: uid('chk'), text: `Bọc lại ghế`, done: false })
    })

    // Ngoại thất - Móp hoặc Đổi màu: mỗi vị trí một task riêng
    EXTERIOR_SPOTS.forEach(([key, spotLabel]) => {
      const cond = exterior[key]?.condition
      if (cond === 'dent') items.push({ id: uid('chk'), text: `Sửa móp ${spotLabel.toLowerCase()}`, done: false })
      if (cond === 'discolor') items.push({ id: uid('chk'), text: `Sơn lại ${spotLabel.toLowerCase()}`, done: false })
    })

    // Mức nhiên liệu - Báo vàng (empty) mới tạo
    if (fuelLevel === 'empty') {
      const fuelText = vehicle.fuelType === 'diesel' ? 'Đổ dầu' : 'Đổ xăng'
      items.push({ id: uid('chk'), text: fuelText, done: false })
    }

    // Tình trạng lốp
    if (inputTireState.status === 'error') items.push({ id: uid('chk'), text: 'Kiểm tra lốp', done: false })
    if (inputTireState.status === 'none') items.push({ id: uid('chk'), text: 'Thay lốp', done: false })

    // SOC acquy đầu vào < 50%
    if (inputAcquySOC < 50) items.push({ id: uid('chk'), text: 'Kiểm tra / Sạc ắc quy', done: false })

    return items
  }, [type, screen, rearCamera, rearSensor, dashcam, hipass, inputDieuHoa, inputSuoiGhe, interior, exterior, fuelLevel, vehicle.fuelType, inputTireState, inputAcquySOC])

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

    // Camera lùi - Mờ hoặc Hỏng
    if (rearCamera === 'blurry') labels.push({ text: 'Cam lùi mờ', bold: true })
    if (rearCamera === 'broken') labels.push({ text: 'Cam lùi hỏng', bold: true })

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

    // Ngoại thất - Móp hoặc Đổi màu
    EXTERIOR_SPOTS.forEach(([key, spotLabel]) => {
      const cond = exterior[key]?.condition
      if (cond === 'dent' || cond === 'discolor') {
        labels.push({ text: `${spotLabel}${cond === 'dent' ? ' móp' : ' đổi màu'}`, bold: true })
      }
    })

    // Mức nhiên liệu - Báo vàng
    if (fuelLevel === 'empty') {
      labels.push({ text: 'Nhiên liệu gần hết', bold: true })
    }

    // Tình trạng lốp
    if (inputTireState.status === 'error') labels.push({ text: 'Lốp hơi mòn', bold: true })
    if (inputTireState.status === 'none') labels.push({ text: 'Lốp mòn lắm', bold: true })

    // SOC ắc quy < 50%
    if (inputAcquySOC < 50) labels.push({ text: 'Ắc quy yếu', bold: true })

    return labels
  }, [type, screen, rearCamera, rearSensor, dashcam, inputDieuHoa, inputSuoiGhe, interior, exterior, fuelLevel, inputTireState, inputAcquySOC])

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

  // ====== TASK GENERATION ======
  async function handleCreateOrUpdateTasks() {
    const promises: Promise<void>[] = []

    if (type === 'in' && allChecklistItems.length > 0) {
      // Đầu vào: mỗi item trong allChecklistItems là một task riêng
      for (const item of allChecklistItems) {
        const existingTask = tasks.find(
          (t) => t.vehicleId === vehicle.id && t.title === item.text
        )
        if (existingTask) {
          // Task đã tồn tại, không tạo trùng
          continue
        }
        promises.push(addTask({
          id: uid('task'),
          title: item.text,
          checklist: [],
          priority: 'medium',
          status: 'todo',
          vehicleId: vehicle.id,
          createdAt: new Date().toISOString(),
        }))
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
            promises.push(useStore.getState().deleteTask(t.id))
          }
        })

      requiredPrefixes.forEach(({ title, prefix }) => {
        const existingTask = tasks.find((t) =>
          t.title.includes(prefix) && t.vehicleId === vehicle.id
        )

        if (!existingTask) {
          promises.push(addTask({
            id: uid('task'),
            title,
            checklist: [],
            priority: 'high',
            status: 'todo',
            vehicleId: vehicle.id,
            createdAt: new Date().toISOString(),
          }))
        }
      })
    }

    await Promise.all(promises)
  }

  // ====== SAVE (manual, used by Save button) ======
  async function handleSave() {
    if (!vehicle?.id || !sheetId) {
      throw new Error('Missing vehicle ID or sheet ID')
    }
    const patch = buildPatch()
    await updateCheckSheet(sheetId, patch)
    return sheetId
  }

  async function handleSaveAndClose() {
    if (isSaving) return
    setIsSaving(true)

    try {
      // 1. Lưu CheckSheet — rule engine tự động sinh task
      await handleSave()

      // 3. Notification
      addNotification({
        type: 'task_done',
        title: 'Lưu thành công',
        body: `Đã lưu phiếu ${type === 'in' ? 'đầu vào' : 'đầu ra'} cho xe ${vehicle.plate}`,
      })

      // 4. Gọi callback để đóng popup
      onSaved()
    } catch (err) {
      console.error('[CheckSheetForm] SAVE FAILED:', err)
      addNotification({ type: 'error', title: 'Lỗi lưu', body: 'Không thể lưu phiếu kiểm tra. Dữ liệu vẫn còn trên màn hình.' })
    } finally {
      setIsSaving(false)
    }
  }

  // ====== RENDER ======
  return (
    <>
      <div className="flex flex-col" style={{ maxHeight: 'calc(100dvh - 160px)' }}>
        {/* Summary */}
        <div className="bg-white border-b border-slate-100">
          <div className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-4">
            <SummaryStat icon={<CheckCircle2 size={18} />} label="OK" count={summaryCounts.ok} tone="green" />
            <SummaryStat icon={<XCircle size={18} />} label="Hỏng" count={summaryCounts.error} tone="red" />
            <SummaryStat icon={<Minus size={18} />} label="Cần lắp" count={summaryCounts.none} tone="slate" />
            <SummaryStat icon={<StickyNote size={18} />} label="Ghi chú" count={summaryCounts.noteCount} tone="brand" />
          </div>
        </div>

        {/* Form kiểm tra - Người check, Ngày check, Mức nhiên liệu */}
        <div className="px-1">
          <CollapsibleCard title="Thông tin kiểm tra">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Người check</label>
                <select className="input" value={checkerId} onChange={(e) => setCheckerId(e.target.value)}>
                  <option value="">-- Chọn người check --</option>
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
              <div className="grid grid-cols-3 gap-2">
                {FUEL_LEVEL_ITEMS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFuelLevelIdx(idx)}
                    className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors ${
                      fuelLevelIdx === idx
                        ? 'border-brand-400 bg-brand-500 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </CollapsibleCard>
        </div>

        {/* Suggested tasks assistant */}
        {suggestedTasks.length > 0 && (
          <CollapsibleCard
            title="Nhiệm vụ gợi ý"
            badge={<Badge tone="blue">{selectedTaskIds.size}/{suggestedTasks.length}</Badge>}
            defaultOpen={false}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">Chọn nhiệm vụ cần tạo từ phiếu kiểm tra.</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTaskIds(new Set(suggestedTasks.map((task) => task.id)))}
                    className="text-xs text-brand-600 hover:text-brand-700"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskIds(new Set())}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="max-h-56 space-y-2 overflow-y-auto">
                {suggestedTasks.map((task) => {
                  const isSelected = selectedTaskIds.has(task.id)
                  return (
                    <label
                      key={task.id}
                      className={clsx(
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                        isSelected ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                        checked={isSelected}
                        onChange={() => toggleSuggestedTask(task.id)}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{task.title}</div>
                        {task.description ? (
                          <div className="mt-1 text-xs text-slate-500">{task.description}</div>
                        ) : null}
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-600">
                  Đã chọn <span className="font-semibold">{selectedTaskIds.size}</span> /
                  {suggestedTasks.length} nhiệm vụ
                </div>
                <button
                  type="button"
                  onClick={handleCreateSelectedTasks}
                  disabled={selectedTaskIds.size === 0}
                  className="btn-primary"
                >
                  Tạo nhiệm vụ đã chọn
                </button>
              </div>
            </div>
          </CollapsibleCard>
        )}

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
                        onChange={(p) => updateExterior(key, p)}
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
          <button className="btn-secondary flex-1" onClick={onCancel} type="button" disabled={isSaving}>
            Huỷ
          </button>
          <button className="btn-primary flex-1" onClick={handleSaveAndClose} type="button" disabled={isSaving}>
            {isSaving ? 'Đang lưu...' : `Lưu ${type === 'in' ? 'đầu vào' : 'đầu ra'}`}
          </button>
        </div>
      </div>

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
  value: string | null | undefined
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
  onChange,
}: {
  label: string
  entry: { condition: ExteriorCondition }
  onChange: (p: { condition: ExteriorCondition }) => void
}) {
  return (
    <div className="mb-3">
      <label className="label">{label}</label>
      <SegButton options={EXTERIOR_OPTIONS} value={entry.condition} onChange={(v) => onChange({ condition: v as ExteriorCondition })} />
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
        value={entry?.status ?? ''}
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
        value={entry?.status ?? ''}
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
        value={entry?.status ?? ''}
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
        value={entry?.status ?? ''}
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
        value={entry?.status ?? ''}
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
        value={entry?.status ?? ''}
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
        value={entry?.status ?? ''}
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
