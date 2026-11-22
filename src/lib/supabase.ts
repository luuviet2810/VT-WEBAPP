/**
 * Supabase Client (Legacy Data Source & Backup Link)
 *
 * QUY TẮC AN TOÀN:
 * - Admin Web hoạt động độc lập trên Neon PostgreSQL + Express Backend.
 * - Không yêu cầu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY để khởi chạy.
 * - Nếu không có biến môi trường Supabase (như trên Vercel Production),
 *   client này KHÔNG ném lỗi "supabaseUrl is required", mà trả về Safe Proxy
 *   để bảo vệ ứng dụng khỏi hiện tượng sập trang trắng.
 * - Dự án Supabase cũ được bảo toàn 100% làm nguồn backup lịch sử.
 */

import { createClient, type Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== ''
)

// Safe no-op proxy for disconnected mode
function createSafeProxy(): any {
  const noopPromise = () => Promise.resolve({ data: null, error: null })
  const chainable: any = () => new Proxy(noopPromise, {
    get: () => chainable,
    apply: () => chainable,
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

export const supabase: ReturnType<typeof createClient> = (
  isSupabaseConfigured
    ? createClient(supabaseUrl!, supabaseAnonKey!)
    : createSafeProxy()
) as ReturnType<typeof createClient>

export type { Session }
