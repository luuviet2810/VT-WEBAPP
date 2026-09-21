import { supabase } from '../lib/supabase'

/**
 * website_settings — cấu hình liên hệ GLOBAL của Public Web (migration 035).
 * Read: mọi role (Public Web dùng anon key).
 * Update: chỉ Admin (RLS check role 'admin' ở tầng DB) — gọi từ Pre-Web.
 */
export interface WebsiteSettingsRow {
  id: number
  office_address_1: string
  office_address_2: string
  phone_display: string
  phone_raw: string
  kakao_url: string
  tiktok_url: string
  tiktok_display: string
  facebook_url: string
  messenger_url: string
  updated_at: string
}

/** NULL khi bảng chưa tồn tại (migration 035 chưa chạy) → caller dùng defaults. */
export async function getWebsiteSettings(): Promise<WebsiteSettingsRow | null> {
  const { data, error } = await supabase
    .from('website_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    console.warn('[websiteSettings] read failed (migration 035 chưa chạy?):', error.message)
    return null
  }
  return (data as WebsiteSettingsRow) ?? null
}

export async function updateWebsiteSettings(patch: Partial<Omit<WebsiteSettingsRow, 'id' | 'updated_at'>>): Promise<void> {
  const { error } = await supabase
    .from('website_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
}
