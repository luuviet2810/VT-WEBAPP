/**
 * ============================================================
 * CẤU HÌNH PUBLIC WEB
 * ============================================================
 * SITE_CONFIG        : branding cố định (tên, tagline, copyright)
 * DEFAULT_SITE_SETTINGS : giá trị liên hệ mặc định — dùng khi bảng
 *                        website_settings chưa tồn tại (migration 035
 *                        chưa chạy). Khi bảng đã có, Footer/Bubble đọc
 *                        từ DB (Admin sửa trong Pre-Web).
 */
export const SITE_CONFIG = {
  name: 'VT AUTO',
  tagline: 'XE CŨ TẠI HÀN QUỐC',
  slogan: 'Kiểm tra kỹ – Bán xe chất lượng',
  copyright: '© 2026 VT AUTO',
}

export interface SiteSettings {
  address1: string
  address2: string
  phoneDisplay: string
  phoneRaw: string
  kakaoUrl: string
  tiktokUrl: string
  tiktokDisplay: string
  facebookUrl: string
  messengerUrl: string
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  address1: 'CS1: 대전광역시 유성구 유성대로 510, 339호',
  address2: 'CS2: 경기 수원시 권선구 세화로 49, 8호',
  phoneDisplay: '010-2592-5885 (Tiến)',
  phoneRaw: '+821025925885',
  kakaoUrl: '',
  tiktokUrl: 'https://www.tiktok.com/@viettienauto',
  tiktokDisplay: '@viettienauto',
  facebookUrl: '',
  messengerUrl: '',
}
