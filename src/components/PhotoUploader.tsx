import { GripVertical, ImagePlus, Star, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import clsx from 'clsx'
import { EmptyState } from './ui'
import { uploadVehicleImage } from '../services/storage.service'

const MAX_IMAGES = 20

export default function PhotoUploader({
  images,
  onChange,
  vehicleId,
  label = 'Thêm ảnh',
  emptyText = 'Chưa có ảnh',
  multiple = true,
  rightContent,
}: {
  images: string[]
  onChange: (images: string[]) => void
  vehicleId?: string
  label?: string
  emptyText?: string
  multiple?: boolean
  rightContent?: React.ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || uploading) return
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) return
    const selected = Array.from(files).slice(0, remaining)

    setUploadError(null)
    setUploading(true)
    const uploaded: string[] = []
    try {
      for (const file of selected) {
        const result = await uploadVehicleImage(vehicleId ?? 'temp', file)
        uploaded.push(result.url)
      }
      onChange([...images, ...uploaded])
    } catch (err) {
      console.error('🔴 [PhotoUploader] Upload failed:', err)
      setUploadError('Tải ảnh lên thất bại.')
    } finally {
      setUploading(false)
    }
  }

  function removeAt(idx: number) {
    onChange(images.filter((_, i) => i !== idx))
  }

  function setCover(idx: number) {
    if (idx === 0) return
    const next = [...images]
    const [cover] = next.splice(idx, 1)
    next.unshift(cover)
    onChange(next)
  }

  function reorder(from: number, to: number) {
    if (from === to) return
    const next = [...images]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-primary" disabled={uploading || images.length >= MAX_IMAGES}>
          <ImagePlus size={16} />
          {uploading ? 'Đang tải...' : label}
        </button>
        {rightContent || (
          <span className="text-xs text-slate-400">
            {images.length}/{MAX_IMAGES} ảnh • Kéo thả để sắp xếp
          </span>
        )}
      </div>
      {rightContent && (
        <div className="mb-3 text-right text-xs text-slate-400">
          {images.length}/{MAX_IMAGES} ảnh • Kéo thả để sắp xếp
        </div>
      )}

      {uploadError && <div className="mt-2 text-xs text-red-600">{uploadError}</div>}

      {images.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200">
          <EmptyState icon={<Upload size={30} />} title={emptyText} subtitle="Ảnh đầu tiên sẽ là ảnh hiển thị" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((src, idx) => (
            <div
              key={`${idx}-${src.slice(0, 24)}`}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => {
                e.preventDefault()
                setOverIdx(idx)
              }}
              onDragLeave={() => setOverIdx(null)}
              onDrop={() => {
                if (dragIdx !== null) reorder(dragIdx, idx)
                setDragIdx(null)
                setOverIdx(null)
              }}
              onDragEnd={() => {
                setDragIdx(null)
                setOverIdx(null)
              }}
              className={clsx(
                'group relative aspect-square cursor-grab overflow-hidden rounded-xl border bg-slate-50 active:cursor-grabbing',
                idx === 0 ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200',
                overIdx === idx && dragIdx !== idx && 'scale-[0.98] border-brand-400'
              )}
            >
              <img src={src} className="h-full w-full object-cover" draggable={false} />
              <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
                <span className="rounded-md bg-slate-900/60 p-1 text-white">
                  <GripVertical size={12} />
                </span>
                {idx === 0 && (
                  <span className="flex items-center gap-0.5 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <Star size={10} />
                    Hiển thị
                  </span>
                )}
              </div>
              <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => setCover(idx)}
                    className="flex-1 rounded-lg bg-white/95 py-1 text-[10px] font-medium text-brand-700 shadow-sm"
                  >
                    Làm ảnh hiển thị
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="rounded-lg bg-slate-900/70 p-1.5 text-white"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
