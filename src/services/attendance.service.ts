import { supabase } from '../lib/supabase'
import type { AttendanceEntry } from '../types'

function mapRow(row: Record<string, unknown>): AttendanceEntry {
  return {
    id: row.id as string,
    employeeId: row.user_id as string,
    date: row.date as string,
    checkIn: row.check_in as string | null,
    checkOut: row.check_out as string | null,
    note: row.note as string | undefined,
  }
}

export async function getAttendanceEntries(): Promise<AttendanceEntry[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function getAttendanceByDate(date: string): Promise<AttendanceEntry[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', date)

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function getAttendanceByEmployee(employeeId: string): Promise<AttendanceEntry[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', employeeId)
    .order('date', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function createAttendanceEntry(
  entry: Omit<AttendanceEntry, 'id'>
): Promise<AttendanceEntry> {
  const { data, error } = await supabase
    .from('attendance')
    .insert({
      user_id: entry.employeeId,
      date: entry.date,
      check_in: entry.checkIn ?? null,
      check_out: entry.checkOut ?? null,
      note: entry.note ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return mapRow(data as Record<string, unknown>)
}

export async function updateAttendanceEntry(
  id: string,
  patch: Partial<AttendanceEntry>
): Promise<AttendanceEntry> {
  const updateData: Record<string, unknown> = {}
  if (patch.checkIn !== undefined) updateData.check_in = patch.checkIn
  if (patch.checkOut !== undefined) updateData.check_out = patch.checkOut
  if (patch.note !== undefined) updateData.note = patch.note ?? null

  const { data, error } = await supabase
    .from('attendance')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapRow(data as Record<string, unknown>)
}

export async function deleteAttendanceEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Find or create today's entry for an employee
export async function findOrCreateTodayEntry(
  employeeId: string,
  date: string
): Promise<AttendanceEntry | null> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', employeeId)
    .eq('date', date)
    .limit(1)

  if (error) throw error
  if (data && data.length > 0) {
    return mapRow(data[0] as Record<string, unknown>)
  }
  return null
}

export async function checkIn(employeeId: string): Promise<AttendanceEntry> {
  const date = new Date().toISOString().slice(0, 10)
  const time = new Date().toTimeString().slice(0, 5)

  const existing = await findOrCreateTodayEntry(employeeId, date)
  if (existing) {
    if (existing.checkIn) {
      return existing // Already checked in
    }
    return updateAttendanceEntry(existing.id, { checkIn: time })
  }

  return createAttendanceEntry({
    employeeId,
    date,
    checkIn: time,
    checkOut: null,
    note: undefined,
  })
}

export async function checkOut(employeeId: string): Promise<AttendanceEntry> {
  const date = new Date().toISOString().slice(0, 10)
  const time = new Date().toTimeString().slice(0, 5)

  const existing = await findOrCreateTodayEntry(employeeId, date)
  if (existing) {
    if (existing.checkOut) {
      return existing // Already checked out
    }
    return updateAttendanceEntry(existing.id, { checkOut: time })
  }

  return createAttendanceEntry({
    employeeId,
    date,
    checkIn: null,
    checkOut: time,
    note: undefined,
  })
}
