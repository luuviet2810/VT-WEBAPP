import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Globe2, GripVertical, Image as ImageIcon, Monitor, RefreshCw, Smartphone, X } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../store/useStore'
import WebsiteSettingsEditor from '../components/WebsiteSettingsEditor'
import * as publicWebService from '../services/publicWeb.service'
import type { VehicleImageRow } from '../services/vehicleMedia.service'
import { formatKRW, mileageLabel } from '../public/format'
import type { Vehicle } from '../types'

/**
 * PRE-WEB — Phase 2.
 *  ① Preview: Public Web THẬT qua iframe (Mobile/Desktop, Làm mới, Mở website)
 *  ② Quản lý xe trên website: bật/tắt is_public, kéo-thả public_sort_order,
 *     xem/đổi ảnh đại diện nhóm 'website'. Lưu ngay vào DB, toast xác nhận.
 * Mutation giới hạn: vehicles.is_public, vehicles.public_sort_order
 * (qua store.updateVehicle) và vehicle_images.sort_order (publicWeb.service).
 */
const PUBLIC_WEB_URL =
  import.meta.env.VITE_PUBLIC_WEB_URL || 'https://vtautocustomer.vercel.app'

type Device = 'mobile' | 'desktop'
type ListTab = 'visible' | 'hidden'

const ORDER_TAIL = Number.MAX_SAFE_INTEGER

// ====== Toast (pattern hiện có của project) ======
function useToast() {
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((kind: 'success' | 'error', text: string) => {
    setToast({ kind, text })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  return { toast, showToast }
}

// ====== Ảnh đại diện website (ảnh đầu nhóm 'website') ======
function WebsiteCover({ images, size = 'md' }: { images?: VehicleImageRow[]; size?: 'md' | 'lg' }) {
  const cover = images?.[0]
  const cls = size === 'md' ? 'h-14 w-20' : 'h-20 w-28'
  if (!cover) {
    return (
      <div className={`${cls} flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400`}>
        <ImageIcon size={16} />
        <span className="px-1 text-center text-[9px] leading-tight">Chưa có ảnh website</span>
      </div>
    )
  }
  return (
    <img
      src={cover.thumbnail || cover.url}
      alt=""
      className={`${cls} shrink-0 rounded-lg object-cover`}
      loading="lazy"
      decoding="async"
    />
  )
}

// ====== Row kéo-thả được (chỉ tab "Đang hiển thị") ======
function SortableVehicleRow({
  vehicle: v,
  images,
  onToggle,
  onOpenCover,
}: {
  vehicle: Vehicle
  images?: VehicleImageRow[]
  onToggle: (id: string) => void
  onOpenCover: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: v.id })
  return (
    <VehicleRowInner
      vehicle={v}
      images={images}
      onToggle={onToggle}
      onOpenCover={onOpenCover}
      dragProps={{ attributes, listeners, setNodeRef, transform, transition, isDragging }}
    />
  )
}

function VehicleRowInner({
  vehicle: v,
  images,
  onToggle,
  onOpenCover,
  dragProps,
}: {
  vehicle: Vehicle
  images?: VehicleImageRow[]
  onToggle: (id: string) => void
  onOpenCover: (id: string) => void
  dragProps?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listeners: any
    setNodeRef: (el: HTMLElement | null) => void
    transform: { x: number; y: number; scaleX: number; scaleY: number } | null
    transition: string | undefined
    isDragging: boolean
  }
}) {
  const style = dragProps?.transform
    ? { transform: CSS.Translate.toString(dragProps.transform), transition: dragProps.transition }
    : undefined
  return (
    <div
      ref={dragProps?.setNodeRef}
      style={style}
      className={`flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:gap-3 ${
        dragProps?.isDragging ? 'z-10 border-brand-400 shadow-lg' : ''
      }`}
    >
      {dragProps && (
        <button
          type="button"
          {...dragProps.attributes}
          {...dragProps.listeners}
          aria-label="Kéo để sắp xếp thứ tự trên website"
          className="shrink-0 cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </button>
      )}

      <WebsiteCover images={images} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-bold text-slate-900">{v.model}</span>
          {v.year != null && <span className="shrink-0 text-xs font-medium text-slate-500">{v.year}</span>}
        </div>
        <div className="truncate text-xs font-semibold text-brand-600">{v.plate || 'Chưa có biển số'}</div>
        {v.brand && <div className="truncate text-xs text-slate-500">{v.brand}</div>}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-600">
          {mileageLabel(v.mileage) && <span>{mileageLabel(v.mileage)}</span>}
          <span className="font-semibold text-brand-600">{formatKRW(v.sellPrice)}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {/* Switch is_public */}
        <button
          type="button"
          role="switch"
          aria-checked={!!v.isPublic}
          aria-label="Hiển thị trên website"
          title={v.isPublic ? 'Đang hiển thị trên website' : 'Ẩn khỏi website'}
          onClick={() => onToggle(v.id)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${v.isPublic ? 'bg-green-500' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${v.isPublic ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenCover(v.id)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600"
          >
            Ảnh đại diện
          </button>
          {v.isPublic && (
            <a
              href={`${PUBLIC_WEB_URL}/xe/${v.id}`}
              target="_blank"
              rel="noreferrer"
              title="Xem trên website"
              className="rounded-lg border border-slate-200 p-1 text-slate-500 hover:border-brand-300 hover:text-brand-600"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ====== Modal chọn ảnh đại diện website ======
function CoverPickerModal({
  vehicle,
  images,
  onClose,
  onPick,
}: {
  vehicle: Vehicle
  images: VehicleImageRow[]
  onClose: () => void
  onPick: (imageId: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Ảnh đại diện website</h3>
            <p className="mt-0.5 text-xs text-slate-500">{vehicle.model} — chọn ảnh làm ảnh đầu tiên (giữ nguyên các ảnh khác)</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto p-4">
          {images.length === 0 && (
            <div className="col-span-3 py-8 text-center text-sm text-slate-400">
              Xe chưa có ảnh nào trong nhóm "Ảnh trên website".
            </div>
          )}
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                try {
                  await onPick(img.id)
                } finally {
                  setSaving(false)
                }
              }}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-colors ${
                idx === 0 ? 'border-brand-500' : 'border-transparent hover:border-brand-300'
              }`}
              title={idx === 0 ? 'Ảnh đại diện hiện tại' : 'Chọn làm ảnh đại diện'}
            >
              <img src={img.thumbnail || img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              {idx === 0 && (
                <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">Hiện tại</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ====== PAGE ======
export default function PreWeb() {
  const vehicles = useStore((s) => s.vehicles)
  const updateVehicle = useStore((s) => s.updateVehicle)
  const { toast, showToast } = useToast()

  const [device, setDevice] = useState<Device>('mobile')
  const [previewKey, setPreviewKey] = useState(0)
  const [tab, setTab] = useState<ListTab>('visible')
  const [covers, setCovers] = useState<Record<string, VehicleImageRow[]>>({})
  const [coverVehicleId, setCoverVehicleId] = useState<string | null>(null)

  // Ảnh website gộp theo xe — 1 query khi mở trang
  useEffect(() => {
    let cancelled = false
    publicWebService
      .getWebsiteImagesGrouped()
      .then((map) => { if (!cancelled) setCovers(map) })
      .catch((err) => console.error('[PreWeb] Failed to load website images:', err))
    return () => { cancelled = true }
  }, [])

  // Chỉ xe CÒN HÀNG (status 'available') được quản lý ở Pre-Web.
  // Xe sold / deposited KHÔNG xuất hiện ở cả hai tab (dữ liệu giữ nguyên).
  const inStock = useMemo(() => vehicles.filter((v) => v.status === 'available'), [vehicles])
  const visible = useMemo(
    () =>
      inStock
        .filter((v) => v.isPublic)
        .sort((a, b) => (a.publicSortOrder ?? ORDER_TAIL) - (b.publicSortOrder ?? ORDER_TAIL)),
    [inStock]
  )
  const hiddenList = useMemo(
    () => inStock.filter((v) => !v.isPublic).sort((a, b) => (a.model || '').localeCompare(b.model || '')),
    [inStock]
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // ====== Mutations ======

  // Re-number public_sort_order liên tục 1..N cho xe còn hàng + đang public
  // (loại trừ excludeId). Không để khoảng số sau OFF / drag.
  const renumberVisible = useCallback(async (excludeId?: string) => {
    const list = useStore
      .getState()
      .vehicles.filter((v) => v.status === 'available' && v.isPublic && v.id !== excludeId)
      .sort((a, b) => (a.publicSortOrder ?? ORDER_TAIL) - (b.publicSortOrder ?? ORDER_TAIL))
    const updates = list
      .map((v, i) => ({ id: v.id, order: i + 1, current: v.publicSortOrder ?? null }))
      .filter((x) => x.current !== x.order)
    if (updates.length === 0) return
    await Promise.all(updates.map((x) => updateVehicle(x.id, { publicSortOrder: x.order })))
  }, [updateVehicle])

  const handleToggle = useCallback(async (id: string) => {
    const v = useStore.getState().vehicles.find((x) => x.id === id)
    if (!v) return
    const next = !v.isPublic
    try {
      await updateVehicle(id, { isPublic: next })
      const after = useStore.getState().vehicles.find((x) => x.id === id)
      if (after?.isPublic === next) {
        if (!next) {
          // OFF: các xe còn lại được re-number liên tục 1..N
          await renumberVisible(id)
        }
        // ON: giữ public_sort_order cũ; NULL → tự xuống cuối (view NULLS LAST)
        showToast('success', 'Đã cập nhật website')
      } else {
        showToast('error', 'Không thể cập nhật — dữ liệu chưa thay đổi')
      }
    } catch (err) {
      console.error('[PreWeb] toggle is_public failed:', err)
      showToast('error', 'Không thể cập nhật — dữ liệu chưa thay đổi')
    }
  }, [updateVehicle, renumberVisible, showToast])

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = visible.findIndex((v) => v.id === active.id)
    const newIndex = visible.findIndex((v) => v.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(visible, oldIndex, newIndex)
    // Re-number TOÀN BỘ danh sách đang public: index + 1, không khoảng số
    const updates = next
      .map((v, i) => ({ id: v.id, order: i + 1, current: v.publicSortOrder ?? null }))
      .filter((x) => x.current !== x.order)
    if (updates.length === 0) return
    Promise.all(updates.map((x) => updateVehicle(x.id, { publicSortOrder: x.order })))
      .then(() => showToast('success', 'Đã cập nhật website'))
      .catch((err) => {
        console.error('[PreWeb] reorder failed:', err)
        showToast('error', 'Không thể cập nhật — dữ liệu chưa thay đổi')
      })
  }

  async function refreshCovers() {
    try {
      setCovers(await publicWebService.getWebsiteImagesGrouped())
    } catch (err) {
      console.error('[PreWeb] refresh covers failed:', err)
    }
  }

  const coverVehicle = coverVehicleId ? vehicles.find((v) => v.id === coverVehicleId) ?? null : null

  return (
    <div className="pb-6">
      {/* ===== Header ===== */}
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Globe2 size={22} className="text-brand-600" /> PRE-WEB
        </h1>
        <p className="mt-1 text-sm text-slate-500">Xem trước website khách hàng bằng dữ liệu thật.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ===== ② QUẢN LÝ XE — trái trên desktop, dưới preview trên mobile ===== */}
        <section className="order-2 lg:order-1">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Quản lý xe trên website</h2>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setTab('visible')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${tab === 'visible' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Đang hiển thị ({visible.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('hidden')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${tab === 'hidden' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Đang ẩn ({hiddenList.length})
              </button>
            </div>
          </div>

          {tab === 'visible' ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visible.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {visible.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
                      Chưa có xe nào hiển thị trên website.
                    </div>
                  )}
                  {visible.map((v) => (
                    <SortableVehicleRow key={v.id} vehicle={v} images={covers[v.id]} onToggle={handleToggle} onOpenCover={setCoverVehicleId} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-2">
              {hiddenList.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
                  Không có xe nào đang ẩn.
                </div>
              )}
              {hiddenList.map((v) => (
                <VehicleRowInner key={v.id} vehicle={v} images={covers[v.id]} onToggle={handleToggle} onOpenCover={setCoverVehicleId} />
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">
            Kéo-thả để đổi thứ tự hiển thị trên website · Bật/tắt ẩn xe khỏi website mà không xoá dữ liệu.
          </p>
        </section>

        {/* ===== ① PREVIEW — phải trên desktop, đầu tiên trên mobile ===== */}
        <section className="order-1 lg:order-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Preview website</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setDevice('mobile')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${device === 'mobile' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Smartphone size={13} /> Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setDevice('desktop')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${device === 'desktop' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Monitor size={13} /> Desktop
                </button>
              </div>
              <button type="button" className="btn-secondary flex items-center gap-1.5" onClick={() => setPreviewKey((k) => k + 1)} title="Tải lại preview">
                <RefreshCw size={14} /> Làm mới
              </button>
              <a className="btn-primary flex items-center gap-1.5" href={PUBLIC_WEB_URL} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> Mở website
              </a>
            </div>
          </div>

          <div className="flex justify-center rounded-2xl bg-slate-100 p-4">
            {device === 'mobile' ? (
              <div className="max-w-full rounded-[2.2rem] border-[6px] border-slate-800 bg-slate-800 shadow-2xl">
                <div className="overflow-hidden rounded-[1.8rem] bg-white" style={{ width: 390, height: 760, maxWidth: 'calc(100vw - 60px)' }}>
                  <iframe key={previewKey} src={PUBLIC_WEB_URL} title="Preview website khách hàng (mobile)" className="h-full w-full border-0" />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[1200px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl" style={{ height: 760 }}>
                <iframe key={previewKey} src={PUBLIC_WEB_URL} title="Preview website khách hàng (desktop)" className="h-full w-full border-0" />
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ===== Thông tin website (Footer/Bubble của Public Web) ===== */}
      <div className="mt-6">
        <WebsiteSettingsEditor />
      </div>

      {/* ===== Modal đổi ảnh đại diện ===== */}
      {coverVehicle && (
        <CoverPickerModal
          vehicle={coverVehicle}
          images={covers[coverVehicle.id] ?? []}
          onClose={() => setCoverVehicleId(null)}
          onPick={async (imageId) => {
            try {
              await publicWebService.setWebsiteCover(coverVehicle.id, imageId)
              await refreshCovers()
              showToast('success', 'Đã cập nhật website')
            } catch (err) {
              console.error('[PreWeb] set cover failed:', err)
              showToast('error', 'Không thể cập nhật — dữ liệu chưa thay đổi')
            }
          }}
        />
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${toast.kind === 'success' ? 'bg-slate-800' : 'bg-red-600'}`}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
