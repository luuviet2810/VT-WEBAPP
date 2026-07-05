import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Edit3, Plus, Trash2, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal } from '../components/ui'
import { formatDateTime } from '../utils/format'

export default function Positions() {
  const positions = useStore((s) => s.positions)
  const vehicles = useStore((s) => s.vehicles)
  const moveLogs = useStore((s) => s.moveLogs)
  const employees = useStore((s) => s.employees)
  const moveVehicle = useStore((s) => s.moveVehicle)
  const addPosition = useStore((s) => s.addPosition)
  const updatePosition = useStore((s) => s.updatePosition)
  const deletePosition = useStore((s) => s.deletePosition)
  const [dragId, setDragId] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [newPosName, setNewPosName] = useState('')
  const [editingPosId, setEditingPosId] = useState<string | null>(null)
  const [editingPosName, setEditingPosName] = useState('')

  const recentLogs = [...moveLogs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 12)

  function handleDrop(positionId: string) {
    if (dragId) moveVehicle(dragId, positionId)
    setDragId(null)
  }

  function handleAddPosition() {
    if (!newPosName.trim()) return
    addPosition(newPosName.trim())
    setNewPosName('')
  }

  function startEditPosition(id: string, name: string) {
    setEditingPosId(id)
    setEditingPosName(name)
  }

  function saveEditPosition() {
    if (!editingPosId || !editingPosName.trim()) return
    updatePosition(editingPosId, { name: editingPosName.trim() })
    setEditingPosId(null)
    setEditingPosName('')
  }

  function handleDeletePosition(id: string) {
    if (!confirm('Xoá vị trí này?')) return
    deletePosition(id)
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vị trí xe</h1>
          <p className="mt-1 text-sm text-slate-500">Kéo thả xe giữa các công đoạn — xe được thêm tại Bảng giá</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => setEditModalOpen(true)}
        >
          <Edit3 size={16} />
          Chỉnh sửa vị trí
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3">
        {positions.map((p) => {
          const posVehicles = vehicles.filter((v) => v.positionId === p.id)
          return (
            <div
              key={p.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(p.id)}
              className="w-64 shrink-0 rounded-2xl border border-slate-200 bg-white p-3 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="truncate text-sm font-semibold text-slate-700">{p.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{posVehicles.length}</span>
              </div>
              <div className="min-h-[90px] space-y-2.5">
                {posVehicles.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">Thả xe vào đây</div>
                )}
                {posVehicles.map((v) => (
                  <Link
                    key={v.id}
                    to={`/xe/${v.id}`}
                    draggable
                    onDragStart={() => setDragId(v.id)}
                    className="flex cursor-grab items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition-all active:cursor-grabbing hover:shadow-md active:scale-98"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {v.images[0] && <img src={v.images[0]} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">{v.plate}</div>
                      <div className="truncate text-xs text-slate-400">{v.model}</div>
                    </div>
                    <Badge tone={v.status === 'sold' ? 'green' : 'slate'}>{v.status === 'sold' ? 'Đã bán' : 'Chưa bán'}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card mt-6 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Clock size={16} className="text-slate-400" />
          Lịch sử di chuyển gần đây
        </div>
        {recentLogs.length === 0 ? (
          <EmptyState title="Chưa có lịch sử di chuyển" />
        ) : (
          <ul className="divide-y divide-slate-50">
            {recentLogs.map((log) => {
              const v = vehicles.find((x) => x.id === log.vehicleId)
              const from = positions.find((p) => p.id === log.fromPositionId)
              const to = positions.find((p) => p.id === log.toPositionId)
              const emp = employees.find((e) => e.id === log.employeeId)
              return (
                <li key={log.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="font-semibold text-slate-800">{v?.plate || '—'}</span>
                    <span className="flex items-center gap-2 text-slate-500">
                      <span className="shrink-0 text-slate-400">{from?.name || '—'}</span>
                      <span className="shrink-0 text-slate-400">→</span>
                      <span className="shrink-0 font-medium text-brand-600">{to?.name || '—'}</span>
                    </span>
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {emp?.name} • {formatDateTime(log.createdAt)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Chỉnh sửa vị trí"
      >
        <div className="space-y-3">
          {positions.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              {editingPosId === p.id ? (
                <>
                  <input
                    className="input flex-1"
                    value={editingPosName}
                    onChange={(e) => setEditingPosName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditPosition()
                      if (e.key === 'Escape') setEditingPosId(null)
                    }}
                    autoFocus
                  />
                  <button className="btn-primary !px-3" onClick={saveEditPosition}>Lưu</button>
                  <button className="btn-secondary !px-3" onClick={() => setEditingPosId(null)}><X size={14} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-slate-700">{p.name}</span>
                  <button
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 active:scale-95"
                    onClick={() => startEditPosition(p.id, p.name)}
                    title="Sửa tên"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 active:scale-95"
                    onClick={() => handleDeletePosition(p.id)}
                    title="Xoá vị trí"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}

          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Thêm vị trí mới</div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Tên vị trí..."
                value={newPosName}
                onChange={(e) => setNewPosName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPosition()}
              />
              <button className="btn-secondary !px-3" onClick={handleAddPosition}>
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <button className="btn-secondary w-full" onClick={() => setEditModalOpen(false)}>
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
