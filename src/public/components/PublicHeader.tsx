import logo from '../../assets/logo-vtauto.png'
import { SITE_CONFIG } from '../contactConfig'

/** Header trang chính: logo + tagline, không menu phức tạp. */
export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <img src={logo} alt={SITE_CONFIG.name} className="h-10 w-10 object-contain" />
        <div className="min-w-0">
          <div className="text-base font-extrabold tracking-wide text-slate-900">{SITE_CONFIG.name}</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">{SITE_CONFIG.tagline}</div>
        </div>
      </div>
    </header>
  )
}
