import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, FileImage, Info, ListChecks, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal, Tabs } from '../components/ui'
import PhotoUploader from '../components/PhotoUploader'
import CheckSheetForm from '../components/CheckSheetForm'
import { formatCurrency, formatDateTime } from '../utils/format'
import { VehicleStatus } from '../types'

const TABS = [
  { key: 'info', label: 'Thông tin', icon: <Info size={15} /> },
  { key: 'history', label: 'Lịch sử', icon: <Clock size={15} /> },
  { key: 'checksheet', label: 'Checksheet', icon: <ListChecks size={15} /> },
  { key: 'files', label: 'Giấy tờ & Ảnh', icon: <FileImage size={15} /> },
]

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vehicles = useStore((s) => s.vehicles)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const moveLogs = useStore((s) => s.moveLogs)
  const checkSheets = useStore((s) => s.checkSheets)
  const vehicleTimelines = useStore((s) => s.vehicleTimelines)
  const loadVehicleTimeline = useStore((s) => s.loadVehicleTimeline)
  const updateVehicle = useStore((s) => s.updateVehicle)
  const moveVehicle = useStore((s) => s.moveVehicle)
  const deleteVehicle = useStore((s) => s.deleteVehicle)

  const [tab, setTab] = useState('info')
  const [checkModal, setCheckModal] = useState<'in' | 'out' | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)

  const vehicle = vehicles.find((v) => v.id === id)
  if (!vehicle) {
    return (
      <div className="card">
        <EmptyState title="Không tìm thấy xe" subtitle="Xe có thể đã bị xoá" />
      </div>
    )
  }
  const currentVehicle = vehicle

  const position = positions.find((p) => p.id === currentVehicle.positionId)
  const sheets = checkSheets.filter((c) => c.vehicleId === currentVehicle.id)
  const timeline = vehicleTimelines[currentVehicle.id] || []

  useEffect(() => {
    if (!currentVehicle.id) return
    setTimelineLoading(true)
    loadVehicleTimeline(currentVehicle.id)
      .catch((err) => console.error('🔴 [VehicleDetail] Failed to load timeline:', err))
      .finally(() => setTimelineLoading(false))
  }, [currentVehicle.id, loadVehicleTimeline])

  function handleDelete() {
    if (confirm('Xoá xe này khỏi hệ thống?')) {
      deleteVehicle(currentVehicle.id)
      navigate('/')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{currentVehicle.plate || '—'}</h1>
            <p className="text-sm text-slate-500">{currentVehicle.model}</p>
          </div>
        </div>
        <button onClick={handleDelete} className="btn-danger">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Vị trí hiện tại</div>
          <div className="mt-1 font-semibold text-brand-600">{position ? position.name : 'Chưa phân bổ'}</div>
          <select
            className="input mt-2"
            value={currentVehicle.positionId || ''}
            onChange={(e) => moveVehicle(currentVehicle.id, e.target.value)}
          >
            <option value="">— Chưa phân bổ —</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Người đang xử lý</div>
          <select
            className="input mt-2"
            value={currentVehicle.assigneeId || ''}
            onChange={(e) => updateVehicle(currentVehicle.id, { assigneeId: e.target.value || null })}
          >
            <option value="">— Chưa phân công —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-5">
        {tab === 'info' && (
          <div className="card p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Biển số" value={currentVehicle.plate} onSave={(v) => updateVehicle(currentVehicle.id, { plate: v })} />
              <Field label="Dòng xe" value={currentVehicle.model} onSave={(v) => updateVehicle(currentVehicle.id, { model: v })} />
              <Field
                label="Năm SX"
                value={currentVehicle.year ? String(currentVehicle.year) : ''}
                onSave={(v) => updateVehicle(currentVehicle.id, { year: v ? Number(v) : undefined })}
              />
              <Field label="Màu xe" value={currentVehicle.color || ''} onSave={(v) => updateVehicle(currentVehicle.id, { color: v })} />
              <Field
                label="Giá mua"
                value={currentVehicle.costPrice !== undefined ? String(currentVehicle.costPrice) : ''}
                onSave={(v) => updateVehicle(currentVehicle.id, { costPrice: v ? Number(v) : undefined })}
              />
              <Field
                label="Giá bán"
                value={currentVehicle.sellPrice !== undefined ? String(currentVehicle.sellPrice) : ''}
                onSave={(v) => updateVehicle(currentVehicle.id, { sellPrice: v ? Number(v) : undefined })}
              />
              <div>
                <label className="label">Tình trạng</label>
                <select
                  className="input"
                  value={currentVehicle.status}
                  onChange={(e) => updateVehicle(currentVehicle.id, { status: e.target.value as VehicleStatus })}
                >
                  <option value="available">Chưa bán</option>
                  <option value="deposited">Đã cọc</option>
                  <option value="sold">Đã bán</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Ghi chú</label>
              <textarea
                className="input"
                rows={3}
                defaultValue={currentVehicle.note}
                onBlur={(e) => updateVehicle(currentVehicle.id, { note: e.target.value })}
              />
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="card p-5">
            <div className="mb-3">
              <div className="text-sm font-semibold text-slate-700">Lịch sử</div>
            </div>
            {timelineLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-200 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
                      <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <EmptyState icon={<Clock size={30} />} title="Chưa có lịch sử." />
            ) : (
              <ul className="space-y-0">
                {timeline.map((item) => {
                  const user = item.userId ? employees.find((e) => e.id === item.userId)?.name : undefined

                  const isMoveLog = item.type === 'move_log' && !!item.moveLogId
                  const moveLog = isMoveLog ? moveLogs.find((m) => m.id === item.moveLogId) : undefined
                  const from = moveLog ? positions.find((p) => p.id === moveLog.fromPositionId) : undefined
                  const to = moveLog ? positions.find((p) => p.id === moveLog.toPositionId) : undefined

                  return (
                    <li key={item.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      <div>
                        <div className="text-sm text-slate-700">
                          {isMoveLog ? (
                            <>
                              <span className="font-medium">{from ? from.name : '—'}</span>
                              {' → '}
                              <span className="font-medium text-brand-600">{to ? to.name : '—'}</span>
                            </>
                          ) : (
                            item.title
                          )}
                        </div>
                        {item.description && !isMoveLog && (
                          <div className="text-xs text-slate-500">{item.description}</div>
                        )}
                        <div className="text-xs text-slate-400">
                          {user || 'Không rõ'} • {formatDateTime(item.time)}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {tab === 'checksheet' && (
          <div>
            <div className="mb-4 flex gap-3">
              <button className="btn-secondary" onClick={() => setCheckModal('in')}>
                + Phiếu đầu vào
              </button>
              <button className="btn-secondary" onClick={() => setCheckModal('out')}>
                + Phiếu đầu ra
              </button>
            </div>
            {sheets.length === 0 ? (
              <div className="card">
                <EmptyState icon={<ListChecks size={30} />} title="Chưa có checksheet nào" />
              </div>
            ) : (
              <div className="space-y-3">
                {sheets.map((c) => (
                  <div key={c.id} className="card flex items-center justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={c.type === 'in' ? 'blue' : 'purple'}>{c.type === 'in' ? 'Đầu vào' : 'Đầu ra'}</Badge>
                        <span className="text-sm text-slate-500">{c.checkDate}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Người check: {employees.find((e) => e.id === c.checkerId)?.name || '—'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{formatDateTime(c.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'files' && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Ảnh xe</h3>
              <PhotoUploader images={currentVehicle.images} onChange={(images) => updateVehicle(currentVehicle.id, { images })} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Giấy tờ</h3>
              <PhotoUploader
                images={currentVehicle.documents}
                onChange={(documents) => updateVehicle(currentVehicle.id, { documents })}
                label="Thêm giấy tờ"
              />
            </div>
          </div>
        )}
      </div>

      <Modal
        open={checkModal !== null}
        onClose={() => setCheckModal(null)}
        title={checkModal === 'in' ? 'Phiếu đầu vào' : 'Phiếu đầu ra'}
        subtitle={<span className="text-sm text-slate-400">{currentVehicle.plate} • {currentVehicle.model}</span>}
      >
        {checkModal && (
          <CheckSheetForm vehicle={vehicle} type={checkModal} onCancel={() => setCheckModal(null)} onSaved={() => setCheckModal(null)} />
        )}
      </Modal>
    </div>
  )
}

function Field({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" defaultValue={value} onBlur={(e) => onSave(e.target.value)} />
    </div>
  )
}
