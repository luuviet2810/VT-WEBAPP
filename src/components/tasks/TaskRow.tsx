import { useState, memo } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import type { Task } from '../../types'

type Props = {
  task: Task
  onToggleChecklist: (taskId: string, itemId: string) => void
  onUpdateTask: (id: string, patch: { title?: string; checklist?: Task['checklist']; status?: Task['status'] }) => void
  onDeleteTask: (id: string) => void
}

const TaskRow = memo(function TaskRow({ task, onToggleChecklist, onUpdateTask, onDeleteTask }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const startEdit = () => {
    setEditText(task.title)
    setEditingId(task.id)
  }

  const saveEdit = () => {
    if (!editingId) return
    const next = editText.trim()
    onUpdateTask(task.id, next ? { title: next } : {})
    setEditingId(null)
  }

  const deleteItem = () => {
    if (window.confirm('Xóa nhiệm vụ này?')) {
      onDeleteTask(task.id)
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
      <div className="pt-0.5">
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
          className="h-4 w-4 rounded border-slate-300 text-brand-600"
        />
      </div>
      <div className="min-w-0 flex-1">
        {editingId === task.id ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="input flex-1"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit()
                if (e.key === 'Escape') setEditingId(null)
              }}
            />
            <button type="button" className="btn-icon" onClick={saveEdit}>
              <Check size={16} />
            </button>
            <button type="button" className="btn-icon" onClick={() => setEditingId(null)}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="text-sm font-medium text-slate-800">{task.title}</div>
        )}
        <div className="mt-1.5 space-y-1">
          {(task.checklist || []).map((item) => (
            <label key={item.id} className="flex cursor-pointer items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => onToggleChecklist(task.id, item.id)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
              />
              <span className={item.done ? 'text-slate-400 line-through' : undefined}>{item.text}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" className="btn-icon" onClick={startEdit} title="Sửa">
          <Pencil size={16} />
        </button>
        <button type="button" className="btn-icon text-red-600 hover:text-red-700" onClick={deleteItem} title="Xóa">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
})

export default TaskRow
