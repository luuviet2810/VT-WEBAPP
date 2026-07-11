// ====== VEHICLE IMPORT FROM CSV ======

import { useCallback, useEffect, useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, ArrowLeft, Download, FileText } from 'lucide-react'
import * as Papa from 'papaparse'
import * as vehicleService from '../services/vehicle.service'
import { useStore } from '../store/useStore'

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
  action: 'insert' | 'update' | 'no_change'
  existing?: { id: string; fields: Partial<VehicleForDisplay> }
  fieldsToUpdate: string[]
}

interface VehicleForDisplay {
  plate: string
  model: string
  year: string
  fuelType: string
  displacement: string
  mileage: string
  color: string
  costPrice: string
  sellPrice: string
  status: string
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

const FUEL_MAP: Record<string, string> = {
  'xăng': 'gasoline',
  'gasoline': 'gasoline',
  'dầu': 'diesel',
  'diesel': 'diesel',
  'lpg': 'lpg',
  'hybrid': 'hybrid',
}

const STATUS_MAP: Record<string, string> = {
  'chưa bán': 'available',
  'available': 'available',
  'đã cọc': 'deposited',
  'deposited': 'deposited',
  'đã bán': 'sold',
  'sold': 'sold',
}

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

function toDisplay(v: CSVRow): VehicleForDisplay {
  return {
    plate: v.plate,
    model: v.model,
    year: v.year || '',
    fuelType: v.fuelType ? (FUEL_MAP[v.fuelType.toLowerCase()] || v.fuelType) : '',
    displacement: v.displacement || '',
    mileage: v.mileage || '',
    color: v.color || '',
    costPrice: v.costPrice || '',
    sellPrice: v.sellPrice || '',
    status: v.status ? (STATUS_MAP[v.status.toLowerCase()] || v.status) : '',
  }
}

function displayLabel(display: VehicleForDisplay, field: keyof VehicleForDisplay): string {
  return display[field] || '—'
}

export default function VehicleImport() {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [rawData, setRawData] = useState<CSVRow[]>([])
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ added: number; updated: number; unchanged: number; errors: { row: number; plate: string; reason: string }[] } | null>(null)

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text()

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: async (results) => {
        const rows: CSVRow[] = results.data
          .filter((r: any) => r.plate || r.Plate || r.PLATE || Object.values(r).some((v: any) => v?.toString().trim()))
          .map((r: any) => normalizeRow(r as Record<string, string>))
          .filter((r) => r.plate)

        if (rows.length === 0) {
          alert('Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra file CSV có chứa cột "plate" (biển số).')
          return
        }

        setRawData(rows)
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

    for (const row of rawData) {
      const display = toDisplay(row)
      const existing = await vehicleService.getVehicleByPlate(row.plate)

      if (!existing) {
        rows.push({ row, action: 'insert', fieldsToUpdate: Object.keys(FIELD_LABELS).filter((f) => !!(display as any)[f]) })
      } else {
        const fieldsToUpdate: string[] = []
        const existingDisp: Partial<VehicleForDisplay> = {}

        for (const field of Object.keys(FIELD_LABELS) as (keyof VehicleForDisplay)[]) {
          const newVal = (display as any)[field]
          if (!newVal) continue

          const oldVal = getExistingField(existing, field)

          if (!oldVal) {
            fieldsToUpdate.push(field);
            (existingDisp as any)[field] = oldVal || '—'
          }
        }

        if (fieldsToUpdate.length > 0) {
          rows.push({
            row,
            action: 'update',
            existing: { id: existing.id, fields: existingDisp },
            fieldsToUpdate,
          })
        } else {
          rows.push({ row, action: 'no_change', fieldsToUpdate: [] })
        }
      }
    }

    setImportRows(rows)
    setIsProcessing(false)
  }, [rawData])

  function getExistingField(vehicle: any, field: keyof VehicleForDisplay): string {
    switch (field) {
      case 'model': return vehicle.model || ''
      case 'year': return vehicle.year?.toString() || ''
      case 'fuelType': return vehicle.fuelType || ''
      case 'displacement': return vehicle.displacement || ''
      case 'mileage': return vehicle.mileage || ''
      case 'color': return vehicle.color || ''
      case 'costPrice': return vehicle.costPrice?.toString() || ''
      case 'sellPrice': return vehicle.sellPrice?.toString() || ''
      case 'status': return vehicle.status || ''
      default: return ''
    }
  }

  async function handleImport() {
    setIsProcessing(true)
    const errors: { row: number; plate: string; reason: string }[] = []
    let added = 0, updated = 0, unchanged = 0

    for (let i = 0; i < importRows.length; i++) {
      const ir = importRows[i]

      if (ir.action === 'no_change') {
        unchanged++
        continue
      }

      try {
        if (ir.action === 'insert') {
          await useStore.getState().addVehicle({
            plate: ir.row.plate,
            model: ir.row.model || 'Chưa xác định',
            year: ir.row.year ? parseInt(ir.row.year) : undefined,
            fuelType: ir.row.fuelType ? (FUEL_MAP[ir.row.fuelType.toLowerCase()] || ir.row.fuelType) as any : undefined,
            displacement: ir.row.displacement || undefined,
            mileage: ir.row.mileage || undefined,
            color: ir.row.color || undefined,
            costPrice: ir.row.costPrice ? parseFloat(ir.row.costPrice) : undefined,
            sellPrice: ir.row.sellPrice ? parseFloat(ir.row.sellPrice) : undefined,
            status: ir.row.status ? (STATUS_MAP[ir.row.status.toLowerCase()] || 'available') as any : 'available',
          })
          added++
        } else if (ir.action === 'update' && ir.existing) {
          const patch: Record<string, any> = {}
          for (const field of ir.fieldsToUpdate) {
            const val = (toDisplay(ir.row) as any)[field]
            if (!val) continue
            switch (field) {
              case 'model': patch.model = val; break
              case 'year': patch.year = parseInt(val); break
              case 'fuelType': patch.fuelType = FUEL_MAP[val.toLowerCase()] || val; break
              case 'displacement': patch.displacement = val; break
              case 'mileage': patch.mileage = val; break
              case 'color': patch.color = val; break
              case 'costPrice': patch.costPrice = parseFloat(val); break
              case 'sellPrice': patch.sellPrice = parseFloat(val); break
              case 'status': patch.status = STATUS_MAP[val.toLowerCase()] || 'available'; break
            }
          }
          if (Object.keys(patch).length > 0) {
            await useStore.getState().updateVehicle(ir.existing.id, patch)
          }
          updated++
        }
      } catch (err: any) {
        errors.push({ row: i + 1, plate: ir.row.plate, reason: err?.message || 'Lỗi không xác định' })
      }
    }

    setResult({ added, updated, unchanged, errors })
    setStep('result')
    setIsProcessing(false)
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Đồng bộ dữ liệu xe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tải lên file CSV để thêm mới hoặc cập nhật thông tin xe. Hệ thống tự động tìm xe theo biển số và chỉ cập nhật các trường còn trống.
        </p>
      </div>

      {step === 'upload' && (
        <UploadStep onFile={handleFile} />
      )}

      {step === 'preview' && (
        <PreviewStep
          rows={importRows.length > 0 ? importRows : null}
          rawData={rawData}
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
          <li>• Xe đã tồn tại: chỉ cập nhật các trường đang trống</li>
          <li>• Xe chưa tồn tại: thêm mới</li>
        </ul>
        <a href="/sample-vehicle-import.csv" download
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
          <Download size={14} /> Tải file mẫu
        </a>
      </div>
    </div>
  )
}

// ====== PREVIEW STEP ======

function PreviewStep({
  rows,
  rawData,
  isProcessing,
  onAnalyze,
  onImport,
  onBack,
}: {
  rows: ImportRow[] | null
  rawData: CSVRow[]
  isProcessing: boolean
  onAnalyze: () => Promise<void>
  onImport: () => Promise<void>
  onBack: () => void
}) {
  // Auto-analyze on mount
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

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <StatBox value={inserts.length} label="Thêm mới" color="#34c759" />
        <StatBox value={updates.length} label="Cập nhật" color="#007aff" />
        <StatBox value={noChanges.length} label="Không đổi" color="#8e8e93" />
        <StatBox value={rows.length} label="Tổng" color="#334155" />
      </div>

      {/* Preview Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Biển số</th>
              <th className="px-4 py-3">Hành động</th>
              <th className="px-4 py-3">Cập nhật</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, 50).map((ir, i) => {
              const display = toDisplay(ir.row)
              const color = ir.action === 'insert' ? '#34c759' : ir.action === 'update' ? '#007aff' : '#8e8e93'
              const label = ir.action === 'insert' ? 'Thêm mới' : ir.action === 'update' ? 'Cập nhật' : 'Không đổi'
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
                      ? Object.keys(FIELD_LABELS).filter((f) => !!(display as any)[f]).map((f) => FIELD_LABELS[f]).join(', ')
                      : ir.action === 'update'
                      ? ir.fieldsToUpdate.map((f) => FIELD_LABELS[f]).join(', ')
                      : '—'}
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

function ResultStep({ result, onBack }: { result: { added: number; updated: number; unchanged: number; errors: { row: number; plate: string; reason: string }[] }; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-emerald-800">Hoàn tất đồng bộ</h2>
        <p className="mt-1 text-sm text-emerald-600">Dữ liệu xe đã được đồng bộ thành công.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatBox value={result.added} label="Đã thêm mới" color="#34c759" />
        <StatBox value={result.updated} label="Đã cập nhật" color="#007aff" />
        <StatBox value={result.unchanged} label="Không thay đổi" color="#8e8e93" />
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
