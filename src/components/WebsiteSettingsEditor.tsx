import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import logo from '../assets/logo-vtauto.png'
import { getWebsiteSettings, updateWebsiteSettings } from '../services/websiteSettings.service'
import { DEFAULT_SITE_SETTINGS, SITE_CONFIG } from '../public/contactConfig'

/**
 * Pre-Web → "Thông tin website": sửa địa chỉ / link liên hệ của Public Web
 * (lưu bảng website_settings — global, mọi thiết bị thấy giống nhau).
 * Footer + ContactBubble đọc qua SiteSettingsProvider; Public Web nhận
 * giá trị mới sau refresh. Không upload logo ở bước này.
 */
interface FormState {
  address1: string
  address2: string
  phoneDisplay: string
  kakaoUrl: string
  tiktok: string // nhận '@id' hoặc URL đầy đủ
  facebookUrl: string
  messengerUrl: string
}

function isValidUrl(u: string): boolean {
  return u === '' || /^https?:\/\/[^\s]+\.[^\s]+/.test(u.trim())
}

/** '@viettienauto' → https://www.tiktok.com/@viettienauto ; URL giữ nguyên */
function normalizeTiktok(input: string): { url: string; display: string } {
  const t = input.trim()
  if (!t) return { url: '', display: '' }
  if (t.startsWith('@')) return { url: `https://www.tiktok.com/${t}`, display: t }
  const m = t.match(/tiktok\.com\/(@[^/?#\s]+)/)
  return { url: t, display: m ? m[1] : t }
}

/** '010-2592-5885 (Tiến)' → '+821025925885' */
function normalizePhoneRaw(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return `+82${digits.slice(1)}`
  if (digits.startsWith('82')) return `+${digits}`
  return `+${digits}`
}

const URL_FIELDS: { key: keyof FormState; label: string; placeholder: string }[] = [
  { key: 'kakaoUrl', label: 'KakaoTalk (URL open chat)', placeholder: 'https://open.kakao.com/o/...' },
  { key: 'facebookUrl', label: 'Facebook Group (URL)', placeholder: 'https://www.facebook.com/groups/...' },
  { key: 'messengerUrl', label: 'Messenger (URL)', placeholder: 'https://m.me/...' },
]

export default function WebsiteSettingsEditor() {
  const [form, setForm] = useState<FormState | null>(null)
  const [dbReady, setDbReady] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    getWebsiteSettings().then((row) => {
      if (cancelled) return
      if (!row) {
        setDbReady(false)
        setForm({
          address1: DEFAULT_SITE_SETTINGS.address1,
          address2: DEFAULT_SITE_SETTINGS.address2,
          phoneDisplay: DEFAULT_SITE_SETTINGS.phoneDisplay,
          kakaoUrl: DEFAULT_SITE_SETTINGS.kakaoUrl,
          tiktok: DEFAULT_SITE_SETTINGS.tiktokDisplay || DEFAULT_SITE_SETTINGS.tiktokUrl,
          facebookUrl: DEFAULT_SITE_SETTINGS.facebookUrl,
          messengerUrl: DEFAULT_SITE_SETTINGS.messengerUrl,
        })
        return
      }
      setForm({
        address1: row.office_address_1,
        address2: row.office_address_2,
        phoneDisplay: row.phone_display,
        kakaoUrl: row.kakao_url,
        tiktok: row.tiktok_display || row.tiktok_url,
        facebookUrl: row.facebook_url,
        messengerUrl: row.messenger_url,
      })
    })
    return () => { cancelled = true }
  }, [])

  if (!form) {
    return <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-400">Đang tải thông tin website...</div>
  }

  const urlErrors = URL_FIELDS.filter((f) => !isValidUrl(form[f.key])).map((f) => f.key)
  const tiktokInvalid = !isValidUrl(form.tiktok) && !form.tiktok.trim().startsWith('@')
  const invalid = urlErrors.length > 0 || tiktokInvalid

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  async function handleSave() {
    if (!form || invalid) return
    setSaving(true)
    setMsg(null)
    try {
      const tik = normalizeTiktok(form.tiktok)
      await updateWebsiteSettings({
        office_address_1: form.address1.trim(),
        office_address_2: form.address2.trim(),
        phone_display: form.phoneDisplay.trim(),
        phone_raw: normalizePhoneRaw(form.phoneDisplay),
        kakao_url: form.kakaoUrl.trim(),
        tiktok_url: tik.url,
        tiktok_display: tik.display,
        facebook_url: form.facebookUrl.trim(),
        messenger_url: form.messengerUrl.trim(),
      })
      setMsg({ kind: 'success', text: 'Đã lưu thông tin website — Public Web cập nhật sau refresh.' })
    } catch (err) {
      console.error('[WebsiteSettingsEditor] save failed:', err)
      setMsg({ kind: 'error', text: 'Không thể lưu — kiểm tra migration 035 đã chạy và quyền Admin.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Thông tin website</h2>
      <p className="mt-1 text-xs text-slate-400">
        Dùng cho Footer + Contact Bubble của Public Web. Lưu xong, khách xem web sẽ thấy thông tin mới sau khi tải lại trang.
      </p>

      {!dbReady && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Bảng website_settings chưa tồn tại (migration 035 chưa chạy) — đang hiển thị giá trị mặc định, chưa lưu được.
        </div>
      )}

      {/* Logo hiện tại — chỉ preview, chưa cho upload */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
        <img src={logo} alt={`${SITE_CONFIG.name} logo`} className="h-9 w-auto object-contain" draggable={false} />
        <div className="text-xs text-slate-500">Logo website hiện tại (đổi logo sẽ thêm ở Website Editor sau này)</div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Địa chỉ CS1</span>
          <input className="input" value={form.address1} onChange={(e) => set('address1', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Địa chỉ CS2</span>
          <input className="input" value={form.address2} onChange={(e) => set('address2', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Điện thoại hiển thị</span>
          <input className="input" value={form.phoneDisplay} onChange={(e) => set('phoneDisplay', e.target.value)} placeholder="010-2592-5885 (Tiến)" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">TikTok (@id hoặc URL)</span>
          <input className="input" value={form.tiktok} onChange={(e) => set('tiktok', e.target.value)} placeholder="@viettienauto" />
          {tiktokInvalid && <span className="mt-1 block text-[11px] text-red-600">TikTok phải dạng @ten hoặc URL http(s)</span>}
        </label>
        {URL_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{f.label}</span>
            <input className="input" value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
            {urlErrors.includes(f.key) && <span className="mt-1 block text-[11px] text-red-600">URL không hợp lệ (để trống nếu chưa có)</span>}
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" className="btn-primary flex items-center gap-1.5" onClick={handleSave} disabled={saving || invalid}>
          <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu thông tin'}
        </button>
        {msg && (
          <span className={`text-xs font-medium ${msg.kind === 'success' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>
        )}
      </div>
    </section>
  )
}
