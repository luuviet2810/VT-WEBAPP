import { VTLogo } from '../../components/VTLogo'
import { SITE_CONFIG } from '../contactConfig'

/**
 * Header Public Web — MỘT logo image duy nhất (asset dùng chung
 * với Footer và Admin sidebar), giữ nguyên tỷ lệ (object-contain,
 * w-auto). Không logo text.
 */
export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-2.5">
        <VTLogo
          size="lg"
          priority
          alt={`${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`}
        />
      </div>
    </header>
  )
}
