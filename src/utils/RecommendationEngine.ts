/**
 * RecommendationEngine — Smart Scheduling Engine
 *
 * A deterministic rule-based recommendation engine.
 * NOT AI. NOT machine learning. Pure conditional logic.
 *
 * All business rules live here — never in UI components.
 *
 * Usage:
 *   import { getRecommendations } from './RecommendationEngine'
 *   const recs = getRecommendations({ vehicles, tasks, employees, checkSheets })
 */

import type { Vehicle, Task, Employee, CheckSheet } from '../types'

// ====== INPUT ======

export interface RecommendationInput {
  vehicles: Vehicle[]
  tasks: Task[]
  employees: Employee[]
  checkSheets: CheckSheet[]
}

// ====== OUTPUT TYPES ======

export type RecommendationPriority = 'high' | 'medium' | 'low'

export interface VehicleRecommendation {
  type:
    | 'vehicle_needs_final_check'
    | 'vehicle_needs_ready'
    | 'vehicle_overdue'
    | 'vehicle_blocked'
  vehicleId: string
  vehiclePlate: string
  reason: string
  priority: RecommendationPriority
}

export interface TaskRecommendation {
  type:
    | 'task_unassigned'
    | 'task_high_priority'
    | 'task_overdue'
  taskId: string
  taskTitle: string
  vehicleId: string
  vehiclePlate: string
  priority: RecommendationPriority
  reason: string
}

export interface EmployeeRecommendation {
  type:
    | 'employee_idle'
    | 'employee_underloaded'
  employeeId: string
  employeeName: string
  reason: string
  activeTaskCount: number
}

export interface PositionRecommendation {
  type: 'position_crowded' | 'position_empty'
  positionId: string
  positionName: string
  reason: string
  vehicleCount: number
}

export interface Recommendations {
  vehicles: VehicleRecommendation[]
  tasks: TaskRecommendation[]
  employees: EmployeeRecommendation[]
  positions: PositionRecommendation[]
}

// ====== HELPERS ======

const PRIORITY_ORDER: Record<string, number> = { high: 0, urgent: 1, medium: 2, low: 3 }

function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

function daysSince(dateStr: string): number {
  const created = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
}

function hasCompletedTasks(tasks: Task[]): boolean {
  return tasks.some((t) => t.status === 'done')
}

function hasAllTasksCompleted(tasks: Task[]): boolean {
  return tasks.length > 0 && tasks.every((t) => t.status === 'done')
}

function getCheckSheetByType(sheets: CheckSheet[], vehicleId: string, type: 'in' | 'out'): CheckSheet | undefined {
  return sheets.find((s) => s.vehicleId === vehicleId && s.type === type)
}

function getWorkflowStatus(v: Vehicle, vTasks: Task[], sheets: CheckSheet[]): string {
  if (v.status === 'sold') return 'sold'
  const hasIn = !!getCheckSheetByType(sheets, v.id, 'in')
  if (!hasIn) return 'new'
  const hasUnfinished = vTasks.some((t) => t.status !== 'done')
  if (hasUnfinished) return 'working'
  const hasOut = !!getCheckSheetByType(sheets, v.id, 'out')
  if (!hasOut) return 'final_check'
  return 'ready'
}

// ====== VEHICLE RECOMMENDATIONS ======

function recommendVehicles(
  vehicles: Vehicle[],
  tasks: Task[],
  employees: Employee[],
  checkSheets: CheckSheet[]
): VehicleRecommendation[] {
  const recommendations: VehicleRecommendation[] = []
  const now = new Date()

  for (const vehicle of vehicles) {
    if (vehicle.status === 'sold') continue

    const vTasks = tasks.filter((t) => t.vehicleId === vehicle.id)
    const workflow = getWorkflowStatus(vehicle, vTasks, checkSheets)
    const daysOld = daysSince(vehicle.createdAt)

    // Rule: All tasks done → recommend Final Check
    if (workflow === 'working' && hasAllTasksCompleted(vTasks)) {
      recommendations.push({
        type: 'vehicle_needs_final_check',
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
        reason: 'Tất cả nhiệm vụ đã hoàn thành — cần tạo phiếu kiểm tra đầu ra',
        priority: 'high',
      })
    }

    // Rule: Final Check done → recommend Ready for Sale
    if (workflow === 'final_check') {
      recommendations.push({
        type: 'vehicle_needs_ready',
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
        reason: 'Phiếu đầu ra đã hoàn thành — sẵn sàng bán',
        priority: 'high',
      })
    }

    // Rule: Overdue — working > 7 days or any workflow > 14 days
    if (workflow === 'working' || workflow === 'final_check') {
      if (daysOld > 7) {
        recommendations.push({
          type: 'vehicle_overdue',
          vehicleId: vehicle.id,
          vehiclePlate: vehicle.plate,
          reason: `Đang xử lý hơn ${daysOld} ngày — cần kiểm tra tiến độ`,
          priority: 'high',
        })
      }
    } else if (daysOld > 14) {
      recommendations.push({
        type: 'vehicle_overdue',
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
        reason: `Không có hoạt động hơn ${daysOld} ngày`,
        priority: 'medium',
      })
    }

    // Rule: Vehicle with no tasks and no input checksheet → blocked
    if (workflow === 'new') {
      const hasCheckSheet = checkSheets.some((s) => s.vehicleId === vehicle.id)
      if (!hasCheckSheet) {
        recommendations.push({
          type: 'vehicle_blocked',
          vehicleId: vehicle.id,
          vehiclePlate: vehicle.plate,
          reason: 'Xe mới nhập chưa tạo phiếu kiểm tra — cần tạo phiếu đầu vào',
          priority: 'high',
        })
      }
    }
  }

  return recommendations
}

// ====== TASK RECOMMENDATIONS ======

function recommendTasks(
  tasks: Task[],
  vehicles: Vehicle[]
): TaskRecommendation[] {
  const recommendations: TaskRecommendation[] = []
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]))

  // Rule: Unassigned tasks
  const unassigned = tasks.filter((t) => t.status !== 'done' && !t.assigneeId && t.vehicleId)
  for (const task of unassigned) {
    const vehicle = vehicleMap.get(task.vehicleId!)
    recommendations.push({
      type: 'task_unassigned',
      taskId: task.id,
      taskTitle: task.title,
      vehicleId: task.vehicleId!,
      vehiclePlate: vehicle?.plate ?? '',
      priority: task.priority === 'urgent' || task.priority === 'priority' ? 'high' : 'medium',
      reason: 'Nhiệm vụ chưa được giao — cần phân công nhân viên',
    })
  }

  // Rule: Overdue tasks
  const overdue = tasks.filter((t) => t.status !== 'done' && isOverdue(t.dueDate) && t.vehicleId && t.assigneeId)
  for (const task of overdue) {
    const vehicle = vehicleMap.get(task.vehicleId!)
    recommendations.push({
      type: 'task_overdue',
      taskId: task.id,
      taskTitle: task.title,
      vehicleId: task.vehicleId!,
      vehiclePlate: vehicle?.plate ?? '',
      priority: 'high',
      reason: 'Nhiệm vụ quá hạn — cần xử lý ngay',
    })
  }

  // Rule: High/urgent priority tasks that are still in todo
  const urgentTodo = tasks.filter(
    (t) =>
      t.status === 'todo' &&
      (t.priority === 'urgent' || t.priority === 'priority') &&
      t.vehicleId
  )
  for (const task of urgentTodo) {
    // Skip if already added (e.g., as unassigned)
    if (recommendations.some((r) => r.taskId === task.id)) continue
    const vehicle = vehicleMap.get(task.vehicleId!)
    recommendations.push({
      type: 'task_high_priority',
      taskId: task.id,
      taskTitle: task.title,
      vehicleId: task.vehicleId!,
      vehiclePlate: vehicle?.plate ?? '',
      priority: 'high',
      reason: 'Nhiệm vụ ưu tiên cao chưa được thực hiện',
    })
  }

  return recommendations
}

// ====== EMPLOYEE RECOMMENDATIONS ======

function recommendEmployees(
  tasks: Task[],
  employees: Employee[]
): EmployeeRecommendation[] {
  const recommendations: EmployeeRecommendation[] = []

  // Count active (non-done) tasks per employee
  const activeTasksByEmployee = new Map<string, number>()
  for (const task of tasks) {
    if (task.status === 'done' || !task.assigneeId) continue
    activeTasksByEmployee.set(
      task.assigneeId,
      (activeTasksByEmployee.get(task.assigneeId) ?? 0) + 1
    )
  }

  // Rule: Idle employees (no active tasks)
  const idleEmployees = employees.filter((e) => {
    return (activeTasksByEmployee.get(e.id) ?? 0) === 0
  })
  for (const emp of idleEmployees) {
    recommendations.push({
      type: 'employee_idle',
      employeeId: emp.id,
      employeeName: emp.name,
      reason: 'Nhân viên hiện không có nhiệm vụ đang thực hiện',
      activeTaskCount: 0,
    })
  }

  // Rule: Underloaded employees (less than 2 active tasks)
  const underloaded = employees.filter((e) => {
    const count = activeTasksByEmployee.get(e.id) ?? 0
    return count > 0 && count < 2
  })
  for (const emp of underloaded) {
    recommendations.push({
      type: 'employee_underloaded',
      employeeId: emp.id,
      employeeName: emp.name,
      reason: `Nhân viên có ít nhiệm vụ đang thực hiện (${activeTasksByEmployee.get(emp.id)} nhiệm vụ)`,
      activeTaskCount: activeTasksByEmployee.get(emp.id) ?? 0,
    })
  }

  return recommendations
}

// ====== POSITION RECOMMENDATIONS ======

function recommendPositions(
  vehicles: Vehicle[],
  positions: { id: string; name: string }[]
): PositionRecommendation[] {
  const recommendations: PositionRecommendation[] = []

  const vehicleCountByPosition = new Map<string, number>()
  for (const vehicle of vehicles) {
    if (vehicle.status === 'sold' || !vehicle.positionId) continue
    vehicleCountByPosition.set(
      vehicle.positionId,
      (vehicleCountByPosition.get(vehicle.positionId) ?? 0) + 1
    )
  }

  // Rule: Crowded positions (more than 5 vehicles)
  for (const position of positions) {
    const count = vehicleCountByPosition.get(position.id) ?? 0
    if (count > 5) {
      recommendations.push({
        type: 'position_crowded',
        positionId: position.id,
        positionName: position.name,
        reason: `Vị trí có ${count} xe — nên phân bổ sang vị trí khác`,
        vehicleCount: count,
      })
    }
  }

  // Rule: Empty positions (no vehicles)
  for (const position of positions) {
    const count = vehicleCountByPosition.get(position.id) ?? 0
    if (count === 0) {
      recommendations.push({
        type: 'position_empty',
        positionId: position.id,
        positionName: position.name,
        reason: 'Vị trí hiện không có xe đậu',
        vehicleCount: 0,
      })
    }
  }

  return recommendations
}

// ====== MAIN EXPORT ======

export function getRecommendations(input: RecommendationInput): Recommendations {
  const { vehicles, tasks, employees, checkSheets } = input

  return {
    vehicles: recommendVehicles(vehicles, tasks, employees, checkSheets),
    tasks: recommendTasks(tasks, vehicles),
    employees: recommendEmployees(tasks, employees),
    positions: recommendPositions(vehicles, vehicles.map((v) => ({ id: v.positionId ?? '', name: '' })).filter((v) => v.id)),
  }
}

/**
 * Suggest the best employee for a given task based on current workload.
 * Returns the employee with the fewest active (non-done) tasks.
 */
export function suggestEmployeeForTask(
  taskId: string,
  tasks: Task[],
  employees: Employee[]
): Employee | null {
  const activeTasksByEmployee = new Map<string, number>()
  for (const task of tasks) {
    if (task.status === 'done' || !task.assigneeId) continue
    activeTasksByEmployee.set(
      task.assigneeId,
      (activeTasksByEmployee.get(task.assigneeId) ?? 0) + 1
    )
  }

  const sorted = [...employees].sort((a, b) => {
    const aCount = activeTasksByEmployee.get(a.id) ?? 0
    const bCount = activeTasksByEmployee.get(b.id) ?? 0
    return aCount - bCount
  })

  return sorted[0] ?? null
}
