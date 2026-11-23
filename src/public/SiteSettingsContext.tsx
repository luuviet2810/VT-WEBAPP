import { createContext, useContext, useEffect, useState } from 'react'
import { apiGet } from '../services/api.client'
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from './contactConfig'

/**
 * SiteSettingsProvider — load website_settings (DB) một lần khi mở
 * Public Web; fallback DEFAULT_SITE_SETTINGS khi bảng chưa tồn tại.
 * Footer + ContactBubble đọc qua useSiteSettings() — không hardcode link.
 */
const SiteSettingsContext = createContext<SiteSettings>(DEFAULT_SITE_SETTINGS)

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)

  useEffect(() => {
    let cancelled = false
    apiGet<any>('/api/public/settings')
      .then((row) => {
        if (!row || cancelled) return
        setSettings({
          address1: row.office_address_1 || row.address1,
          address2: row.office_address_2 || row.address2,
          phoneDisplay: row.phone_display || row.phoneDisplay,
          phoneRaw: row.phone_raw || row.phoneRaw,
          kakaoUrl: row.kakao_url || row.kakaoUrl,
          tiktokUrl: row.tiktok_url || row.tiktokUrl,
          tiktokDisplay: row.tiktok_display || row.tiktokDisplay,
          facebookUrl: row.facebook_url || row.facebookUrl,
          messengerUrl: row.messenger_url || row.messengerUrl,
        })
      })
      .catch(() => {
        // Fallback to default site settings
      })
    return () => { cancelled = true }
  }, [])

  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>
}

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext)
}
