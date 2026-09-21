import { createContext, useContext, useEffect, useState } from 'react'
import { getWebsiteSettings } from '../services/websiteSettings.service'
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
    getWebsiteSettings().then((row) => {
      if (!row || cancelled) return
      setSettings({
        address1: row.office_address_1,
        address2: row.office_address_2,
        phoneDisplay: row.phone_display,
        phoneRaw: row.phone_raw,
        kakaoUrl: row.kakao_url,
        tiktokUrl: row.tiktok_url,
        tiktokDisplay: row.tiktok_display,
        facebookUrl: row.facebook_url,
        messengerUrl: row.messenger_url,
      })
    })
    return () => { cancelled = true }
  }, [])

  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>
}

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext)
}
