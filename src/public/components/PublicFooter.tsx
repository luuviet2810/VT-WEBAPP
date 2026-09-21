import logo from '../../assets/logo-vtauto.png'
import { Facebook, MessageCircle, MessageSquare, Music2, Phone } from 'lucide-react'
import { SITE_CONFIG } from '../contactConfig'
import { useSiteSettings } from '../SiteSettingsContext'

/**
 * Footer Public Web — cùng logo asset với Header.
 * Địa chỉ + link đọc từ website_settings (useSiteSettings);
 * mục nào trống thì tự ẩn, không render link giả.
 */
export default function PublicFooter() {
  const s = useSiteSettings()

  const addresses = [s.address1, s.address2].filter(Boolean)
  const contactLinks = [
    { key: 'phone', icon: <Phone size={13} />, label: s.phoneDisplay, href: s.phoneRaw ? `tel:${s.phoneRaw}` : '' },
    { key: 'kakao', icon: <MessageSquare size={13} />, label: 'KakaoTalk', href: s.kakaoUrl },
    { key: 'tiktok', icon: <Music2 size={13} />, label: `TikTok ${s.tiktokDisplay}`, href: s.tiktokUrl },
    { key: 'facebook', icon: <Facebook size={13} />, label: 'Facebook', href: s.facebookUrl },
    { key: 'messenger', icon: <MessageCircle size={13} />, label: 'Messenger', href: s.messengerUrl },
  ].filter((l) => !!l.href && !!l.label)

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white pb-24 pt-8">
      <div className="mx-auto max-w-3xl space-y-4 px-4 text-center">
        {/* Logo — cùng asset với Header (ảnh đã chứa tagline) */}
        <img
          src={logo}
          alt={`${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`}
          className="mx-auto h-12 w-auto max-w-full object-contain"
          draggable={false}
        />

        {/* Địa chỉ văn phòng */}
        {addresses.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Địa chỉ văn phòng</div>
            {addresses.map((a) => (
              <div key={a} className="break-words text-xs text-slate-600">📍 {a}</div>
            ))}
          </div>
        )}

        {/* Liên hệ */}
        {contactLinks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Liên hệ</div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
              {contactLinks.map((l) => (
                <a
                  key={l.key}
                  href={l.href}
                  target={l.href.startsWith('tel:') ? undefined : '_blank'}
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
                >
                  {l.icon}
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 text-[11px] text-slate-400">{SITE_CONFIG.copyright}</div>
      </div>
    </footer>
  )
}
