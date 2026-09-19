import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicVehicle, PublicVehicleImage } from '../publicApi'
import { formatKRW, fuelLabel, mileageLabel } from '../format'

export interface BannerSlide {
  vehicle: PublicVehicle
  image?: PublicVehicleImage
}

const AUTOPLAY_MS = 4000

/**
 * Carousel đầu trang — scroll-snap native (vuốt mượt trên mobile),
 * tự chuyển slide, indicator "n / N" + dots. Chỉ nhận xe public
 * (dữ liệu do Home fetch từ public_vehicles).
 */
export default function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const idxRef = useRef(0)
  const [idx, setIdx] = useState(0)
  const n = slides.length

  // Auto-advance
  useEffect(() => {
    if (n < 2) return
    const timer = setInterval(() => {
      const el = ref.current
      if (!el) return
      const next = (idxRef.current + 1) % n
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [n])

  function handleScroll() {
    const el = ref.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== idxRef.current) {
      idxRef.current = i
      setIdx(i)
    }
  }

  if (n === 0) return null

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map(({ vehicle: v, image }) => (
          <Link key={v.id} to={`/xe/${v.id}`} className="relative min-w-full shrink-0 snap-center">
            <div className="relative h-56 w-full overflow-hidden bg-slate-200 sm:h-80">
              {image ? (
                <img
                  src={image.url}
                  alt={v.model}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm">Chưa có ảnh</div>
              )}
              {/* Gradient + info */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-4 pt-10">
                <div className="text-lg font-extrabold text-white drop-shadow">{v.model}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/90">
                  {v.brand && <span className="font-semibold">{v.brand}</span>}
                  {v.year != null && <span>· {v.year}</span>}
                  {fuelLabel(v.fuelType) && <span>· {fuelLabel(v.fuelType)}</span>}
                  {mileageLabel(v.mileage) && <span>· {mileageLabel(v.mileage)}</span>}
                </div>
                <div className="mt-1 text-base font-extrabold text-amber-300">{formatKRW(v.sellPrice)}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Indicator: số lượng slide + dots */}
      {n > 1 && (
        <>
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white">
            {idx + 1} / {n}
          </div>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.vehicle.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: 'smooth' })}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
