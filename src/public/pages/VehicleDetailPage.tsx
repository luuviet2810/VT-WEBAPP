import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Image as ImageIcon } from 'lucide-react'
import logo from '../../assets/logo-vtauto.png'
import {
  getPublicVehicle,
  getPublicVehicleImages,
  type PublicVehicle,
  type PublicVehicleImage,
} from '../publicApi'
import { getVehicleOptionDefs } from '../../services/vehicleOption.service'
import type { VehicleOptionDef } from '../../types'
import { SITE_CONFIG } from '../contactConfig'
import { formatKRW, fuelLabel, mileageLabel } from '../format'
import Lightbox from '../components/Lightbox'

/**
 * Trang chi tiết xe — Public Web.
 * Header: ← Quay lại danh sách + Logo.
 * Gallery đầu trang (vuốt, 1/N, không crop, click → fullscreen) →
 * Thông tin xe → Option xe (label đọc từ vehicle_option_defs) →
 * "HÌNH ẢNH XE" full width, giữ nguyên tỷ lệ.
 */
export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [vehicle, setVehicle] = useState<PublicVehicle | null>(null)
  const [images, setImages] = useState<PublicVehicleImage[]>([])
  const [defs, setDefs] = useState<VehicleOptionDef[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [galleryIdx, setGalleryIdx] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const [v, imgs] = await Promise.all([
          getPublicVehicle(id!),
          getPublicVehicleImages(id!),
        ])
        if (cancelled) return
        if (!v) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setVehicle(v)
        setImages(imgs)
        setLoading(false)
        // Chỉ tải catalog option khi xe có option được tick
        if (v.options && v.options.length > 0) {
          try {
            const rows = await getVehicleOptionDefs()
            if (!cancelled) setDefs(rows)
          } catch (err) {
            console.error('[PublicWeb] Failed to load option defs:', err)
          }
        }
      } catch (err) {
        console.error('[PublicWeb] Failed to load vehicle:', err)
        if (!cancelled) {
          setNotFound(true)
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  // Chỉ hiển thị option xe THỰC SỰ có — label từ DB, không hard-code
  const selectedOptions = useMemo(() => {
    if (!vehicle?.options?.length || !defs) return []
    const selectedKeys = new Set(vehicle.options)
    const groups: { label: string; items: VehicleOptionDef[] }[] = []
    for (const def of defs) {
      if (!selectedKeys.has(def.key)) continue
      let g = groups.find((x) => x.label === def.groupLabel)
      if (!g) {
        g = { label: def.groupLabel, items: [] }
        groups.push(g)
      }
      g.items.push(def)
    }
    return groups
  }, [vehicle, defs])

  function handleGalleryScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== galleryIdx) setGalleryIdx(i)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2.5">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft size={18} /> Danh sách
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt={SITE_CONFIG.name} className="h-8 w-8 object-contain" />
            <span className="text-sm font-extrabold tracking-wide text-slate-900">{SITE_CONFIG.name}</span>
          </Link>
        </div>
      </header>

      {loading && (
        <div className="flex flex-1 items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      )}

      {notFound && !loading && (
        <div className="mx-auto max-w-3xl flex-1 px-4 py-20 text-center">
          <div className="text-base font-semibold text-slate-700">Xe không tồn tại hoặc đã được bán</div>
          <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
            <ChevronLeft size={16} /> Xem danh sách xe
          </Link>
        </div>
      )}

      {vehicle && !loading && (
        <main className="mx-auto w-full max-w-3xl flex-1">
          {/* ===== GALLERY ĐẦU TRANG — vuốt ngang, không crop, 1/N ===== */}
          {images.length > 0 ? (
            <div className="relative">
              <div
                onScroll={handleGalleryScroll}
                className="flex snap-x snap-mandatory overflow-x-auto bg-slate-50 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {images.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    className="flex min-w-full shrink-0 snap-center items-center justify-center"
                    onClick={() => setLightboxIndex(images.findIndex((x) => x.id === img.id))}
                    aria-label="Xem ảnh lớn"
                  >
                    <img
                      src={img.url}
                      alt={vehicle.model}
                      className="max-h-[60vh] w-auto max-w-full object-contain"
                      loading="eager"
                      decoding="async"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
                {galleryIdx + 1} / {images.length}
              </div>
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center bg-slate-50 text-slate-300">
              <ImageIcon size={40} />
            </div>
          )}

          {/* ===== THÔNG TIN XE ===== */}
          <section className="px-4 py-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-extrabold leading-tight text-slate-900">{vehicle.model}</h1>
              <div className="shrink-0 text-right text-xl font-extrabold text-brand-600">{formatKRW(vehicle.sellPrice)}</div>
            </div>

            <dl className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {[
                { label: 'Hãng xe', value: vehicle.brand || '—' },
                { label: 'Năm sản xuất', value: vehicle.year != null ? String(vehicle.year) : '—' },
                { label: 'Nhiên liệu', value: fuelLabel(vehicle.fuelType) ?? '—' },
                { label: 'Số km', value: mileageLabel(vehicle.mileage) ?? '—' },
                { label: 'Màu sắc', value: vehicle.color || '—' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3">
                  <dt className="text-sm text-slate-500">{row.label}</dt>
                  <dd className="text-sm font-semibold text-slate-800">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ===== OPTION XE (chỉ option đã tick, label từ DB) ===== */}
          {selectedOptions.length > 0 && (
            <section className="px-4 pb-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Trang bị</h2>
              <div className="space-y-3">
                {selectedOptions.map((g) => (
                  <div key={g.label}>
                    <div className="mb-1.5 text-xs font-semibold text-slate-500">{g.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((opt) => (
                        <span
                          key={opt.key}
                          className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700"
                        >
                          <span className="text-brand-500">✓</span> {opt.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== HÌNH ẢNH XE — full width, giữ nguyên tỷ lệ, không crop ===== */}
          {images.length > 0 && (
            <section className="border-t border-slate-100 px-4 py-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Hình ảnh xe</h2>
            </section>
          )}
          <div className="space-y-1 bg-white">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                className="block w-full"
                onClick={() => setLightboxIndex(i)}
                aria-label={`Xem ảnh ${i + 1} toàn màn hình`}
              >
                <img
                  src={img.url}
                  alt={`${vehicle.model} — ảnh ${i + 1}`}
                  className="block h-auto w-full"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </button>
            ))}
          </div>
          <div className="h-6" />
        </main>
      )}

      {/* ===== LIGHTBOX FULLSCREEN ===== */}
      {lightboxIndex !== null && images.length > 0 && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setGalleryIdx}
        />
      )}
    </div>
  )
}
