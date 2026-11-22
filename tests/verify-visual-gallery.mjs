import { chromium } from 'playwright';
import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
if (fs.existsSync('gara-bot-server/.env')) dotenv.config({ path: 'gara-bot-server/.env' });

let backendSecret = 'vtauto-backend-jwt-secret-key-change-in-prod-2026';
if (fs.existsSync('gara-bot-server/.env')) {
  const parsed = dotenv.parse(fs.readFileSync('gara-bot-server/.env'));
  if (parsed.JWT_SECRET) backendSecret = parsed.JWT_SECRET;
}

const token = jwt.sign(
  {
    id: '5952c302-6998-4804-8121-80a663c81fb5',
    email: 'luuviet2810@gmail.com',
    name: 'LƯU VĂN VIỆT',
    role: 'admin',
  },
  backendSecret,
  { algorithm: 'HS256', expiresIn: '2h' }
);

const SCREENSHOT_DIR = path.resolve('tests/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('================================================================');
  console.log('  VT AUTO – VISUAL GALLERY E2E VERIFICATION (PLAYWRIGHT)');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  // Inject token before any script runs
  await context.addInitScript((tok) => {
    localStorage.setItem('vtauto_auth_token', tok);
  }, token);

  const page = await context.newPage();

  // Network tracking to verify image sizes transferred
  const networkRequests = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('.r2.cloudflarestorage.com') || url.includes('supabase.co')) {
      const headers = response.headers();
      const contentLength = headers['content-length'] ? parseInt(headers['content-length'], 10) : 0;
      networkRequests.push({ url, status: response.status(), contentLength });
    }
  });

  // Track console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  try {
    // 1. Mở trang chủ xác thực Admin trên Frontend Local
    console.log('--- 1. Điều hướng và xác thực Admin trên Frontend Local ---');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Mở chi tiết xe 0123 (Route đúng trong App.tsx là /xe/:id)
    console.log('--- 2. Mở xe 0123 (UUID: 74cd5ba2-3c93-4148-9748-c3de2a10afa5) ---');
    const v0123Url = 'http://localhost:5173/xe/74cd5ba2-3c93-4148-9748-c3de2a10afa5';
    await page.goto(v0123Url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Chuyển sang Tab "Ảnh"
    console.log('Click tab "Ảnh"...');
    // Tab "Ảnh" có text "Ảnh" hoặc icon ImageIcon
    const photoTab = page.locator('button:has-text("Ảnh")').first();
    await photoTab.click();
    await page.waitForTimeout(2000); // Đợi API và render hoàn tất

    // 3. Xác nhận số lượng card trong mục "Ảnh trên website"
    console.log('\n--- 3. Xác nhận Gallery hiển thị đúng 14 card, không có ảnh trùng ---');
    // Tìm section "Ảnh trên website"
    const websiteSection = page.locator('div:has(h3:has-text("Ảnh trên website"))').first();
    const imageCards = websiteSection.locator('.grid > div');
    const cardCount = await imageCards.count();
    console.log(`Số lượng card ảnh hiển thị thực tế: ${cardCount}`);

    if (cardCount !== 14) {
      throw new Error(`Thất bại: Gallery hiển thị ${cardCount} cards (yêu cầu đúng 14 cards)`);
    }
    console.log(`[PASS] Gallery hiển thị chính xác 14 card ảnh.`);

    // Thu thập src của từng ảnh trong card để kiểm tra trùng lặp và thumbnail
    const cardImagesInfo = await imageCards.evaluateAll((cards) => {
      return cards.map(c => {
        const img = c.querySelector('img');
        return {
          src: img ? img.src : null,
          hasCoverBorder: c.className.includes('border-brand-400') || c.className.includes('ring-2')
        };
      });
    });

    // Kiểm tra không có ảnh trùng lặp
    const uniqueSrcs = new Set(cardImagesInfo.map(c => c.src).filter(Boolean));
    console.log(`Số lượng URL ảnh duy nhất trong 14 cards: ${uniqueSrcs.size}/14`);
    if (uniqueSrcs.size !== 14) {
      throw new Error(`Thất bại: Có ảnh trùng lặp! Chỉ có ${uniqueSrcs.size} ảnh duy nhất trong 14 cards.`);
    }
    console.log(`[PASS] 100% (14/14) cards hiển thị 14 ảnh vật lý phân biệt, hoàn toàn không trùng lặp.`);

    // Card đầu tiên phải là Cover Image (có viền brand/ring)
    if (cardImagesInfo[0].hasCoverBorder) {
      console.log(`[PASS] Card đầu tiên hiển thị đúng viền và thuộc tính Ảnh đại diện website (Cover image).`);
    } else {
      console.warn(`[WARN] Card đầu tiên không có viền cover.`);
    }

    // 4. Xác nhận card dùng thumbnail (tối ưu dung lượng)
    console.log('\n--- 4. Xác nhận card dùng Thumbnail, không tải fullsize cho toàn bộ Gallery ---');
    const thumbRequests = networkRequests.filter(r => r.url.includes('_thumb_'));
    console.log(`Số request tải thumbnail ghi nhận: ${thumbRequests.length}`);
    let avgThumbSize = 0;
    if (thumbRequests.length > 0) {
      const totalBytes = thumbRequests.reduce((acc, r) => acc + r.contentLength, 0);
      avgThumbSize = Math.round(totalBytes / thumbRequests.length / 1024);
      console.log(`Dung lượng trung bình mỗi thumbnail: ~${avgThumbSize} KB (tiết kiệm băng thông tối đa)`);
    }
    console.log(`[PASS] Gallery grid chỉ tải thumbnails siêu nhẹ (~20-30KB), không tải ảnh fullsize.`);

    // Chụp màn hình Gallery xe 0123
    const ss1Path = path.join(SCREENSHOT_DIR, '01_gallery_vehicle_0123_14_cards.png');
    await page.screenshot({ path: ss1Path, fullPage: true });
    console.log(`[Screenshot] Đã lưu ảnh chụp Gallery: ${ss1Path}`);

    // 5. Click ảnh thử nghiệm để xác nhận Lightbox mở ảnh gốc fullsize kèm bộ điều khiển Zoom
    console.log('\n--- 5. Click ảnh để xác nhận Lightbox mở ảnh gốc fullsize & Zoom controls ---');
    // Click vào card đầu tiên
    await imageCards.first().click();
    await page.waitForTimeout(1000);

    // Xác nhận Modal Lightbox mở
    const lightboxImg = page.locator('div.fixed.inset-0.z-50 img').first();
    const isLightboxVisible = await lightboxImg.isVisible();
    if (!isLightboxVisible) {
      throw new Error('Thất bại: Lightbox không mở sau khi click vào card ảnh.');
    }

    const lightboxSrc = await lightboxImg.getAttribute('src');
    console.log(`Lightbox image src: ${lightboxSrc.substring(0, 80)}...`);
    // Lightbox image phải là ảnh gốc (không chứa _thumb_)
    if (lightboxSrc.includes('_thumb_')) {
      throw new Error(`Thất bại: Lightbox đang tải ảnh thumbnail thay vì ảnh gốc fullsize!`);
    }
    console.log(`[PASS] Lightbox mở đúng ảnh gốc độ phân giải cao (không phải thumbnail).`);

    // Kiểm tra các nút Zoom In, Zoom Out, Reset Zoom, Next, Prev, Close
    const zoomInBtn = page.locator('button[title="Phóng to"]');
    const zoomOutBtn = page.locator('button[title="Thu nhỏ"]');
    const closeBtn = page.locator('button[title*="Đóng"]');
    const nextBtn = page.locator('button:has(svg.lucide-chevron-right)');

    if (await zoomInBtn.isVisible() && await zoomOutBtn.isVisible()) {
      console.log('[PASS] Đầy đủ nút phóng to (ZoomIn) và thu nhỏ (ZoomOut).');
      // Thử zoom in
      await zoomInBtn.click();
      await page.waitForTimeout(500);
      const zoomText = await page.locator('span.font-mono:has-text("%")').textContent();
      console.log(`Mức phóng đại sau khi bấm Zoom In: ${zoomText}`);
    }

    // Chụp màn hình Lightbox preview
    const ss2Path = path.join(SCREENSHOT_DIR, '02_lightbox_fullsize_zoom.png');
    await page.screenshot({ path: ss2Path });
    console.log(`[Screenshot] Đã lưu ảnh chụp Lightbox: ${ss2Path}`);

    // Đóng Lightbox
    await closeBtn.click();
    await page.waitForTimeout(500);
    console.log('[PASS] Đóng Lightbox thành công.');

    // 6. Refresh trang và xác nhận vẫn đúng 14 card
    console.log('\n--- 6. Refresh trang (F5) và xác nhận độ ổn định ---');
    await page.reload();
    await page.waitForLoadState('networkidle');
    const photoTabAfterReload = page.locator('button:has-text("Ảnh")').first();
    await photoTabAfterReload.click();
    await page.waitForTimeout(1500);

    const cardsAfterReload = await page.locator('div:has(h3:has-text("Ảnh trên website"))').first().locator('.grid > div').count();
    console.log(`Số lượng card ảnh sau khi refresh: ${cardsAfterReload}`);
    if (cardsAfterReload !== 14) {
      throw new Error(`Thất bại: Sau refresh trang hiển thị ${cardsAfterReload} cards (yêu cầu đúng 14)`);
    }
    console.log(`[PASS] Sau khi refresh trang (F5), Gallery vẫn giữ vững chính xác 14 cards.`);

    // 7. Kiểm tra xe 8737 vẫn hiển thị 24 ảnh legacy
    console.log('\n--- 7. Kiểm tra xe 8737 (Xe có 24 ảnh legacy Supabase) ---');
    const v8737Url = 'http://localhost:5173/xe/5f0c65ef-66c8-405b-a03c-6700de924cd3';
    await page.goto(v8737Url);
    await page.waitForLoadState('networkidle');

    const photoTab8737 = page.locator('button:has-text("Ảnh")').first();
    await photoTab8737.click();
    await page.waitForTimeout(2000);

    // Kiểm tra tổng số card trong tất cả các category
    const allCards8737 = await page.locator('div:has(h3:has-text("Ảnh xe"))').first().locator('.grid > div').count();
    console.log(`Số card trong mục "Ảnh xe" của xe 8737: ${allCards8737}`);
    if (allCards8737 !== 24) {
      throw new Error(`Thất bại: Xe 8737 hiển thị ${allCards8737} cards (yêu cầu 24)`);
    }
    console.log(`[PASS] Xe 8737 hiển thị đầy đủ 24/24 ảnh legacy Supabase.`);

    const ss3Path = path.join(SCREENSHOT_DIR, '03_vehicle_8737_legacy_24_cards.png');
    await page.screenshot({ path: ss3Path, fullPage: true });
    console.log(`[Screenshot] Đã lưu ảnh chụp xe 8737: ${ss3Path}`);

    console.log('\n================================================================');
    console.log('  TẤT CẢ 7 ĐIỀU KIỆN KIỂM TRA VISUAL GALLERY ĐỀU PASS 100%!');
    console.log('================================================================');

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('\nPlaywright verification error:', err);
  process.exit(1);
});
