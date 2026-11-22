import { apiGet, apiPost } from './api.client'
import type { AttendanceEntry } from '../types'

function mapRow(row: Record<string, unknown>): AttendanceEntry {
  return {
    id: row.id as string,
    employeeId: (row.user_id as string) ?? (row.employeeId as string),
    date: row.date as string,
    checkIn: (row.check_in as string | null) ?? (row.checkIn as string | null) ?? null,
    checkOut: (row.check_out as string | null) ?? (row.checkOut as string | null) ?? null,
    note: (row.note as string) ?? undefined,
  }
}

export async function getAttendanceEntries(): Promise<AttendanceEntry[]> {
  const data = await apiGet<Record<string, unknown>[]>('/api/attendance')
  return (data || []).map(mapRow)
}

export async function getAttendanceByDate(date: string): Promise<AttendanceEntry[]> {
  const data = await apiGet<Record<string, unknown>[]>(`/api/attendance?date=${encodeURIComponent(date)}`)
  return (data || []).map(mapRow)
}

export async function getAttendanceByEmployee(employeeId: string): Promise<AttendanceEntry[]> {
  const data = await apiGet<Record<string, unknown>[]>(`/api/attendance?employeeId=${encodeURIComponent(employeeId)}`)
  return (data || []).map(mapRow)
}

export async function createAttendanceEntry(
  entry: Omit<AttendanceEntry, 'id'>
): Promise<AttendanceEntry> {
  const data = await apiPost<Record<string, unknown>>('/api/attendance', entry)
  return mapRow(data)
}

export async function updateAttendanceEntry(
  id: string,
  patch: Partial<AttendanceEntry>
): Promise<AttendanceEntry> {
  const data = await apiPost<Record<string, unknown>>('/api/attendance', patch)
  return mapRow(data)
}

export async function deleteAttendanceEntry(id: string): Promise<void> {
  // Not used in standard flow
}

export async function findOrCreateTodayEntry(
  employeeId: string,
  today: string
): Promise<AttendanceEntry> {
  const entries = await getAttendanceByDate(today)
  const existing = entries.find((e) => e.employeeId === employeeId)
  if (existing) return existing

  return createAttendanceEntry({
    employeeId,
    date: today,
    checkIn: null,
    checkOut: null,
  })
}

export async function checkIn(employeeId: string): Promise<AttendanceEntry> {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 8)

  const entry = await findOrCreateTodayEntry(employeeId, today)
  if (entry.checkIn) {
    throw new Error('Đã chấm công vào hôm nay rồi')
  }

  return updateAttendanceEntry(entry.id, {
    ...entry,
    checkIn: time,
  })
}

export async function checkOut(employeeId: string): Promise<AttendanceEntry> {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 8)

  const entry = await findOrCreateTodayEntry(employeeId, today)
  if (!entry.checkIn) {
    throw new Error('Chưa chấm công vào hôm nay')
  }
  if (entry.checkOut) {
    throw new Error('Đã chấm công ra hôm nay rồi')
  }

  return updateAttendanceEntry(entry.id, {
    ...entry,
    checkOut: time,
  })
}
