// ====== VEHICLE IMPORT FROM CSV ======

import { useCallback, useEffect, useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, ArrowLeft, Download, FileText } from 'lucide-react'
import * as Papa from 'papaparse'
import * as vehicleService from '../services/vehicle.service'
import { useStore } from '../store/useStore'
import { normalizeVehicleName, normalizeFuel, normalizeColor } from '../utils/vehicleName'

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

// ====== CSV ROW NORMALIZATION ======

function normalizeRow(raw: Record<string, string>): CSVRow {
  const r: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    r[k.toLowerCase().replace(/[\s_-]+/g, '')] = (v ?? '').trim()
  }
  return {
    plate: r['plate'] || r['bienso'] || r['biển số'] || '',
    model: r['model'] || r['dongxe'] || r['dòng xe'] || '',
    year: r['year'] || r['nam'] || r['năm'] || '',
    fuelType: r['fueltype'] || r['fuel_type'] || r['nhienlieu'] || r['nhiên liệu'] || '',
    displacement: r['displacement'] || r['dungtich'] || r['dung tích'] || '',
    mileage: r['mileage'] || r['sokm'] || r['số km'] || r['odo'] || '',
    color: r['color'] || r['mau'] || r['màu'] || r['màu sắc'] || '',
    costPrice: r['costprice'] || r['cost_price'] || r['giavon'] || r['giá vốn'] || '',
    sellPrice: r['sellprice'] || r['sell_price'] || r['giaban'] || r['giá bán'] || '',
    status: r['status'] || r['trangthai'] || r['trạng thái'] || '',
  }
}

/** Deduplicate rows by plate — keep first occurrence, warn about duplicates */
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

/** Validate row, return error message or null */
function validateRow(row: CSVRow): string | null {
  if (!row.plate) return 'Biển số trống'
  return null
}

// ====== BUILD PATCH FROM CSV — uses shared normalizers ======

function buildPatchFromCSV(row: CSVRow, existing: any): Record<string, any> {
  const patch: Record<string, any> = {}

  // Model — normalize via shared util
  if (row.model && !existing.model) {
    patch.model = normalizeVehicleName(row.model)
  }

  // Year
  if (row.year && !existing.year) {
    const parsed = parseInt(row.year)
    if (!isNaN(parsed) && parsed > 1900 && parsed < 2100) patch.year = parsed
  }

  // Fuel — normalize via shared util
  if (row.fuelType && !existing.fuelType) {
    patch.fuelType = normalizeFuel(row.fuelType)
  }

  // Displacement
  if (row.displacement && !existing.displacement) {
    patch.displacement = row.displacement
  }

  // Mileage
  if (row.mileage && !existing.mileage) {
    patch.mileage = row.mileage
  }

  // Color — normalize via shared util
  if (row.color && !existing.color) {
    patch.color = normalizeColor(row.color)
  }

  // Cost price
  if (row.costPrice && (existing.costPrice == null || isNaN(existing.costPrice))) {
    const parsed = parseFloat(row.costPrice)
    if (!isNaN(parsed)) patch.costPrice = parsed
  }

  // Sell price
  if (row.sellPrice && (existing.sellPrice == null || isNaN(existing.sellPrice))) {
    const parsed = parseFloat(row.sellPrice)
    if (!isNaN(parsed)) patch.sellPrice = parsed
  }

  // Status
  if (row.status && !existing.status) {
    patch.status = STATUS_MAP[row.status.toLowerCase()] || 'available'
  }

  return patch
}

/** Get the non-normalized display value of a single field for preview purposes */
function rawFieldValue(row: CSVRow, field: keyof CSVRow): string {
  return (row as any)[field] || ''
}

// ====== MAIN COMPONENT ======

export default function VehicleImport() {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [rawData, setRawData] = useState<CSVRow[]>([])
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text()

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: async (results) => {
        // Parse all rows
        const allRows: CSVRow[] = results.data
          .filter((r: any) => Object.values(r).some((v: any) => v?.toString().trim()))
          .map((r: any) => normalizeRow(r as Record<string, string>))

        // Skip empty plates
        const validRows = allRows.filter((r) => r.plate)
        const skippedCount = allRows.length - validRows.length

        // Dedup by plate
        const { deduped, duplicates } = dedupRows(validRows)

        if (deduped.length === 0) {
          alert('Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra file CSV có chứa cột "plate" (biển số).')
          return
        }

        if (duplicates > 0 || skippedCount > 0) {
          const warnings: string[] = []
          if (duplicates > 0) warnings.push(`${duplicates} dòng trùng biển số`)
          if (skippedCount > 0) warnings.push(`${skippedCount} dòng thiếu biển số`)
        }

        setRawData(deduped)
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

    for (const row of rawData) {
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
  }, [rawData])

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
        if (ir.action === 'insert') {
          await useStore.getState().addVehicle({
            plate: ir.row.plate,
            model: normalizeVehicleName(ir.row.model || 'Chưa xác định'),
            year: ir.row.year ? parseInt(ir.row.year) : undefined,
            fuelType: ir.row.fuelType ? normalizeFuel(ir.row.fuelType) as any : undefined,
            displacement: ir.row.displacement || undefined,
            mileage: ir.row.mileage || undefined,
            color: ir.row.color ? normalizeColor(ir.row.color) : undefined,
            costPrice: ir.row.costPrice ? parseFloat(ir.row.costPrice) : undefined,
            sellPrice: ir.row.sellPrice ? parseFloat(ir.row.sellPrice) : undefined,
            status: ir.row.status ? (STATUS_MAP[ir.row.status.toLowerCase()] || 'available') as any : 'available',
          })
          inserted++
        } else if (ir.action === 'update' && ir.existing) {
          const patch = buildPatchFromCSV(ir.row, await vehicleService.getVehicleByPlate(ir.row.plate))
          if (Object.keys(patch).length > 0) {
            await useStore.getState().updateVehicle(ir.existing.id, patch)
          }
          updated++
        }
      } catch (err: any) {
        errors.push({ row: i + 1, plate: ir.row.plate, reason: err?.message || 'Lỗi không xác định' })
      }
    }

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
      {/* Header */}
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
          isProcessing={isProcessing}
          onAnalyze={analyzeImport}
          onImport={handleImport}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'result' && result && (
        <ResultStep result={result} onBack={() => { setStep('upload'); setResult(null); setRawData([]); setImportRows([]) }} />
      )}
    </div>
  )
}

// ====== UPLOAD STEP ======

function UploadStep({ onFile }: { onFile: (f: File) => Promise<void> }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      onFile(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
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
        <input id="csv-file-input" type="file" accept=".csv" className="hidden" onChange={handleChange} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <FileText size={16} />
          Yêu cầu file CSV
        </div>
        <ul className="mt-2 space-y-1 text-xs text-slate-500">
          <li>• Cột <strong>plate</strong> (biển số) là bắt buộc</li>
          <li>• Các cột khác: model, year, fuelType, displacement, mileage, color, costPrice, sellPrice, status</li>
          <li>• Hỗ trợ tên cột tiếng Việt: biển số, dòng xe, năm, nhiên liệu, màu, giá vốn, giá bán...</li>
          <li>• Nhiên liệu tự động chuẩn hóa: GASOLINE → Xăng, DIESEL → Dầu, LPG → Ga, HYBRID → Hybrid, EV → Điện</li>
          <li>• Màu sắc tự động chuẩn hóa: White → Trắng, Black → Đen, Silver → Bạc, v.v.</li>
          <li>• Dòng xe tự động chuẩn hóa qua bảng mapping</li>
          <li>• Xe đã tồn tại: chỉ cập nhật các trường đang trống — không ghi đè dữ liệu đã có</li>
          <li>• Xe chưa tồn tại: thêm mới</li>
          <li>• Import cùng file nhiều lần: không sinh trùng, không thay đổi dữ liệu đã có</li>
        </ul>
      </div>
    </div>
  )
}

// ====== PREVIEW STEP ======

function PreviewStep({
  rows,
  isProcessing,
  onAnalyze,
  onImport,
  onBack,
}: {
  rows: ImportRow[] | null
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
              const color = ir.action === 'insert' ? '#34c759' : ir.action === 'update' ? '#007aff' : ir.action === 'no_change' ? '#8e8e93' : '#ff9500'
              const label = ir.action === 'insert' ? 'Thêm mới' : ir.action === 'update' ? 'Cập nhật' : ir.action === 'no_change' ? 'Không đổi' : 'Bỏ qua'
              return (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{ir.row.plate}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: `${color}1a`, color }}>
                      {ir.action === 'insert' ? <PlusIcon /> : ir.action === 'update' ? <ArrowIcon /> : <MinusIcon />}
                      {label}
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

      {/* Stats log */}
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
              <li key={i} className="text-xs text-red-600">
                Dòng {e.row} - {e.plate}: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onBack} className="btn-primary">
        Nhập file khác
      </button>
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
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )
}

function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  )
}
