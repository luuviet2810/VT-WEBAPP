import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Clock, Download, FileText, Image as ImageIcon, Info, LogIn, LogOut, ImagePlus, Star, Trash2, GripVertical, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Modal, EmptyState, Tabs } from '../components/ui'
import PhotoUploader from '../components/PhotoUploader'
import CheckSheetForm from '../components/CheckSheetForm'
import { useStore } from '../store/useStore'
import { formatDateTime } from '../utils/format'
import * as vehicleMediaService from '../services/vehicleMedia.service'
import * as storageService from '../services/storage.service'
import type { VehicleImageRow } from '../services/vehicleMedia.service'
import type { Vehicle } from '../types'

interface Props {
  vehicle: Vehicle
  tab: string
  onTabChange: (tab: string) => void
}

export const VEHICLE_DETAIL_TABS = [
  { key: 'info', label: 'Thông tin', icon: <Info size={15} /> },
  { key: 'photos', label: 'Ảnh', icon: <ImageIcon size={15} /> },
  { key: 'checkin', label: 'Đầu vào', icon: <LogIn size={15} /> },
  { key: 'checkout', label: 'Đầu ra', icon: <LogOut size={15} /> },
  { key: 'docs', label: 'Giấy tờ', icon: <FileText size={15} /> },
  { key: 'history', label: 'Lịch sử', icon: <Clock size={15} /> },
]

const DISPLACEMENT_OPTIONS = ['1.0L', '1.4L', '1.6L', '1.8L', '2.0L', '2.2L', '2.4L', '3.0L', '3.3L']

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

  const infoFields = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="label">Biển số (4 số cuối)</label>
        <input className="input" defaultValue={vehicle.plate} onBlur={(e) => patch({ plate: e.target.value })} />
      </div>
      <div>
        <label className="label">Dòng xe</label>
        <input className="input" defaultValue={vehicle.model} onBlur={(e) => patch({ model: e.target.value })} />
      </div>
      <div>
        <label className="label">Năm</label>
        <input className="input" type="number" placeholder="VD: 2020" defaultValue={vehicle.year ?? ''} onBlur={(e) => patch({ year: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <label className="label">Nhiên liệu</label>
        <select className="input" defaultValue={vehicle.fuelType ?? ''} onChange={(e) => patch({ fuelType: (e.target.value || undefined) as Vehicle['fuelType'] })}>
          <option value="">Chọn...</option>
          <option value="gasoline">Xăng</option>
          <option value="diesel">Dầu</option>
          <option value="lpg">LPG</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>
      <div>
        <label className="label">Dung tích (L)</label>
        <select className="input" defaultValue={vehicle.displacement ?? ''} onChange={(e) => patch({ displacement: e.target.value || undefined })}>
          <option value="">Chọn...</option>
          {DISPLACEMENT_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Đã chạy (vạn km)</label>
        <input className="input" placeholder="VD: 12" defaultValue={vehicle.mileage ?? ''} onBlur={(e) => patch({ mileage: e.target.value || undefined })} />
      </div>
      <div>
        <label className="label">Màu xe</label>
        <select className="input" defaultValue={vehicle.color ?? ''} onChange={(e) => patch({ color: e.target.value || undefined })}>
          <option value="">Chọn...</option>
          {['Trắng', 'Đen', 'Bạc', 'Xám', 'Đỏ', 'Xanh'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Giá bán</label>
        <input className="input" placeholder="VNĐ" defaultValue={vehicle.sellPrice ?? ''} onBlur={(e) => patch({ sellPrice: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <label className="label">Vị trí xe</label>
        <select className="input" defaultValue={vehicle.positionId ?? ''} onChange={(e) => patch({ positionId: e.target.value || '00000000-0000-0000-0000-000000000001' })}>
          <option value="">— Chưa phân bổ —</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Tình trạng</label>
        <select className="input" defaultValue={vehicle.status} onChange={(e) => patch({ status: e.target.value as Vehicle['status'] })}>
          <option value="available">Chưa bán</option>
          <option value="deposited">Đã cọc</option>
          <option value="sold">Đã bán</option>
        </select>
      </div>
      <div>
        <label className="label">Hạn Song nưng</label>
        <input className="input" type="date" defaultValue={vehicle.songNungExpiryDate ?? ''} onBlur={(e) => patch({ songNungExpiryDate: e.target.value || null })} />
        {vehicle.songNungExpiryDate && (
          <span className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${new Date(vehicle.songNungExpiryDate) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${new Date(vehicle.songNungExpiryDate) < new Date() ? 'bg-red-600' : 'bg-green-600'}`} />
            {new Date(vehicle.songNungExpiryDate) < new Date() ? 'Hết hạn' : 'Còn hạn'}
          </span>
        )}
      </div>
      <div>
        <label className="label">Hạn đăng kiểm</label>
        <input className="input" type="date" defaultValue={vehicle.registrationExpiryDate ?? ''} onBlur={(e) => patch({ registrationExpiryDate: e.target.value || null })} />
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
              <textarea className="input" rows={2} defaultValue={vehicle.note ?? ''} onBlur={(e) => patch({ note: e.target.value || undefined })} />
            </div>
          </div>
        )}

        {tab === 'photos' && (
          <div className="flex flex-1 flex-col">
            <CategorizedPhotoViewer vehicle={vehicle} />
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
            <PhotoUploader
              images={vehicle.documents}
              onChange={(documents) => patch({ documents })}
              label="Thêm ảnh / giấy tờ"
              emptyText="Chưa có ảnh"
              rightContent={
                <button
                  className="btn-secondary flex items-center gap-2"
                  onClick={() => downloadAllImages(vehicle.documents, vehicle.model, vehicle.plate, 'Giayto')}
                  disabled={!vehicle.documents || vehicle.documents.length === 0}
                >
                  <Download size={16} /> Tải tất cả
                </button>
              }
            />
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

// ====== CATEGORIZED PHOTO VIEWER ======

function CategorizedPhotoViewer({ vehicle }: { vehicle: Vehicle }) {
  const [imageRows, setImageRows] = useState<VehicleImageRow[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [previewRows, setPreviewRows] = useState<VehicleImageRow[]>([])
  const [dragIdx, setDragIdx] = useState<{ cat: string; idx: number } | null>(null)
  const [overIdx, setOverIdx] = useState<{ cat: string; idx: number } | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [expiryModal, setExpiryModal] = useState<{ files: File[]; category: string } | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const [regExpiryDate, setRegExpiryDate] = useState('')
  const [editingExpiry, setEditingExpiry] = useState<VehicleImageRow | null>(null)
  const [editExpiryDate, setEditExpiryDate] = useState('')

  const CATEGORIES = [
    { key: 'error', title: 'Ảnh lỗi xe', desc: null },
    { key: 'documents', title: 'Ảnh giấy tờ', desc: 'Song nưng, Đăng ký, Uỷ quyền' },
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
      setImageRows(rows)
      syncVehicleImages(rows)
    } catch (err) {
      console.error('Failed to load images:', err)
    }
  }

  function syncVehicleImages(rows: VehicleImageRow[]) {
    const vehicleUrls = rows
      .filter((r) => r.category === 'vehicle' || !r.category)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((r) => r.url)
    useStore.getState().setVehicleImages(vehicle.id, vehicleUrls)
  }

  const byCategory = useMemo(() => {
    const map: Record<string, VehicleImageRow[]> = {}
    for (const cat of CATEGORIES) map[cat.key] = []
    for (const row of imageRows) {
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
    const tempRows: VehicleImageRow[] = fileArray.map((f, i) => ({
      id: 'temp_' + Date.now() + '_' + i,
      vehicle_id: vehicle.id,
      path: '',
      bucket: 'vehicle-images',
      url: URL.createObjectURL(f),
      thumbnail: null,
      category,
      subtype: null,
      resolved: false,
      song_nung_expiry_date: category === 'song_nung' ? (expiryDate ?? null) : null,
      size_bytes: f.size,
      mime_type: f.type,
      sort_order: imageRows.length + i,
      created_at: new Date().toISOString(),
    }))

    // Show thumbnails immediately
    setImageRows((prev) => [...prev, ...tempRows])

    try {
      // Upload with limited concurrency (3 at a time)
      const CONCURRENCY = 3
      const uploadOne = async (file: File, tempRow: VehicleImageRow) => {
        try {
          const result = await storageService.uploadVehicleImage(vehicle.id, file)
          let thumbUrl: string | null = null
          try {
            const { resizeImage } = await import('../utils/imageResize')
            const thumbBlob = await resizeImage(file, 600, 0.75)
            const thumbFile = new File([thumbBlob], 'thumb_' + file.name, { type: 'image/jpeg' })
            const thumbResult = await storageService.uploadVehicleImage(vehicle.id, thumbFile)
            thumbUrl = thumbResult.url
          } catch { /* thumbnail failure is non-critical */ }
          const dbRow = await vehicleMediaService.addVehicleImage(
            vehicle.id, result.path, 'vehicle-images', result.url,
            file.size, file.type, tempRow.sort_order, thumbUrl, category,
            category === 'song_nung' ? (expiryDate ?? null) : undefined
          )
          // Replace temp row with real row
          setImageRows((prev) => prev.map((r) => (r.id === tempRow.id ? dbRow : r)))
          URL.revokeObjectURL(tempRow.url)
        } catch (err) {
          console.error('[upload] Failed:', file.name, err)
          // Remove failed temp row
          setImageRows((prev) => prev.filter((r) => r.id !== tempRow.id))
        }
      }

      // Process in batches
      for (let i = 0; i < fileArray.length; i += CONCURRENCY) {
        const batch = fileArray.slice(i, i + CONCURRENCY)
        await Promise.all(batch.map((f, bi) => uploadOne(f, tempRows[i + bi])))
      }
    } catch (err) {
      console.error('[upload] Batch failed:', err)
    } finally {
      setUploading(null)
    }
  }

  async function handleDelete(row: VehicleImageRow) {
    // Optimistic: remove from UI immediately
    setImageRows((prev) => prev.filter((r) => r.id !== row.id))
    if (previewIndex !== null) setPreviewIndex(null)
    try {
      await vehicleMediaService.deleteVehicleImage(row.id, row.path)
    } catch (err) {
      console.error('Delete failed:', err)
      // Rollback on failure
      setImageRows((prev) => [...prev, row])
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

  function handleSetCover(row: VehicleImageRow) {
    const items = byCategory['vehicle'] || []
    const idx = items.findIndex((r) => r.id === row.id)
    if (idx <= 0) return
    handleReorder('vehicle', idx, 0)
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

  function downloadOne(url: string, idx: number) {
    const ext = url.split('.').pop()?.split('?')[0] || 'jpg'
    downloadFile(url, `${vehicle.model}_${vehicle.plate}_${idx + 1}.${ext}`)
  }

  function downloadAll() {
    imageRows.forEach((row, i) => {
      setTimeout(() => downloadOne(row.url, i), i * 300)
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
                    // Store files as array (FileList is live — resets on value='')
                    setExpiryModal({ files: Array.from(e.target.files), category: cat.key })
                    setExpiryDate('')
                    setRegExpiryDate('')
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
                    key={row.id}
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
                    className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded-lg border bg-slate-50 ${
                      cat.key === 'vehicle' && idx === 0 ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200'
                    } ${overIdx?.cat === cat.key && overIdx.idx === idx && dragIdx?.cat === cat.key && dragIdx.idx !== idx ? 'scale-[0.98] border-brand-400' : ''} ${
                      overIdx?.cat === cat.key && overIdx.idx === idx && dragIdx && dragIdx.cat !== cat.key ? 'scale-[0.98] border-violet-400 ring-2 ring-violet-100' : ''}`}
                  >
                    <img src={row.thumbnail || row.url} className="h-full w-full object-cover" draggable={false} loading="lazy" />
                    {/* Top badges */}
                    <div className="absolute left-1 top-1 flex items-center gap-1">
                      <span className="rounded-md bg-slate-900/60 p-0.5 text-white"><GripVertical size={10} /></span>
                      {cat.key === 'vehicle' && idx === 0 && (
                        <span className="flex items-center gap-0.5 rounded-md bg-brand-600 px-1 py-0.5 text-[9px] font-semibold text-white">
                          <Star size={8} /> Hiển thị
                        </span>
                      )}
                      {cat.key === 'song_nung' && row.song_nung_expiry_date && (
                        <span className={`flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[9px] font-semibold text-white ${new Date(row.song_nung_expiry_date) < new Date() ? 'bg-red-600' : 'bg-green-600'}`}>
                          {new Date(row.song_nung_expiry_date) < new Date() ? 'HẾT HẠN' : 'Còn hạn'}
                        </span>
                      )}
                    </div>
                    {/* Hover controls */}
                    <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => { setPreviewRows(items); setPreviewIndex(idx) }}
                        className="flex-1 rounded-md bg-white/95 py-0.5 text-[9px] font-medium text-slate-700 shadow-sm">
                        Xem
                      </button>
                      {cat.key === 'vehicle' && idx !== 0 && (
                        <button onClick={() => handleSetCover(row)}
                          className="rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-medium text-brand-700 shadow-sm">
                          Ảnh đại diện
                        </button>
                      )}
                      {cat.key === 'song_nung' && (
                        <button onClick={() => { setEditingExpiry(row); setEditExpiryDate(row.song_nung_expiry_date || ''); }}
                          className="rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 shadow-sm">
                          Hạn
                        </button>
                      )}
                      <button onClick={() => downloadOne(row.url, idx)}
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
                          Hạn: {new Date(row.song_nung_expiry_date).toLocaleDateString('vi-VN')}
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

      {/* Preview Modal */}
      {previewIndex !== null && previewRows[previewIndex] && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setPreviewIndex(null)}>
          <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <button onClick={() => setPreviewIndex(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <X size={20} />
              </button>
              <span className="text-sm font-medium">{vehicle.plate} — {vehicle.model}</span>
            </div>
            <div className="flex items-center gap-3">
              {previewRows.length > 1 && <span className="text-xs text-white/60">{previewIndex + 1}/{previewRows.length}</span>}
              <button onClick={() => downloadOne(previewRows[previewIndex].url, previewIndex)}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors" title="Tải ảnh">
                <Download size={14} /> Tải ảnh
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-2" onClick={(e) => e.stopPropagation()}>
            <img src={previewRows[previewIndex].url} className="max-h-full max-w-full object-contain select-none" draggable={false} />
          </div>
          {previewRows.length > 1 && (
            <div className="flex shrink-0 items-center justify-center gap-6 px-4 py-4" onClick={(e) => e.stopPropagation()}>
              <button disabled={previewIndex === 0} onClick={() => setPreviewIndex(previewIndex - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30">
                <ChevronLeft size={22} />
              </button>
              <span className="text-sm text-white/80">{previewIndex + 1}/{previewRows.length}</span>
              <button disabled={previewIndex >= previewRows.length - 1} onClick={() => setPreviewIndex(previewIndex + 1)}
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
                    await handleUpload(expiryModal.files, expiryModal.category, expiryDate || null)
                    // Update vehicle-level expiry dates
                    if (vehicle?.id) {
                      const patch: Partial<Vehicle> = {}
                      if (expiryDate) patch.songNungExpiryDate = expiryDate
                      if (regExpiryDate) patch.registrationExpiryDate = regExpiryDate
                      if (Object.keys(patch).length > 0) {
                        useStore.getState().updateVehicle(vehicle.id, patch)
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
                    await vehicleMediaService.updateVehicleImageExpiry(editingExpiry.id, editExpiryDate || null)
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
