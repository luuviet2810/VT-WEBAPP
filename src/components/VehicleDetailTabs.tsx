import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ArrowLeft, Clock, Download, FileText, Image as ImageIcon, Info, LogIn,
  LogOut, ImagePlus, Star, Trash2, GripVertical, X, ChevronLeft, ChevronRight,
  Calendar, SlidersHorizontal, Pencil, Check, Plus, File as FileIcon, FileUp, ExternalLink,
  Eye, Loader2, AlertCircle, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react'
import { Modal, EmptyState, Tabs, ConfirmDialog } from '../components/ui'
import PhotoUploader from '../components/PhotoUploader'
import CheckSheetForm from '../components/CheckSheetForm'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { formatDateTime } from '../utils/format'
import * as vehicleMediaService from '../services/vehicleMedia.service'
import * as storageService from '../services/storage.service'
import * as vehicleOptionService from '../services/vehicleOption.service'
import type { VehicleImageRow, VehicleDocumentRow } from '../services/vehicleMedia.service'
import type { Vehicle, VehicleOptionDef } from '../types'
import { DISPLACEMENT_OPTIONS } from '../utils/vehicleDisplacement'
import { toInputDateFormat, formatDisplayDate, extractDateFromString } from '../utils/dateUtils'

interface Props {
  vehicle: Vehicle
  tab: string
  onTabChange: (tab: string) => void
}

export const VEHICLE_DETAIL_TABS = [
  { key: 'info', label: 'Thông tin', icon: <Info size={15} /> },
  { key: 'photos', label: 'Ảnh', icon: <ImageIcon size={15} /> },
  { key: 'options', label: 'Option xe', icon: <SlidersHorizontal size={15} /> },
  { key: 'checkin', label: 'Đầu vào', icon: <LogIn size={15} /> },
  { key: 'checkout', label: 'Đầu ra', icon: <LogOut size={15} /> },
  { key: 'docs', label: 'Giấy tờ', icon: <FileText size={15} /> },
  { key: 'history', label: 'Lịch sử', icon: <Clock size={15} /> },
]

async function downloadAllImages(images: string[], model: string, plate: string, prefix = '') {
  for (let i = 0; i < images.length; i++) {
    const imageUrl = images[i]
    const fileName = prefix
      ? `${prefix}_${model}_${plate}_${i + 1}.jpg`
      : `${model}_${plate}_${i + 1}.jpg`
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch {}
  }
}

export default function VehicleDetailTabs({ vehicle, tab, onTabChange }: Props) {
  const updateVehicle = useStore((s) => s.updateVehicle)
  const employees = useStore((s) => s.employees)
  const positions = useStore((s) => s.positions)
  const vehicleTimelines = useStore((s) => s.vehicleTimelines)
  const moveLogs = useStore((s) => s.moveLogs)
  const timeline = vehicleTimelines[vehicle.id] || []

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  function patch(p: Partial<Vehicle>) {
    updateVehicle(vehicle.id, p)
  }

  // ====== Form thông tin xe: controlled + nút [Lưu thay đổi] rõ ràng ======
  // Không còn autosave onBlur/onChange ngầm — một đường lưu duy nhất
  // UPDATE theo id, có trạng thái đang lưu / thành công / thất bại.
  type InfoForm = {
    plate: string; model: string; brand: string; year: string; fuelType: string
    displacement: string; mileage: string; color: string; sellPrice: string
    positionId: string; status: Vehicle['status']; songNung: string; dangKiem: string
  }
  function pickInfo(v: Vehicle): InfoForm {
    return {
      plate: v.plate ?? '', model: v.model ?? '', brand: v.brand ?? '',
      year: v.year?.toString() ?? '', fuelType: v.fuelType ?? '',
      displacement: v.displacement ?? '', mileage: v.mileage ?? '',
      color: v.color ?? '', sellPrice: v.sellPrice?.toString() ?? '',
      positionId: v.positionId ?? '', status: v.status,
      songNung: toInputDateFormat(v.songNungExpiryDate),
      dangKiem: toInputDateFormat(v.registrationExpiryDate),
    }
  }
  const [info, setInfo] = useState<InfoForm>(() => pickInfo(vehicle))
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoMsg, setInfoMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [noteDraft, setNoteDraft] = useState(vehicle.note ?? '')
  useEffect(() => {
    setInfo(pickInfo(vehicle))
    setNoteDraft(vehicle.note ?? '')
    setInfoMsg(null)
  }, [vehicle.id, vehicle.songNungExpiryDate, vehicle.registrationExpiryDate, vehicle.updatedAt])
  function setInfoField<K extends keyof InfoForm>(k: K, val: InfoForm[K]) {
    setInfo((f) => ({ ...f, [k]: val }))
  }

  async function handleSaveInfo() {
    if (infoSaving) return // khoá nút — không gửi trùng
    const plate = info.plate.trim()
    const model = info.model.trim()
    if (!plate || !model) {
      setInfoMsg({ kind: 'error', text: 'Biển số và Dòng xe là bắt buộc.' })
      return
    }
    const data: Partial<Vehicle> = {
      plate,
      model,
      brand: info.brand.trim() || undefined,
      year: info.year ? Number(info.year) : undefined,
      fuelType: (info.fuelType || undefined) as Vehicle['fuelType'],
      displacement: info.displacement || undefined,
      mileage: info.mileage || undefined,
      color: info.color || undefined,
      sellPrice: info.sellPrice ? Number(info.sellPrice) : undefined,
      positionId: info.positionId || '00000000-0000-0000-0000-000000000001',
      status: info.status,
      songNungExpiryDate: toInputDateFormat(info.songNung) || null,
      registrationExpiryDate: toInputDateFormat(info.dangKiem) || null,
      note: noteDraft || undefined,
    }
    setInfoSaving(true)
    setInfoMsg(null)
    const ok = await updateVehicle(vehicle.id, data)
    setInfoSaving(false)
    if (ok) {
      setInfoMsg({ kind: 'success', text: 'Đã lưu thay đổi.' })
      const fresh = useStore.getState().vehicles.find((v) => v.id === vehicle.id)
      if (fresh) {
        setInfo(pickInfo(fresh))
        setNoteDraft(fresh.note ?? '')
      }
    } else {
      setInfoMsg({ kind: 'error', text: 'Lưu thất bại — dữ liệu giữ nguyên. Xem thông báo lỗi cụ thể.' })
    }
  }

  const infoFields = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Public Web visibility switch — prominent, top of the info tab */}
      <div className="sm:col-span-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800">🌐 Hiển thị trên website</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {vehicle.isPublic
                ? 'BẬT — xe sẽ xuất hiện trên Public Web (khi chưa bán)'
                : 'TẮT — xe ẩn trên Public Web, dữ liệu Admin giữ nguyên'}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!vehicle.isPublic}
            aria-label="Hiển thị trên website"
            onClick={() => patch({ isPublic: !vehicle.isPublic })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${vehicle.isPublic ? 'bg-green-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${vehicle.isPublic ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
      <div>
        <label className="label">Biển số (4 số cuối)</label>
        <input className="input" value={info.plate} onChange={(e) => setInfoField('plate', e.target.value)} />
      </div>
      <div>
        <label className="label">Dòng xe</label>
        <input className="input" value={info.model} onChange={(e) => setInfoField('model', e.target.value)} />
      </div>
      <div>
        <label className="label">Hãng xe</label>
        <input className="input" placeholder="VD: Hyundai" value={info.brand} onChange={(e) => setInfoField('brand', e.target.value)} />
      </div>
      <div>
        <label className="label">Năm</label>
        <input className="input" type="number" placeholder="VD: 2020" value={info.year} onChange={(e) => setInfoField('year', e.target.value)} />
      </div>
      <div>
        <label className="label">Nhiên liệu</label>
        <select className="input" value={info.fuelType} onChange={(e) => setInfoField('fuelType', e.target.value)}>
          <option value="">Chọn...</option>
          <option value="Xăng">Xăng</option>
          <option value="Dầu">Dầu</option>
          <option value="Ga">Ga</option>
          <option value="Hybrid">Hybrid</option>
          <option value="Điện">Điện</option>
        </select>
      </div>
      <div>
        <label className="label">Dung tích (L)</label>
        <select className="input" value={info.displacement} onChange={(e) => setInfoField('displacement', e.target.value)}>
          <option value="">Chọn...</option>
          {info.displacement && !DISPLACEMENT_OPTIONS.includes(info.displacement) && (
            <option value={info.displacement} disabled>
              {/^\d+(\.\d+)?$/.test(info.displacement) ? `${info.displacement}L` : info.displacement}
            </option>
          )}
          {DISPLACEMENT_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Đã chạy (vạn km)</label>
        <input className="input" placeholder="VD: 12" value={info.mileage} onChange={(e) => setInfoField('mileage', e.target.value)} />
      </div>
      <div>
        <label className="label">Màu xe</label>
        <select className="input" value={info.color} onChange={(e) => setInfoField('color', e.target.value)}>
          <option value="">Chọn...</option>
          {['Trắng', 'Đen', 'Bạc', 'Xám', 'Đỏ', 'Xanh'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Giá bán</label>
        <input className="input" placeholder="VNĐ" value={info.sellPrice} onChange={(e) => setInfoField('sellPrice', e.target.value)} />
      </div>
      <div>
        <label className="label">Vị trí xe</label>
        <select className="input" value={info.positionId} onChange={(e) => setInfoField('positionId', e.target.value)}>
          <option value="">— Chưa phân bổ —</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Tình trạng</label>
        <select className="input" value={info.status} onChange={(e) => setInfoField('status', e.target.value as Vehicle['status'])}>
          <option value="available">Chưa bán</option>
          <option value="deposited">Đã cọc</option>
          <option value="sold">Đã bán</option>
        </select>
      </div>
      <div>
        <label className="label">Hạn Song nưng</label>
        <input className="input" type="date" value={info.songNung} onChange={(e) => setInfoField('songNung', e.target.value)} />
        {vehicle.songNungExpiryDate && (
          <span className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${new Date(vehicle.songNungExpiryDate) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${new Date(vehicle.songNungExpiryDate) < new Date() ? 'bg-red-600' : 'bg-green-600'}`} />
            {new Date(vehicle.songNungExpiryDate) < new Date() ? 'Hết hạn' : 'Còn hạn'}
          </span>
        )}
      </div>
      <div>
        <label className="label">Hạn đăng kiểm</label>
        <input className="input" type="date" value={info.dangKiem} onChange={(e) => setInfoField('dangKiem', e.target.value)} />
        {vehicle.registrationExpiryDate && (
          <span className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${new Date(vehicle.registrationExpiryDate) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${new Date(vehicle.registrationExpiryDate) < new Date() ? 'bg-red-600' : 'bg-green-600'}`} />
            {new Date(vehicle.registrationExpiryDate) < new Date() ? 'Hết hạn' : 'Còn hạn'}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-6 pb-3">
        <Tabs tabs={VEHICLE_DETAIL_TABS} active={tab} onChange={onTabChange} />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-8">
        {tab === 'info' && (
          <div>
            {infoFields}
            <div className="mt-4">
              <label className="label">Ghi chú</label>
              <textarea className="input" rows={2} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
            </div>
            {/* Nút lưu rõ ràng — UPDATE theo id, khoá khi đang lưu */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary" onClick={handleSaveInfo} disabled={infoSaving}>
                {infoSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              {infoMsg && (
                <span className={`text-xs font-medium ${infoMsg.kind === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {infoMsg.text}
                </span>
              )}
            </div>
          </div>
        )}

        {tab === 'photos' && (
          <div className="flex flex-1 flex-col">
            <CategorizedPhotoViewer vehicle={vehicle} />
          </div>
        )}

        {tab === 'options' && (
          <div className="flex flex-1 flex-col">
            <VehicleOptionsTab vehicle={vehicle} />
          </div>
        )}

        {tab === 'checkin' && (
          isMobile ? (
            <FullscreenSheet title="Đầu vào" vehicle={vehicle} onBack={() => onTabChange('info')}>
              <CheckSheetForm vehicle={vehicle} type="in" onCancel={() => onTabChange('info')} onSaved={() => onTabChange('info')} />
            </FullscreenSheet>
          ) : (
            <CheckSheetForm vehicle={vehicle} type="in" onCancel={() => onTabChange('info')} onSaved={() => onTabChange('info')} />
          )
        )}

        {tab === 'checkout' && (
          isMobile ? (
            <FullscreenSheet title="Đầu ra" vehicle={vehicle} onBack={() => onTabChange('info')}>
              <CheckSheetForm vehicle={vehicle} type="out" onCancel={() => onTabChange('info')} onSaved={() => onTabChange('info')} />
            </FullscreenSheet>
          ) : (
            <CheckSheetForm vehicle={vehicle} type="out" onCancel={() => onTabChange('info')} onSaved={() => onTabChange('info')} />
          )
        )}

        {tab === 'docs' && (
          <div className="flex flex-1 flex-col">
            <VehicleDocumentManager vehicle={vehicle} />
          </div>
        )}

        {tab === 'history' && (
          <div className="card p-5">
            <div className="mb-3 text-sm font-semibold text-slate-700">Lịch sử</div>
            {timeline.length === 0 ? (
              <EmptyState icon={<Clock size={30} />} title="Chưa có lịch sử." />
            ) : (
              <ul className="space-y-0">
                {timeline.map((item) => {
                  const user = item.userId ? employees.find((e) => e.id === item.userId)?.name : undefined
                  const isMoveLog = item.type === 'move_log' && !!item.moveLogId
                  const moveLog = isMoveLog ? moveLogs.find((m) => m.id === item.moveLogId) : undefined
                  const fromPos = moveLog ? positions.find((p) => p.id === moveLog.fromPositionId) : undefined
                  const toPos = moveLog ? positions.find((p) => p.id === moveLog.toPositionId) : undefined
                  return (
                    <li key={item.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      <div>
                        <div className="text-sm text-slate-700">
                          {isMoveLog ? (
                            <><span className="font-medium">{fromPos ? fromPos.name : '—'}</span> → <span className="font-medium text-brand-600">{toPos ? toPos.name : '—'}</span></>
                          ) : item.title}
                        </div>
                        {item.description && !isMoveLog && <div className="text-xs text-slate-500">{item.description}</div>}
                        <div className="text-xs text-slate-400">{user || 'Không rõ'} • {formatDateTime(item.time)}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Fullscreen sheet for mobile — replaces the inline CheckSheet modal on small screens */
function FullscreenSheet({ title, vehicle, onBack, children }: { title: string; vehicle: Vehicle; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="text-sm font-semibold text-slate-900">{title}</span>
            <span className="ml-2 text-xs text-slate-400">{vehicle.plate} • {vehicle.model}</span>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

// ====== VEHICLE DOCUMENT MANAGER ======

function VehicleDocumentManager({ vehicle }: { vehicle: Vehicle }) {
  const [docs, setDocs] = useState<VehicleDocumentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [previewDoc, setPreviewDoc] = useState<VehicleDocumentRow | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<VehicleDocumentRow | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (vehicle?.id) loadDocuments()
  }, [vehicle?.id])

  async function loadDocuments() {
    if (!vehicle?.id) return
    setLoading(true)
    try {
      const data = await vehicleMediaService.getVehicleDocuments(vehicle.id)
      setDocs(data)
    } catch (err) {
      console.error('[VehicleDocumentManager] Failed to load documents:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !vehicle?.id) return
    const fileList = Array.from(files)
    setUploading(true)
    setUploadProgress({ current: 0, total: fileList.length })

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      if (file.size > 25 * 1024 * 1024) {
        alert(`File "${file.name}" vượt quá giới hạn 25MB.`)
        continue
      }
      try {
        await storageService.uploadVehicleDocument(vehicle.id, file, file.name, docs.length + i)
      } catch (err: any) {
        console.error('[VehicleDocumentManager] Upload error:', file.name, err)
        alert(`Tải file "${file.name}" thất bại: ${err.message || 'Lỗi tải lên'}`)
      }
      setUploadProgress({ current: i + 1, total: fileList.length })
    }

    setUploading(false)
    setUploadProgress(null)
    await loadDocuments()
  }

  async function handleDelete(doc: VehicleDocumentRow) {
    try {
      await vehicleMediaService.deleteVehicleDocument(doc.id, doc.path)
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
      setDeleteDoc(null)
    } catch (err: any) {
      console.error('[VehicleDocumentManager] Delete error:', err)
      alert(`Xóa tài liệu thất bại: ${err.message || 'Lỗi không xác định'}`)
    }
  }

  async function downloadDoc(doc: VehicleDocumentRow) {
    const url = doc.downloadUrl || doc.url
    if (!url) return
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = doc.label || doc.path.split('/').pop() || 'tai-lieu'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('Download doc failed:', err)
      window.open(url, '_blank')
    }
  }

  function downloadAllDocs() {
    docs.forEach((d, i) => {
      setTimeout(() => downloadDoc(d), i * 350)
    })
  }

  function formatBytes(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  function getFileIcon(fileName: string, mimeType?: string | null) {
    const lower = (fileName || '').toLowerCase()
    const mime = (mimeType || '').toLowerCase()
    if (lower.endsWith('.pdf') || mime.includes('pdf')) {
      return <FileText className="text-red-500" size={24} />
    }
    if (lower.endsWith('.doc') || lower.endsWith('.docx') || mime.includes('word') || mime.includes('document')) {
      return <FileText className="text-blue-500" size={24} />
    }
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || mime.includes('image')) {
      return <ImageIcon className="text-emerald-500" size={24} />
    }
    return <FileIcon className="text-slate-500" size={24} />
  }

  const isImage = (doc: VehicleDocumentRow) => {
    const l = (doc.label || doc.path || '').toLowerCase()
    const m = (doc.mime_type || '').toLowerCase()
    return l.endsWith('.jpg') || l.endsWith('.jpeg') || l.endsWith('.png') || l.endsWith('.webp') || m.includes('image')
  }

  const isPdf = (doc: VehicleDocumentRow) => {
    const l = (doc.label || doc.path || '').toLowerCase()
    const m = (doc.mime_type || '').toLowerCase()
    return l.endsWith('.pdf') || m.includes('pdf')
  }

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Tài liệu xe ({docs.length})</h3>
          <p className="text-xs text-slate-500">Hỗ trợ PDF, Word (.doc, .docx) và ảnh. Tối đa 25MB/file.</p>
        </div>
        <div className="flex items-center gap-2">
          {docs.length > 0 && (
            <button onClick={downloadAllDocs} className="btn-secondary flex items-center gap-1.5 text-xs">
              <Download size={14} /> Tải tất cả
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary flex items-center gap-1.5 text-xs"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {uploadProgress ? `Đang tải (${uploadProgress.current}/${uploadProgress.total})...` : 'Đang tải...'}
              </>
            ) : (
              <>
                <FileUp size={14} /> Tải tài liệu lên
              </>
            )}
          </button>
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-brand-600" />
        </div>
      ) : docs.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30"
        >
          <FileUp size={36} className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-700">Chưa có tài liệu nào</p>
          <p className="mt-1 text-xs text-slate-400">Bấm vào đây để tải tài liệu lên R2 (PDF, DOCX, Ảnh tối đa 25MB)</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-3 p-3.5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  {getFileIcon(doc.label || doc.path, doc.mime_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800" title={doc.label || doc.path}>
                    {doc.label || doc.path.split('/').pop() || 'Tài liệu'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{formatBytes(doc.size_bytes)}</span>
                    <span>•</span>
                    <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString('vi-VN') : '—'}</span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                {(isImage(doc) || isPdf(doc)) && (
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Eye size={13} /> Xem
                  </button>
                )}
                <button
                  onClick={() => downloadDoc(doc)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download size={13} /> Tải về
                </button>
                <button
                  onClick={() => setDeleteDoc(doc)}
                  className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={13} /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal for Image/PDF */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setPreviewDoc(null)}>
          <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewDoc(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={20} />
              </button>
              <span className="truncate text-sm font-medium max-w-xs sm:max-w-md">
                {previewDoc.label || previewDoc.path.split('/').pop()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadDoc(previewDoc)}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
              >
                <Download size={14} /> Tải về
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            {isImage(previewDoc) ? (
              <img
                src={previewDoc.downloadUrl || previewDoc.url}
                className="max-h-full max-w-full object-contain select-none"
                alt="Document Preview"
              />
            ) : isPdf(previewDoc) ? (
              <iframe
                src={previewDoc.downloadUrl || previewDoc.url}
                className="h-full w-full rounded-lg bg-white"
                title="PDF Preview"
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteDoc(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-semibold text-slate-900">Xác nhận xóa tài liệu</h4>
            <p className="mt-2 text-xs text-slate-500">
              Bạn có chắc chắn muốn xóa file <strong className="text-slate-700">{deleteDoc.label || deleteDoc.path}</strong>? File sẽ bị xóa vĩnh viễn khỏi hệ thống và Cloudflare R2.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteDoc(null)} className="btn-secondary px-3 py-1.5 text-xs">
                Hủy
              </button>
              <button onClick={() => handleDelete(deleteDoc)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ====== CATEGORIZED PHOTO VIEWER ======

/** Local row type — `clientKey` keeps the React key stable when a temp
 *  (optimistic blob) row is swapped for the real DB row, so the <img>
 *  element is NOT remounted (no flash) when the upload finishes. */
type ViewerRow = VehicleImageRow & {
  clientKey?: string
  isUploading?: boolean
  uploadError?: string | null
}

function CategorizedPhotoViewer({ vehicle }: { vehicle: Vehicle }) {
  const [imageRows, setImageRows] = useState<ViewerRow[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [previewRows, setPreviewRows] = useState<ViewerRow[]>([])
  const [dragIdx, setDragIdx] = useState<{ cat: string; idx: number } | null>(null)
  const [overIdx, setOverIdx] = useState<{ cat: string; idx: number } | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [expiryModal, setExpiryModal] = useState<{ files: File[]; category: string } | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const [regExpiryDate, setRegExpiryDate] = useState('')
  const [editingExpiry, setEditingExpiry] = useState<VehicleImageRow | null>(null)
  const [editExpiryDate, setEditExpiryDate] = useState('')

  // Display order per product spec — "Ảnh trên website" (Public Web) first.
  // 'website' reuses the existing category/sort_order/thumbnail mechanism.
  const CATEGORIES = [
    { key: 'website', title: 'Ảnh trên website', desc: 'Khách sẽ thấy trên Public Web — Ảnh đầu tiên = ảnh đại diện website' },
    { key: 'documents', title: 'Ảnh giấy tờ', desc: 'Song nưng, Đăng ký, Uỷ quyền' },
    { key: 'error', title: 'Ảnh lỗi xe', desc: null },
    { key: 'song_nung', title: 'Ảnh Song nưng', desc: null },
    { key: 'vehicle', title: 'Ảnh xe', desc: null },
  ]

  useEffect(() => {
    if (vehicle?.id) loadImages()
  }, [vehicle?.id])

  async function loadImages() {
    if (!vehicle?.id) return
    try {
      const rows = await vehicleMediaService.getVehicleImages(vehicle.id)
      // Guard against orphan thumbnail records that might have been uploaded separately
      const isThumbRecord = (r: VehicleImageRow) => {
        const p = r.path || r.url || ''
        return p.includes('_thumb_') || p.includes('/thumb_') || p.startsWith('thumb_')
      }

      // De-duplicate by id & path
      const seenIds = new Set<string>()
      const seenPaths = new Set<string>()
      const uniqueRows = rows.filter((r) => {
        if (isThumbRecord(r)) return false
        if (seenIds.has(r.id)) return false
        seenIds.add(r.id)
        if (r.path) {
          if (seenPaths.has(r.path)) return false
          seenPaths.add(r.path)
        }
        return true
      })

      // Preserve clientKey of rows already on screen so React keys stay
      // stable across reloads (prevents <img> remount / flicker).
      setImageRows((prev) =>
        uniqueRows.map((r) => {
          const old = prev.find((p) => p.id === r.id)
          return old?.clientKey ? { ...r, clientKey: old.clientKey } : r
        })
      )
      syncVehicleImages(uniqueRows)
    } catch (err) {
      console.error('Failed to load images:', err)
    }
  }

  function syncVehicleImages(rows: (VehicleImageRow | ViewerRow)[]) {
    const vehicleRows = rows
      .filter((r) => r.category === 'vehicle' || !r.category)
      .sort((a, b) => a.sort_order - b.sort_order)
    const vehicleUrls = vehicleRows.map((r) => r.downloadUrl || r.url)
    // Keep the url → thumbnail map fresh so list cards can render the small
    // thumbnail instead of falling back to the full-size cover image.
    const thumbs: Record<string, string> = {}
    for (const r of vehicleRows) {
      const displayUrl = r.downloadUrl || r.url
      if (r.thumbnail) thumbs[displayUrl] = r.thumbnail
    }
    useStore.getState().setVehicleImages(vehicle.id, vehicleUrls, thumbs)
  }

  const byCategory = useMemo(() => {
    const map: Record<string, ViewerRow[]> = {}
    for (const cat of CATEGORIES) map[cat.key] = []

    const seenIds = new Set<string>()
    const seenPaths = new Set<string>()

    for (const row of imageRows) {
      if (seenIds.has(row.id)) continue
      seenIds.add(row.id)

      // Guard against orphan thumbnail records that might have been uploaded separately
      const rowPath = row.path || row.url || ''
      if (rowPath && (rowPath.includes('_thumb_') || rowPath.includes('/thumb_') || rowPath.startsWith('thumb_'))) continue

      if (row.path && seenPaths.has(row.path)) continue
      if (row.path) seenPaths.add(row.path)

      const cat = row.category || 'vehicle'
      if (map[cat]) map[cat].push(row)
      else map[cat] = [row]
    }
    for (const cat of Object.keys(map)) {
      map[cat].sort((a, b) => a.sort_order - b.sort_order)
    }
    return map
  }, [imageRows])

  async function handleUpload(files: FileList | File[] | null, category: string, expiryDate?: string | null) {
    if (!files || !files.length || !vehicle?.id) return
    setUploading(category)
    const fileArray = Array.from(files)
    const tempRows: ViewerRow[] = fileArray.map((f, i) => {
      const blobUrl = URL.createObjectURL(f)
      return {
        id: 'temp_' + Date.now() + '_' + i,
        clientKey: 'ck_' + Date.now() + '_' + i,
        vehicle_id: vehicle.id,
        path: '',
        bucket: 'vehicle-images',
        url: blobUrl,
        downloadUrl: blobUrl,
        thumbnail: null,
        category,
        subtype: null,
        resolved: false,
        song_nung_expiry_date: category === 'song_nung' ? (expiryDate ?? null) : null,
        size_bytes: f.size,
        mime_type: f.type,
        sort_order: imageRows.length + i,
        created_at: new Date().toISOString(),
        isUploading: true,
        uploadError: null,
      }
    })

    // Show optimistic thumbnails immediately
    setImageRows((prev) => [...prev, ...tempRows])

    try {
      const CONCURRENCY = 2
      const uploadOne = async (file: File, tempRow: ViewerRow) => {
        try {
          // Upload thumbnail directly to R2 (without inserting a separate row in Neon DB!)
          let thumbKey: string | null = null
          try {
            const { resizeImage } = await import('../utils/imageResize')
            const thumbBlob = await resizeImage(file, 600, 0.75)
            thumbKey = await storageService.uploadThumbnailToR2(vehicle.id, thumbBlob, file.name)
          } catch { /* thumbnail failure is non-critical */ }

          // Upload original image with thumbnail metadata — exactly ONE record in DB!
          const result = await storageService.uploadVehicleImage(vehicle.id, file, {
            category: category as any,
            sortOrder: tempRow.sort_order,
            songNungExpiryDate: category === 'song_nung' ? (expiryDate ?? null) : undefined,
            thumbnail: thumbKey,
          })

          const confirmedRow: ViewerRow = {
            id: result.id || tempRow.id,
            clientKey: tempRow.clientKey,
            vehicle_id: vehicle.id,
            path: result.path,
            bucket: result.bucket || 'vehicle-images',
            url: result.url,
            downloadUrl: result.downloadUrl || result.url,
            thumbnail: result.downloadUrl || result.url,
            category,
            subtype: null,
            resolved: false,
            song_nung_expiry_date: category === 'song_nung' ? (expiryDate ?? null) : null,
            size_bytes: file.size,
            mime_type: file.type,
            sort_order: tempRow.sort_order,
            created_at: new Date().toISOString(),
            isUploading: false,
            uploadError: null,
          }

          setImageRows((prev) => prev.map((r) => (r.id === tempRow.id ? confirmedRow : r)))
          URL.revokeObjectURL(tempRow.url)
        } catch (err: any) {
          console.error('[upload] Failed:', file.name, err)
          setImageRows((prev) =>
            prev.map((r) =>
              r.id === tempRow.id
                ? { ...r, isUploading: false, uploadError: err.message || 'Lỗi tải ảnh' }
                : r
            )
          )
        }
      }

      // Process in batches
      for (let i = 0; i < fileArray.length; i += CONCURRENCY) {
        const batch = fileArray.slice(i, i + CONCURRENCY)
        await Promise.all(batch.map((f, bi) => uploadOne(f, tempRows[i + bi])))
      }

      await loadImages()
    } catch (err) {
      console.error('[upload] Batch failed:', err)
    } finally {
      setUploading(null)
    }
  }

  async function handleDelete(row: ViewerRow) {
    // Optimistic: remove from UI immediately
    const before = imageRows
    const remaining = before.filter((r) => r.id !== row.id)
    setImageRows(remaining)
    // Keep the global store in sync right away (cover image in lists) —
    // don't rely solely on the realtime DELETE echo.
    syncVehicleImages(remaining)
    if (previewIndex !== null) setPreviewIndex(null)
    try {
      await vehicleMediaService.deleteVehicleImage(row.id, row.path)
    } catch (err) {
      console.error('Delete failed:', err)
      // Rollback on failure
      setImageRows(before)
      syncVehicleImages(before)
    }
  }

  async function handleReorder(category: string, from: number, to: number) {
    if (from === to) return
    const items = [...(byCategory[category] || [])]
    const [moved] = items.splice(from, 1)
    items.splice(to, 0, moved)

    // Optimistic UI: update local state immediately
    const updatedRows = imageRows.map((r) => {
      const idx = items.findIndex((i) => i.id === r.id)
      return idx >= 0 ? { ...r, sort_order: idx } : r
    })
    setImageRows(updatedRows)
    // Reflect the new order (esp. cover = first 'vehicle' image) in the
    // global store immediately — setVehicleImages no-ops if nothing changed.
    syncVehicleImages(updatedRows)

    // Persist in background
    for (let i = 0; i < items.length; i++) {
      vehicleMediaService.updateVehicleImageOrder(items[i].id, i).catch(console.error)
    }
  }

  async function handleMoveCategory(fromCat: string, fromIdx: number, toCat: string) {
    const sourceItems = byCategory[fromCat] || []
    const row = sourceItems[fromIdx]
    if (!row) return

    // Place at the end of the target category
    const targetItems = byCategory[toCat] || []
    const targetSortOrder = targetItems.length

    // Update category + sort_order in DB
    await vehicleMediaService.updateVehicleImageCategory(row.id, toCat, targetSortOrder)

    // Reorder remaining items in the source category (fill the gap)
    const remainingSource = sourceItems.filter((_, i) => i !== fromIdx)
    for (let i = 0; i < remainingSource.length; i++) {
      if (remainingSource[i].id !== row.id) {
        await vehicleMediaService.updateVehicleImageOrder(remainingSource[i].id, i)
      }
    }

    await loadImages()
  }

  async function handleSetCover(row: VehicleImageRow) {
    // Find which category this image is currently in
    let fromCat = ''
    let fromIdx = -1
    for (const cat of CATEGORIES) {
      const items = byCategory[cat.key] || []
      const idx = items.findIndex((r) => r.id === row.id)
      if (idx >= 0) { fromCat = cat.key; fromIdx = idx; break }
    }
    if (fromIdx < 0) return

    if (fromCat === 'website') {
      // Website cover = first image of the 'website' group — reorder WITHIN
      // the group only; never move it into the internal 'vehicle' group.
      if (fromIdx > 0) {
        handleReorder('website', fromIdx, 0)
      }
      return
    }

    if (fromCat !== 'vehicle') {
      // Move to vehicle category first
      await handleMoveCategory(fromCat, fromIdx, 'vehicle')
    }

    // Promote to position 0 in vehicle category
    const vehicleItems = byCategory['vehicle'] || []
    const pos = vehicleItems.findIndex((r) => r.id === row.id)
    if (pos > 0) {
      handleReorder('vehicle', pos, 0)
    }
  }

  async function downloadFile(url: string, filename: string) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  function downloadOne(row: ViewerRow, idx: number) {
    const targetUrl = row.downloadUrl || row.url
    const ext = targetUrl.split('.').pop()?.split('?')[0] || 'jpg'
    downloadFile(targetUrl, `${vehicle.model}_${vehicle.plate}_${idx + 1}.${ext}`)
  }

  function downloadAll() {
    imageRows.forEach((row, i) => {
      setTimeout(() => downloadOne(row, i), i * 300)
    })
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">{imageRows.length} ảnh</span>
        {imageRows.length > 0 && (
          <button onClick={downloadAll} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Tải tất cả
          </button>
        )}
      </div>

      {/* Category Sections */}
      {CATEGORIES.map((cat) => {
        const items = byCategory[cat.key] || []
        return (
          <div key={cat.key} className="mb-6">
            {/* Section Header */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">{cat.title}</h3>
                {cat.desc && <p className="mt-0.5 text-xs text-slate-400">{cat.desc}</p>}
              </div>
              <button
                onClick={() => inputRefs.current[cat.key]?.click()}
                className="btn-primary"
                disabled={uploading === cat.key}
              >
                <ImagePlus size={16} />
                {uploading === cat.key ? 'Đang tải...' : 'Tải ảnh lên'}
              </button>
              <input
                ref={(el) => { inputRefs.current[cat.key] = el }}
                type="file" accept="image/*" multiple
                className="hidden"
                onChange={(e) => {
                  if (cat.key === 'song_nung' && e.target.files?.length) {
                    const files = Array.from(e.target.files)
                    let detectedDate = ''
                    for (const f of files) {
                      const detected = extractDateFromString(f.name)
                      if (detected) {
                        detectedDate = detected
                        break
                      }
                    }
                    setExpiryModal({ files, category: cat.key })
                    setExpiryDate(detectedDate || toInputDateFormat(vehicle.songNungExpiryDate))
                    setRegExpiryDate(toInputDateFormat(vehicle.registrationExpiryDate))
                    e.target.value = ''
                  } else {
                    handleUpload(e.target.files, cat.key)
                    e.target.value = ''
                  }
                }}
              />
            </div>

            {/* Image Grid or Empty */}
            {items.length === 0 ? (
              <div
                className="rounded-xl border border-dashed border-slate-200 transition-colors"
                onDragOver={(e) => { e.preventDefault(); setOverIdx({ cat: cat.key, idx: 0 }) }}
                onDragLeave={() => setOverIdx(null)}
                onDrop={() => {
                  if (dragIdx && dragIdx.cat !== cat.key) {
                    handleMoveCategory(dragIdx.cat, dragIdx.idx, cat.key)
                  }
                  setDragIdx(null); setOverIdx(null)
                }}
              >
                <EmptyState icon={<ImagePlus size={28} />} title="Chưa có ảnh" subtitle="" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
                {items.map((row, idx) => (
                  <div
                    key={row.clientKey ?? row.id}
                    draggable
                    onDragStart={() => setDragIdx({ cat: cat.key, idx })}
                    onDragOver={(e) => { e.preventDefault(); setOverIdx({ cat: cat.key, idx }) }}
                    onDragLeave={() => setOverIdx(null)}
                    onDrop={() => {
                      if (dragIdx) {
                        if (dragIdx.cat === cat.key) {
                          handleReorder(cat.key, dragIdx.idx, idx)
                        } else {
                          handleMoveCategory(dragIdx.cat, dragIdx.idx, cat.key)
                        }
                      }
                      setDragIdx(null); setOverIdx(null)
                    }}
                    onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                    onClick={() => { setPreviewRows(items); setPreviewIndex(idx); }}
                    className={`group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-lg border bg-slate-50 ${
                      (cat.key === 'vehicle' || cat.key === 'website') && idx === 0 ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200'
                    } ${overIdx?.cat === cat.key && overIdx.idx === idx && dragIdx?.cat === cat.key && dragIdx.idx !== idx ? 'scale-[0.98] border-brand-400' : ''} ${
                      overIdx?.cat === cat.key && overIdx.idx === idx && dragIdx && dragIdx.cat !== cat.key ? 'scale-[0.98] border-violet-400 ring-2 ring-violet-100' : ''}`}
                  >
                    <img
                      src={row.thumbnail || row.downloadUrl || row.url}
                      className="h-full w-full object-cover"
                      draggable={false}
                      loading="lazy"
                    />

                    {/* Progress / Loading indicator */}
                    {row.isUploading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-[1px]">
                        <Loader2 size={20} className="animate-spin text-white" />
                        <span className="mt-1 text-[10px] font-medium">Đang tải...</span>
                      </div>
                    )}

                    {/* Error indicator */}
                    {row.uploadError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 p-1 text-center text-white backdrop-blur-[1px]">
                        <AlertCircle size={16} className="text-red-300" />
                        <span className="mt-0.5 line-clamp-2 text-[9px] text-red-100">{row.uploadError}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setImageRows((prev) => prev.filter((r) => r.id !== row.id))
                          }}
                          className="mt-1 rounded bg-white/20 px-1.5 py-0.5 text-[8px] font-medium hover:bg-white/30"
                        >
                          Đóng
                        </button>
                      </div>
                    )}

                    {/* Top badges */}
                    <div className="absolute left-1 top-1 flex items-center gap-1">
                      <span className="rounded-md bg-slate-900/60 p-0.5 text-white"><GripVertical size={10} /></span>
                      {(cat.key === 'vehicle' || cat.key === 'website') && idx === 0 && (
                        <span className="flex items-center gap-0.5 rounded-md bg-brand-600 px-1 py-0.5 text-[9px] font-semibold text-white">
                          <Star size={8} /> {cat.key === 'website' ? 'Đại diện web' : 'Hiển thị'}
                        </span>
                      )}
                      {cat.key === 'song_nung' && row.song_nung_expiry_date && (
                        <span className={`flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[9px] font-semibold text-white ${new Date(toInputDateFormat(row.song_nung_expiry_date)) < new Date() ? 'bg-red-600' : 'bg-green-600'}`}>
                          {new Date(toInputDateFormat(row.song_nung_expiry_date)) < new Date() ? 'HẾT HẠN' : 'Còn hạn'}
                        </span>
                      )}
                    </div>
                    {/* Hover controls */}
                    <div
                      className="absolute inset-x-1 bottom-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button onClick={() => { setPreviewRows(items); setPreviewIndex(idx) }}
                        className="flex-1 rounded-md bg-white/95 py-0.5 text-[9px] font-medium text-slate-700 shadow-sm">
                        Xem
                      </button>
                      {!((cat.key === 'vehicle' || cat.key === 'website') && idx === 0) && (
                        <button onClick={() => handleSetCover(row)}
                          className="rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-medium text-brand-700 shadow-sm">
                          {cat.key === 'website' ? 'Ảnh đại diện web' : 'Ảnh đại diện'}
                        </button>
                      )}
                      {cat.key === 'song_nung' && (
                        <button onClick={() => { setEditingExpiry(row); setEditExpiryDate(toInputDateFormat(row.song_nung_expiry_date)); }}
                          className="rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 shadow-sm">
                          Hạn
                        </button>
                      )}
                      <button onClick={() => downloadOne(row, idx)}
                        className="rounded-md bg-slate-900/70 p-1 text-white">
                        <Download size={10} />
                      </button>
                      <button onClick={() => handleDelete(row)}
                        className="rounded-md bg-red-600/80 p-1 text-white">
                        <Trash2 size={10} />
                      </button>
                    </div>
                    {/* Song nung expiry date label */}
                    {cat.key === 'song_nung' && row.song_nung_expiry_date && (
                      <div className="absolute bottom-8 left-1 right-1 text-center">
                        <span className="text-[9px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          Hạn: {formatDisplayDate(row.song_nung_expiry_date)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Preview Modal / Lightbox */}
      {previewIndex !== null && previewRows[previewIndex] && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => { setZoomLevel(1); setPreviewIndex(null); }}>
          <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setZoomLevel(1); setPreviewIndex(null); }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                title="Đóng (Esc)"
              >
                <X size={20} />
              </button>
              <span className="text-sm font-medium">{vehicle.plate} — {vehicle.model}</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
                  className="rounded p-1 text-white hover:bg-white/20 transition-colors"
                  title="Phóng to"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
                  className="rounded p-1 text-white hover:bg-white/20 transition-colors"
                  title="Thu nhỏ"
                >
                  <ZoomOut size={16} />
                </button>
                {zoomLevel > 1 && (
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="rounded p-1 text-white hover:bg-white/20 transition-colors"
                    title="Về kích thước chuẩn (100%)"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                <span className="text-xs text-white/70 px-1 font-mono">{Math.round(zoomLevel * 100)}%</span>
              </div>

              {previewRows.length > 1 && <span className="text-xs text-white/60">{previewIndex + 1}/{previewRows.length}</span>}
              <button onClick={() => downloadOne(previewRows[previewIndex], previewIndex)}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors" title="Tải ảnh gốc">
                <Download size={14} /> Tải ảnh
              </button>
            </div>
          </div>
          {/* Main Full-Size Image in Lightbox — loads downloadUrl (original full quality photo) */}
          <div className="flex min-h-0 flex-1 items-center justify-center px-2 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewRows[previewIndex].downloadUrl || previewRows[previewIndex].url}
              className="max-h-full max-w-full object-contain select-none transition-transform duration-200"
              style={{
                transform: `scale(${zoomLevel})`,
                cursor: zoomLevel > 1 ? 'grab' : 'zoom-in',
              }}
              onClick={() => setZoomLevel((z) => (z > 1 ? 1 : 2))}
              draggable={false}
              alt={`${vehicle.plate} ${previewIndex + 1}`}
            />
          </div>
          {previewRows.length > 1 && (
            <div className="flex shrink-0 items-center justify-center gap-6 px-4 py-4" onClick={(e) => e.stopPropagation()}>
              <button disabled={previewIndex === 0} onClick={() => { setZoomLevel(1); setPreviewIndex(previewIndex - 1); }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30">
                <ChevronLeft size={22} />
              </button>
              <span className="text-sm text-white/80">{previewIndex + 1}/{previewRows.length}</span>
              <button disabled={previewIndex >= previewRows.length - 1} onClick={() => { setZoomLevel(1); setPreviewIndex(previewIndex + 1); }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30">
                <ChevronRight size={22} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Expiry date modal for song_nung upload */}
      {expiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setExpiryModal(null)}>
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-slate-800">Thông tin Song nưng</h3>
            <p className="mt-1 text-xs text-slate-500">Nhập ngày hết hạn</p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Ngày hết hạn Song nưng</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Ngày hết hạn đăng kiểm</label>
                <input type="date" value={regExpiryDate} onChange={(e) => setRegExpiryDate(e.target.value)} className="input mt-1 w-full" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setExpiryModal(null)} className="btn-secondary px-4 py-2 text-sm">Hủy</button>
              <button
                onClick={async () => {
                  if (expiryModal) {
                    const normalizedExpiry = toInputDateFormat(expiryDate) || null
                    const normalizedReg = toInputDateFormat(regExpiryDate) || null
                    await handleUpload(expiryModal.files, expiryModal.category, normalizedExpiry)
                    // Update vehicle-level expiry dates
                    if (vehicle?.id) {
                      const patch: Partial<Vehicle> = {}
                      if (normalizedExpiry) patch.songNungExpiryDate = normalizedExpiry
                      if (normalizedReg) patch.registrationExpiryDate = normalizedReg
                      if (Object.keys(patch).length > 0) {
                        await useStore.getState().updateVehicle(vehicle.id, patch)
                      }
                    }
                    setExpiryModal(null)
                  }
                }}
                className="btn-primary px-4 py-2 text-sm"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit expiry date modal for song_nung */}
      {editingExpiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingExpiry(null)}>
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-slate-800">Sửa ngày hết hạn</h3>
            <input
              type="date"
              value={editExpiryDate}
              onChange={(e) => setEditExpiryDate(e.target.value)}
              className="input mt-3 w-full"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingExpiry(null)}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  if (editingExpiry) {
                    const normalizedExpiry = toInputDateFormat(editExpiryDate) || null
                    await vehicleMediaService.updateVehicleImageExpiry(editingExpiry.id, normalizedExpiry)
                    if (normalizedExpiry && vehicle?.id) {
                      await useStore.getState().updateVehicle(vehicle.id, { songNungExpiryDate: normalizedExpiry })
                    }
                    setEditingExpiry(null)
                    await loadImages()
                  }
                }}
                className="btn-primary px-4 py-2 text-sm"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ====== VEHICLE OPTIONS TAB ("Option xe") ======

/**
 * Per-vehicle equipment checkboxes. The catalog (groups/labels) is read
 * from table vehicle_option_defs — nothing is hard-coded here so the
 * future Public Web can render labels from the same source.
 * Selections are stored per vehicle in vehicles.options (JSONB array of
 * vehicle_option_defs.key) via the existing updateVehicle flow.
 */
function VehicleOptionsTab({ vehicle }: { vehicle: Vehicle }) {
  const updateVehicle = useStore((s) => s.updateVehicle)
  const vehicles = useStore((s) => s.vehicles)
  const isAdmin = useAuthStore((s) => s.currentUser?.role === 'admin')

  const [defs, setDefs] = useState<VehicleOptionDef[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkingOptions, setCheckingOptions] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  // Option mới đang gõ (local-only, chưa vào DB cho tới khi Enter/blur)
  const [draft, setDraft] = useState<{ groupKey: string; label: string } | null>(null)
  const draftRef = useRef<HTMLInputElement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VehicleOptionDef | null>(null)

  async function refreshDefs() {
    const rows = await vehicleOptionService.getVehicleOptionDefs()
    setDefs(rows)
  }

  useEffect(() => {
    let cancelled = false
    vehicleOptionService
      .getVehicleOptionDefs()
      .then((rows) => { if (!cancelled) setDefs(rows) })
      .catch((err) => {
        console.error('[VehicleOptionsTab] Failed to load option defs:', err)
        if (!cancelled) setLoadError(true)
      })
    return () => { cancelled = true }
  }, [])

  // Auto-focus input khi bắt đầu thêm option
  useEffect(() => {
    if (draft) requestAnimationFrame(() => draftRef.current?.focus())
  }, [draft?.groupKey])

  const selected = vehicle.options ?? []

  // Group defs by catalog order
  const groups: { key: string; label: string; defs: VehicleOptionDef[] }[] = []
  for (const def of defs ?? []) {
    let g = groups.find((x) => x.key === def.groupKey)
    if (!g) {
      g = { key: def.groupKey, label: def.groupLabel, defs: [] }
      groups.push(g)
    }
    g.defs.push(def)
  }

  function toggle(key: string) {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key]
    updateVehicle(vehicle.id, { options: next })
  }

  /** Chạy mutation catalog: chặn thoát Edit Mode khi đang lưu, toast lỗi giữ nguyên dữ liệu */
  async function runSave(fn: () => Promise<unknown>, okText?: string) {
    setSaving(true)
    setMsg(null)
    try {
      await fn()
      if (okText) setMsg({ kind: 'success', text: okText })
    } catch (err) {
      console.error('[VehicleOptionsTab] save failed:', err)
      setMsg({ kind: 'error', text: 'Không thể lưu thay đổi option — dữ liệu giữ nguyên, thử lại.' })
    } finally {
      setSaving(false)
    }
  }

  // ===== Đổi tên inline: Enter hoặc blur =====
  function commitRename(def: VehicleOptionDef, raw: string) {
    const label = raw.trim()
    if (!label || label === def.label) return
    runSave(async () => {
      await vehicleOptionService.updateOptionDefLabel(def.id, label)
      await refreshDefs()
    })
  }

  // ===== Thêm option vào cuối nhóm =====
  function nextSortOf(groupKey: string): number {
    const inGroup = (defs ?? []).filter((d) => d.groupKey === groupKey)
    return inGroup.reduce((m, d) => Math.max(m, d.sortOrder), 0) + 1
  }

  function commitDraft() {
    if (!draft) return
    const label = draft.label.trim()
    const groupKey = draft.groupKey
    const groupLabel = groups.find((g) => g.key === groupKey)?.label ?? groupKey
    setDraft(null)
    if (!label) return // Escape / blur rỗng → huỷ, không ghi DB
    runSave(async () => {
      await vehicleOptionService.createOptionDef(groupKey, groupLabel, label, nextSortOf(groupKey))
      await refreshDefs()
    }, `Đã thêm option "${label}"`)
  }

  // ===== Xoá option: confirm + dọn key khỏi vehicles đang dùng =====
  const usingCount = deleteTarget
    ? vehicles.filter((v) => v.options?.includes(deleteTarget.key)).length
    : 0

  function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    runSave(async () => {
      await vehicleOptionService.deleteOptionDef(target.id)
      // Dỡ key khỏi các xe đang chọn (đã xác nhận rõ ràng, không âm thầm)
      const affected = vehicles.filter((v) => v.options?.includes(target.key))
      await Promise.all(
        affected.map((v) =>
          updateVehicle(v.id, { options: (v.options ?? []).filter((k) => k !== target.key) })
        )
      )
      await refreshDefs()
    }, `Đã xoá option "${target.label}"`)
  }

  if (loadError) {
    return (
      <div className="card p-5 text-sm text-red-600">
        Không tải được danh sách option. Kiểm tra kết nối rồi mở lại tab này.
      </div>
    )
  }
  if (!defs) {
    return <div className="card p-5 text-sm text-slate-400">Đang tải danh sách option...</div>
  }

  return (
    <div className="space-y-5">
      {/* Header: thông tin + nút Chỉnh sửa / Hoàn tất (chỉ Admin) */}
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
          Tick các trang bị của xe — lựa chọn được lưu riêng cho từng xe và hiển thị trên Public Web.
          {selected.length > 0 && (
            <span className="ml-1 font-semibold text-brand-600">Đang chọn: {selected.length}</span>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={vehicle.optionsChecked === true}
              disabled={checkingOptions || saving}
              onChange={async (e) => {
                setCheckingOptions(true)
                setMsg(null)
                const ok = await updateVehicle(vehicle.id, { optionsChecked: e.target.checked })
                setCheckingOptions(false)
                setMsg(ok
                  ? { kind: 'success', text: e.target.checked ? 'Đã xác nhận kiểm tra Option.' : 'Đã bỏ xác nhận kiểm tra Option.' }
                  : { kind: 'error', text: 'Không thể lưu trạng thái kiểm tra Option.' })
              }}
            />
            Đã kiểm tra Option
          </label>
          {isAdmin && (
            <button
              type="button"
              className="btn-secondary flex shrink-0 items-center gap-1.5"
              disabled={saving}
              onClick={() => { setEditMode((m) => !m); setDraft(null); setMsg(null) }}
            >
              {editMode ? <Check size={15} /> : <Pencil size={15} />}
              {editMode ? 'Hoàn tất' : 'Chỉnh sửa'}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`rounded-lg px-3 py-2 text-xs font-medium ${msg.kind === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.key}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.label}</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.defs.map((def) => {
              const checked = selected.includes(def.key)
              if (!editMode) {
                // NORMAL MODE: chỉ checkbox + tên
                return (
                  <label
                    key={def.key}
                    className={`flex min-h-[46px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors ${
                      checked ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 accent-brand-600"
                      checked={checked}
                      onChange={() => toggle(def.key)}
                    />
                    <span className={`min-w-0 truncate text-sm ${checked ? 'font-semibold text-brand-700' : 'text-slate-700'}`}>
                      {def.label}
                    </span>
                  </label>
                )
              }
              // EDIT MODE: checkbox + input inline + nút X
              return (
                <div
                  key={def.key}
                  className={`flex min-h-[46px] items-center gap-2 rounded-xl border px-3 py-2 ${
                    checked ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-brand-600"
                    checked={checked}
                    onChange={() => toggle(def.key)}
                  />
                  <input
                    key={`${def.id}:${def.label}`}
                    defaultValue={def.label}
                    className="input min-w-0 flex-1 px-2 py-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    onBlur={(e) => commitRename(def, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(def)}
                    aria-label={`Xoá option ${def.label}`}
                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}

            {/* Ô thêm option — nằm trong grid, chỉ Edit Mode */}
            {editMode &&
              (draft && draft.groupKey === g.key ? (
                <div className="flex min-h-[46px] items-center gap-2 rounded-xl border border-dashed border-brand-400 bg-brand-50/50 px-3 py-2">
                  <input
                    ref={draftRef}
                    value={draft.label}
                    placeholder="Tên option mới..."
                    className="input min-w-0 flex-1 px-2 py-1 text-sm"
                    onChange={(e) => setDraft({ groupKey: g.key, label: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitDraft()
                      if (e.key === 'Escape') setDraft(null)
                    }}
                    onBlur={() => commitDraft()}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDraft({ groupKey: g.key, label: '' })}
                  className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-500 transition-colors hover:border-brand-300 hover:text-brand-600"
                >
                  <Plus size={14} /> Thêm option
                </button>
              ))}
          </div>
        </div>
      ))}

      {groups.length === 0 && (
        <EmptyState icon={<SlidersHorizontal size={30} />} title="Chưa có option nào" subtitle="Bấm Chỉnh sửa rồi Thêm option để tạo." />
      )}

      {/* Confirm xoá option — cảnh báo số xe đang dùng */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xoá option?"
        message={
          deleteTarget
            ? usingCount > 0
              ? `Option "${deleteTarget.label}" đang được sử dụng bởi ${usingCount} xe. Bản chọn của các xe đó sẽ được gỡ option này. Bạn có chắc muốn xóa?`
              : `Xoá option "${deleteTarget.label}" khỏi danh mục?`
            : ''
        }
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
