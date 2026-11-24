/**
 * VT AUTO — Shared API Client
 *
 * Tự động gắn JWT Bearer token từ localStorage (vtauto_auth_token)
 * Chuẩn hóa lỗi HTTP, phân biệt 401/403/500
 * Không log token hoặc mật khẩu ra console
 */

import { getAuthToken, clearAuthToken } from './auth.service'

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

/**
 * Lấy API Base URL chuẩn hóa (loại bỏ trailing slash).
 *
 * Quy tắc môi trường nghiêm ngặt:
 * 1. Trong môi trường Production (import.meta.env.PROD):
 *    - Bắt buộc sử dụng URL từ import.meta.env.VITE_API_URL.
 *    - Tuyệt đối KHÔNG fallback sang localhost:3001.
 *    - Nếu thiếu biến môi trường hoặc cấu hình nhầm localhost, ném lỗi cấu hình rõ ràng để phát hiện ngay.
 * 2. Trong môi trường Development (import.meta.env.DEV):
 *    - Ưu tiên import.meta.env.VITE_API_URL nếu có.
 *    - Chỉ cho phép fallback sang http://localhost:3001 khi chạy local dev.
 */
export function getApiBaseUrl(): string {
  // Trong môi trường Development (DEV), cho phép fallback về localhost
  if (import.meta.env.DEV) {
    const devUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').trim()
    return devUrl.replace(/\/$/, '')
  }

  // Trong môi trường Production (PROD), tuyệt đối không chứa hay fallback về localhost
  const envUrl = (import.meta.env.VITE_API_URL || '').trim()

  if (!envUrl) {
    const errorMsg =
      '[CRITICAL CONFIG ERROR] VITE_API_URL chưa được cấu hình cho môi trường Production! Vui lòng thiết lập VITE_API_URL=https://vt-webapp.onrender.com trên Vercel.'
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
    const errorMsg =
      `[CRITICAL CONFIG ERROR] Phát hiện cấu hình URL localhost trong môi trường Production (${envUrl})! Production bắt buộc phải kết nối Backend Render: https://vt-webapp.onrender.com.`
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  return envUrl.replace(/\/$/, '')
}

export async function apiClient<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${getApiBaseUrl()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const token = (getAuthToken() || '').trim()
  const headers = new Headers(init?.headers || {})

  // Tự động gắn header Authorization Bearer nếu có token hợp lệ
  if (token && token !== 'undefined' && token !== 'null') {
    const existingAuth = headers.get('Authorization')
    if (!existingAuth || existingAuth.includes('undefined') || existingAuth.includes('null')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  } else {
    // Nếu chưa đăng nhập và gọi API nghiệp vụ yêu cầu quyền, từ chối sớm để tránh spam request 401 lên server
    const isPublic =
      endpoint.startsWith('/api/public') ||
      endpoint.startsWith('/api/auth/login') ||
      endpoint.startsWith('/api/auth/verify')
    if (!isPublic && (
      endpoint.startsWith('/api/vehicles') ||
      endpoint.startsWith('/api/positions') ||
      endpoint.startsWith('/api/employees') ||
      endpoint.startsWith('/api/tasks') ||
      endpoint.startsWith('/api/checksheets') ||
      endpoint.startsWith('/api/attendance') ||
      endpoint.startsWith('/api/move-logs')
    )) {
      console.warn(`[API Client] Hủy request đến "${endpoint}" do chưa có JWT Token xác thực.`)
      throw new ApiError('Chưa đăng nhập. Vui lòng đăng nhập để truy cập dữ liệu.', 401, 'unauthorized')
    }
  }

  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  // Bổ sung timeout 45s (đủ thời gian cho Render Free wake up từ cold-start, tránh treo loading vô hạn)
  const controller = new AbortController()
  const timeoutMs = 45000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      signal: init?.signal || controller.signal,
      headers,
    })
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError(
        'Kết nối máy chủ bị quá thời gian (Timeout 45s). Máy chủ có thể đang thức dậy, vui lòng thử lại.',
        408,
        'timeout'
      )
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

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
