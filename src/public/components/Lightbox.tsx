import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { PublicVehicleImage } from '../publicApi'

/**
 * Lightbox fullscreen — vuốt ngang để xem tiếp (scroll-snap),
 * giữ đúng tỷ lệ ảnh (object-contain, không crop), có nút đóng + counter.
 */
export default function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: PublicVehicleImage[]
  index: number
  onClose: () => void
  onIndexChange: (i: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(index)

  // Mở tại đúng ảnh được click
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollLeft = index * el.clientWidth
    setCurrent(index)
  }, [index])

  // Khoá scroll nền khi lightbox mở
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function handleScroll() {
    const el = ref.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== current) {
      setCurrent(i)
      onIndexChange(i)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/95" role="dialog" aria-modal="true" aria-label="Xem ảnh">
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white">
          <span className="text-sm font-medium">{current + 1} / {images.length}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={22} />
          </button>
        </div>
        <div
          ref={ref}
          onScroll={handleScroll}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img) => (
            <div key={img.id} className="flex min-w-full shrink-0 snap-center items-center justify-center px-2">
              <img
                src={img.url}
                alt=""
                className="max-h-[80vh] max-w-full object-contain select-none"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
