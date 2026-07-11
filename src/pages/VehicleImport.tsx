// ====== VEHICLE IMPORT FROM CSV ======

import { useCallback, useEffect, useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, ArrowLeft, FileText } from 'lucide-react'
import * as Papa from 'papaparse'
import * as vehicleService from '../services/vehicle.service'
import { upsertVehicle } from '../services/vehicle.service'
import { initializeFromSupabase } from '../store/useStore'
import { normalizeVehicleName } from '../utils/vehicleName'
import { normalizeVehicle, normalizeFuel, normalizeColor, type RawVehicle } from '../utils/normalizeVehicle'

// ====== TYPES ======

interface CSVRow {
  plate: string
  model: string
  year?: string
  fuelType?: string
  displacement?: string
  mileage?: string
  color?: string
  costPrice?: string
  sellPrice?: string
  status?: string
}

interface ImportRow {
  row: CSVRow
  action: 'insert' | 'update' | 'no_change' | 'duplicate' | 'skip'
  existing?: { id: string }
  fieldsToUpdate: string[]
  skipReason?: string
}

interface ImportResult {
  total: number
  matched: number
  inserted: number
  updated: number
  unchanged: number
  duplicate: number
  failed: number
  skipped: number
  errors: { row: number; plate: string; reason: string }[]
}

const FIELD_LABELS: Record<string, string> = {
  model: 'Dòng xe',
  year: 'Năm',
  fuelType: 'Nhiên liệu',
  displacement: 'Dung tích',
  mileage: 'Số KM',
  color: 'Màu',
  costPrice: 'Giá vốn',
  sellPrice: 'Giá bán',
  status: 'Trạng thái',
}

const STATUS_MAP: Record<string, string> = {
  'chưa bán': 'available',
  'available': 'available',
  'đã cọc': 'deposited',
  'deposited': 'deposited',
  'đã bán': 'sold',
  'sold': 'sold',
}

// ====== COLUMN NAME MAPPING (exact, no fuzzy) ======

const COLUMN_ALIASES: Record<string, keyof CSVRow> = {
  // English
  plate: 'plate',
  model: 'model',
  year: 'year',
  fuel_type: 'fuelType',
  fueltype: 'fuelType',
  displacement: 'displacement',
  mileage: 'mileage',
  odo: 'mileage',
  color: 'color',
  cost_price: 'costPrice',
  costprice: 'costPrice',
  sell_price: 'sellPrice',
  sellprice: 'sellPrice',
  status: 'status',
  // Vietnamese
  bienso: 'plate',
  'biển số': 'plate',
  dongxe: 'model',
  'dòng xe': 'model',
  nam: 'year',
  'năm': 'year',
  nhienlieu: 'fuelType',
  'nhiên liệu': 'fuelType',
  dungtich: 'displacement',
  'dung tích': 'displacement',
  sokm: 'mileage',
  'số km': 'mileage',
  mau: 'color',
  'màu': 'color',
  'màu sắc': 'color',
  giavon: 'costPrice',
  'giá vốn': 'costPrice',
  giaban: 'sellPrice',
  'giá bán': 'sellPrice',
  trangthai: 'status',
  'trạng thái': 'status',
}

function mapColumns(header: string): string | null {
  const key = header.trim().toLowerCase().replace(/[\s_-]+/g, '')
  // Try exact match first (preserving underscores for fuel_type, cost_price...)
  if (COLUMN_ALIASES[header.trim().toLowerCase()]) return COLUMN_ALIASES[header.trim().toLowerCase()]
  // Fallback to stripped-key match
  return COLUMN_ALIASES[key] ?? null
}

/** Parse a single CSV row into CSVRow using the exact column mapping */
function parseRow(raw: Record<string, string>): CSVRow {
  const row: CSVRow = { plate: '', model: '' }
  for (const [header, value] of Object.entries(raw)) {
    const field = mapColumns(header)
    if (field && value != null) {
      ;(row as any)[field] = value.trim()
    }
  }
  return row
}

/** Validate row types — color must not be numeric, mileage must be numeric */
function validateTypes(row: CSVRow): string | null {
  if (row.color && /^\d+$/.test(row.color.trim())) {
    return `Cột "color" chứa giá trị số "${row.color}" — có thể dữ liệu đang bị sai cột. Mileage phải là số, color phải là chữ.`
  }
  if (row.mileage && /[a-zA-Zà-ỹÀ-Ỹ]/i.test(row.mileage.trim())) {
    return `Cột "mileage" chứa chữ "${row.mileage}" — mileage phải là số.`
  }
  return null
}

/** Validate row completeness */
function validateRow(row: CSVRow): string | null {
  if (!row.plate) return 'Biển số trống'
  return validateTypes(row)
}

/** Deduplicate rows by plate */
function dedupRows(rows: CSVRow[]): { deduped: CSVRow[]; duplicates: number } {
  const seen = new Set<string>()
  const deduped: CSVRow[] = []
  let duplicates = 0
  for (const row of rows) {
    if (seen.has(row.plate)) {
      duplicates++
      continue
    }
    seen.add(row.plate)
    deduped.push(row)
  }
  return { deduped, duplicates }
}

// ====== BUILD PATCH — only fills NULL/empty fields ======

function buildPatchFromCSV(row: CSVRow, existing: any): Record<string, any> {
  const patch: Record<string, any> = {}

  if (row.model && !existing.model) patch.model = normalizeVehicleName(row.model)
  if (row.year && !existing.year) {
    const parsed = parseInt(row.year)
    if (!isNaN(parsed) && parsed > 1900 && parsed < 2100) patch.year = parsed
  }
  if (row.fuelType && !existing.fuelType) patch.fuelType = normalizeFuel(row.fuelType)
  if (row.displacement && !existing.displacement) patch.displacement = row.displacement
  if (row.mileage && !existing.mileage) patch.mileage = row.mileage
  if (row.color && !existing.color) patch.color = normalizeColor(row.color)
  if (row.costPrice && (existing.costPrice == null || isNaN(existing.costPrice))) {
    const parsed = parseFloat(row.costPrice)
    if (!isNaN(parsed)) patch.costPrice = parsed
  }
  if (row.sellPrice && (existing.sellPrice == null || isNaN(existing.sellPrice))) {
    const parsed = parseFloat(row.sellPrice)
    if (!isNaN(parsed)) patch.sellPrice = parsed
  }
  if (row.status && !existing.status) {
    patch.status = STATUS_MAP[row.status.toLowerCase()] || 'available'
  }

  return patch
}

// ====== MAIN COMPONENT ======

export default function VehicleImport() {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [normalizedData, setNormalizedData] = useState<CSVRow[]>([])
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text()

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const errors: string[] = []

        // 1. Parse raw rows using exact column mapping
        const rawRows: CSVRow[] = results.data
          .filter((r: any) => Object.values(r).some((v: any) => v?.toString().trim()))
          .map((r: any) => parseRow(r as Record<string, string>))

        // 2. Validate types
        const validRows: CSVRow[] = []
        for (const row of rawRows) {
          const typeErr = validateTypes(row)
          if (typeErr) {
            errors.push(`${row.plate || '(không rõ biển)'}: ${typeErr}`)
            continue
          }
          validRows.push(row)
        }

        // 3. Normalize BEFORE preview
        const normalized = validRows.map((row) => normalizeVehicle(row as RawVehicle) as CSVRow)

        // 4. Skip empty plates
        const withPlate = normalized.filter((r) => r.plate)

        // 5. Dedup
        const { deduped, duplicates } = dedupRows(withPlate)

        if (deduped.length === 0) {
          alert('Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra file CSV.')
          return
        }

        setNormalizedData(deduped)
        setParseErrors(errors)
        setStep('preview')
      },
      error: () => {
        alert('Lỗi đọc file CSV. Vui lòng kiểm tra định dạng.')
      },
    })
  }, [])

  const analyzeImport = useCallback(async () => {
    setIsProcessing(true)
    const rows: ImportRow[] = []
    let matched = 0

    for (const row of normalizedData) {
      const err = validateRow(row)
      if (err) {
        rows.push({ row, action: 'skip', fieldsToUpdate: [], skipReason: err })
        continue
      }

      const existing = await vehicleService.getVehicleByPlate(row.plate)

      if (!existing) {
        const fields = Object.keys(FIELD_LABELS).filter((f) => !!(row as any)[f])
        rows.push({ row, action: 'insert', fieldsToUpdate: fields })
      } else {
        matched++
        const patch = buildPatchFromCSV(row, existing)
        if (Object.keys(patch).length > 0) {
          rows.push({ row, action: 'update', existing: { id: existing.id }, fieldsToUpdate: Object.keys(patch) })
        } else {
          rows.push({ row, action: 'no_change', fieldsToUpdate: [] })
        }
      }
    }

    setImportRows(rows)
    setIsProcessing(false)
  }, [normalizedData])

  async function handleImport() {
    setIsProcessing(true)
    const errors: { row: number; plate: string; reason: string }[] = []
    let inserted = 0, updated = 0, unchanged = 0, duplicate = 0, skipped = 0

    for (let i = 0; i < importRows.length; i++) {
      const ir = importRows[i]

      if (ir.action === 'no_change') { unchanged++; continue }
      if (ir.action === 'duplicate') { duplicate++; continue }
      if (ir.action === 'skip') { skipped++; continue }

      try {
        const result = await upsertVehicle({
          plate: ir.row.plate,
          model: ir.row.model || undefined,
          year: ir.row.year ? parseInt(ir.row.year) : undefined,
          fuelType: ir.row.fuelType || undefined,
          displacement: ir.row.displacement || undefined,
          mileage: ir.row.mileage || undefined,
          color: ir.row.color || undefined,
          costPrice: ir.row.costPrice ? parseFloat(ir.row.costPrice) : undefined,
          sellPrice: ir.row.sellPrice ? parseFloat(ir.row.sellPrice) : undefined,
          status: ir.row.status || undefined,
        })
        if (result === 'inserted') inserted++
        else updated++
      } catch (err: any) {
        errors.push({ row: i + 1, plate: ir.row.plate, reason: err?.message || 'Lỗi không xác định' })
      }
    }

    // Refresh store data so the UI picks up imported vehicles
    initializeFromSupabase()

    setResult({
      total: importRows.length,
      matched: updated + unchanged,
      inserted,
      updated,
      unchanged,
      duplicate,
      failed: errors.length,
      skipped,
      errors,
    })
    setStep('result')
    setIsProcessing(false)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Đồng bộ dữ liệu xe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tải lên file CSV để thêm mới hoặc cập nhật thông tin xe. Hệ thống tự động tìm xe theo biển số, chỉ cập nhật các trường còn trống.
        </p>
      </div>

      {step === 'upload' && <UploadStep onFile={handleFile} />}

      {step === 'preview' && (
        <PreviewStep
          rows={importRows.length > 0 ? importRows : null}
          parseErrors={parseErrors}
          isProcessing={isProcessing}
          onAnalyze={analyzeImport}
          onImport={handleImport}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'result' && result && (
        <ResultStep result={result} onBack={() => { setStep('upload'); setResult(null); setNormalizedData([]); setImportRows([]) }} />
      )}
    </div>
  )
}

// ====== UPLOAD STEP ======

function UploadStep({ onFile }: { onFile: (f: File) => Promise<void> }) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) onFile(f) }}
        onClick={() => document.getElementById('csv-file-input')?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-colors ${
          dragging ? 'border-brand-400 bg-brand-50' : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
          <Upload size={28} className="text-brand-500" />
        </div>
        <p className="text-base font-semibold text-slate-800">Kéo thả file CSV vào đây</p>
        <p className="mt-1 text-sm text-slate-500">hoặc nhấp để chọn file</p>
        <input id="csv-file-input" type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <FileText size={16} />
          Yêu cầu file CSV
        </div>
        <ul className="mt-2 space-y-1 text-xs text-slate-500">
          <li>• Cột <strong>plate</strong> (biển số) là bắt buộc</li>
          <li>• Thứ tự cột: plate, model, year, fuel_type, displacement, mileage, color, cost_price, sell_price</li>
          <li>• Dữ liệu được chuẩn hóa trước khi hiển thị preview</li>
          <li>• Nhiên liệu: GASOLINE→Xăng, DIESEL→Dầu, LPG→Ga, HYBRID→Hybrid, EV→Điện</li>
          <li>• Màu sắc: White→Trắng, Black→Đen, Silver→Bạc, Gray→Xám, Blue→Xanh dương...</li>
          <li>• Xe đã tồn tại: chỉ cập nhật trường đang trống</li>
          <li>• Import nhiều lần: không sinh trùng, không ghi đè</li>
        </ul>
      </div>
    </div>
  )
}

// ====== PREVIEW STEP ======

function PreviewStep({
  rows,
  parseErrors,
  isProcessing,
  onAnalyze,
  onImport,
  onBack,
}: {
  rows: ImportRow[] | null
  parseErrors: string[]
  isProcessing: boolean
  onAnalyze: () => Promise<void>
  onImport: () => Promise<void>
  onBack: () => void
}) {
  useEffect(() => {
    if (!rows) onAnalyze()
  }, [])

  if (!rows) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        <p className="ml-3 text-sm text-slate-500">Đang phân tích dữ liệu...</p>
      </div>
    )
  }

  const inserts = rows.filter((r) => r.action === 'insert')
  const updates = rows.filter((r) => r.action === 'update')
  const noChanges = rows.filter((r) => r.action === 'no_change')
  const skipped = rows.filter((r) => r.action === 'skip' || r.action === 'duplicate')

  return (
    <div className="space-y-6">
      {parseErrors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertCircle size={16} />
            Cảnh báo dữ liệu
          </div>
          <ul className="mt-2 space-y-1">
            {parseErrors.map((e, i) => (
              <li key={i} className="text-xs text-red-600">• {e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3">
        <StatBox value={inserts.length} label="Thêm mới" color="#34c759" />
        <StatBox value={updates.length} label="Cập nhật" color="#007aff" />
        <StatBox value={noChanges.length} label="Không đổi" color="#8e8e93" />
        <StatBox value={skipped.length} label="Bỏ qua" color="#ff9500" />
        <StatBox value={rows.length} label="Tổng" color="#334155" />
      </div>

      {/* Preview Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Biển số</th>
              <th className="px-4 py-3">Hành động</th>
              <th className="px-4 py-3">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, 50).map((ir, i) => {
              const actionColor = ir.action === 'insert' ? '#34c759' : ir.action === 'update' ? '#007aff' : ir.action === 'no_change' ? '#8e8e93' : '#ff9500'
              const actionLabel = ir.action === 'insert' ? 'Thêm mới' : ir.action === 'update' ? 'Cập nhật' : ir.action === 'no_change' ? 'Không đổi' : 'Bỏ qua'
              return (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{ir.row.plate}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: `${actionColor}1a`, color: actionColor }}>
                      {ir.action === 'insert' ? <PlusIcon /> : ir.action === 'update' ? <ArrowIcon /> : <MinusIcon />}
                      {actionLabel}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {ir.action === 'insert'
                      ? ir.fieldsToUpdate.map((f) => FIELD_LABELS[f] || f).join(', ')
                      : ir.action === 'update'
                      ? ir.fieldsToUpdate.map((f) => FIELD_LABELS[f] || f).join(', ')
                      : ir.skipReason || '—'}
                  </td>
                </tr>
              )
            })}
            {rows.length > 50 && (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-center text-xs text-slate-400">
                  ... và {rows.length - 50} dòng khác
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-secondary" disabled={isProcessing}>
          <ArrowLeft size={15} /> Quay lại
        </button>
        <button onClick={onImport} className="btn-primary" disabled={isProcessing || rows.length === 0}>
          {isProcessing ? 'Đang xử lý...' : `Xác nhận nhập (${rows.length} xe)`}
        </button>
      </div>
    </div>
  )
}

// ====== RESULT STEP ======

function ResultStep({ result, onBack }: { result: ImportResult; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-emerald-800">Hoàn tất đồng bộ</h2>
        <p className="mt-1 text-sm text-emerald-600">Dữ liệu xe đã được đồng bộ.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{result.total} rows imported</div>
        <div className="mt-3 space-y-1.5">
          <StatRow label="Matched" value={result.matched} color="#007aff" />
          <StatRow label="Inserted" value={result.inserted} color="#34c759" />
          <StatRow label="Updated" value={result.updated} color="#34c759" />
          <StatRow label="Unchanged" value={result.unchanged} color="#8e8e93" />
          <StatRow label="Duplicate" value={result.duplicate} color="#ff9500" />
          <StatRow label="Skipped" value={result.skipped} color="#ff9500" />
          <StatRow label="Failed" value={result.failed} color="#ff3b30" />
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertCircle size={16} />
            {result.errors.length} lỗi
          </div>
          <ul className="mt-2 space-y-1">
            {result.errors.map((e, i) => (
              <li key={i} className="text-xs text-red-600">Dòng {e.row} - {e.plate}: {e.reason}</li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onBack} className="btn-primary">Nhập file khác</button>
    </div>
  )
}

// ====== HELPERS ======

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: `${color}0d` }}>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium" style={{ color, opacity: 0.7 }}>{label}</div>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold" style={{ color }}>{value}</span>
    </div>
  )
}

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}

function ArrowIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function MinusIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
