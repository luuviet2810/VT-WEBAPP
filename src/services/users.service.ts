import { apiGet, apiPost, apiPut, apiDelete } from './api.client'
import type { Employee, UserRole, UserStatus } from '../types'
import type { AuthProfile } from './auth.service'

export type UserRow = {
  id: string
  authId?: string
  auth_id?: string
  name: string
  fullName?: string
  phone?: string | null
  email?: string | null
  role: string
  isAdmin?: boolean
  is_admin?: boolean
  status: string
  disabled: boolean
  passkeyEnabled?: boolean
  passkey_enabled?: boolean
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

function mapRowToAuthProfile(row: UserRow): AuthProfile {
  const name = row.name || ''
  return {
    id: row.id,
    authId: row.authId || row.auth_id || row.id,
    name,
    fullName: row.fullName || name,
    email: row.email || '',
    role: (row.role as UserRole) || 'staff',
    status: (row.status as UserStatus) || 'pending',
    disabled: Boolean(row.disabled),
    passkeyEnabled: Boolean(row.passkeyEnabled || row.passkey_enabled),
    phone: row.phone ?? null,
    avatar: row.avatar ?? null,
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
    updatedAt: row.updatedAt || row.updated_at || new Date().toISOString(),
  }
}

export async function getUsers(): Promise<AuthProfile[]> {
  const data = await apiGet<UserRow[]>('/api/employees')
  return (data || []).map(mapRowToAuthProfile)
}

export async function updateUser(id: string, patch: Partial<AuthProfile | { name?: string; role?: string; status?: string; disabled?: boolean; phone?: string | null }>): Promise<AuthProfile> {
  const data = await apiPut<UserRow>(`/api/employees/${id}`, patch)
  return mapRowToAuthProfile(data)
}

export async function deleteUser(id: string): Promise<void> {
  await apiDelete(`/api/employees/${id}`)
}

export async function approveUser(id: string): Promise<AuthProfile> {
  const data = await apiPost<UserRow>(`/api/employees/${id}/approve`)
  return mapRowToAuthProfile(data)
}

export async function rejectUser(id: string): Promise<AuthProfile> {
  const data = await apiPost<UserRow>(`/api/employees/${id}/reject`)
  return mapRowToAuthProfile(data)
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
