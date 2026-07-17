import { useState, useEffect } from 'react'
import { ArrowLeft, Clock, Download, FileText, Image as ImageIcon, Info, LogIn, LogOut } from 'lucide-react'
import { EmptyState, Tabs } from '../components/ui'
import PhotoUploader from '../components/PhotoUploader'
import CheckSheetForm from '../components/CheckSheetForm'
import { useStore } from '../store/useStore'
import { formatDateTime } from '../utils/format'
import type { Vehicle } from '../types'

interface Props {
  vehicle: Vehicle
  tab: string
  onTabChange: (tab: string) => void
}

export const VEHICLE_DETAIL_TABS = [
  { key: 'info', label: 'Thông tin', icon: <Info size={15} /> },
  { key: 'photos', label: 'Ảnh', icon: <ImageIcon size={15} /> },
  { key: 'checkin', label: 'Đầu vào', icon: <LogIn size={15} /> },
  { key: 'checkout', label: 'Đầu ra', icon: <LogOut size={15} /> },
  { key: 'docs', label: 'Giấy tờ', icon: <FileText size={15} /> },
  { key: 'history', label: 'Lịch sử', icon: <Clock size={15} /> },
]

const DISPLACEMENT_OPTIONS = ['1.0L', '1.4L', '1.6L', '1.8L', '2.0L', '2.2L', '2.4L', '3.0L', '3.3L']

async function downloadAllImages(images: string[], model: string, plate: string, prefix = '') {
  for (let i = 0; i < images.length; i++) {
    const imageUrl = images[i]
    const fileName = prefix
      ? `${prefix}_${model}_${plate}_${i + 1}.jpg`
      : `${model}_${plate}_${i + 1}.jpg`
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
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch {}
  }
}

export default function VehicleDetailTabs({ vehicle, tab, onTabChange }: Props) {
  const updateVehicle = useStore((s) => s.updateVehicle)
  const employees = useStore((s) => s.employees)
  const positions = useStore((s) => s.positions)
  const vehicleTimelines = useStore((s) => s.vehicleTimelines)
  const moveLogs = useStore((s) => s.moveLogs)
  const timeline = vehicleTimelines[vehicle.id] || []

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  function patch(p: Partial<Vehicle>) {
    updateVehicle(vehicle.id, p)
  }

  const infoFields = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="label">Biển số (4 số cuối)</label>
        <input className="input" defaultValue={vehicle.plate} onBlur={(e) => patch({ plate: e.target.value })} />
      </div>
      <div>
        <label className="label">Dòng xe</label>
        <input className="input" defaultValue={vehicle.model} onBlur={(e) => patch({ model: e.target.value })} />
      </div>
      <div>
        <label className="label">Năm</label>
        <input className="input" type="number" placeholder="VD: 2020" defaultValue={vehicle.year ?? ''} onBlur={(e) => patch({ year: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div>
        <label className="label">Nhiên liệu</label>
        <select className="input" defaultValue={vehicle.fuelType ?? ''} onChange={(e) => patch({ fuelType: (e.target.value || undefined) as Vehicle['fuelType'] })}>
          <option value="">Chọn...</option>
          <option value="gasoline">Xăng</option>
          <option value="diesel">Dầu</option>
          <option value="lpg">LPG</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>
      <div>
        <label className="label">Dung tích (L)</label>
        <select className="input" defaultValue={vehicle.displacement ?? ''} onChange={(e) => patch({ displacement: e.target.value || undefined })}>
          <option value="">Chọn...</option>
          {DISPLACEMENT_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Đã chạy (vạn km)</label>
        <input className="input" placeholder="VD: 12" defaultValue={vehicle.mileage ?? ''} onBlur={(e) => patch({ mileage: e.target.value || undefined })} />
      </div>
      <div>
        <label className="label">Màu xe</label>
        <select className="input" defaultValue={vehicle.color ?? ''} onChange={(e) => patch({ color: e.target.value || undefined })}>
          <option value="">Chọn...</option>
          {['Trắng', 'Đen', 'Bạc', 'Xám', 'Đỏ', 'Xanh'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Vị trí xe</label>
        <select className="input" defaultValue={vehicle.positionId ?? ''} onChange={(e) => patch({ positionId: e.target.value || '00000000-0000-0000-0000-000000000001' })}>
          <option value="">— Chưa phân bổ —</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Tình trạng</label>
        <select className="input" defaultValue={vehicle.status} onChange={(e) => patch({ status: e.target.value as Vehicle['status'] })}>
          <option value="available">Chưa bán</option>
          <option value="deposited">Đã cọc</option>
          <option value="sold">Đã bán</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      <div className="bg-white pb-3">
        <Tabs tabs={VEHICLE_DETAIL_TABS} active={tab} onChange={onTabChange} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'info' && (
          <div>
            {infoFields}
            <div className="mt-4">
              <label className="label">Ghi chú</label>
              <textarea className="input" rows={2} defaultValue={vehicle.note ?? ''} onBlur={(e) => patch({ note: e.target.value || undefined })} />
            </div>
          </div>
        )}

        {tab === 'photos' && (
          <div className="flex flex-1 flex-col">
            <PhotoUploader
              images={vehicle.images}
              onChange={(images) => patch({ images })}
              rightContent={
                <button
                  className="btn-secondary flex items-center gap-2"
                  onClick={() => downloadAllImages(vehicle.images, vehicle.model, vehicle.plate)}
                  disabled={!vehicle.images || vehicle.images.length === 0}
                >
                  <Download size={16} /> Tải tất cả
                </button>
              }
            />
          </div>
        )}

        {tab === 'checkin' && (
          isMobile ? (
            <FullscreenSheet title="Đầu vào" vehicle={vehicle} onBack={() => onTabChange('info')}>
              <CheckSheetForm vehicle={vehicle} type="in" onCancel={() => onTabChange('info')} onSaved={() => onTabChange('info')} />
            </FullscreenSheet>
          ) : (
            <CheckSheetForm vehicle={vehicle} type="in" onCancel={() => onTabChange('info')} onSaved={() => {}} />
          )
        )}

        {tab === 'checkout' && (
          isMobile ? (
            <FullscreenSheet title="Đầu ra" vehicle={vehicle} onBack={() => onTabChange('info')}>
              <CheckSheetForm vehicle={vehicle} type="out" onCancel={() => onTabChange('info')} onSaved={() => onTabChange('info')} />
            </FullscreenSheet>
          ) : (
            <CheckSheetForm vehicle={vehicle} type="out" onCancel={() => onTabChange('info')} onSaved={() => {}} />
          )
        )}

        {tab === 'docs' && (
          <div className="flex flex-1 flex-col">
            <PhotoUploader
              images={vehicle.documents}
              onChange={(documents) => patch({ documents })}
              label="Thêm ảnh / giấy tờ"
              emptyText="Chưa có ảnh"
              rightContent={
                <button
                  className="btn-secondary flex items-center gap-2"
                  onClick={() => downloadAllImages(vehicle.documents, vehicle.model, vehicle.plate, 'Giayto')}
                  disabled={!vehicle.documents || vehicle.documents.length === 0}
                >
                  <Download size={16} /> Tải tất cả
                </button>
              }
            />
          </div>
        )}

        {tab === 'history' && (
          <div className="card p-5">
            <div className="mb-3 text-sm font-semibold text-slate-700">Lịch sử</div>
            {timeline.length === 0 ? (
              <EmptyState icon={<Clock size={30} />} title="Chưa có lịch sử." />
            ) : (
              <ul className="space-y-0">
                {timeline.map((item) => {
                  const user = item.userId ? employees.find((e) => e.id === item.userId)?.name : undefined
                  const isMoveLog = item.type === 'move_log' && !!item.moveLogId
                  const moveLog = isMoveLog ? moveLogs.find((m) => m.id === item.moveLogId) : undefined
                  const fromPos = moveLog ? positions.find((p) => p.id === moveLog.fromPositionId) : undefined
                  const toPos = moveLog ? positions.find((p) => p.id === moveLog.toPositionId) : undefined
                  return (
                    <li key={item.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      <div>
                        <div className="text-sm text-slate-700">
                          {isMoveLog ? (
                            <><span className="font-medium">{fromPos ? fromPos.name : '—'}</span> → <span className="font-medium text-brand-600">{toPos ? toPos.name : '—'}</span></>
                          ) : item.title}
                        </div>
                        {item.description && !isMoveLog && <div className="text-xs text-slate-500">{item.description}</div>}
                        <div className="text-xs text-slate-400">{user || 'Không rõ'} • {formatDateTime(item.time)}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Fullscreen sheet for mobile — replaces the inline CheckSheet modal on small screens */
function FullscreenSheet({ title, vehicle, onBack, children }: { title: string; vehicle: Vehicle; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="text-sm font-semibold text-slate-900">{title}</span>
            <span className="ml-2 text-xs text-slate-400">{vehicle.plate} • {vehicle.model}</span>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
