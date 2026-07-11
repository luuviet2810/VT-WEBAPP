// ====== DASHBOARD VIEW MODEL ======

import { useMemo } from 'react'
import { useStore } from '../../../store/useStore'
import { todayISO } from '../../../utils/format'
import type { Vehicle, Task, Position, Employee, AttendanceEntry, CheckSheet, MoveLog } from '../../../types'

export interface KpiData {
  noInputCheck: number
  needPolish: number
  washing: number
  needTasks: number
}

export interface AttendanceData {
  checkedIn: number
  working: number
  notCheckedIn: number
  totalActive: number
  percentage: number
}

export interface LiveFeedItem {
  id: string
  time: string
  employee: string
  action: string
  vehicle: string
  timestamp: number
}

export interface LocationItem {
  name: string
  count: number
  color: string
}

export interface WarningItem {
  label: string
  count: number
  severity: 'red' | 'amber'
  key: string
}

export interface WorkflowColumn {
  title: string
  vehicles: { id: string; plate: string; model: string; task: string }[]
  extra: number
}

export interface TaskItem {
  id: string
  vehicle: string
  title: string
  plate?: string
  location?: string
  status: string
  assigneeId?: string | null
}

export interface QuickStats {
  total: number
  sold: number
  pending: number
  washing: number
}

export function useDashboardViewModel() {
  const vehicles = useStore((s) => s.vehicles)
  const tasks = useStore((s) => s.tasks)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const checkSheets = useStore((s) => s.checkSheets)
  const moveLogs = useStore((s) => s.moveLogs)
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)

  const today = todayISO()

  return useMemo(() => {
    // ===== KPI =====
    const activeVehicles = vehicles.filter((v) => v.status !== 'sold')
    const noInputCheck = activeVehicles.filter((v) =>
      !checkSheets.some((c) => c.vehicleId === v.id && c.type === 'in')
    ).length

    const needPolish = activeVehicles.filter((v) =>
      tasks.some((t) => t.vehicleId === v.id && t.status !== 'done' &&
        t.title.toLowerCase().includes('đánh bóng'))
    ).length

    const washing = activeVehicles.filter((v) =>
      tasks.some((t) => t.vehicleId === v.id && t.status !== 'done' &&
        t.title.toLowerCase().includes('rửa'))
    ).length

    const needTasks = tasks.filter((t) => t.status !== 'done').length

    const kpi: KpiData = { noInputCheck, needPolish, washing, needTasks }

    // ===== ATTENDANCE =====
    const todayAtt = attendance.filter((a) => a.date === today)
    const activeEmps = employees.filter((e) => !e.disabled)
    const checkedIn = todayAtt.filter((a) => a.checkIn).length
    const working = todayAtt.filter((a) => a.checkIn && !a.checkOut).length
    const notCheckedIn = activeEmps.filter(
      (e) => !todayAtt.some((a) => a.employeeId === e.id)
    ).length
    const percentage = activeEmps.length > 0 ? Math.round((checkedIn / activeEmps.length) * 100) : 0

    const attendanceData: AttendanceData = { checkedIn, working, notCheckedIn, totalActive: activeEmps.length, percentage }

    // ===== LIVE FEED =====
    const feedItems: LiveFeedItem[] = moveLogs
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 8)
      .map((log) => {
        const v = vehicles.find((ve) => ve.id === log.vehicleId)
        const emp = employees.find((e) => e.id === log.employeeId)
        const toPos = positions.find((p) => p.id === log.toPositionId)
        return {
          id: log.id,
          time: log.createdAt.slice(11, 16),
          employee: emp?.name || '—',
          action: `Di chuyển đến ${toPos?.name || '—'}`,
          vehicle: v?.plate || '—',
          timestamp: new Date(log.createdAt).getTime(),
        }
      })

    // ===== LOCATIONS =====
    const locationColors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#f97316']
    const locationData: LocationItem[] = positions.map((p, i) => ({
      name: p.name,
      count: vehicles.filter((v) => v.positionId === p.id && v.status !== 'sold').length,
      color: locationColors[i % locationColors.length],
    }))
    // Add "no position" row
    const noPosCount = activeVehicles.filter((v) => !v.positionId).length
    if (noPosCount > 0) {
      locationData.unshift({ name: 'Chưa phân bổ', count: noPosCount, color: '#94a3b8' })
    }

    // ===== WARNINGS =====
    const warnings: WarningItem[] = [
      { label: 'Xe thiếu CheckSheet', count: activeVehicles.filter((v) => !checkSheets.some((c) => c.vehicleId === v.id)).length, severity: 'red', key: 'no_cs' },
      { label: 'Xe chưa có ảnh', count: activeVehicles.filter((v) => v.images.length === 0).length, severity: 'amber', key: 'no_img' },
      { label: 'Xe chưa định giá', count: activeVehicles.filter((v) => !v.sellPrice).length, severity: 'amber', key: 'no_price' },
      { label: 'Xe quá hạn rửa máy', count: activeVehicles.filter((v) => tasks.some((t) => t.vehicleId === v.id && t.status !== 'done' && t.title.toLowerCase().includes('rửa'))).length, severity: 'red', key: 'overdue_wash' },
    ]

    // ===== WORKFLOW =====
    const workflowColumns: WorkflowColumn[] = [
      { title: 'Chờ song nưng', vehicles: [], extra: 0 },
      { title: 'Rửa máy', vehicles: [], extra: 0 },
      { title: 'Đánh bóng', vehicles: [], extra: 0 },
      { title: 'Đánh bóng Wolpyong', vehicles: [], extra: 0 },
      { title: 'Song nưng dưới này', vehicles: [], extra: 0 },
    ]

    // Map tasks to workflow columns
    for (const col of workflowColumns) {
      const kw = col.title.toLowerCase()
      const matched = tasks
        .filter((t) => t.status !== 'done' && t.title.toLowerCase().includes(kw))
        .map((t) => {
          const v = vehicles.find((ve) => ve.id === t.vehicleId)
          return { id: t.id, plate: v?.plate || '—', model: v?.model || '', task: t.title }
        })
        .filter((v) => v.plate !== '—')
      // Deduplicate by plate
      const seen = new Set<string>()
      const deduped = matched.filter((v) => {
        if (seen.has(v.plate)) return false
        seen.add(v.plate)
        return true
      })
      col.vehicles = deduped.slice(0, 6)
      col.extra = Math.max(0, deduped.length - 6)
    }

    // ===== MY TASKS =====
    const myTasks: TaskItem[] = tasks
      .filter((t) => t.assigneeId === currentEmployeeId && t.status !== 'done')
      .slice(0, 10)
      .map((t) => {
        const v = vehicles.find((ve) => ve.id === t.vehicleId)
        const pos = v?.positionId ? positions.find((p) => p.id === v.positionId) : undefined
        return {
          id: t.id,
          vehicle: v?.plate || '',
          plate: v?.plate,
          title: t.title,
          location: pos?.name,
          status: t.status,
          assigneeId: t.assigneeId,
        }
      })

    const assignedToMe: TaskItem[] = tasks
      .filter((t) => t.assigneeId !== currentEmployeeId && t.status !== 'done')
      .slice(0, 10)
      .map((t) => {
        const v = vehicles.find((ve) => ve.id === t.vehicleId)
        return {
          id: t.id,
          vehicle: v?.plate || '',
          plate: v?.plate,
          title: t.title,
          status: t.status,
          assigneeId: t.assigneeId,
        }
      })

    // ===== QUICK STATS =====
    const quickStats: QuickStats = {
      total: vehicles.length,
      sold: vehicles.filter((v) => v.status === 'sold').length,
      pending: vehicles.filter((v) => v.status === 'deposited').length,
      washing,
    }

    return {
      kpi,
      attendanceData,
      feedItems,
      locationData,
      warnings,
      workflowColumns,
      myTasks,
      assignedToMe,
      quickStats,
      vehicles,
      today,
    }
  }, [vehicles, tasks, positions, employees, attendance, checkSheets, moveLogs, currentEmployeeId, today])
}
