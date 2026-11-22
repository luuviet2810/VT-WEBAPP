/**
 * VT AUTO — Shared API Client
 *
 * Tự động gắn JWT Bearer token từ localStorage (vtauto_auth_token)
 * Chuẩn hóa lỗi HTTP, phân biệt 401/403/500
 * Không log token hoặc mật khẩu ra console
 */

import { getAuthToken, clearAuthToken } from './auth.service'

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  'http://localhost:3001'

export class ApiError extends Error {
  public statusCode: number
  public errorCode?: string
  public details?: any

  constructor(message: string, statusCode: number, errorCode?: string, details?: any) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.details = details
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL.replace(/\/$/, '')
}

export async function apiClient<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${getApiBaseUrl()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const token = getAuthToken()
  const headers = new Headers(init?.headers || {})

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })

  let body: any = null
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    try {
      body = await response.json()
    } catch {
      body = null
    }
  } else {
    try {
      body = await response.text()
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    const errorMsg =
      body?.message || body?.error || `Yêu cầu API thất bại (${response.status}: ${response.statusText})`
    const errorCode = body?.error || (response.status === 401 ? 'unauthorized' : 'api_error')

    if (response.status === 401) {
      console.warn('[API Client] Phiên làm việc đã hết hạn hoặc không có quyền truy cập.')
    }

    throw new ApiError(errorMsg, response.status, errorCode, body)
  }

  // Tự động unwrap nếu server trả về dạng { ok: true, data: ... }
  if (body && typeof body === 'object' && 'ok' in body && 'data' in body) {
    return body.data as T
  }

  return body as T
}

export function apiGet<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
  return apiClient<T>(endpoint, { ...init, method: 'GET' })
}

export function apiPost<T = any>(endpoint: string, body?: any, init?: RequestInit): Promise<T> {
  return apiClient<T>(endpoint, {
    ...init,
    method: 'POST',
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })
}

export function apiPut<T = any>(endpoint: string, body?: any, init?: RequestInit): Promise<T> {
  return apiClient<T>(endpoint, {
    ...init,
    method: 'PUT',
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })
}

export function apiPatch<T = any>(endpoint: string, body?: any, init?: RequestInit): Promise<T> {
  return apiClient<T>(endpoint, {
    ...init,
    method: 'PATCH',
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })
}

export function apiDelete<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
  return apiClient<T>(endpoint, { ...init, method: 'DELETE' })
}
