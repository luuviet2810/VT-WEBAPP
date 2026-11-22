import { useState, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Expand, X, Download, Trash2, ImagePlus, Star, GripVertical, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Modal, EmptyState } from './ui'
import clsx from 'clsx'
import { uploadVehicleImage } from '../services/storage.service'

const MAX_IMAGES = 50

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

export default function VehicleGallery({
  title,
  images,
  onChange,
  vehicleId,
}: {
  title: string
  images: string[]
  onChange: (images: string[]) => void
  vehicleId?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [uploading, setUploading] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [multiSelect, setMultiSelect] = useState<Set<number>>(new Set())

  // Deduplicate images to guarantee every image appears only ONCE, excluding accidental thumb strings
  const displayImages = useMemo(() => Array.from(new Set(images.filter((img) => !img || (!img.includes('_thumb_') && !img.includes('/thumb_'))))), [images])

  function openPreview(idx: number) {
    setZoomLevel(1)
    setPreviewIndex(idx)
  }
  function closePreview() {
    setZoomLevel(1)
    setPreviewIndex(null)
  }

  // Upload
  async function handleFiles(files: FileList | null) {
    if (!files || !files.length || uploading) return
    setUploading(true)
    const uploaded: string[] = []
    try {
      for (const file of Array.from(files).slice(0, MAX_IMAGES - images.length)) {
        const result = await uploadVehicleImage(vehicleId ?? 'temp', file)
        uploaded.push(result.url)
      }
      onChange([...images, ...uploaded])
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  // Reorder
  function reorder(from: number, to: number) {
    if (from === to) return
    const next = [...images]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  // Delete
  function removeImage(idx: number) {
    onChange(images.filter((_, i) => i !== idx))
  }

  // Set cover (move to index 0)
  function setAsCover(idx: number) {
    if (idx === 0) return
    reorder(idx, 0)
  }

  // Download helpers
  function downloadOne(url: string, idx: number) {
    const ext = url.split('.').pop()?.split('?')[0] || 'jpg'
    downloadFile(url, `${title}_${idx + 1}.${ext}`)
  }

  function downloadAll() {
    images.forEach((url, i) => {
      setTimeout(() => downloadOne(url, i), i * 300)
    })
  }

  function downloadSelected() {
    multiSelect.forEach((idx) => {
      setTimeout(() => downloadOne(images[idx], idx), 0)
    })
  }

  function toggleSelect(idx: number) {
    setMultiSelect((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }

  // Direction buttons for preview modal
  function goToPrev() { if (previewIndex !== null) setPreviewIndex((previewIndex - 1 + images.length) % images.length) }
  function goToNext() { if (previewIndex !== null) setPreviewIndex((previewIndex + 1) % images.length) }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-primary" disabled={uploading || images.length >= MAX_IMAGES}>
          <ImagePlus size={16} />
          {uploading ? 'Đang tải...' : 'Thêm ảnh'}
        </button>
        {multiSelect.size > 0 && (
          <button type="button" onClick={downloadSelected} className="btn-secondary">
            <Download size={14} /> Tải ({multiSelect.size})
          </button>
        )}
        {images.length > 0 && (
          <>
            <button type="button" onClick={downloadAll} className="btn-secondary">
              <Download size={14} /> Tải tất cả
            </button>
            <span className="text-xs text-slate-400">{images.length}/{MAX_IMAGES} ảnh</span>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
      </div>

      {/* Grid */}
      {displayImages.length === 0 ? (
        <div className="mt-2 rounded-xl border border-dashed py-12 text-center" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <Expand size={32} className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm text-slate-400">{'Chưa có ảnh'}</p>
          <p className="text-xs text-slate-300 mt-0.5">Ảnh đầu tiên sẽ là ảnh hiển thị</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {displayImages.map((src, idx) => (
            <div key={`${idx}-${src.slice(0, 24)}`}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); setOverIdx(idx) }}
              onDragLeave={() => setOverIdx(null)}
              onDrop={() => { if (dragIdx !== null) reorder(dragIdx, idx); setDragIdx(null); setOverIdx(null) }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
              onClick={() => openPreview(idx)}
              className={clsx(
                'group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-slate-50 transition-all',
                idx === 0 ? 'ring-2 ring-blue-400 ring-offset-1' : 'border',
                overIdx === idx && dragIdx !== idx && 'scale-95 ring-2 ring-blue-400',
              )}
              style={{ borderColor: idx === 0 ? 'transparent' : 'rgba(0,0,0,0.06)' }}
            >
              <img src={src} className="h-full w-full object-cover" draggable={false} loading="lazy" />

              {/* Top controls */}
              <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
                <span className="rounded-lg bg-slate-900/60 p-1.5 text-white"><GripVertical size={12} /></span>
                {idx === 0 && (
                  <span className="flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    <Star size={10} /> Hiển thị
                  </span>
                )}
              </div>

              {/* Hover controls */}
              <div
                className="absolute inset-x-1.5 bottom-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button type="button" onClick={() => openPreview(idx)}
                  className="flex-1 rounded-lg bg-white/90 py-1 text-[10px] font-medium text-slate-700 shadow-sm hover:bg-white">
                  Xem
                </button>
                {idx !== 0 && (
                  <button type="button" onClick={() => setAsCover(idx)}
                    className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-medium text-blue-700 shadow-sm hover:bg-white">
                    Ảnh đại diện
                  </button>
                )}
                <button type="button" onClick={() => downloadOne(src, idx)}
                  className="rounded-lg bg-slate-900/70 p-1.5 text-white hover:bg-slate-900">
                  <Download size={12} />
                </button>
                <button type="button" onClick={() => removeImage(idx)}
                  className="rounded-lg bg-red-600/80 p-1.5 text-white hover:bg-red-600">
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Multi-select checkbox */}
              <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <input type="checkbox" checked={multiSelect.has(idx)} onChange={() => toggleSelect(idx)}
                  className="h-4 w-4 rounded border-white/80 bg-white/60 text-blue-600" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Modal open={previewIndex !== null} onClose={closePreview} title={title} width="max-w-5xl">
        {previewIndex !== null && (
          <div className="flex flex-col gap-4">
            <div className="relative flex items-center justify-center bg-slate-900/5 rounded-xl min-h-[300px] overflow-hidden">
              <img
                src={displayImages[previewIndex]}
                className="max-h-[70vh] max-w-full rounded-lg object-contain transition-transform duration-200 select-none"
                style={{
                  transform: `scale(${zoomLevel})`,
                  cursor: zoomLevel > 1 ? 'grab' : 'zoom-in',
                }}
                onClick={() => setZoomLevel((z) => (z > 1 ? 1 : 2))}
                alt={`${title} ${previewIndex + 1}`}
                draggable={false}
              />
              <div className="absolute right-3 top-3 flex items-center gap-1.5 bg-white/90 p-1 rounded-xl shadow-sm">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
                  className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100"
                  title="Phóng to"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
                  className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100"
                  title="Thu nhỏ"
                >
                  <ZoomOut size={16} />
                </button>
                {zoomLevel > 1 && (
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100"
                    title="Về cỡ chuẩn"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={closePreview}
                  className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100"
                  title="Đóng"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setZoomLevel(1); goToPrev(); }}
                className="btn-secondary"
                disabled={displayImages.length <= 1}
              >
                <ChevronLeft size={16} /> Ảnh trước
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{previewIndex + 1}/{displayImages.length}</span>
                <button type="button" onClick={() => downloadOne(displayImages[previewIndex], previewIndex)} className="btn-secondary">
                  <Download size={14} /> Tải
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setZoomLevel(1); goToNext(); }}
                className="btn-secondary"
                disabled={displayImages.length <= 1}
              >
                Ảnh sau <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
