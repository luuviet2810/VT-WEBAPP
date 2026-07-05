// ====== MY TASKS PAGE - Staff personal tasks ======

import { Link } from 'react-router-dom'
import { CheckCircle, Circle, Clock, Filter, Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { Badge, EmptyState } from '../components/ui'
import { formatDateTime } from '../utils/format'
import { TaskStatus, TaskPriority } from '../types'

export default function MyTasks() {
  const tasks = useStore((s) => s.tasks)
  const updateTask = useStore((s) => s.updateTask)
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)
  const vehicles = useStore((s) => s.vehicles)

  // Get current user's tasks
  const myTasks = tasks.filter((t) => t.assigneeId === currentEmployeeId)
  
  // Sort: incomplete first, then by due date
  const sortedTasks = [...myTasks].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'done' ? 1 : -1
    }
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    return 0
  })

  const pendingCount = myTasks.filter((t) => t.status !== 'done').length
  const doneCount = myTasks.filter((t) => t.status === 'done').length

  const toggleTaskStatus = (taskId: string, currentStatus: TaskStatus) => {
    const newStatus: TaskStatus = currentStatus === 'done' ? 'todo' : 'done'
    updateTask(taskId, { status: newStatus })
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-slate-100 text-slate-600'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return 'Khẩn'
      case 'high': return 'Cao'
      case 'medium': return 'TB'
      case 'low': return 'Thấp'
      default: return priority
    }
  }

  const isOverdue = (task: typeof tasks[0]) => {
    if (!task.dueDate || task.status === 'done') return false
    return new Date(task.dueDate) < new Date()
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Việc của tôi</h1>
        <p className="mt-1 text-sm text-slate-500">
          {pendingCount} việc đang chờ • {doneCount} đã hoàn thành
        </p>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{pendingCount}</div>
          <div className="text-xs text-slate-500">Đang làm</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{doneCount}</div>
          <div className="text-xs text-slate-500">Hoàn thành</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {myTasks.filter((t) => isOverdue(t)).length}
          </div>
          <div className="text-xs text-slate-500">Quá hạn</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-brand-600">{myTasks.length}</div>
          <div className="text-xs text-slate-500">Tổng cộng</div>
        </div>
      </div>

      {/* Task List */}
      {sortedTasks.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            icon={<CheckCircle size={32} />}
            title="Không có việc gì"
            subtitle="Bạn không có nhiệm vụ nào được giao"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => {
            const vehicle = vehicles.find((v) => v.id === task.vehicleId)
            const overdue = isOverdue(task)

            return (
              <div
                key={task.id}
                className={`card p-4 ${
                  task.status === 'done' ? 'bg-slate-50 opacity-75' : ''
                } ${overdue ? 'border-l-4 border-red-400' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTaskStatus(task.id, task.status)}
                    className={`mt-0.5 shrink-0 ${
                      task.status === 'done'
                        ? 'text-green-500'
                        : 'text-slate-300 hover:text-green-500'
                    }`}
                  >
                    {task.status === 'done' ? (
                      <CheckCircle size={22} />
                    ) : (
                      <Circle size={22} />
                    )}
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium ${
                      task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'
                    }`}>
                      {task.title}
                    </div>

                    {/* Vehicle info */}
                    {vehicle && (
                      <div className="mt-1 text-sm text-slate-500">
                        Xe: {vehicle.plate} • {vehicle.model}
                      </div>
                    )}

                    {/* Due date */}
                    {task.dueDate && (
                      <div className={`mt-1 flex items-center gap-1 text-xs ${
                        overdue ? 'text-red-600' : 'text-slate-400'
                      }`}>
                        <Clock size={12} />
                        {new Date(task.dueDate).toLocaleDateString('vi-VN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {task.dueTime && ` lúc ${task.dueTime}`}
                        {overdue && ' (Quá hạn)'}
                      </div>
                    )}

                    {/* Checklist progress */}
                    {task.checklist.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Tiến độ</span>
                          <span>
                            {task.checklist.filter((c) => c.done).length}/{task.checklist.length}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full bg-brand-500 transition-all"
                            style={{
                              width: `${
                                (task.checklist.filter((c) => c.done).length /
                                  task.checklist.length) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Priority badge */}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
