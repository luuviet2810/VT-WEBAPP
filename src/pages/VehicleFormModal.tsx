import { useEffect, useState } from 'react'
import { FileText, Image as ImageIcon, LogIn, LogOut, Info, Download } from 'lucide-react'
import { Modal, Tabs, Badge } from '../components/ui'
import PhotoUploader from '../components/PhotoUploader'
import CheckSheetForm from '../components/CheckSheetForm'
import { useStore } from '../store/useStore'
import { useIsAdminMode } from '../hooks/useAuthRole'
import { FuelType, VehicleStatus } from '../types'

// Download all images as individual files
async function downloadAllImages(
  images: string[],
  model: string,
  plate: string,
  prefix: string = ''
) {
  if (!images || images.length === 0) return

  for (let i = 0; i < images.length; i++) {
    const imageUrl = images[i]
    const index = i + 1
    const fileName = prefix
      ? `Giayto_${model}_${plate}_${index}.jpg`
      : `${model}_${plate}_${index}.jpg`

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Small delay between downloads to avoid browser blocking
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch (error) {
      console.error(`Failed to download ${fileName}:`, error)
    }
  }
}

const TABS = [
  { key: 'info', label: 'Thông tin', icon: <Info size={15} /> },
  { key: 'photos', label: 'Ảnh', icon: <ImageIcon size={15} /> },
  { key: 'checkin', label: 'Đầu vào', icon: <LogIn size={15} /> },
  { key: 'checkout', label: 'Đầu ra', icon: <LogOut size={15} /> },
  { key: 'docs', label: 'Giấy tờ', icon: <FileText size={15} /> },
]

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
  const updateVehicle = useStore((s) => s.updateVehicle)
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
          displacement: v.displacement ?? '',
          mileage: v.mileage ?? '',
          color: v.color ?? '',
          costPrice: v.costPrice?.toString() ?? '',
          sellPrice: v.sellPrice?.toString() ?? '',
          status: v.status,
          positionId: v.positionId ?? '',
          note: v.note ?? '',
        })
        setTab('info')
      }
    } else {
      reset()
    }
  }, [open, editVehicleId])

  async function handleSave() {
    console.log("HANDLE SAVE START");
    if (!form.plate.trim() || !form.model.trim()) return
    const data = {
      plate: form.plate.trim(),
      model: form.model.trim(),
      year: form.year ? Number(form.year) : undefined,
      fuelType: (form.fuelType as FuelType) || undefined,
      displacement: form.displacement || undefined,
      mileage: form.mileage || undefined,
      color: form.color || undefined,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      sellPrice: form.sellPrice ? Number(form.sellPrice) : undefined,
      status: form.status,
      positionId: form.positionId || null,
      note: form.note || undefined,
    }
    console.log("DATA TO SAVE", data);
    if (vehicleId) {
      updateVehicle(vehicleId, data)
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
    <Modal open={open} onClose={handleClose} title={isEditing ? 'Chỉnh sửa xe' : 'Thêm xe mới'} subtitle={<Badge tone="slate">{form.status === 'available' ? 'Chưa bán' : form.status === 'deposited' ? 'Đã cọc' : 'Đã bán'}</Badge>} width="max-w-3xl">
      <div className="-mx-5 bg-white px-5 pb-3">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-2 flex h-full flex-col">
        {tab === 'info' && (
          <div>
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
                  {['1.0L', '1.4L', '1.6L', '2.0L', '2.5L', '3.0L'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
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
                    <option key={c} value={c}>
                      {c}
                    </option>
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
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Ghi chú</label>
              <textarea className="input" rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
            </div>
            <button className="btn-primary mt-5 w-full" onClick={handleSave}>
              {vehicle ? 'Lưu & chuyển sang Ảnh' : 'Tạo xe & chuyển sang Ảnh'}
            </button>
          </div>
        )}

        {tab === 'photos' &&
          (vehicle ? (
            <div className="flex flex-1 flex-col">
              <PhotoUploader
                images={vehicle.images}
                onChange={(images) => updateVehicle(vehicle.id, { images })}
                rightContent={
                  <button
                    className="btn-secondary flex items-center gap-2"
                    onClick={() => downloadAllImages(vehicle.images, vehicle.model, vehicle.plate)}
                    disabled={!vehicle.images || vehicle.images.length === 0}
                    title={!vehicle.images || vehicle.images.length === 0 ? 'Chưa có ảnh để tải' : ''}
                  >
                    <Download size={16} />
                    Tải tất cả
                  </button>
                }
              />
            </div>
          ) : (
            <NeedVehicleHint />
          ))}

        {tab === 'checkin' &&
          (vehicle ? (
            <CheckSheetForm vehicle={vehicle} type="in" onCancel={() => setTab('info')} onSaved={handleClose} />
          ) : (
            <NeedVehicleHint />
          ))}

        {tab === 'checkout' &&
          (vehicle ? (
            <CheckSheetForm vehicle={vehicle} type="out" onCancel={() => setTab('info')} onSaved={handleClose} />
          ) : (
            <NeedVehicleHint />
          ))}

        {tab === 'docs' &&
          (vehicle ? (
            <div className="flex flex-1 flex-col">
              <PhotoUploader
                images={vehicle.documents}
                onChange={(documents) => updateVehicle(vehicle.id, { documents })}
                label="Thêm ảnh / giấy tờ"
                emptyText="Chưa có ảnh"
                rightContent={
                  <button
                    className="btn-secondary flex items-center gap-2"
                    onClick={() => downloadAllImages(vehicle.documents, vehicle.model, vehicle.plate, 'Giayto')}
                    disabled={!vehicle.documents || vehicle.documents.length === 0}
                    title={!vehicle.documents || vehicle.documents.length === 0 ? 'Chưa có ảnh để tải' : ''}
                  >
                    <Download size={16} />
                    Tải tất cả
                  </button>
                }
              />
              <a className="mt-3 inline-block text-sm text-brand-600 hover:underline" href={`#/xe/${vehicle.id}`}>
                Mở chi tiết xe →
              </a>
            </div>
          ) : (
            <NeedVehicleHint />
          ))}
      </div>
    </Modal>
  )
}

function NeedVehicleHint() {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
      Hãy tạo xe ở tab "Thông tin" trước
    </div>
  )
}
