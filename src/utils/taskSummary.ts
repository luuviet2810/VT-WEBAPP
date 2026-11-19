import type { Task, Vehicle } from '../types'

export function isActiveVehicleTask(task: Task, vehicles: Vehicle[]): boolean {
  if (task.status === 'done') return false
  if (!task.vehicleId) return !task.ruleId && !task.vehicleModelSnapshot && !task.vehiclePlateSnapshot
  const vehicle = vehicles.find((v) => v.id === task.vehicleId)
  return Boolean(vehicle && vehicle.status !== 'sold')
}

export interface TaskGroupSummary {
  key: string
  label: string
  icon: string
  count: number
  isManual: boolean
  tasks: Task[]
}

// Build read-only task summary groups from current incomplete tasks.
// Manual → grouped as one "Việc ngoài", counted by task.
// Auto   → grouped by title, counted by unique vehicles.
export function buildTaskSummary(tasks: Task[], vehicles?: Vehicle[]): TaskGroupSummary[] {
  const groups: TaskGroupSummary[] = []
  // Tổng quan chỉ phản ánh xe đang hoạt động. Task của xe sold vẫn
  // tồn tại và hiển thị trong Kanban "Xe đã bán", nhưng không tính ở đây.
  // Task không vehicle_id chỉ được giữ nếu là task thủ công (việc ngoài).
  const incomplete = vehicles
    ? tasks.filter((t) => isActiveVehicleTask(t, vehicles))
    : tasks.filter((t) => t.status !== 'done')

  const manualTasks = incomplete.filter((t) => !t.ruleId)
  if (manualTasks.length > 0) {
    groups.push({
      key: 'manual',
      label: 'Việc ngoài',
      icon: '🔧',
      count: manualTasks.length,
      isManual: true,
      tasks: manualTasks,
    })
  }

  const byTitle = new Map<string, Task[]>()
  for (const t of incomplete) {
    if (!t.ruleId) continue
    const list = byTitle.get(t.title) || []
    list.push(t)
    byTitle.set(t.title, list)
  }

  for (const [title, groupTasks] of byTitle) {
    const uniqueVehicles = new Set(groupTasks.map((t) => t.vehicleId).filter(Boolean))
    groups.push({
      key: 'auto-' + title,
      label: title,
      icon: '🤖',
      count: uniqueVehicles.size,
      isManual: false,
      tasks: groupTasks,
    })
  }

  return groups.sort((a, b) => (a.isManual ? -1 : b.isManual ? 1 : b.count - a.count))
}