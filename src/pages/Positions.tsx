// ====== POSITIONS PAGE - Kanban-style vehicle management ======

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Edit3, Plus, Trash2, X, GripVertical, ArrowRight } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../store/useStore'
import { EmptyState, Modal, ConfirmDialog } from '../components/ui'
import { formatDateTime } from '../utils/format'
import { Position } from '../types'

// Sortable position item component
function SortablePositionItem({
  position,
  onEdit,
  onDelete,
}: {
  position: Position
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: position.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 rounded-xl border bg-white p-3 shadow-sm
        transition-all duration-200
        ${isDragging ? 'scale-[1.02] shadow-lg ring-2 ring-brand-400' : 'hover:shadow-md hover:border-brand-200'}
      `}
    >
      {/* Drag Handle */}
      <button
        className="cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>

      {/* Position Name */}
      <span className="flex-1 text-sm font-medium text-slate-700">{position.name}</span>

      {/* Edit Button */}
      <button
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 active:scale-95"
        onClick={onEdit}
        title="Sửa tên"
      >
        <Edit3 size={14} />
      </button>

      {/* Delete Button */}
      <button
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 active:scale-95"
        onClick={onDelete}
        title="Xoá vị trí"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function Positions() {
  const positions = useStore((s) => s.positions)
  const vehicles = useStore((s) => s.vehicles)
  const moveLogs = useStore((s) => s.moveLogs)
  const employees = useStore((s) => s.employees)
  const moveVehicle = useStore((s) => s.moveVehicle)
  const addPosition = useStore((s) => s.addPosition)
  const updatePosition = useStore((s) => s.updatePosition)
  const deletePosition = useStore((s) => s.deletePosition)
  const reorderPositions = useStore((s) => s.reorderPositions)

  // Sort positions by order for display
  const sortedPositions = [...positions].sort((a, b) => a.order - b.order)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end for position reordering
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedPositions.findIndex((p) => p.id === active.id)
      const newIndex = sortedPositions.findIndex((p) => p.id === over.id)
      const newOrder = arrayMove(sortedPositions, oldIndex, newIndex)
      reorderPositions(newOrder.map((p) => p.id))
    }
  }

  // State for vehicle drag
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [newPosName, setNewPosName] = useState('')
  const [editingPosId, setEditingPosId] = useState<string | null>(null)
  const [editingPosName, setEditingPosName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Vehicle drag handlers (native HTML5 drag)
  function handleVehicleDragStart(e: React.DragEvent, vehicleId: string) {
    setDragId(vehicleId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', vehicleId)
  }

  function handleVehicleDragOver(e: React.DragEvent, positionId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(positionId)
  }

  function handleVehicleDragLeave() {
    setDragOverId(null)
  }

  function handleVehicleDrop(e: React.DragEvent, positionId: string) {
    e.preventDefault()
    setDragOverId(null)
    
    if (dragId) {
      moveVehicle(dragId, positionId)
      setDragId(null)
    }
  }

  function handleVehicleDragEnd() {
    setDragId(null)
    setDragOverId(null)
  }

  // Recent logs for activity feed
  const recentLogs = [...moveLogs]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 12)

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
    const hasVehicles = vehicles.some((v) => v.positionId === id)
    if (hasVehicles) {
      setShowDeleteConfirm('blocked')
      return
    }
    setShowDeleteConfirm(id)
  }

  function confirmDeletePosition() {
    if (showDeleteConfirm) {
      deletePosition(showDeleteConfirm)
      setShowDeleteConfirm(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vị trí xe</h1>
          <p className="mt-1 text-sm text-slate-500">Kéo thả xe giữa các công đoạn — cập nhật tự động</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => setEditModalOpen(true)}
        >
          <Edit3 size={16} />
          Chỉnh sửa vị trí
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedPositions.map((p) => {
          const posVehicles = vehicles.filter((v) => v.positionId === p.id && v.status !== 'sold')
          const isDragOver = dragOverId === p.id

          return (
            <div
              key={p.id}
              onDragOver={(e) => handleVehicleDragOver(e, p.id)}
              onDragLeave={handleVehicleDragLeave}
              onDrop={(e) => handleVehicleDrop(e, p.id)}
              className={`
                w-72 shrink-0 rounded-2xl border-2 p-4 transition-all duration-200
                ${isDragOver 
                  ? 'border-brand-400 bg-brand-50 shadow-lg' 
                  : 'border-slate-200 bg-slate-50'
                }
              `}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100">
                    <span className="text-sm font-bold text-brand-600">{posVehicles.length}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{p.name}</span>
                </div>
                {isDragOver && (
                  <ArrowRight size={16} className="text-brand-500 animate-pulse" />
                )}
              </div>

              {/* Vehicle Cards */}
              <div className="space-y-2 min-h-[100px]">
                {posVehicles.length === 0 && (
                  <div className={`
                    flex items-center justify-center rounded-xl border-2 border-dashed py-8 text-xs transition-colors
                    ${isDragOver ? 'border-brand-300 bg-brand-100/50 text-brand-500' : 'border-slate-200 text-slate-400'}
                  `}>
                    {isDragOver ? 'Thả xe vào đây' : 'Kéo xe vào đây'}
                  </div>
                )}
                
                {posVehicles.map((v) => {
                  const isDragging = dragId === v.id

                  return (
                    <Link
                      key={v.id}
                      to={`/xe/${v.id}`}
                      draggable
                      onDragStart={(e) => handleVehicleDragStart(e, v.id)}
                      onDragEnd={handleVehicleDragEnd}
                      className={`
                        flex cursor-grab items-center gap-3 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition-all duration-200
                        ${isDragging
                          ? 'opacity-50 scale-95 shadow-lg ring-2 ring-brand-400'
                          : 'hover:shadow-md hover:border-brand-200 active:cursor-grabbing'
                        }
                      `}
                    >
                      {/* Drag Handle */}
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                        <GripVertical size={14} />
                      </div>

                      {/* Plate - Model */}
                      <span className="truncate text-sm font-semibold text-slate-800">
                        {v.plate} <span className="font-normal text-slate-400">- {v.model}</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Sold Vehicles Column */}
        {vehicles.filter((v) => v.status === 'sold').length > 0 && (
          <div className="w-72 shrink-0 rounded-2xl border-2 border-green-200 bg-green-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                <span className="text-sm font-bold text-green-600">
                  {vehicles.filter((v) => v.status === 'sold').length}
                </span>
              </div>
              <span className="text-sm font-semibold text-green-700">Đã bán</span>
            </div>
            <div className="space-y-2 min-h-[60px]">
              {vehicles.filter((v) => v.status === 'sold').slice(0, 3).map((v) => (
                <Link
                  key={v.id}
                  to={`/xe/${v.id}`}
                  className="flex items-center gap-2 rounded-lg bg-white/80 p-2 text-sm text-green-800 hover:bg-white"
                >
                  <span className="font-medium">{v.plate}</span>
                  <span className="text-xs text-green-600">{v.model}</span>
                </Link>
              ))}
              {vehicles.filter((v) => v.status === 'sold').length > 3 && (
                <div className="text-center text-xs text-green-600">
                  +{vehicles.filter((v) => v.status === 'sold').length - 3} xe khác
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="card mt-6 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Clock size={16} className="text-slate-400" />
          Hoạt động gần đây
        </div>
        {recentLogs.length === 0 ? (
          <EmptyState title="Chưa có hoạt động nào" />
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
                      <span className="shrink-0 text-brand-500">→</span>
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

      {/* Edit Positions Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Chỉnh sửa vị trí"
      >
        <div className="space-y-2">
          <p className="mb-3 text-xs text-slate-500">
            Kéo thả để sắp xếp thứ tự vị trí
          </p>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedPositions.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedPositions.map((p) => (
                <SortablePositionItem
                  key={p.id}
                  position={p}
                  onEdit={() => startEditPosition(p.id, p.name)}
                  onDelete={() => handleDeletePosition(p.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add New Position */}
          <div className="border-t border-slate-100 pt-3 mt-3">
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

          {/* Edit Position Inline */}
          {editingPosId && (
            <div className="border-t border-slate-100 pt-3 mt-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Sửa tên vị trí</div>
              <div className="flex gap-2">
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
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="border-t border-slate-100 pt-3 mt-3">
            <button className="btn-secondary w-full" onClick={() => setEditModalOpen(false)}>
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete position confirmation */}
      <ConfirmDialog
        open={!!showDeleteConfirm}
        title="Xóa vị trí?"
        message="Bạn có chắc muốn xóa vị trí này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        variant="danger"
        onConfirm={confirmDeletePosition}
        onCancel={() => setShowDeleteConfirm(null)}
      />

      {/* Cannot delete position with vehicles */}
      {showDeleteConfirm === 'blocked' && (
        <ConfirmDialog
          open={true}
          title="Không thể xóa vị trí"
          message="Vị trí này đang có xe. Hãy di chuyển xe trước khi xóa vị trí."
          confirmLabel="Đã hiểu"
          variant="default"
          onConfirm={() => setShowDeleteConfirm(null)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  )
}
