import { useState } from 'react'
import { ArrowLeft, Check, Clock, Plus, Trash2, X, Loader2 } from 'lucide-react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal, ConfirmDialog } from '../components/ui'
import { TaskChecklistItem, TaskPriority, TaskStatus } from '../types'
import { formatDateTime, uid } from '../utils/format'
import clsx from 'clsx'

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'Chưa làm' },
  { key: 'doing', label: 'Đang làm' },
  { key: 'done', label: 'Hoàn thành' },
]
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
}

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tasks = useStore((s) => s.tasks)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const toggleTaskChecklistItem = useStore((s) => s.toggleTaskChecklistItem)
  const taskActivityLogs = useStore((s) => s.taskActivityLogs).filter((l) => l.taskId === id)
  const employees = useStore((s) => s.employees)
  const vehicles = useStore((s) => s.vehicles)
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [newChecklistText, setNewChecklistText] = useState('')
  const [showAddChecklist, setShowAddChecklist] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const task = tasks.find((t) => t.id === id)
  if (!task) {
    return (
      <div className="card">
        <EmptyState title="Không tìm thấy nhiệm vụ" />
      </div>
    )
  }
  const currentTask = task

  function startEditChecklist(item: TaskChecklistItem) {
    setEditingChecklistId(item.id)
    setEditText(item.text)
  }

  function saveEditChecklist() {
    if (!editingChecklistId || !editText.trim()) return
    const newChecklist = currentTask.checklist.map((i) => (i.id === editingChecklistId ? { ...i, text: editText.trim() } : i))
    updateTask(currentTask.id, { checklist: newChecklist })
    setEditingChecklistId(null)
    setEditText('')
  }

  function addChecklistItem() {
    if (!newChecklistText.trim()) return
    const newItem: TaskChecklistItem = { id: uid('chk'), text: newChecklistText.trim(), done: false }
    updateTask(currentTask.id, { checklist: [...currentTask.checklist, newItem] })
    setNewChecklistText('')
    setShowAddChecklist(false)
  }

  function removeChecklistItem(itemId: string) {
    const newChecklist = currentTask.checklist.filter((i) => i.id !== itemId)
    updateTask(currentTask.id, { checklist: newChecklist })
  }

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  function confirmDelete() {
    deleteTask(currentTask.id)
    navigate('/nhiem-vu')
  }

  const vehicle = vehicles.find((v) => v.id === currentTask.vehicleId)
  const assignee = employees.find((e) => e.id === currentTask.assigneeId)
  const [statusLoading, setStatusLoading] = useState(false)

  async function handleQuickStatus(status: TaskStatus) {
    if (statusLoading) return
    setStatusLoading(true)
    try {
      await updateTask(currentTask.id, { status })
      navigate('/nhiem-vu')
    } catch {
      setStatusLoading(false)
    }
  }

  function statusActions() {
    const all = [
      { key: 'todo' as TaskStatus, label: 'Chưa làm', style: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
      { key: 'doing' as TaskStatus, label: 'Đang làm', style: 'bg-blue-500 text-white hover:bg-blue-600' },
      { key: 'done' as TaskStatus, label: 'Hoàn thành', style: 'bg-green-500 text-white hover:bg-green-600' },
    ]
    return all.filter((a) => a.key !== currentTask.status)
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate('/nhiem-vu')} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{currentTask.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Badge tone={currentTask.status === 'done' ? 'green' : currentTask.status === 'doing' ? 'blue' : 'slate'}>{COLUMNS.find((c) => c.key === currentTask.status)?.label}</Badge>
            <Badge tone={currentTask.priority === 'urgent' ? 'red' : currentTask.priority === 'high' ? 'orange' : currentTask.priority === 'medium' ? 'blue' : 'slate'}>{PRIORITY_LABEL[currentTask.priority]}</Badge>
            {assignee && <span>{assignee.name}</span>}
            {vehicle && <span>xe {vehicle.plate} {vehicle.model}</span>}
            {currentTask.dueDate && <span>{currentTask.dueDate}{currentTask.dueTime ? ` ${currentTask.dueTime}` : ''}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <select
            className="input w-auto text-xs"
            value={currentTask.status}
            onChange={(e) => updateTask(currentTask.id, { status: e.target.value as TaskStatus })}
          >
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button onClick={handleDelete} className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600" title="Xoá">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {currentTask.description && (
            <div className="card p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Mô tả</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{currentTask.description}</p>
            </div>
          )}

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Checklist</h3>
              <span className="text-xs text-slate-400">
                {currentTask.checklist.filter((i) => i.done).length}/{currentTask.checklist.length} hoàn thành
              </span>
            </div>
            {currentTask.checklist.length > 0 && (
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${currentTask.checklist.length > 0 ? (currentTask.checklist.filter((i) => i.done).length / currentTask.checklist.length) * 100 : 0}%` }}
                />
              </div>
            )}
            <div className="space-y-2">
              {currentTask.checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleTaskChecklistItem(currentTask.id, item.id)}
                    className="mt-0.5 rounded border-slate-300 text-brand-600"
                  />
                  {editingChecklistId === item.id ? (
                    <div className="flex flex-1 gap-1">
                      <input
                        className="input flex-1"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditChecklist(); if (e.key === 'Escape') setEditingChecklistId(null) }}
                        autoFocus
                      />
                      <button className="btn-primary !px-2 !py-1" onClick={saveEditChecklist}><Check size={13} /></button>
                      <button className="btn-secondary !px-2 !py-1" onClick={() => setEditingChecklistId(null)}><X size={13} /></button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={clsx('flex-1 text-sm cursor-pointer', item.done ? 'text-slate-400 line-through' : 'text-slate-700')}
                        onDoubleClick={() => startEditChecklist(item)}
                      >
                        {item.text}
                      </span>
                      <button className="rounded p-1 text-slate-300 hover:text-slate-500" onClick={() => startEditChecklist(item)}>
                        <span className="text-xs">sửa</span>
                      </button>
                      <button className="rounded p-1 text-slate-300 hover:text-red-400" onClick={() => removeChecklistItem(item.id)}>
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}

              {showAddChecklist ? (
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="VD: Rửa xe sạch"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addChecklistItem(); if (e.key === 'Escape') { setShowAddChecklist(false); setNewChecklistText('') } }}
                    autoFocus
                  />
                  <button className="btn-primary !px-2" onClick={addChecklistItem}><Check size={13} /></button>
                  <button className="btn-secondary !px-2" onClick={() => { setShowAddChecklist(false); setNewChecklistText('') }}><X size={13} /></button>
                </div>
              ) : (
                <button className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-200 py-2 text-xs text-slate-400 hover:border-brand-300 hover:text-brand-600" onClick={() => setShowAddChecklist(true)}>
                  <Plus size={14} />
                  Thêm mục checklist
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {vehicle ? (
            <Link to={`/xe/${vehicle.id}`} className="card block p-4 transition hover:shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Xe liên quan</h3>
              <div className="space-y-1">
                <div>
                  <span className="text-xs text-slate-400">Biển số</span>
                  <div className="text-sm font-medium text-brand-600">{vehicle.plate || '—'}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Dòng xe</span>
                  <div className="text-sm text-slate-700">{vehicle.model}</div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="card p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Xe liên quan</h3>
              <p className="text-xs text-slate-400">Nhiệm vụ này chưa được liên kết với xe cụ thể.</p>
            </div>
          )}

          <div className="card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Clock size={14} />
              Lịch sử hoạt động
            </h3>
            {taskActivityLogs.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có hoạt động nào</p>
            ) : (
              <ul className="space-y-3">
                {taskActivityLogs.map((log) => {
                  const emp = employees.find((e) => e.id === log.employeeId)
                  return (
                    <li key={log.id} className="flex gap-2">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-slate-200" />
                      <div>
                        <p className="text-xs text-slate-700">{log.action}</p>
                        <p className="text-[10px] text-slate-400">{emp?.name} • {formatDateTime(log.createdAt)}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Quick Status Actions */}
      <div className="mt-6 flex items-center gap-3">
        {statusActions().map((action) => (
          <button
            key={action.key}
            onClick={() => handleQuickStatus(action.key)}
            disabled={statusLoading}
            className={`flex h-11 min-w-[120px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 ${statusLoading ? 'bg-slate-100 text-slate-400' : action.style}`}
          >
            {statusLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            {action.label}
          </button>
        ))}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Xóa nhiệm vụ?"
        message={`Bạn có chắc muốn xóa nhiệm vụ "${currentTask.title}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
