import { supabase } from '../lib/supabase'
import type { Employee } from '../types'

type UserRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  role: string
  is_admin: boolean
  status: string
  disabled: boolean
  avatar: string | null
  created_at?: string
  updated_at?: string
}

function mapRowToEmployee(row: UserRow): Employee {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    isAdmin: row.is_admin,
    disabled: row.disabled,
  }
}

export async function getEmployees(): Promise<Employee[]> {
  const { data, error, status, statusText } = await supabase
    .from('users')
    .select('*')
    .order('name', { ascending: true })

  console.log('🔵 [users.service] getEmployees()')
  console.log('   data:', JSON.stringify(data, null, 2))
  console.log('   error:', error)
  console.log('   status:', status)
  console.log('   statusText:', statusText)

  if (error) throw error
  return (data as UserRow[]).map(mapRowToEmployee)
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapRowToEmployee(data as UserRow)
}

export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee> {
  const updateData: Record<string, unknown> = {}
  if (patch.name !== undefined) updateData.name = patch.name
  if (patch.phone !== undefined) updateData.phone = patch.phone ?? null
  if (patch.isAdmin !== undefined) updateData.is_admin = patch.isAdmin
  if (patch.disabled !== undefined) updateData.disabled = patch.disabled

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapRowToEmployee(data as UserRow)
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)

  if (error) throw error
}
