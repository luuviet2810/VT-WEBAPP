import { useState } from 'react'
import { Facebook, MessageCircle, MessageSquare, Music2, Phone, X } from 'lucide-react'
import { SITE_CONFIG } from '../contactConfig'

/**
 * Nút bong bóng liên hệ cố định góc dưới phải — đọc TOÀN BỘ link
 * từ SITE_CONFIG (không hardcode). Kênh nào chưa có URL thật ('')
 * thì tự ẩn. Mở: animation nhẹ, danh sách rõ ràng.
 */
export default function ContactBubble() {
  const [open, setOpen] = useState(false)

  const channels = [
    { key: 'phone', label: 'Gọi điện', href: `tel:${SITE_CONFIG.phoneRaw}`, bg: 'bg-green-500', icon: <Phone size={20} className="text-white" /> },
    { key: 'kakao', label: 'KakaoTalk', href: SITE_CONFIG.kakao, bg: 'bg-[#FEE500]', icon: <MessageSquare size={20} className="text-slate-900" /> },
    { key: 'facebook', label: 'Facebook', href: SITE_CONFIG.facebook, bg: 'bg-[#1877F2]', icon: <Facebook size={20} className="text-white" /> },
    { key: 'messenger', label: 'Messenger', href: SITE_CONFIG.messenger, bg: 'bg-[#0084FF]', icon: <MessageCircle size={20} className="text-white" /> },
    { key: 'tiktok', label: 'TikTok', href: SITE_CONFIG.tiktok, bg: 'bg-slate-900', icon: <Music2 size={20} className="text-white" /> },
  ].filter((c) => !!c.href)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2.5">
      {/* Backdrop nhẹ khi mở — bấm ra ngoài để đóng */}
      {open && <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />}

      {channels.map((c, i) => (
        <a
          key={c.key}
          href={c.href}
          target={c.href.startsWith('tel:') ? undefined : '_blank'}
          rel="noreferrer"
          className={`flex items-center gap-2 transition-all duration-200 ease-out ${
            open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
          }`}
          style={{ transitionDelay: open ? `${i * 40}ms` : '0ms' }}
        >
          <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-white shadow">{c.label}</span>
          <span className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg ${c.bg}`}>{c.icon}</span>
        </a>
      ))}

      <button
        type="button"
        aria-label="Liên hệ"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  )
}
