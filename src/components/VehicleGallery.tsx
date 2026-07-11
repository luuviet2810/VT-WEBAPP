import { useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { Modal, EmptyState } from './ui'
import clsx from 'clsx'

type VehicleGalleryProps = {
  title: string
  images: string[]
  onChange: (images: string[]) => void
  label?: string
  emptyText?: string
  uploaderRightContent?: React.ReactNode
}

export default function VehicleGallery({
  title,
  images,
  onChange,
  label = 'Thêm ảnh',
  emptyText = 'Chưa có ảnh',
  uploaderRightContent,
}: VehicleGalleryProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  function openPreview(index: number) {
    setPreviewIndex(index)
  }

  function closePreview() {
    setPreviewIndex(null)
  }

  function goToPrev() {
    if (previewIndex === null) return
    setPreviewIndex((previewIndex - 1 + images.length) % images.length)
  }

  function goToNext() {
    if (previewIndex === null) return
    setPreviewIndex((previewIndex + 1) % images.length)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200">
          <EmptyState icon={<Expand size={30} />} title={emptyText} subtitle="Ảnh đầu tiên sẽ là ảnh hiển thị" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((src, idx) => (
            <button
              key={`${idx}-${src.slice(0, 24)}`}
              type="button"
              onClick={() => openPreview(idx)}
              className={clsx(
                'group relative aspect-square overflow-hidden rounded-xl border bg-slate-50 transition-transform hover:scale-[1.01]',
                idx === 0 ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200'
              )}
            >
              <img src={src} className="h-full w-full object-cover" draggable={false} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-xs font-medium text-white">Xem trước</span>
              </div>
              {idx === 0 && (
                <span className="absolute left-2 top-2 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Hiển thị
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
      </div>

      <Modal open={previewIndex !== null} onClose={closePreview} title={title} width="max-w-5xl">
        {previewIndex !== null && (
          <div className="flex flex-col gap-3">
            <div className="relative flex items-center justify-center bg-slate-900/5">
              <img
                src={images[previewIndex]}
                className="max-h-[70vh] max-w-full rounded-xl object-contain"
                alt={`${title} ${previewIndex + 1}`}
              />
              <button
                type="button"
                onClick={closePreview}
                className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-slate-700 shadow-sm hover:bg-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={goToPrev}
                className="btn-secondary flex items-center gap-1"
                disabled={images.length <= 1}
              >
                <ChevronLeft size={16} />
                Ảnh trước
              </button>
              <span className="text-sm text-slate-500">
                {previewIndex + 1}/{images.length}
              </span>
              <button
                type="button"
                onClick={goToNext}
                className="btn-secondary flex items-center gap-1"
                disabled={images.length <= 1}
              >
                Ảnh sau
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
