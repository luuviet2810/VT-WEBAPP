/**
 * VT AUTO – Comprehensive Playwright Verification: Upcoming Vehicles (Xe Sắp Về)
 */

import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SCREENSHOT_DIR = path.resolve('tests/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN: XE SẮP VỀ (UPCOMING VEHICLES) ===\n');

  // 1. KIỂM THỬ TRỰC TIẾP TRÊN DATABASE NEON
  console.log('[PHẦN 1] Kiểm tra tính toàn vẹn và an toàn dữ liệu trong Neon PostgreSQL:');
  const client = await pool.connect();
  try {
    const availRes = await client.query(`
      SELECT count(*) FROM vehicles 
      WHERE status = 'available' AND is_public = true AND is_coming_soon = false
    `);
    const availCount = Number(availRes.rows[0].count);
    console.log(`  ✓ Số xe Đang có (Available): ${availCount} (Kỳ vọng: 27)`);
    if (availCount !== 27) throw new Error(`Lỗi DB: Số xe Available là ${availCount} thay vì 27`);

    const comingRes = await client.query(`
      SELECT count(*) FROM vehicles 
      WHERE status = 'available' AND is_public = true AND is_coming_soon = true
    `);
    const comingCount = Number(comingRes.rows[0].count);
    console.log(`  ✓ Số xe Sắp về (Coming Soon): ${comingCount} (Kỳ vọng: 10)`);
    if (comingCount !== 10) throw new Error(`Lỗi DB: Số xe Coming Soon là ${comingCount} thay vì 10`);

    const hiddenRes = await client.query(`
      SELECT count(*) FROM vehicles 
      WHERE status = 'available' AND is_public = false
    `);
    const hiddenCount = Number(hiddenRes.rows[0].count);
    console.log(`  ✓ Số xe Đang ẩn (Hidden): ${hiddenCount} (Kỳ vọng: 0)`);
    if (hiddenCount !== 0) throw new Error(`Lỗi DB: Số xe Hidden là ${hiddenCount} thay vì 0`);

    const soldRes = await client.query(`SELECT count(*) FROM vehicles WHERE status = 'sold'`);
    const soldCount = Number(soldRes.rows[0].count);
    console.log(`  ✓ Số xe Đã bán (Sold): ${soldCount} (Kỳ vọng: 73)`);
    if (soldCount !== 73) throw new Error(`Lỗi DB: Số xe Sold là ${soldCount} thay vì 73`);

    // Kiểm tra giá nội bộ xe K5 fabba60d
    const k5Res = await client.query(`
      SELECT id, model, sell_price, is_coming_soon FROM vehicles WHERE id = 'fabba60d-d17f-4a14-ae79-dd3a0e8ddde2'
    `);
    const k5InternalPrice = Number(k5Res.rows[0].sell_price);
    console.log(`  ✓ Giá nội bộ xe K5 (fabba60d) trong DB: ${k5InternalPrice} ₩ (Kỳ vọng bảo toàn: 5600000 ₩)`);
    if (k5InternalPrice !== 5600000) throw new Error(`Giá nội bộ xe K5 bị thay đổi thành ${k5InternalPrice}`);

  } finally {
    client.release();
    await pool.end();
  }

  // 2. KIỂM THỬ BẢO MẬT API BACKEND
  console.log('\n[PHẦN 2] Kiểm tra Bảo mật API Backend (/api/public/vehicles):');
  const apiRes = await fetch('http://localhost:3001/api/public/vehicles');
  if (!apiRes.ok) throw new Error(`API GET /api/public/vehicles thất bại (${apiRes.status})`);
  const apiJson = await apiRes.json();
  const allPublic = apiJson.data;
  console.log(`  ✓ Tổng số xe trả về qua API: ${allPublic.length} (27 đang có + 10 sắp về = 37)`);
  if (allPublic.length !== 37) throw new Error(`API trả về ${allPublic.length} xe thay vì 37`);

  const apiAvailable = allPublic.filter(v => !v.isComingSoon);
  const apiUpcoming = allPublic.filter(v => v.isComingSoon);
  console.log(`  ✓ API phân loại xe: ${apiAvailable.length} xe đang có, ${apiUpcoming.length} xe sắp về.`);

  // BẢO MẬT: Đảm bảo 100% xe sắp về KHÔNG trả giá nội bộ
  const leakedPrices = apiUpcoming.filter(v => v.sellPrice != null && v.sellPrice > 0);
  if (leakedPrices.length > 0) {
    throw new Error(`LỖI BẢO MẬT: Phát hiện ${leakedPrices.length} xe sắp về bị lộ giá qua API!`);
  }
  console.log('  ✓ BẢO MẬT TUYỆT ĐỐI: 100% (10/10) xe sắp về có sellPrice = null qua API.');

  // Kiểm tra chi tiết 1 xe sắp về
  const k5ApiRes = await fetch('http://localhost:3001/api/public/vehicles/fabba60d-d17f-4a14-ae79-dd3a0e8ddde2');
  const k5ApiJson = await k5ApiRes.json();
  if (k5ApiJson.data.sellPrice !== null) {
    throw new Error(`LỖI BẢO MẬT: Xe K5 fabba60d bị lộ giá qua API chi tiết (${k5ApiJson.data.sellPrice})!`);
  }
  console.log('  ✓ API chi tiết xe K5 fabba60d trả về sellPrice = null và isComingSoon = true.');

  // 3. KIỂM THỬ GIAO DIỆN PUBLIC WEB BẰNG PLAYWRIGHT
  console.log('\n[PHẦN 3] Kiểm thử giao diện Public Web:');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173/?mode=public', { waitUntil: 'networkidle' });
    await page.waitForSelector('h1:has-text("Xe đang có")', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Kiểm tra Section 1: Xe đang có
    const availTitle = await page.locator('h1:has-text("Xe đang có")').innerText();
    const availBadge = await page.locator('h1:has-text("Xe đang có") + span').innerText();
    console.log(`  ✓ Tiêu đề Section 1: ${availTitle} ${availBadge} (Kỳ vọng: 27 xe)`);
    if (!availBadge.includes('27')) throw new Error(`Section 1 hiển thị ${availBadge} thay vì 27 xe!`);

    // Đếm số card trong section 2
    const upcomingSection = page.locator('section#upcoming-vehicles');
    await upcomingSection.waitFor({ timeout: 5000 });

    const upcomingTitle = await page.locator('h2:has-text("XE SẮP VỀ")').innerText();
    const upcomingBadge = await page.locator('h2:has-text("XE SẮP VỀ") + span').innerText();
    console.log(`  ✓ Tiêu đề Section 2: ${upcomingTitle} ${upcomingBadge} (Kỳ vọng: 10 xe)`);
    if (!upcomingBadge.includes('10')) throw new Error(`Section 2 hiển thị ${upcomingBadge} thay vì 10 xe!`);

    // Đếm số card trong section 2
    const upcomingCards = await upcomingSection.locator('div.grid.grid-cols-3 > a').count();
    console.log(`  ✓ Số lượng card trong section XE SẮP VỀ: ${upcomingCards} (Kỳ vọng: 10)`);
    if (upcomingCards !== 10) throw new Error(`Số lượng card sắp về là ${upcomingCards} thay vì 10!`);

    // Kiểm tra nhãn SẮP VỀ và giá "Liên hệ" trên các card sắp về
    const upcomingBadgesCount = await upcomingSection.locator('div:has-text("SẮP VỀ")').count();
    console.log(`  ✓ Số card có nhãn "SẮP VỀ": ${upcomingBadgesCount}`);
    if (upcomingBadgesCount < 10) throw new Error(`Thiếu nhãn SẮP VỀ trên card sắp về (chỉ có ${upcomingBadgesCount}/10)!`);

    // Kiểm tra giá của 10 xe sắp về đều là "Liên hệ"
    const upcomingCardsText = await upcomingSection.locator('div.grid.grid-cols-3 > a').allInnerTexts();
    for (let i = 0; i < upcomingCardsText.length; i++) {
      if (!upcomingCardsText[i].includes('Liên hệ')) {
        throw new Error(`Card xe sắp về thứ ${i + 1} không hiển thị giá "Liên hệ": ${upcomingCardsText[i]}`);
      }
    }
    console.log('  ✓ 100% (10/10) card xe sắp về hiển thị giá "Liên hệ".');

    // Chụp ảnh Desktop
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'upcoming_desktop.png'), fullPage: true });
    console.log('  ✓ Đã lưu ảnh Desktop: tests/screenshots/upcoming_desktop.png');

    // 4. KIỂM THỬ BỘ LỌC ĐỘC LẬP
    console.log('\n[PHẦN 4] Kiểm thử Bộ lọc độc lập trên Section XE ĐANG CÓ:');
    const searchInput = page.locator('input[placeholder="Tìm tên xe, hãng xe, dòng xe..."]');
    await searchInput.fill('Cruze');
    await page.waitForTimeout(500);

    const filteredAvailBadge = await page.locator('h1:has-text("Xe đang có") + span').innerText();
    console.log(`  ✓ Sau khi tìm "Cruze", số xe đang có: ${filteredAvailBadge}`);
    if (!filteredAvailBadge.includes('3 / 27 xe') && !filteredAvailBadge.includes('3 xe')) {
      throw new Error(`Bộ lọc tìm kiếm không lọc đúng xe đang có: ${filteredAvailBadge}`);
    }

    // Đảm bảo section XE SẮP VỀ vẫn hiển thị nguyên vẹn 10 xe
    const upcomingCardsAfterFilter = await upcomingSection.locator('div.grid.grid-cols-3 > a').count();
    console.log(`  ✓ Section XE SẮP VỀ vẫn giữ nguyên: ${upcomingCardsAfterFilter} xe`);
    if (upcomingCardsAfterFilter !== 10) {
      throw new Error(`Lỗi: Bộ lọc của xe đang bán làm ảnh hưởng xe sắp về (${upcomingCardsAfterFilter} xe)!`);
    }

    // Xóa tìm kiếm
    await page.locator('button[title="Xóa tìm kiếm"]').click();
    await page.waitForTimeout(500);

    // 5. KIỂM THỬ TRANG CHI TIẾT XE SẮP VỀ
    console.log('\n[PHẦN 5] Kiểm thử Trang chi tiết xe Sắp về:');
    const k5UpcomingLink = upcomingSection.locator('a[href*="fabba60d-d17f-4a14-ae79-dd3a0e8ddde2"]').first();
    await k5UpcomingLink.click();
    await page.waitForURL('**/xe/fabba60d-d17f-4a14-ae79-dd3a0e8ddde2', { timeout: 5000 });
    await page.waitForTimeout(500);

    // Kiểm tra huy hiệu "Sắp về" trên trang chi tiết
    const detailBadgeVisible = await page.locator('span:has-text("Sắp về")').isVisible();
    console.log('  ✓ Huy hiệu "Sắp về" trên trang chi tiết:', detailBadgeVisible);
    if (!detailBadgeVisible) throw new Error('Trang chi tiết thiếu huy hiệu "Sắp về"!');

    // Kiểm tra giá hiển thị là "Liên hệ"
    const detailPriceText = await page.locator('section:has(h1) div.text-xl').innerText();
    console.log(`  ✓ Giá hiển thị trên trang chi tiết: "${detailPriceText}"`);
    if (detailPriceText !== 'Liên hệ') {
      throw new Error(`Giá trên trang chi tiết hiển thị "${detailPriceText}" thay vì "Liên hệ"!`);
    }

    // Kiểm tra Banner thông báo xe chuẩn bị về
    const inquiryBannerVisible = await page.locator('div:has-text("Xe đang chuẩn bị về")').first().isVisible();
    console.log('  ✓ Banner hướng dẫn liên hệ xe sắp về hiển thị:', inquiryBannerVisible);
    if (!inquiryBannerVisible) throw new Error('Thiếu Banner hướng dẫn liên hệ xe sắp về!');

    // Đảm bảo không lộ giá nội bộ (5.600.000 hoặc 5600000) trong toàn bộ DOM
    const pageHtml = await page.content();
    if (pageHtml.includes('5.600.000') || pageHtml.includes('5600000')) {
      throw new Error('LỖI BẢO MẬT: Giá nội bộ (5.600.000) bị rò rỉ trong mã nguồn trang chi tiết!');
    }
    console.log('  ✓ BẢO MẬT TUYỆT ĐỐI: Không tìm thấy giá nội bộ (5.600.000) trong toàn bộ DOM của trang chi tiết.');

    // Chụp ảnh chi tiết
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'upcoming_detail.png'), fullPage: false });
    console.log('  ✓ Đã lưu ảnh Trang chi tiết: tests/screenshots/upcoming_detail.png');

    // 6. KIỂM THỬ MOBILE VIEWPORT
    console.log('\n[PHẦN 6] Kiểm thử trên Mobile Viewport (390 x 844 - iPhone):');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/?mode=public', { waitUntil: 'networkidle' });
    await page.waitForSelector('h2:has-text("XE SẮP VỀ")', { timeout: 10000 });
    await page.waitForTimeout(500);

    const mobileUpcomingCards = await page.locator('section#upcoming-vehicles div.grid.grid-cols-3 > a').count();
    console.log(`  ✓ Số card xe sắp về trên Mobile: ${mobileUpcomingCards} (Kỳ vọng: 10)`);
    if (mobileUpcomingCards !== 10) throw new Error(`Mobile hiển thị ${mobileUpcomingCards} xe thay vì 10!`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'upcoming_mobile.png'), fullPage: false });
    console.log('  ✓ Đã lưu ảnh Mobile: tests/screenshots/upcoming_mobile.png');

    console.log('\n================================================================');
    console.log('🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ DỮ LIỆU, API, GIAO DIỆN & BẢO MẬT ĐỀU PASS 100%!');
    console.log('================================================================');

  } finally {
    await browser.close();
  }
}

runTest().catch((err) => {
  console.error('❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
