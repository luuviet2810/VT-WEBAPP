import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car } from 'lucide-react'
import { getAllPublicImages, getPublicVehicles, type PublicVehicle, type PublicVehicleImage } from '../publicApi'
import BannerCarousel, { type BannerSlide } from '../components/BannerCarousel'
import { formatDay, formatKRW, fuelLabel, mileageLabel } from '../format'

/**
 * Trang chính Public Web: Banner carousel + danh sách "Xe đang có".
 * Dữ liệu: public_vehicles + public_vehicle_images (READ-ONLY).
 */
export default function Home() {
  const [vehicles, setVehicles] = useState<PublicVehicle[] | null>(null)
  const [images, setImages] = useState<PublicVehicleImage[]>([])
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // 2 query cho TOÀN BỘ trang: danh sách xe + ảnh website (đã sort)
        const [vs, imgs] = await Promise.all([getPublicVehicles(), getAllPublicImages()])
        if (cancelled) return
        setVehicles(vs)
        setImages(imgs)
      } catch (err) {
        console.error('[PublicWeb] Failed to load vehicles:', err)
        if (!cancelled) setLoadError(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Ảnh đầu tiên (sort_order nhỏ nhất) của mỗi xe = ảnh đại diện website
  const coverByVehicle = useMemo(() => {
    const map = new Map<string, PublicVehicleImage>()
    for (const img of images) {
      if (!map.has(img.vehicleId)) map.set(img.vehicleId, img)
    }
    return map
  }, [images])

  const bannerSlides: BannerSlide[] = useMemo(() => {
    if (!vehicles) return []
    return vehicles
      .filter((v) => coverByVehicle.has(v.id))
      .slice(0, 8)
      .map((v) => ({ vehicle: v, image: coverByVehicle.get(v.id) }))
  }, [vehicles, coverByVehicle])

  const lastUpdated = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return null
    return vehicles.reduce((max, v) => (v.updatedAt > max ? v.updatedAt : max), vehicles[0].updatedAt)
  }, [vehicles])

  return (
    <main>
      {/* BANNER */}
      {bannerSlides.length > 0 && <BannerCarousel slides={bannerSlides} />}

      {/* DANH SÁCH XE */}
      <section className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h1 className="text-xl font-extrabold text-slate-900">Xe đang có</h1>
          {lastUpdated && (
            <span className="text-xs text-slate-400">Cập nhật: {formatDay(lastUpdated)}</span>
          )}
        </div>

        {loadError && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Chưa tải được danh sách xe. Vui lòng thử lại.
          </div>
        )}

        {!loadError && vehicles !== null && vehicles.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Car size={32} className="mx-auto text-slate-300" />
            <div className="mt-2 text-sm font-medium text-slate-500">Chưa có xe hiển thị</div>
            <div className="mt-0.5 text-xs text-slate-400">Vui lòng quay lại sau</div>
          </div>
        )}

        {vehicles === null && !loadError && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="aspect-[4/3] w-full animate-pulse bg-slate-100" />
                <div className="space-y-2 p-3.5">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(vehicles ?? []).map((v) => {
            const cover = coverByVehicle.get(v.id)
            return (
              <Link
                key={v.id}
                to={`/xe/${v.id}`}
                className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform active:scale-[0.99]"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {cover ? (
                    <img
                      src={cover.thumbnail || cover.url}
                      alt={v.model}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Car size={36} />
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-3.5">
                  {/* Dòng 1: Tên xe — Năm */}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-base font-bold text-slate-900">{v.model}</span>
                    {v.year != null && <span className="shrink-0 text-sm font-medium text-slate-500">{v.year}</span>}
                  </div>
                  {/* Dòng 2: Hãng xe */}
                  <div className="text-sm text-slate-500">{v.brand || ' '}</div>
                  {/* Dòng 3: Nhiên liệu — số km */}
                  <div className="flex items-baseline justify-between gap-2 text-sm text-slate-600">
                    <span>{fuelLabel(v.fuelType) ?? ' '}</span>
                    <span className="shrink-0 text-slate-500">{mileageLabel(v.mileage) ?? ''}</span>
                  </div>
                  {/* Dòng 4: Giá */}
                  <div className="pt-1 text-lg font-extrabold text-brand-600">{formatKRW(v.sellPrice)}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
