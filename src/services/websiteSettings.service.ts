import { apiGet, apiPut } from './api.client'

/**
 * website_settings — cấu hình liên hệ GLOBAL của Public Web.
 * Read: mọi role đã xác thực.
 * Update: chỉ Admin — gọi từ Pre-Web.
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

export async function getWebsiteSettings(): Promise<WebsiteSettingsRow | null> {
  try {
    const data = await apiGet<WebsiteSettingsRow | null>('/api/website-settings')
    return data ?? null
  } catch (err: any) {
    console.warn('[websiteSettings] read failed:', err.message)
    return null
  }
}

export async function updateWebsiteSettings(patch: Partial<Omit<WebsiteSettingsRow, 'id' | 'updated_at'>>): Promise<void> {
  await apiPut('/api/website-settings', patch)
}
