/**
 * Supabase Decoupled Stub (Backend)
 *
 * Backend runs 100% on Neon PostgreSQL and Cloudflare R2.
 * Supabase is permanently disconnected from runtime operations.
 */

export const SUPABASE_URL = ''
export const SUPABASE_SERVICE_ROLE_KEY = ''
export const isSupabaseConfigured = false

function createSafeStub(): any {
  const chainable: any = () => new Proxy(() => Promise.resolve({ data: null, error: null }), {
    get: () => chainable,
    apply: () => chainable(),
  })

  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  }
}

export const supabaseAdmin: any = createSafeStub()
