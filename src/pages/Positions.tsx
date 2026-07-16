// ====== POSITIONS PAGE - Kanban-style vehicle management ======

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit3, Plus, Trash2, X, GripVertical, ArrowRight, Clock, Search, RotateCcw } from 'lucide-react'
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
  const vehicleTimelines = useStore((s) => s.vehicleTimelines)
  const moveVehicle = useStore((s) => s.moveVehicle)
  const updateVehicle = useStore((s) => s.updateVehicle)
  const addPosition = useStore((s) => s.addPosition)
  const updatePosition = useStore((s) => s.updatePosition)
  const deletePosition = useStore((s) => s.deletePosition)
  const reorderPositions = useStore((s) => s.reorderPositions)

  // Sort positions by order for display
  const sortedPositions = [...positions].sort((a, b) => a.order - b.order)
  const [searchQuery, setSearchQuery] = useState('')

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
  const [historyOpen, setHistoryOpen] = useState(false)
  const [newPosName, setNewPosName] = useState('')
  const [editingPosId, setEditingPosId] = useState<string | null>(null)
  const [editingPosName, setEditingPosName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Vehicle drag handlers (native HTML5 drag)
  const [yardDialogOpen, setYardDialogOpen] = useState(false)
  const [yardDragVehicleId, setYardDragVehicleId] = useState<string | null>(null)
  const [yardPositionTarget, setYardPositionTarget] = useState<string | null>(null)
  const [selectedYardPos, setSelectedYardPos] = useState('')

  const YARD_POSITIONS = ['A15', 'C14', 'Hwamul 5', 'Hwamul 6', 'Hwamul 7', 'Hwamul 8', 'Hwamul 9', 'Hwamul 10']

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
      const pos = positions.find((p) => p.id === positionId)
      if (pos?.name === 'Trong bãi lớn') {
        setYardDragVehicleId(dragId)
        setYardPositionTarget(positionId)
        setSelectedYardPos('')
        setYardDialogOpen(true)
        setDragId(null)
        return
      }
      moveVehicle(dragId, positionId)
      setDragId(null)
    }
  }

  function confirmYardPosition() {
    if (yardDragVehicleId && yardPositionTarget && selectedYardPos) {
      updateVehicle(yardDragVehicleId, { yardPosition: selectedYardPos })
      moveVehicle(yardDragVehicleId, yardPositionTarget)
    }
    setYardDialogOpen(false)
    setYardDragVehicleId(null)
    setYardPositionTarget(null)
    setSelectedYardPos('')
  }

  function handleVehicleDragEnd() {
    setDragId(null)
    setDragOverId(null)
  }

  // Global activity feed — combine all vehicle timelines + moveLogs
  const globalActivity = useMemo(() => {
    const entries: { id: string; time: string; type: string; title: string; description: string; user?: string; vehicleId?: string }[] = []

    // Collect timeline entries from all vehicles
    for (const [, timeline] of Object.entries(vehicleTimelines)) {
      for (const entry of timeline) {
        entries.push({
          id: entry.id,
          time: entry.time,
          type: entry.type,
          title: entry.title,
          description: entry.description,
          user: entry.user,
          vehicleId: entry.vehicleId,
        })
      }
    }

    // Add move logs as activity entries
    for (const log of moveLogs) {
      const v = vehicles.find((x) => x.id === log.vehicleId)
      const from = positions.find((p) => p.id === log.fromPositionId)
      const to = positions.find((p) => p.id === log.toPositionId)
      const emp = employees.find((e) => e.id === log.employeeId)
      entries.push({
        id: log.id,
        time: log.createdAt,
        type: 'move_log',
        title: `${v?.plate || '—'} → ${to?.name || '—'}`,
        description: `${from?.name || '—'} → ${to?.name || '—'}`,
        user: emp?.name || '—',
        vehicleId: log.vehicleId,
      })
    }

    // Sort newest first, take latest 50
    return entries.sort((a, b) => (a.time < b.time ? 1 : -1)).slice(0, 50)
  }, [vehicleTimelines, moveLogs, vehicles, positions, employees])

  // Recent activity sorted by time, newest first

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
    <div className="flex h-[calc(100dvh-120px)] flex-col">
      {/* Page title */}
      <div className="mb-3 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Vị trí xe</h1>
        <p className="mt-1 text-sm text-slate-500">Kéo thả xe giữa các công đoạn — cập nhật tự động</p>
      </div>
      {/* Search + Actions */}
      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input h-10 pl-10"
            placeholder="Tìm biển số hoặc dòng xe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" title="Đặt lại" onClick={() => setSearchQuery('')} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50">
            <RotateCcw size={16} />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-700" onClick={() => setHistoryOpen(true)} title="Hoạt động gần đây">
            <Clock size={18} />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-700" onClick={() => setEditModalOpen(true)} title="Chỉnh sửa vị trí">
            <Edit3 size={18} />
          </button>
        </div>
      </div>

      {/* Kanban Board — ~85% viewport, full height */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-3">
        {sortedPositions.map((p) => {
          const q = searchQuery.trim().toLowerCase()
          const posVehicles = vehicles
            .filter((v) => v.positionId === p.id && v.status !== 'sold')
            .filter((v) => !q || v.plate.toLowerCase().includes(q) || v.model.toLowerCase().includes(q))
            .sort((a, b) => a.plate.localeCompare(b.plate))
          const isDragOver = dragOverId === p.id

          return (
            <div
              key={p.id}
              onDragOver={(e) => handleVehicleDragOver(e, p.id)}
              onDragLeave={handleVehicleDragLeave}
              onDrop={(e) => handleVehicleDrop(e, p.id)}
              className={`
                w-72 shrink-0 rounded-2xl border-2 p-4 transition-all duration-200 flex flex-col
                ${isDragOver
                  ? 'border-brand-400 bg-brand-50 shadow-lg'
                  : 'border-slate-200 bg-slate-50'
                }
              `}
            >
              {/* Column Header */}
              <div className="mb-3 flex shrink-0 items-center justify-between">
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

              {/* Vehicle Cards — scrollable column */}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
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
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                        <GripVertical size={14} />
                      </div>
                      <span className="truncate text-sm font-semibold text-slate-800">
                        {v.plate} <span className="font-normal text-slate-400">- {v.model}</span>
                      </span>
                      {v.yardPosition && (
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          📍 {v.yardPosition}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Sold Vehicles Column */}
        {vehicles.filter((v) => v.status === 'sold').length > 0 && (
          <div className="flex w-72 shrink-0 flex-col rounded-2xl border-2 border-green-200 bg-green-50 p-4">
            <div className="mb-3 flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                <span className="text-sm font-bold text-green-600">
                  {vehicles.filter((v) => v.status === 'sold').length}
                </span>
              </div>
              <span className="text-sm font-semibold text-green-700">Đã bán</span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
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

      {/* History Drawer */}
      {historyOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
          <div className="fixed bottom-0 right-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[460px]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Hoạt động gần đây</h2>
              <button onClick={() => setHistoryOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {globalActivity.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <EmptyState title="Chưa có hoạt động" />
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {globalActivity.map((entry) => {
                    const v = entry.vehicleId ? vehicles.find((x) => x.id === entry.vehicleId) : undefined
                    return (
                      <div key={entry.id} className="px-5 py-3 text-sm transition-colors hover:bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-400">{entry.time?.slice(11, 16) || ''}</span>
                            <span className="text-xs font-medium text-slate-500">{entry.user || '—'}</span>
                          </div>
                          {v && (
                            <Link to={`/xe/${v.id}`} className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => setHistoryOpen(false)}>
                              {v.plate}
                            </Link>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                          {entry.description || entry.title}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

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

      {/* Yard position dialog */}
      <Modal
        open={yardDialogOpen}
        onClose={() => setYardDialogOpen(false)}
        title="Chọn vị trí trong bãi lớn"
      >
        <div className="space-y-4">
          <select
            className="input w-full"
            value={selectedYardPos}
            onChange={(e) => setSelectedYardPos(e.target.value)}
          >
            <option value="">-- Chọn vị trí --</option>
            {YARD_POSITIONS.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setYardDialogOpen(false)}>Huỷ</button>
            <button className="btn-primary" onClick={confirmYardPosition} disabled={!selectedYardPos}>Xác nhận</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
