/**
 * ============================================================
 * CẤU HÌNH SITE & LIÊN HỆ — PUBLIC WEB
 * ============================================================
 * Đây là NƠI DUY NHẤT cần sửa khi đổi thông tin liên hệ.
 * Mọi component (header, footer, contact bubble) đều đọc từ file này.
 */
export const SITE_CONFIG = {
  name: 'VT AUTO',
  tagline: 'XE CŨ TẠI HÀN QUỐC',
  slogan: 'Kiểm tra kỹ – Bán xe chất lượng',

  // Địa chỉ văn phòng (hiển thị ở footer) — SỬA TẠI ĐÂY
  address: 'Địa chỉ văn phòng — cập nhật trong src/public/contactConfig.ts',

  // Số điện thoại — SỬA TẠI ĐÂY (phoneRaw dùng cho link tel:)
  phoneDisplay: '010-0000-0000',
  phoneRaw: '+821000000000',

  // Messenger — SỬA TẠI ĐÂY (link m.me/...)
  messenger: 'https://m.me/vtauto',

  // Facebook — SỬA TẠI ĐÂY
  facebook: 'https://www.facebook.com/vtauto',

  // KakaoTalk — SỬA TẠI ĐÂY (link open.kakao.com/o/...)
  kakao: 'https://open.kakao.com/o/vtauto',

  copyright: `© 2026 VT AUTO`,
}
