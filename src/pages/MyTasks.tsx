// ====== MY TASKS PAGE - Staff personal view ======

import { Link } from 'react-router-dom'
import { CheckCircle, Circle, Clock, AlertTriangle, User, Car, ClipboardList } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState } from '../components/ui'
import { formatDateTime } from '../utils/format'
import { TaskStatus, TaskPriority } from '../types'

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'Làm gấp / Giao ngay',
  medium: 'Ưu tiên hơn',
  low: 'Cứ từ từ',
  urgent: 'Làm gấp / Giao ngay',
}

const PRIORITY_TONE: Record<TaskPriority, 'slate' | 'blue' | 'orange' | 'red'> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
  urgent: 'red',
}

export default function MyTasks() {
  const tasks = useStore((s) => s.tasks)
  const updateTask = useStore((s) => s.updateTask)
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)
  const vehicles = useStore((s) => s.vehicles)
  const employees = useStore((s) => s.employees)

  // All tasks - both general (no assignee) and assigned to current user
  const allTasks = tasks.filter((t) => 
    !t.assigneeId || t.assigneeId === currentEmployeeId
  )
  
  // Separate assigned tasks vs general tasks
  const assignedTasks = allTasks.filter((t) => t.assigneeId === currentEmployeeId)
  const generalTasks = allTasks.filter((t) => !t.assigneeId)
  
  // Sort: incomplete first, then by due date
  const sortTasks = (taskList: typeof tasks) => [...taskList].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'done' ? 1 : -1
    }
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    return 0
  })

  const sortedAssigned = sortTasks(assignedTasks)
  const sortedGeneral = sortTasks(generalTasks)

  const pendingCount = allTasks.filter((t) => t.status !== 'done').length
  const doneCount = allTasks.filter((t) => t.status === 'done').length
  const overdueCount = allTasks.filter((t) => 
    t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()
  ).length

  const toggleTaskStatus = (taskId: string, currentStatus: TaskStatus) => {
    const newStatus: TaskStatus = currentStatus === 'done' ? 'todo' : 'done'
    updateTask(taskId, { status: newStatus })
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
          {pendingCount} việc đang chờ • {doneCount} đã hoàn thành • {overdueCount} quá hạn
        </p>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{pendingCount}</div>
          <div className="text-xs text-slate-500">Đang làm</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{doneCount}</div>
          <div className="text-xs text-slate-500">Hoàn thành</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          <div className="text-xs text-slate-500">Quá hạn</div>
        </div>
      </div>

      {/* Assigned Tasks - My Work */}
      {sortedAssigned.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <User size={18} className="text-amber-500" />
            <h2 className="text-base font-semibold text-slate-800">Công việc được giao cho bạn</h2>
            <Badge tone="orange">{sortedAssigned.length}</Badge>
          </div>
          <div className="space-y-2">
            {sortedAssigned.map((task) => {
              const vehicle = vehicles.find((v) => v.id === task.vehicleId)
              const overdue = isOverdue(task)

              return (
                <div
                  key={task.id}
                  className={`card p-4 ${task.status === 'done' ? 'opacity-60' : ''} ${overdue ? 'border-l-4 border-red-400' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskStatus(task.id, task.status)}
                      className={`mt-0.5 shrink-0 ${task.status === 'done' ? 'text-green-500' : 'text-slate-300 hover:text-green-500'}`}
                    >
                      {task.status === 'done' ? <CheckCircle size={22} /> : <Circle size={22} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {task.title}
                      </div>
                      {vehicle && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                          <Car size={12} />
                          {vehicle.plate} • {vehicle.model}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone={PRIORITY_TONE[task.priority]}>
                          {PRIORITY_LABEL[task.priority]}
                        </Badge>
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                            <Clock size={12} />
                            {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                            {task.dueTime && ` ${task.dueTime}`}
                          </span>
                        )}
                        {overdue && (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <AlertTriangle size={12} />
                            Quá hạn
                          </span>
                        )}
                      </div>
                      {task.checklist.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Tiến độ</span>
                            <span>{task.checklist.filter((c) => c.done).length}/{task.checklist.length}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full bg-brand-500 transition-all"
                              style={{
                                width: `${(task.checklist.filter((c) => c.done).length / task.checklist.length) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* General Tasks - Shared Work */}
      {sortedGeneral.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-500" />
            <h2 className="text-base font-semibold text-slate-800">Việc chung của gara</h2>
            <Badge tone="blue">{sortedGeneral.length}</Badge>
          </div>
          <div className="space-y-2">
            {sortedGeneral.map((task) => {
              const vehicle = vehicles.find((v) => v.id === task.vehicleId)
              const overdue = isOverdue(task)

              return (
                <div
                  key={task.id}
                  className={`card p-4 ${task.status === 'done' ? 'opacity-60' : ''} ${overdue ? 'border-l-4 border-red-400' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskStatus(task.id, task.status)}
                      className={`mt-0.5 shrink-0 ${task.status === 'done' ? 'text-green-500' : 'text-slate-300 hover:text-green-500'}`}
                    >
                      {task.status === 'done' ? <CheckCircle size={22} /> : <Circle size={22} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {task.title}
                      </div>
                      {vehicle && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                          <Car size={12} />
                          {vehicle.plate} • {vehicle.model}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone={PRIORITY_TONE[task.priority]}>
                          {PRIORITY_LABEL[task.priority]}
                        </Badge>
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                            <Clock size={12} />
                            {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                            {task.dueTime && ` ${task.dueTime}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allTasks.length === 0 && (
        <div className="card p-8">
          <EmptyState
            icon={<CheckCircle size={32} />}
            title="Không có việc gì"
            subtitle="Bạn không có nhiệm vụ nào được giao và không có việc chung nào."
          />
        </div>
      )}
    </div>
  )
}
