import type { Task } from '../types'

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
export function buildTaskSummary(tasks: Task[]): TaskGroupSummary[] {
  const groups: TaskGroupSummary[] = []
  const incomplete = tasks.filter((t) => t.status !== 'done')

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