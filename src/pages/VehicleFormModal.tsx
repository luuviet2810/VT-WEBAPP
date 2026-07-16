import { useEffect, useState } from 'react'
import { Badge } from '../components/ui'
import VehicleDetailTabs, { VEHICLE_DETAIL_TABS } from '../components/VehicleDetailTabs'
import { useStore } from '../store/useStore'
import { useIsAdminMode } from '../hooks/useAuthRole'
import { FuelType, VehicleStatus } from '../types'

export const DISPLACEMENT_OPTIONS = ['1.0L', '1.4L', '1.6L', '1.8L', '2.0L', '2.2L', '2.4L', '3.0L', '3.3L']

export default function VehicleFormModal({
  open,
  onClose,
  editVehicleId = null,
}: {
  open: boolean
  onClose: () => void
  editVehicleId?: string | null
}) {
  const addVehicle = useStore((s) => s.addVehicle)
  const vehicles = useStore((s) => s.vehicles)
  const positions = useStore((s) => s.positions)
  const isAdmin = useIsAdminMode()

  const [tab, setTab] = useState('info')
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const vehicle = vehicles.find((v) => v.id === vehicleId) || null

  const [form, setForm] = useState({
    plate: '',
    model: '',
    year: '',
    fuelType: '' as FuelType | '',
    displacement: '',
    mileage: '',
    color: '',
    costPrice: '',
    sellPrice: '',
    status: 'available' as VehicleStatus,
    positionId: '',
    note: '',
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function reset() {
    setForm({
      plate: '',
      model: '',
      year: '',
      fuelType: '',
      displacement: '',
      mileage: '',
      color: '',
      costPrice: '',
      sellPrice: '',
      status: 'available',
      positionId: '',
      note: '',
    })
    setVehicleId(null)
    setTab('info')
  }

  function handleClose() {
    reset()
    onClose()
  }

  useEffect(() => {
    if (!open) return
    if (editVehicleId) {
      const v = vehicles.find((item) => item.id === editVehicleId)
      if (v) {
        setVehicleId(v.id)
        setForm({
          plate: v.plate,
          model: v.model,
          year: v.year?.toString() ?? '',
          fuelType: v.fuelType ?? '',
          displacement: v.displacement ? (v.displacement.includes('L') ? v.displacement : `${v.displacement}L`) : '',
          mileage: v.mileage ?? '',
          color: v.color ?? '',
          costPrice: v.costPrice?.toString() ?? '',
          sellPrice: v.sellPrice?.toString() ?? '',
          status: v.status,
          positionId: v.positionId ?? '',
          note: v.note ?? '',
        })
      }
    } else {
      reset()
    }
  }, [open, editVehicleId])

  async function handleSave() {
    if (!form.plate.trim() || !form.model.trim()) return
    const data = {
      plate: form.plate.trim(),
      model: form.model.trim(),
      year: form.year ? Number(form.year) : undefined,
      fuelType: (form.fuelType as FuelType) || undefined,
      displacement: form.displacement.replace(/L$/, '') || undefined,
      mileage: form.mileage || undefined,
      color: form.color || undefined,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      sellPrice: form.sellPrice ? Number(form.sellPrice) : undefined,
      status: form.status,
      positionId: form.positionId || '00000000-0000-0000-0000-000000000001',
      note: form.note || undefined,
    }
    if (vehicleId) {
      useStore.getState().updateVehicle(vehicleId, data)
      setTab('photos')
    } else {
      const created = await addVehicle(data)
      if (created?.id) {
        setVehicleId(created.id)
      }
      setTab('photos')
    }
  }

  const isEditing = Boolean(editVehicleId)

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${open ? '' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">{isEditing ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h2>
            <Badge tone="slate">
              {form.status === 'available' ? 'Chưa bán' : form.status === 'deposited' ? 'Đã cọc' : 'Đã bán'}
            </Badge>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            ✕
          </button>
        </div>

        {vehicle ? (
          /* Existing vehicle — use unified tabs */
          <>
            <VehicleDetailTabs vehicle={vehicle} tab={tab} onTabChange={setTab} />
          </>
        ) : (
          /* New vehicle — show create form */
          <>
            <div className="bg-white pb-3">
              <div className="flex gap-2 border-b border-slate-100">
                {VEHICLE_DETAIL_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => t.key === 'info' && setTab('info')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                      tab === t.key && t.key === 'info'
                        ? 'border-b-2 border-brand-500 text-brand-600'
                        : 'cursor-not-allowed text-slate-300'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Biển số (4 số cuối) *</label>
                  <input className="input" placeholder="VD: 4567" maxLength={4} value={form.plate} onChange={(e) => set('plate', e.target.value)} />
                </div>
                <div>
                  <label className="label">Dòng xe *</label>
                  <input className="input" placeholder="VD: Kia K5" value={form.model} onChange={(e) => set('model', e.target.value)} />
                </div>
                <div>
                  <label className="label">Năm</label>
                  <input className="input" placeholder="VD: 2020" value={form.year} onChange={(e) => set('year', e.target.value)} />
                </div>
                <div>
                  <label className="label">Nhiên liệu</label>
                  <select className="input" value={form.fuelType} onChange={(e) => set('fuelType', e.target.value as FuelType | '')}>
                    <option value="">Chọn...</option>
                    <option value="gasoline">Xăng</option>
                    <option value="diesel">Dầu</option>
                    <option value="lpg">LPG</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="label">Dung tích (L)</label>
                  <select className="input" value={form.displacement} onChange={(e) => set('displacement', e.target.value)}>
                    <option value="">Chọn...</option>
                    {DISPLACEMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Đã chạy (vạn km)</label>
                  <input className="input" placeholder="VD: 12" value={form.mileage} onChange={(e) => set('mileage', e.target.value)} />
                </div>
                <div>
                  <label className="label">Màu xe</label>
                  <select className="input" value={form.color} onChange={(e) => set('color', e.target.value)}>
                    <option value="">Chọn...</option>
                    {['Trắng', 'Đen', 'Bạc', 'Xám', 'Đỏ', 'Xanh'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {isAdmin && (
                  <div>
                    <label className="label">Giá nhập</label>
                    <input className="input" placeholder="VNĐ" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="label">Giá bán</label>
                  <input className="input" placeholder="VNĐ" value={form.sellPrice} onChange={(e) => set('sellPrice', e.target.value)} />
                </div>
                <div>
                  <label className="label">Tình trạng</label>
                  <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as VehicleStatus)}>
                    <option value="available">Chưa bán</option>
                    <option value="deposited">Đã cọc</option>
                    <option value="sold">Đã bán</option>
                  </select>
                </div>
                <div>
                  <label className="label">Vị trí xe</label>
                  <select className="input" value={form.positionId} onChange={(e) => set('positionId', e.target.value)}>
                    <option value="">— Chưa phân bổ —</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="label">Ghi chú</label>
                <textarea className="input" rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
              </div>
              <button className="btn-primary mt-5 w-full" onClick={handleSave}>
                {isEditing ? 'Lưu & chuyển sang Ảnh' : 'Tạo xe & chuyển sang Ảnh'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
