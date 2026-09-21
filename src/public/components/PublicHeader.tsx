import logo from '../../assets/logo-vtauto.png'
import { SITE_CONFIG } from '../contactConfig'

/**
 * Header Public Web — MỘT logo image duy nhất (asset dùng chung
 * với Footer và Admin sidebar), giữ nguyên tỷ lệ (object-contain,
 * w-auto). Không logo text. Tagline hiển thị dưới logo.
 */
export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-2.5">
        {/* Logo asset đã chứa tagline bên trong ảnh — không thêm text trùng */}
        <img
          src={logo}
          alt={`${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`}
          className="h-11 w-auto max-w-full object-contain sm:h-14"
          draggable={false}
        />
      </div>
    </header>
  )
}
