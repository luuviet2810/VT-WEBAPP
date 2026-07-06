// ====== GARAGE DASHBOARD v1 - Operational Overview ======

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  Package,
  PackageCheck,
  RotateCcw,
  User,
  Users,
  Wrench,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import {
  getVehicleWorkflowStatus,
  WORKFLOW_STATUS_LABEL,
  WORKFLOW_STATUS_TONE,
  WorkflowCheckSheet,
} from '../../utils/vehicleWorkflow'
import { timelineItemTypeLabel } from '../../utils/timeline'
import { formatDateTime } from '../../utils/format'
import { Badge } from '../../components/ui'
import type { VehicleWorkflowStatus } from '../../types'

// Helper: days between two dates
function daysDiff(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export default function GarageDashboard() {
  const vehicles = useStore((s) => s.vehicles)
  const tasks = useStore((s) => s.tasks)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const checkSheets = useStore((s) => s.checkSheets)
  const taskActivityLogs = useStore((s) => s.taskActivityLogs)

  const today = new Date().toISOString().slice(0, 10)

  // ===== SECTION 1: GARAGE OVERVIEW =====
  const overviewStats = useMemo(() => {
    const active = vehicles.filter((v) => v.status !== 'sold')

    // Count by workflow status
    const workflowCounts = active.map((v) => {
      const vTasks = tasks.filter((t) => t.vehicleId === v.id)
      const vSheets = checkSheets
        .filter((s) => s.vehicleId === v.id)
        .map((s): WorkflowCheckSheet => ({ type: s.type, checkDate: s.checkDate }))
      return getVehicleWorkflowStatus(v, vTasks, vSheets)
    })

    const countByStatus = (status: VehicleWorkflowStatus) =>
      workflowCounts.filter((s) => s === status).length

    const overdue = active.filter((v) => {
      const vTasks = tasks.filter((t) => t.vehicleId === v.id)
      const overdueTask = vTasks.some(
        (t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()
      )
      if (!overdueTask) return false
      const daysOld = daysDiff(new Date(v.createdAt), new Date())
      const workflow = getVehicleWorkflowStatus(
        v,
        vTasks,
        checkSheets
          .filter((s) => s.vehicleId === v.id)
          .map((s): WorkflowCheckSheet => ({ type: s.type, checkDate: s.checkDate }))
      )
      // "Delayed" = working/final_check for more than 7 days, or any workflow for more than 14
      if (workflow === 'working' || workflow === 'final_check') return daysOld > 7
      return daysOld > 14
    })

    return {
      total: vehicles.length,
      active: active.length,
      new: countByStatus('new'),
      input: countByStatus('input'),
      working: countByStatus('working'),
      finalCheck: countByStatus('final_check'),
      ready: countByStatus('ready'),
      sold: vehicles.filter((v) => v.status === 'sold').length,
      overdue: overdue.length,
    }
  }, [vehicles, tasks, checkSheets])

  // ===== SECTION 2: TODAY'S WORK =====
  const todayByEmployee = useMemo(() => {
    const doneIds = new Set(
      tasks
        .filter((t) => {
          if (t.status !== 'done') return false
          const created = t.createdAt?.slice(0, 10)
          return created === today
        })
        .map((t) => t.id)
    )

    return employees
      .filter((e) => !e.disabled)
      .map((emp) => {
        const empTasks = tasks.filter((t) => t.assigneeId === emp.id)
        const active = empTasks.filter((t) => t.status !== 'done')
        const doneToday = empTasks.filter((t) => doneIds.has(t.id)).length
        const progress = empTasks.length > 0 ? Math.round((doneToday / empTasks.length) * 100) : 0
        return { employee: emp, total: empTasks.length, active: active.length, doneToday, progress }
      })
      .sort((a, b) => b.active - a.active)
  }, [employees, tasks, today])

  // ===== SECTION 3: VEHICLES IN PROGRESS =====
  const inProgressVehicles = useMemo(() => {
    return vehicles
      .filter((v) => v.status !== 'sold')
      .map((v) => {
        const vTasks = tasks.filter((t) => t.vehicleId === v.id)
        const vSheets = checkSheets
          .filter((s) => s.vehicleId === v.id)
          .map((s): WorkflowCheckSheet => ({ type: s.type, checkDate: s.checkDate }))
        const workflow = getVehicleWorkflowStatus(v, vTasks, vSheets)
        const activeTasks = vTasks.filter((t) => t.status !== 'done')
        const total = vTasks.length
        const done = vTasks.filter((t) => t.status === 'done').length
        const progress = total > 0 ? Math.round((done / total) * 100) : 0
        const position = positions.find((p) => p.id === v.positionId)
        const assignee = employees.find((e) => e.id === v.assigneeId)
        return { vehicle: v, workflow, activeTasks: activeTasks.length, progress, position, assignee }
      })
      .filter((item) => item.workflow !== 'sold' && item.workflow !== 'new')
      .slice(0, 12)
  }, [vehicles, tasks, checkSheets, positions, employees])

  // ===== SECTION 4: OVERDUE VEHICLES =====
  const overdueVehicles = useMemo(() => {
    const now = new Date()
    return vehicles
      .filter((v) => v.status !== 'sold')
      .map((v) => {
        const vTasks = tasks.filter((t) => t.vehicleId === v.id)
        const hasOverdueTask = vTasks.some(
          (t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now
        )
        if (!hasOverdueTask) return null
        const vSheets = checkSheets
          .filter((s) => s.vehicleId === v.id)
          .map((s): WorkflowCheckSheet => ({ type: s.type, checkDate: s.checkDate }))
        const workflow = getVehicleWorkflowStatus(v, vTasks, vSheets)
        const assignee = employees.find((e) => e.id === v.assigneeId)
        const daysDelayed = daysDiff(new Date(v.createdAt), now)
        return { vehicle: v, workflow, assignee, daysDelayed }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.daysDelayed - a.daysDelayed)
      .slice(0, 6)
  }, [vehicles, tasks, checkSheets, employees])

  // ===== SECTION 5: RECENT ACTIVITY =====
  const recentActivities = useMemo(() => {
    const fromLogs = taskActivityLogs.slice(0, 20).map((log) => {
      const emp = employees.find((e) => e.id === log.employeeId)
      const task = tasks.find((t) => t.id === log.taskId)
      return {
        id: log.id,
        time: log.createdAt,
        type: 'task_status_changed' as const,
        title: task?.title || 'Nhiệm vụ',
        description: log.action,
        employeeName: emp?.name,
      }
    })

    return fromLogs.sort((a, b) => (a.time < b.time ? 1 : -1)).slice(0, 8)
  }, [taskActivityLogs, employees, tasks])

  // ===== SECTION 6: EMPLOYEE WORKLOAD =====
  const employeeWorkload = useMemo(() => {
    const doneIds = new Set(
      tasks
        .filter((t) => t.status === 'done' && t.createdAt?.slice(0, 10) === today)
        .map((t) => t.id)
    )

    return employees
      .filter((e) => !e.disabled)
      .map((emp) => {
        const empTasks = tasks.filter((t) => t.assigneeId === emp.id)
        const doneToday = empTasks.filter((t) => doneIds.has(t.id)).length
        const workingVehicles = new Set(empTasks.filter((t) => t.status !== 'done').map((t) => t.vehicleId)).size
        return { employee: emp, assignedTasks: empTasks.length, doneToday, workingVehicles }
      })
      .sort((a, b) => b.assignedTasks - a.assignedTasks)
      .slice(0, 5)
  }, [employees, tasks, today])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bảng điều khiển</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* ===== SECTION 1: GARAGE OVERVIEW ===== */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <Car size={16} />
          Tổng quan gara
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <SummaryCard label="Tổng xe" value={overviewStats.total} icon={<Car size={16} />} tone="slate" />
          <SummaryCard label="Đang xử lý" value={overviewStats.active} icon={<Wrench size={16} />} tone="blue" />
          <SummaryCard label="Chờ nhận xe" value={overviewStats.new + overviewStats.input} icon={<RotateCcw size={16} />} tone="slate" />
          <SummaryCard label="Kiểm tra cuối" value={overviewStats.finalCheck} icon={<Package size={16} />} tone="orange" />
          <SummaryCard label="Sẵn sàng bán" value={overviewStats.ready} icon={<PackageCheck size={16} />} tone="green" />
          <SummaryCard label="Đã bán" value={overviewStats.sold} icon={<CheckCircle size={16} />} tone="purple" />
          <SummaryCard
            label="Trễ tiến độ"
            value={overviewStats.overdue}
            icon={<AlertTriangle size={16} />}
            tone={overviewStats.overdue > 0 ? 'red' : 'slate'}
          />
        </div>
      </section>

      {/* ===== SECTIONS 2 + 6: TODAY'S WORK + EMPLOYEE WORKLOAD (side by side on desktop) ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* SECTION 2: TODAY'S WORK */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Clock size={16} />
              Việc hôm nay
            </h2>
            <Link to="/nhiem-vu" className="text-xs text-brand-600 hover:text-brand-700">
              Chi tiết <ArrowRight size={12} className="inline" />
            </Link>
          </div>
          <div className="card divide-y divide-slate-100">
            {todayByEmployee.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">Không có nhân viên</div>
            ) : (
              todayByEmployee.map(({ employee, total, doneToday, progress }) => (
                <div key={employee.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
                    {employee.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800">{employee.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{progress}%</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{doneToday}</span> hôm nay
                    </div>
                    <div className="text-xs text-slate-400">
                      {total - doneToday}/{total} việc
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* SECTION 6: EMPLOYEE WORKLOAD */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Users size={16} />
              Phân công nhân viên
            </h2>
            <Link to="/nhan-vien" className="text-xs text-brand-600 hover:text-brand-700">
              Chi tiết <ArrowRight size={12} className="inline" />
            </Link>
          </div>
          <div className="card divide-y divide-slate-100">
            {employeeWorkload.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">Không có nhân viên</div>
            ) : (
              employeeWorkload.map(({ employee, assignedTasks, doneToday, workingVehicles }, idx) => (
                <div key={employee.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-500">
                    {idx + 1}
                  </span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {employee.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800">{employee.name}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {workingVehicles} xe đang xử lý
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{assignedTasks}</span> việc
                    </div>
                    <div className="text-xs text-slate-400">{doneToday} hôm nay</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ===== SECTION 3: VEHICLES IN PROGRESS ===== */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <Car size={16} />
            Xe đang xử lý
          </h2>
          <Link to="/xe" className="text-xs text-brand-600 hover:text-brand-700">
            Xem tất cả <ArrowRight size={12} className="inline" />
          </Link>
        </div>
        {inProgressVehicles.length === 0 ? (
          <div className="card flex items-center justify-center gap-3 p-8 text-sm text-slate-400">
            <CheckCircle size={20} />
            Không có xe nào đang xử lý
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {inProgressVehicles.map(({ vehicle, workflow, activeTasks, progress, position, assignee }) => (
              <Link
                key={vehicle.id}
                to={`/xe/${vehicle.id}`}
                className="card flex flex-col gap-2 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">{vehicle.plate}</div>
                    <div className="truncate text-xs text-slate-500">{vehicle.model}</div>
                  </div>
                  <Badge tone={WORKFLOW_STATUS_TONE[workflow]}>{WORKFLOW_STATUS_LABEL[workflow]}</Badge>
                </div>

                {position && (
                  <div className="text-xs text-slate-400">
                    Vị trí: <span className="text-slate-600">{position.name}</span>
                  </div>
                )}

                {assignee && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <User size={11} />
                    {assignee.name}
                  </div>
                )}

                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {activeTasks > 0 ? `${activeTasks} việc đang làm` : 'Không có việc'}
                  </span>
                  <span className="font-medium text-slate-700">{progress}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ===== SECTION 4: OVERDUE VEHICLES ===== */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <AlertTriangle size={16} className="text-red-500" />
            Xe trễ tiến độ
          </h2>
        </div>
        {overdueVehicles.length === 0 ? (
          <div className="card flex items-center justify-center gap-3 p-6 text-sm text-slate-400">
            <CheckCircle size={18} className="text-green-500" />
            Không có xe trễ tiến độ
          </div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {overdueVehicles.map(({ vehicle, workflow, assignee, daysDelayed }) => (
              <Link
                key={vehicle.id}
                to={`/xe/${vehicle.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <AlertTriangle size={16} className="shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{vehicle.plate}</span>
                    <Badge tone={WORKFLOW_STATUS_TONE[workflow]}>{WORKFLOW_STATUS_LABEL[workflow]}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {assignee ? assignee.name : 'Chưa giao'} • {vehicle.model}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-red-600">{daysDelayed}d</div>
                  <div className="text-xs text-slate-400">trễ</div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ===== SECTION 5: RECENT ACTIVITY ===== */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <Clock size={16} />
            Hoạt động gần đây
          </h2>
        </div>
        {recentActivities.length === 0 ? (
          <div className="card flex items-center justify-center p-6 text-sm text-slate-400">
            Chưa có hoạt động nào
          </div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {recentActivities.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-brand-600">
                      {timelineItemTypeLabel(item.type)}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(item.time)}</span>
                  </div>
                  <div className="mt-0.5 text-sm text-slate-700">{item.description}</div>
                  {item.employeeName && (
                    <div className="mt-0.5 text-xs text-slate-400">{item.employeeName}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ===== SMALL SHARED COMPONENTS =====

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: 'slate' | 'blue' | 'green' | 'orange' | 'red' | 'purple'
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: 'text-slate-700 bg-slate-50',
    blue: 'text-blue-700 bg-blue-50',
    green: 'text-green-700 bg-green-50',
    orange: 'text-orange-700 bg-orange-50',
    red: 'text-red-700 bg-red-50',
    purple: 'text-purple-700 bg-purple-50',
  }
  const cls = toneClasses[tone]

  return (
    <div className="card flex flex-col items-center gap-1.5 p-3 text-center">
      <div className={`rounded-lg p-2 ${cls}`}>{icon}</div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}
