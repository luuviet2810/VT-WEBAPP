import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Car, RotateCcw } from 'lucide-react'
import { getAllPublicImages, getPublicVehicles, type PublicVehicle, type PublicVehicleImage } from '../publicApi'
import BannerCarousel, { type BannerSlide } from '../components/BannerCarousel'
import PublicVehicleFilter, { type PublicVehicleFilterRef } from '../components/PublicVehicleFilter'
import { formatDay, formatKRW, fuelLabel } from '../format'

function VehicleCard({ vehicle: v, cover }: { vehicle: PublicVehicle; cover?: PublicVehicleImage }) {
  const [imgError, setImgError] = useState(false)
  return (
    <Link
      to={`/xe/${v.id}`}
      className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {cover && !imgError ? (
          <img
            src={cover.thumbnail || cover.url}
            alt={v.model}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Car size={36} />
          </div>
        )}
        {v.isComingSoon && (
          <div className="absolute left-1.5 top-1.5 rounded-md bg-amber-500/95 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white shadow-xs backdrop-blur-xs sm:left-2 sm:top-2 sm:rounded-lg sm:px-2 sm:text-[10px]">
            SẮP VỀ
          </div>
        )}
      </div>
      <div className="space-y-0.5 p-1.5 sm:space-y-1 sm:p-3.5">
        {/* Dòng 1: Tên xe (trái, bold, truncate) + Năm (phải, không xuống dòng) */}
        <div className="flex items-center justify-between gap-1">
          <span className="min-w-0 truncate text-xs font-bold text-slate-900 sm:text-base">{v.model}</span>
          {v.year != null && (
            <span className="shrink-0 whitespace-nowrap text-[10px] text-slate-500 sm:text-sm">{v.year}</span>
          )}
        </div>
        {/* Dòng 1.5: Hãng xe — chỉ render khi có brand */}
        {v.brand && (
          <div className="truncate text-[10px] leading-tight text-slate-400 sm:text-sm">{v.brand}</div>
        )}
        {/* Dòng 2: Nhiên liệu (trái) + Km (phải) trên CÙNG hàng */}
        <div className="flex items-baseline justify-between gap-1">
          <span className="min-w-0 truncate text-[10px] text-slate-600 sm:text-sm">
            {fuelLabel(v.fuelType) ?? '—'}
          </span>
          {v.mileage && (
            <span className="shrink-0 whitespace-nowrap text-[10px] text-slate-500 sm:text-sm">
              {v.mileage} vạn
            </span>
          )}
        </div>
        {/* Dòng 3: Giá — formatKRW duy nhất, với xe sắp về luôn là "Liên hệ" */}
        <div className={`break-words text-xs font-bold sm:text-lg ${v.isComingSoon ? 'text-amber-600' : 'text-brand-600'}`}>
          {v.isComingSoon ? 'Liên hệ' : formatKRW(v.sellPrice)}
        </div>
      </div>
    </Link>
  )
}

/**
 * Trang chính Public Web:
 * - Banner carousel
 * - Section 1: "XE ĐANG CÓ" (kèm bộ lọc thông minh độc lập)
 * - Section 2: "XE SẮP VỀ" (hiển thị các xe chuẩn bị về, giá luôn là "Liên hệ")
 */
export default function Home() {
  const [vehicles, setVehicles] = useState<PublicVehicle[] | null>(null)
  const [filteredVehicles, setFilteredVehicles] = useState<PublicVehicle[] | null>(null)
  const [hasActiveFilters, setHasActiveFilters] = useState(false)
  const [images, setImages] = useState<PublicVehicleImage[]>([])
  const [loadError, setLoadError] = useState(false)
  const filterRef = useRef<PublicVehicleFilterRef>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [vs, imgs] = await Promise.all([getPublicVehicles(), getAllPublicImages()])
        if (cancelled) return
        setVehicles(vs)
        // Chỉ khởi tạo filteredVehicles cho danh sách xe đang có (không tính xe sắp về)
        const avail = vs.filter((v) => !v.isComingSoon)
        setFilteredVehicles(avail)
        setImages(imgs)
      } catch (err) {
        console.error('[PublicWeb] Failed to load vehicles:', err)
        if (!cancelled) setLoadError(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Phân loại xe: Xe đang có (Available) vs Xe sắp về (Coming Soon)
  const availableVehicles = useMemo(() => {
    if (!vehicles) return null
    return vehicles.filter((v) => !v.isComingSoon)
  }, [vehicles])

  const upcomingVehicles = useMemo(() => {
    if (!vehicles) return []
    return vehicles.filter((v) => Boolean(v.isComingSoon))
  }, [vehicles])

  const handleFilteredChange = useCallback((filtered: PublicVehicle[], active: boolean) => {
    setFilteredVehicles(filtered)
    setHasActiveFilters(active)
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
    if (!availableVehicles) return []
    return availableVehicles
      .filter((v) => coverByVehicle.has(v.id))
      .slice(0, 8)
      .map((v) => ({ vehicle: v, image: coverByVehicle.get(v.id) }))
  }, [availableVehicles, coverByVehicle])

  const lastUpdated = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return null
    return vehicles.reduce((max, v) => (v.updatedAt > max ? v.updatedAt : max), vehicles[0].updatedAt)
  }, [vehicles])

  const displayList = filteredVehicles ?? availableVehicles ?? []

  return (
    <main>
      {/* BANNER */}
      {bannerSlides.length > 0 && <BannerCarousel slides={bannerSlides} />}

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* ======================================================== */}
        {/* SECTION 1: XE ĐANG CÓ (AVAILABLE VEHICLES) */}
        {/* ======================================================== */}
        <section id="available-vehicles">
        {/* BỘ LỌC XE THÔNG MINH (CHỈ ÁP DỤNG CHO XE ĐANG CÓ) */}
        {availableVehicles !== null && !loadError && (
          <PublicVehicleFilter
            ref={filterRef}
            vehicles={availableVehicles}
            onFilteredChange={handleFilteredChange}
            totalCount={availableVehicles.length}
          />
        )}

        {/* TIÊU ĐỀ & SỐ LƯỢNG XE ĐANG CÓ */}
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-extrabold text-slate-900">Xe đang có</h1>
            {availableVehicles !== null && !loadError && (
              <span className="text-xs font-semibold text-brand-600">
                {hasActiveFilters
                  ? `(Tìm thấy ${displayList.length} / ${availableVehicles.length} xe)`
                  : `(${displayList.length} xe)`}
              </span>
            )}
          </div>
          {lastUpdated && (
            <span className="text-xs text-slate-400">Cập nhật: {formatDay(lastUpdated)}</span>
          )}
        </div>

        {/* LỖI TẢI DỮ LIỆU */}
        {loadError && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Chưa tải được danh sách xe. Vui lòng thử lại.
          </div>
        )}

        {/* CHƯA CÓ XE NÀO ĐƯỢC CÔNG KHAI */}
        {!loadError && availableVehicles !== null && availableVehicles.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Car size={32} className="mx-auto text-slate-300" />
            <div className="mt-2 text-sm font-medium text-slate-500">Chưa có xe hiển thị</div>
            <div className="mt-0.5 text-xs text-slate-400">Vui lòng quay lại sau</div>
          </div>
        )}

        {/* LOADING SKELETON */}
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

        {/* EMPTY STATE KHI BỘ LỌC KHÔNG CÓ KẾT QUẢ */}
        {!loadError && availableVehicles !== null && availableVehicles.length > 0 && displayList.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Car size={30} />
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-800">Không tìm thấy xe phù hợp</h3>
            <p className="mt-1 text-xs text-slate-500">
              Rất tiếc, không có xe nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.
            </p>
            <button
              type="button"
              onClick={() => filterRef.current?.reset()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-600 active:scale-95"
            >
              <RotateCcw size={14} />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        )}

        {/* CATALOGUE XE ĐANG CÓ (3 CỘT) */}
        {!loadError && displayList.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {displayList.map((v) => (
              <VehicleCard key={v.id} vehicle={v} cover={coverByVehicle.get(v.id)} />
            ))}
          </div>
        )}
        </section>

        {/* ======================================================== */}
        {/* SECTION 2: XE SẮP VỀ (UPCOMING / COMING SOON VEHICLES) */}
        {/* ======================================================== */}
        {!loadError && upcomingVehicles.length > 0 && (
          <section id="upcoming-vehicles" className="mt-12 border-t border-slate-200/80 pt-8">
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">XE SẮP VỀ</h2>
                <span className="text-xs font-semibold text-amber-600">
                  ({upcomingVehicles.length} xe)
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Những mẫu xe đang chuẩn bị về VT AUTO. Liên hệ với chúng tôi để được tư vấn và cập nhật lịch xe về.
              </p>
            </div>

            {/* CATALOGUE XE SẮP VỀ (3 CỘT) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {upcomingVehicles.map((v) => (
                <VehicleCard key={v.id} vehicle={v} cover={coverByVehicle.get(v.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
