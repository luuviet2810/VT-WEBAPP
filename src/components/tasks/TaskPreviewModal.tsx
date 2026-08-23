import { X, Clock, CheckCircle2, AlertCircle, User, Calendar, Tag, FileText } from 'lucide-react'
import type { Task } from '../../types'

const PRIORITY_LABEL: Record<string, string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' }
const PRIORITY_COLOR: Record<string, string> = { low: '#94a3b8', medium: '#f59e0b', high: '#ef4444', urgent: '#dc2626' }
const STATUS_LABEL: Record<string, string> = { todo: 'Chưa làm', doing: 'Đang làm', done: 'Đã làm' }
const STATUS_COLOR: Record<string, string> = { todo: '#94a3b8', doing: '#f59e0b', done: '#16a34a' }

export default function TaskPreviewModal({
  task,
  onClose,
  vehiclePlate,
  vehicleModel,
}: {
  task: Task
  onClose: () => void
  vehiclePlate?: string
  vehicleModel?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Nhiệm vụ</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {task.createdAt?.slice(0, 10) || '—'} {vehiclePlate && `• ${vehicleModel || ''} ${vehiclePlate}`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {/* Title */}
          <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>

          {/* Meta grid */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Tag size={12} /> Trạng thái
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium" style={{ color: STATUS_COLOR[task.status] || '#94a3b8' }}>
                {task.status === 'done' ? <CheckCircle2 size={14} /> : task.status === 'doing' ? <Clock size={14} /> : <AlertCircle size={14} />}
                {STATUS_LABEL[task.status] || task.status}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <AlertCircle size={12} /> Ưu tiên
              </div>
              <div className="mt-1 text-sm font-medium" style={{ color: PRIORITY_COLOR[task.priority] || '#94a3b8' }}>
                {PRIORITY_LABEL[task.priority] || task.priority}
              </div>
            </div>
            {task.ruleId && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <FileText size={12} /> Nguồn
                </div>
                <div className="mt-1 text-sm font-medium text-blue-600">🤖 Auto • CheckSheet</div>
              </div>
            )}
            {task.assigneeId && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <User size={12} /> Người xử lý
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700">{task.assigneeId}</div>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Calendar size={12} /> Tạo lúc
              </div>
              <div className="mt-1 text-sm font-medium text-slate-700">{task.createdAt ? new Date(task.createdAt).toLocaleString('vi-VN') : '—'}</div>
            </div>
            {task.dueDate && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Calendar size={12} /> Hạn hoàn thành
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700">{new Date(task.dueDate).toLocaleDateString('vi-VN')}</div>
              </div>
            )}
          </div>

          {/* Checklist */}
          {task.checklist && task.checklist.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Các bước kiểm tra</div>
              <div className="space-y-1.5">
                {task.checklist.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded border ${item.done ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                      {item.done && <span className="flex items-center justify-center text-[10px] text-white">✓</span>}
                    </span>
                    <span className={item.done ? 'text-slate-400 line-through' : ''}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}