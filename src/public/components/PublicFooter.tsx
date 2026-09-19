import { SITE_CONFIG } from '../contactConfig'

/** Footer tối giản theo spec. */
export default function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white pb-24 pt-8">
      <div className="mx-auto max-w-3xl space-y-2 px-4 text-center">
        <div className="text-base font-extrabold tracking-wide text-slate-900">{SITE_CONFIG.name}</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">{SITE_CONFIG.tagline}</div>
        <div className="pt-2 text-xs text-slate-500">{SITE_CONFIG.address}</div>
        <div className="text-xs text-slate-500">
          <a href={`tel:${SITE_CONFIG.phoneRaw}`} className="font-medium text-brand-600">{SITE_CONFIG.phoneDisplay}</a>
          {' · '}
          <a href={SITE_CONFIG.facebook} target="_blank" rel="noreferrer" className="font-medium text-brand-600">Facebook</a>
          {' · '}
          <a href={SITE_CONFIG.kakao} target="_blank" rel="noreferrer" className="font-medium text-brand-600">KakaoTalk</a>
        </div>
        <div className="pt-3 text-[11px] text-slate-400">{SITE_CONFIG.copyright}</div>
      </div>
    </footer>
  )
}
