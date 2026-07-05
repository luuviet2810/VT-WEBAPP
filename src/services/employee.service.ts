import { supabase } from '../lib/supabase'
import type { Employee } from '../types'

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return (data as Array<{
    id: string
    name: string
    phone: string | null
    is_admin: boolean
    disabled: boolean
    created_at?: string
    updated_at?: string
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    isAdmin: row.is_admin,
    disabled: row.disabled,
  }))
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  const row = data as {
    id: string
    name: string
    phone: string | null
    is_admin: boolean
    disabled: boolean
    created_at?: string
    updated_at?: string
  }
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    isAdmin: row.is_admin,
    disabled: row.disabled,
  }
}

export async function createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      name: employee.name,
      phone: employee.phone ?? null,
      is_admin: employee.isAdmin,
      disabled: employee.disabled,
    })
    .select()
    .single()

  if (error) throw error

  const row = data as {
    id: string
    name: string
    phone: string | null
    is_admin: boolean
    disabled: boolean
    created_at?: string
    updated_at?: string
  }
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    isAdmin: row.is_admin,
    disabled: row.disabled,
  }
}

export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee> {
  const updateData: Record<string, unknown> = {}
  if (patch.name !== undefined) updateData.name = patch.name
  if (patch.phone !== undefined) updateData.phone = patch.phone ?? null
  if (patch.isAdmin !== undefined) updateData.is_admin = patch.isAdmin
  if (patch.disabled !== undefined) updateData.disabled = patch.disabled

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  const row = data as {
    id: string
    name: string
    phone: string | null
    is_admin: boolean
    disabled: boolean
    created_at?: string
    updated_at?: string
  }
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    isAdmin: row.is_admin,
    disabled: row.disabled,
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)

  if (error) throw error
}
