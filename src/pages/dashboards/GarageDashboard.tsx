// ====== GARAGE DASHBOARD v2 - Management Dashboard ======

import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  LayoutGrid,
  Lightbulb,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  RotateCcw,
  User,
  Users,
  UserCheck,
  UserPlus,
  UserX,
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
import { getRecommendations } from '../../utils/RecommendationEngine'
import { formatDateTime } from '../../utils/format'
import { Badge } from '../../components/ui'
import type { VehicleWorkflowStatus } from '../../types'

// Helper: days between two dates
function daysDiff(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export default function GarageDashboard() {
  const navigate = useNavigate()
  const vehicles = useStore((s) => s.vehicles)
  const tasks = useStore((s) => s.tasks)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const checkSheets = useStore((s) => s.checkSheets)
  const taskActivityLogs = useStore((s) => s.taskActivityLogs)
  const attendance = useStore((s) => s.attendance)

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
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
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/xe?add=true')}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <Plus size={14} />
            Thêm xe
          </button>
          <button
            onClick={() => navigate('/nhiem-vu?add=true')}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <Plus size={14} />
            Tạo nhiệm vụ
          </button>
          <button
            onClick={() => navigate('/vi-tri')}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <MapPin size={14} />
            Vị trí
          </button>
          <button
            onClick={() => navigate('/cham-cong')}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <UserCheck size={14} />
            Chấm công
          </button>
        </div>
      </div>

      {/* ===== TOP KPI CARDS ===== */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <CheckCircle size={16} />
          Chỉ số chính
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <KPICard label="Tổng xe" value={vehicles.length} icon={<Car size={16} />} tone="slate" />
          <KPICard label="Đang xử lý" value={vehicles.filter((v) => v.status !== 'sold').length} icon={<Wrench size={16} />} tone="blue" />
          <KPICard label="Sẵn sàng bán" value={vehicles.filter((v) => v.status === 'available').length} icon={<PackageCheck size={16} />} tone="green" />
          <KPICard label="Đã bán" value={vehicles.filter((v) => v.status === 'sold').length} icon={<CheckCircle size={16} />} tone="purple" />
          <KPICard label="Việc đang chờ" value={tasks.filter((t) => t.status !== 'done').length} icon={<Clock size={16} />} tone="orange" />
          <KPICard label="Hoàn thành hôm nay" value={
            new Set(
              taskActivityLogs
                .filter((log) => log.createdAt?.slice(0, 10) === today && log.action?.includes('hoàn thành'))
                .map((log) => log.taskId)
            ).size
          } icon={<CheckCircle size={16} />} tone="green" />
        </div>
      </section>

      {/* ===== WORKFLOW OVERVIEW ===== */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <LayoutGrid size={16} />
          Quy trình xe
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <WorkflowCard label="Chờ nhận" count={overviewStats.new} color="slate" />
          <WorkflowCard label="Nhận xe" count={overviewStats.input} color="blue" />
          <WorkflowCard label="Sửa chữa" count={overviewStats.working} color="orange" />
          <WorkflowCard label="Kiểm tra cuối" count={overviewStats.finalCheck} color="yellow" />
          <WorkflowCard label="Sẵn sàng" count={overviewStats.ready} color="green" />
          <WorkflowCard label="Đã bán" count={overviewStats.sold} color="purple" />
        </div>
      </section>

      {/* ===== POSITION OVERVIEW ===== */}
      <section>
        <h2 className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <span className="flex items-center gap-2">
            <MapPin size={16} />
            Tình trạng vị trí
          </span>
          <Link to="/vi-tri" className="text-xs normal-case font-medium text-brand-600 hover:text-brand-700">
            Quản lý <ArrowRight size={12} className="inline" />
          </Link>
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {positions.slice(0, 6).map((pos) => {
            const posVehicles = vehicles.filter((v) => v.positionId === pos.id)
            const occupancy = 1 // capacity unknown, show as 1 vehicle per position
            return (
              <div
                key={pos.id}
                className={`card p-3 flex flex-col gap-2 ${
                  posVehicles.length > 0 ? 'bg-slate-50' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-slate-800 truncate">{pos.name}</span>
                  {posVehicles.length > 0 && (
                    <Badge tone="blue">{posVehicles.length}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        posVehicles.length > 0 ? 'bg-brand-500' : 'bg-slate-200'
                      }`}
                      style={{ width: posVehicles.length > 0 ? '100%' : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {posVehicles.length} xe
                  </span>
                </div>
              </div>
            )
          })}
          {positions.length === 0 && (
            <div className="col-span-full card p-6 text-center text-sm text-slate-400">
              Chưa có vị trí nào
            </div>
          )}
        </div>
      </section>

      {/* ===== TASK OVERVIEW ===== */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <span className="flex items-center gap-2">
            <Wrench size={16} />
            Tổng quan nhiệm vụ
          </span>
          <Link to="/nhiem-vu" className="text-xs normal-case font-medium text-brand-600 hover:text-brand-700">
            Xem tất cả <ArrowRight size={12} className="inline" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <TaskStatusCard
            label="Chưa làm"
            count={tasks.filter((t) => t.status === 'todo').length}
            color="slate"
            icon={<Clock size={16} />}
          />
          <TaskStatusCard
            label="Đang làm"
            count={tasks.filter((t) => t.status === 'doing').length}
            color="blue"
            icon={<Wrench size={16} />}
          />
          <TaskStatusCard
            label="Hoàn thành"
            count={tasks.filter((t) => t.status === 'done').length}
            color="green"
            icon={<CheckCircle size={16} />}
          />
        </div>
        {tasks.length > 0 && (
          <div className="mt-3 card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Tỷ lệ hoàn thành</span>
              <span className="font-semibold text-slate-800">
                {Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100)}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{
                  width: `${Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* ===== EMPLOYEE OVERVIEW ===== */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <span className="flex items-center gap-2">
            <Users size={16} />
            Nhân viên hôm nay
          </span>
          <Link to="/nhan-vien" className="text-xs normal-case font-medium text-brand-600 hover:text-brand-700">
            Quản lý <ArrowRight size={12} className="inline" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <EmployeeStatCard
            label="Đang làm"
            count={employees.filter((e) => {
              const att = attendance.find((a) => a.employeeId === e.id && a.date === today)
              return !e.disabled && att?.checkIn && !att.checkOut
            }).length}
            icon={<UserCheck size={16} />}
            color="green"
          />
          <EmployeeStatCard
            label="Vắng mặt"
            count={employees.filter((e) => {
              const att = attendance.find((a) => a.employeeId === e.id && a.date === today)
              return !e.disabled && !att?.checkIn
            }).length}
            icon={<UserX size={16} />}
            color="slate"
          />
          <EmployeeStatCard
            label="Đã check-in"
            count={employees.filter((e) => {
              const att = attendance.find((a) => a.employeeId === e.id && a.date === today)
              return !e.disabled && !!att?.checkIn
            }).length}
            icon={<User size={16} />}
            color="blue"
          />
          <EmployeeStatCard
            label="Tổng nhân viên"
            count={employees.filter((e) => !e.disabled).length}
            icon={<Users size={16} />}
            color="purple"
          />
        </div>
      </section>

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

      {/* ===== SECTION 7: SMART RECOMMENDATIONS ===== */}
      {(() => {
        const recs = getRecommendations({ vehicles, tasks, employees, checkSheets })
        const total = recs.vehicles.length + recs.tasks.length + recs.employees.length
        if (total === 0) return null
        return (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <Lightbulb size={16} className="text-yellow-500" />
                Đề xuất thông minh
              </h2>
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                {total}
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {/* Vehicle recommendations */}
              {recs.vehicles.length > 0 && (
                <div className="card divide-y divide-slate-100">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                    <Car size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Xe ({recs.vehicles.length})</span>
                  </div>
                  {recs.vehicles.map((r) => (
                    <Link
                      key={`${r.type}-${r.vehicleId}`}
                      to={`/xe/${r.vehicleId}`}
                      className="flex items-start gap-2 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span className={`mt-0.5 shrink-0 rounded-full w-2 h-2 ${
                        r.priority === 'high' ? 'bg-red-500' : 'bg-yellow-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800">{r.vehiclePlate}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{r.reason}</div>
                      </div>
                      <ChevronRight size={14} className="mt-1 shrink-0 text-slate-300" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Task recommendations */}
              {recs.tasks.length > 0 && (
                <div className="card divide-y divide-slate-100">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                    <Wrench size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Nhiệm vụ ({recs.tasks.length})</span>
                  </div>
                  {recs.tasks.slice(0, 5).map((r) => (
                    <Link
                      key={`${r.type}-${r.taskId}`}
                      to={`/nhiem-vu/${r.taskId}`}
                      className="flex items-start gap-2 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span className={`mt-0.5 shrink-0 rounded-full w-2 h-2 ${
                        r.priority === 'high' ? 'bg-red-500' : 'bg-orange-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800">{r.taskTitle}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Xe {r.vehiclePlate} · {r.reason}</div>
                      </div>
                      <ChevronRight size={14} className="mt-1 shrink-0 text-slate-300" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Employee recommendations */}
              {recs.employees.length > 0 && (
                <div className="card divide-y divide-slate-100">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                    <UserX size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Nhân viên ({recs.employees.length})</span>
                  </div>
                  {recs.employees.slice(0, 5).map((r) => (
                    <div key={`${r.type}-${r.employeeId}`} className="flex items-start gap-2 px-4 py-3">
                      <span className={`mt-0.5 shrink-0 rounded-full w-2 h-2 ${
                        r.type === 'employee_idle' ? 'bg-blue-400' : 'bg-green-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800">{r.employeeName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{r.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )
      })()}
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

// ===== NEW DASHBOARD COMPONENTS =====

function KPICard({
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
  const toneClasses: Record<typeof tone, { text: string; bg: string; icon: string }> = {
    slate: { text: 'text-slate-700', bg: 'bg-slate-50', icon: 'text-slate-500' },
    blue: { text: 'text-blue-700', bg: 'bg-blue-50', icon: 'text-blue-500' },
    green: { text: 'text-green-700', bg: 'bg-green-50', icon: 'text-green-500' },
    orange: { text: 'text-orange-700', bg: 'bg-orange-50', icon: 'text-orange-500' },
    red: { text: 'text-red-700', bg: 'bg-red-50', icon: 'text-red-500' },
    purple: { text: 'text-purple-700', bg: 'bg-purple-50', icon: 'text-purple-500' },
  }
  const styles = toneClasses[tone]

  return (
    <div className={`card flex flex-col items-center gap-2 p-4 text-center ${styles.bg}`}>
      <div className={`p-2 rounded-lg ${styles.bg}`}>{icon}</div>
      <div className={`text-2xl font-bold ${styles.text}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function WorkflowCard({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: 'slate' | 'blue' | 'orange' | 'yellow' | 'green' | 'purple'
}) {
  const colorClasses: Record<typeof color, { bar: string; bg: string; text: string }> = {
    slate: { bar: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-600' },
    blue: { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
    orange: { bar: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
    yellow: { bar: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    green: { bar: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
    purple: { bar: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  }
  const styles = colorClasses[color]

  return (
    <div className={`card p-3 ${styles.bg}`}>
      <div className="text-center">
        <div className={`text-2xl font-bold ${styles.text}`}>{count}</div>
        <div className="mt-1 text-xs text-slate-500">{label}</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
        <div className={`h-full rounded-full ${styles.bar} transition-all`} style={{ width: count > 0 ? '100%' : '0%' }} />
      </div>
    </div>
  )
}

function TaskStatusCard({
  label,
  count,
  color,
  icon,
}: {
  label: string
  count: number
  color: 'slate' | 'blue' | 'green'
  icon: React.ReactNode
}) {
  const colorClasses: Record<typeof color, { border: string; icon: string; bg: string }> = {
    slate: { border: 'border-slate-300', icon: 'text-slate-500', bg: 'bg-slate-50' },
    blue: { border: 'border-blue-300', icon: 'text-blue-500', bg: 'bg-blue-50' },
    green: { border: 'border-green-300', icon: 'text-green-500', bg: 'bg-green-50' },
  }
  const styles = colorClasses[color]

  return (
    <div className={`card p-4 border-t-4 ${styles.border}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${styles.bg}`}>
          <span className={styles.icon}>{icon}</span>
        </div>
        <div>
          <div className={`text-xl font-bold ${styles.border.replace('border-', 'text-').replace('-300', '-700')}`}>{count}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  )
}

function EmployeeStatCard({
  label,
  count,
  icon,
  color,
}: {
  label: string
  count: number
  icon: React.ReactNode
  color: 'slate' | 'blue' | 'green' | 'purple'
}) {
  const colorClasses: Record<typeof color, { icon: string; bg: string; text: string }> = {
    slate: { icon: 'text-slate-500', bg: 'bg-slate-100', text: 'text-slate-700' },
    blue: { icon: 'text-blue-500', bg: 'bg-blue-100', text: 'text-blue-700' },
    green: { icon: 'text-green-500', bg: 'bg-green-100', text: 'text-green-700' },
    purple: { icon: 'text-purple-500', bg: 'bg-purple-100', text: 'text-purple-700' },
  }
  const styles = colorClasses[color]

  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${styles.bg}`}>
        <span className={styles.icon}>{icon}</span>
      </div>
      <div>
        <div className={`text-xl font-bold ${styles.text}`}>{count}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}
