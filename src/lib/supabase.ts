/**
 * VT AUTO — Supabase Decoupled Stub
 *
 * TOÀN BỘ HỆ THỐNG ĐÃ CHUYỂN SANG:
 * - Neon PostgreSQL (Lakebase)
 * - Cloudflare R2 Object Storage
 * - Express JWT Backend
 *
 * Supabase đã hoàn toàn ngắt kết nối khỏi luồng chạy của ứng dụng.
 * File này chỉ đóng vai trò stub an toàn để giữ kiểu dữ liệu tương thích,
 * KHÔNG nhập thư viện @supabase/supabase-js và KHÔNG tạo kết nối mạng nào.
 */

export const isSupabaseConfigured = false

export interface Session {
  access_token?: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
  user?: {
    id: string
    email?: string
    role?: string
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

// Safe no-op proxy that never initiates any network requests
function createDecoupledStub(): any {
  const errorObj = { data: null, error: new Error('[Supabase Decoupled] Supabase is disabled. All data routes through Express/Neon.') }
  const noopPromise = () => Promise.resolve(errorObj)

  const chainable: any = () => new Proxy(noopPromise, {
    get: () => chainable,
    apply: () => chainable(),
  })

  return new Proxy({} as any, {
    get(_target, prop) {
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signOut: () => Promise.resolve({ error: null }),
        }
      }
      if (prop === 'storage') {
        return {
          from: () => ({
            upload: () => Promise.resolve({ data: null, error: new Error('Supabase Storage is disconnected') }),
            getPublicUrl: () => ({ data: { publicUrl: '' } }),
            remove: () => Promise.resolve({ data: null, error: null }),
          }),
        }
      }
      if (prop === 'channel' || prop === 'removeChannel') {
        return () => ({
          on: () => ({ subscribe: () => {} }),
          subscribe: () => {},
        })
      }
      return chainable
    },
  })
}

export const supabase: any = createDecoupledStub()
