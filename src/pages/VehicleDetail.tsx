import { useMemo, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, ConfirmDialog } from '../components/ui'
import VehicleDetailTabs, { VEHICLE_DETAIL_TABS } from '../components/VehicleDetailTabs'
import MoveVehicleDialog from '../components/MoveVehicleDialog'
import { useCanDeleteVehicle, useVehiclePermissions } from '../rbac/usePermissions'
import { getVehicleWorkflowStatus, WORKFLOW_STATUS_TONE, WORKFLOW_STATUS_LABEL } from '../utils/vehicleWorkflow'

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vehicles = useStore((s) => s.vehicles)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const tasks = useStore((s) => s.tasks)
  const checkSheets = useStore((s) => s.checkSheets)
  const vehicleTimelines = useStore((s) => s.vehicleTimelines)
  const loadVehicleTimeline = useStore((s) => s.loadVehicleTimeline)
  const updateVehicle = useStore((s) => s.updateVehicle)
  const deleteVehicle = useStore((s) => s.deleteVehicle)

  const canDelete = useCanDeleteVehicle()
  const vehiclePerms = useVehiclePermissions()

  const [tab, setTab] = useState('info')
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const vehicle = vehicles.find((v) => v.id === id)

  useEffect(() => {
    if (!vehicle?.id) return
    setTimelineLoading(true)
    loadVehicleTimeline(vehicle.id)
      .catch((err) => console.error('[VehicleDetail] Failed to load timeline:', err))
      .finally(() => setTimelineLoading(false))
  }, [vehicle?.id, loadVehicleTimeline])

  if (!vehicle) {
    return (
      <div className="card">
        <EmptyState title="Không tìm thấy xe" subtitle="Xe có thể đã bị xoá" />
      </div>
    )
  }

  const position = positions.find((p) => p.id === vehicle.positionId)
  const vehicleTasks = tasks.filter((t) => t.vehicleId === vehicle.id)
  const sheets = checkSheets.filter((c) => c.vehicleId === vehicle.id)
  const workflowStatus = getVehicleWorkflowStatus(vehicle, vehicleTasks, sheets)
  const v = vehicle!

  function confirmDelete() {
    deleteVehicle(v.id)
    navigate('/')
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{v.plate || '—'}</h1>
              <Badge tone={WORKFLOW_STATUS_TONE[workflowStatus]}>{WORKFLOW_STATUS_LABEL[workflowStatus]}</Badge>
            </div>
            <p className="text-sm text-slate-500">{v.model}</p>
          </div>
        </div>
        {canDelete && (
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Position + Assignee bar */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Vị trí hiện tại</div>
          <div className="mt-1 font-semibold text-brand-600">{position ? position.name : 'Chưa phân bổ'}</div>
          {vehiclePerms.canMove && (
            <button onClick={() => setMoveDialogOpen(true)} className="btn-secondary mt-2 w-full text-sm">
              Chuyển vị trí
            </button>
          )}
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Người đang xử lý</div>
          {vehiclePerms.canAssign && (
            <select
              className="input mt-2"
              value={v.assigneeId || ''}
              onChange={(e) => updateVehicle(v.id, { assigneeId: e.target.value || null })}
            >
              <option value="">— Chưa phân công —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Unified tabs */}
      <VehicleDetailTabs vehicle={v} tab={tab} onTabChange={setTab} />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Xóa xe?"
        message={`Bạn có chắc muốn xóa xe "${v.plate}" khỏi hệ thống? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <MoveVehicleDialog open={moveDialogOpen} vehicle={v} onClose={() => setMoveDialogOpen(false)} />
    </div>
  )
}
