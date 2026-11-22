import { apiGet, apiPut } from './api.client'
import type { Employee } from '../types'

type UserRow = {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  role: string
  isAdmin?: boolean
  is_admin?: boolean
  status: string
  disabled: boolean
  avatar?: string | null
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

function mapRowToEmployee(row: UserRow): Employee {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    isAdmin: Boolean(row.isAdmin || row.is_admin || row.role === 'admin'),
    disabled: Boolean(row.disabled),
  }
}

export async function getEmployees(): Promise<Employee[]> {
  const data = await apiGet<UserRow[]>('/api/employees')
  return (data || []).map(mapRowToEmployee)
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    const data = await apiGet<UserRow>(`/api/employees/${id}`)
    if (!data) return null
    return mapRowToEmployee(data)
  } catch (err: any) {
    if (err.statusCode === 404) return null
    throw err
  }
}

export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee> {
  const data = await apiPut<UserRow>(`/api/employees/${id}`, patch)
  return mapRowToEmployee(data)
}

export async function deleteEmployee(id: string): Promise<void> {
  // Soft disable user
  await apiPut(`/api/employees/${id}`, { disabled: true })
}
