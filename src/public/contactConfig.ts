/**
 * ============================================================
 * CẤU HÌNH SITE & LIÊN HỆ — PUBLIC WEB
 * ============================================================
 * NƠI DUY NHẤT sửa thông tin liên hệ. Mọi component
 * (Header, Footer, ContactBubble) đều đọc từ file này.
 *
 * Link nào để '' (chưa có URL thật) sẽ TỰ ẨN khỏi Footer/Bubble —
 * không publish link giả.
 */
export const SITE_CONFIG = {
  name: 'VT AUTO',
  tagline: 'XE CŨ TẠI HÀN QUỐC',
  slogan: 'Kiểm tra kỹ – Bán xe chất lượng',

  // Địa chỉ văn phòng
  addresses: [
    'CS1: 대전광역시 유성구 유성대로 510, 339호',
    'CS2: 경기 수원시 권선구 세화로 49, 8호',
  ],

  // Phone / Kakao
  phoneDisplay: '010-2592-5885 (Tiến)',
  phoneRaw: '+821025925885',

  // TikTok
  tiktok: 'https://www.tiktok.com/@viettienauto',
  tiktokDisplay: '@viettienauto',

  // TODO: dán URL chính xác vào đây — khi còn '', link tự ẩn
  facebook: '',
  messenger: '',
  kakao: '',

  copyright: '© 2026 VT AUTO',
}
