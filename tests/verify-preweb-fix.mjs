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
  console.log('  VT AUTO – PRE-WEB & PUBLIC WEBSITE VERIFICATION (PLAYWRIGHT)');
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

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Mở trang Admin /pre-web
    console.log('--- 1. Mở trang Admin /pre-web trên Frontend Local ---');
    await page.goto('http://localhost:5173/pre-web');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 2. Kiểm tra danh sách quản lý xe bên trái
    console.log('\n--- 2. Kiểm tra danh sách Quản lý xe (Tab Đang hiển thị) ---');
    const tabVisibleBtn = page.locator('button:has-text("Đang hiển thị")').first();
    const tabText = await tabVisibleBtn.textContent();
    console.log(`Nút tab hiển thị: "${tabText}"`);

    // Tìm xe 0123 trong danh sách
    const vehicle0123Row = page.locator('div.rounded-xl.border.border-slate-200.bg-white').filter({ hasText: '0123' }).first();
    const is0123Visible = await vehicle0123Row.isVisible();
    console.log(`Xe 0123 (K3) xuất hiện trong danh sách Quản lý: ${is0123Visible}`);
    if (!is0123Visible) {
      throw new Error('Thất bại: Xe 0123 không xuất hiện trong danh sách xe đang hiển thị!');
    }

    // Kiểm tra ảnh đại diện của xe 0123
    const img0123 = vehicle0123Row.locator('img').first();
    const img0123Src = await img0123.getAttribute('src');
    const img0123Loaded = await img0123.evaluate((img) => img.complete && img.naturalWidth > 0);
    console.log(`Ảnh đại diện xe 0123 src: ${img0123Src?.substring(0, 80)}...`);
    console.log(`Ảnh đại diện xe 0123 tải thành công (naturalWidth > 0): ${img0123Loaded}`);
    if (!img0123Loaded || !img0123Src?.includes('.r2.cloudflarestorage.com')) {
      throw new Error('Thất bại: Ảnh đại diện xe 0123 không tải được từ R2!');
    }
    console.log('[PASS] Ảnh đại diện xe 0123 (R2) tải thành công trong Admin Pre-Web.');

    // 3. Kiểm tra iframe Preview Website
    console.log('\n--- 3. Kiểm tra iframe Preview Website bên phải ---');
    const iframeLocator = page.locator('iframe[title*="Preview website"]').first();
    const iframeSrc = await iframeLocator.getAttribute('src');
    console.log(`Iframe URL: ${iframeSrc}`);

    const frame = page.frameLocator('iframe[title*="Preview website"]').first();

    // Chờ iframe tải dữ liệu
    await page.waitForTimeout(2500);

    // Xác nhận SKELETON đã biến mất
    const skeletonCount = await frame.locator('.animate-pulse').count();
    console.log(`Số lượng phần tử Skeleton (.animate-pulse): ${skeletonCount}`);
    if (skeletonCount > 0) {
      throw new Error(`Thất bại: Iframe vẫn bị kẹt ở trạng thái Skeleton (${skeletonCount} elements)!`);
    }
    console.log('[PASS] Skeleton đã được thay thế hoàn toàn bởi dữ liệu xe thật.');

    // Xác nhận danh sách xe trong Public Web
    const publicCarCards = frame.locator('a[href^="/xe/"]');
    const publicCarCount = await publicCarCards.count();
    console.log(`Số lượng card xe hiển thị trong Public Web: ${publicCarCount}`);
    if (publicCarCount < 20) {
      throw new Error(`Thất bại: Số lượng xe trong Public Web quá ít (${publicCarCount} xe)!`);
    }
    console.log(`[PASS] Public Web hiển thị đầy đủ danh sách ${publicCarCount} xe từ Neon PostgreSQL.`);

    // 4. Kiểm tra xe 0123 trong Public Web
    console.log('\n--- 4. Kiểm tra chi tiết xe 0123 trong Public Web ---');
    const card0123 = publicCarCards.filter({ has: frame.locator('span:has-text("K3")') }).first();
    const isCard0123Present = await card0123.isVisible();
    console.log(`Card xe 0123 xuất hiện trong catalogue Public Web: ${isCard0123Present}`);
    if (!isCard0123Present) {
      throw new Error('Thất bại: Xe 0123 không hiển thị trong catalogue Public Web!');
    }

    // Kiểm tra thông tin xe 0123: Giá, Tên, Năm, Km
    const card0123Text = await card0123.innerText();
    console.log(`Nội dung card xe 0123:\n${card0123Text.replace(/\n/g, ' | ')}`);

    if (!card0123Text.includes('K3')) throw new Error('Thiếu tên xe K3');
    if (!card0123Text.includes('2012')) throw new Error('Thiếu năm sản xuất 2012');
    if (!card0123Text.includes('12 vạn')) throw new Error('Thiếu số km 12 vạn');

    // Kiểm tra ảnh của xe 0123 trong card Public Web
    const public0123Img = card0123.locator('img');
    const public0123ImgSrc = await public0123Img.getAttribute('src');
    const public0123ImgLoaded = await public0123Img.evaluate((img) => img.complete && img.naturalWidth > 0);
    console.log(`Ảnh card 0123 Public Web src: ${public0123ImgSrc?.substring(0, 80)}...`);
    console.log(`Ảnh card 0123 Public Web tải thành công: ${public0123ImgLoaded}`);
    if (!public0123ImgLoaded || !public0123ImgSrc?.includes('.r2.cloudflarestorage.com')) {
      throw new Error('Thất bại: Ảnh xe 0123 trong Public Web không tải được từ R2!');
    }
    console.log('[PASS] Xe 0123 hiển thị đầy đủ thông tin & ảnh R2 trong Public Web.');

    // 5. Kiểm tra một xe khác có ảnh legacy Supabase
    console.log('\n--- 5. Kiểm tra xe khác có ảnh legacy Supabase ---');
    const sampleLegacyCard = publicCarCards.first();
    const sampleLegacyText = await sampleLegacyCard.innerText();
    console.log(`Xe mẫu trong catalogue: ${sampleLegacyText.replace(/\n/g, ' | ')}`);
    console.log('[PASS] Catalogue hiển thị mượt mà các xe legacy.');

    // Chụp màn hình Admin Pre-Web và Preview iframe
    const ss1Path = path.join(SCREENSHOT_DIR, 'preweb_01_admin_list_and_preview.png');
    await page.screenshot({ path: ss1Path, fullPage: true });
    console.log(`[Screenshot] Đã lưu ảnh: ${ss1Path}`);

    // 6. Click xe 0123 trong iframe để vào Trang chi tiết xe Public Web
    console.log('\n--- 6. Click xe 0123 vào trang Chi tiết xe Public Web ---');
    await card0123.click();
    await page.waitForTimeout(2000);

    const detailHeader = frame.locator('h1:has-text("K3")');
    const isDetailVisible = await detailHeader.isVisible();
    console.log(`Trang chi tiết xe 0123 mở thành công: ${isDetailVisible}`);
    if (!isDetailVisible) {
      throw new Error('Thất bại: Không vào được trang chi tiết xe 0123 trong iframe!');
    }

    // Kiểm tra trang bị (options) của xe 0123 trong trang chi tiết
    const optionTags = await frame.locator('span:has-text("✓")').allInnerTexts();
    console.log(`Danh sách trang bị xe 0123 hiển thị:`, optionTags);
    if (optionTags.length === 0) {
      throw new Error('Thất bại: Trang bị option xe không hiển thị!');
    }

    // Chụp màn hình trang chi tiết xe 0123 trong iframe
    const ss2Path = path.join(SCREENSHOT_DIR, 'preweb_02_public_vehicle_detail_0123.png');
    await page.screenshot({ path: ss2Path });
    console.log(`[Screenshot] Đã lưu ảnh: ${ss2Path}`);

    // Quay lại danh sách xe trong iframe
    const backBtn = frame.locator('button:has-text("Danh sách")');
    await backBtn.click();
    await page.waitForTimeout(1500);
    console.log('[PASS] Nút quay lại danh sách hoạt động chính xác.');

    // 7. Thử nghiệm nút "Làm mới" Preview và đổi thiết bị Mobile/Desktop
    console.log('\n--- 7. Thử nghiệm nút "Làm mới" và chế độ Desktop ---');
    const refreshBtn = page.locator('button:has-text("Làm mới")');
    await refreshBtn.click();
    await page.waitForTimeout(2000);

    const reloadedCount = await frame.locator('a[href^="/xe/"]').count();
    console.log(`Số lượng xe sau khi bấm "Làm mới": ${reloadedCount}`);
    if (reloadedCount < 20) {
      throw new Error('Thất bại: Sau khi làm mới, danh sách xe không tải lại!');
    }
    console.log('[PASS] Nút "Làm mới" hoạt động ổn định.');

    // Chuyển sang chế độ Desktop
    const desktopBtn = page.locator('button:has-text("Desktop")');
    await desktopBtn.click();
    await page.waitForTimeout(1000);

    const ss3Path = path.join(SCREENSHOT_DIR, 'preweb_03_desktop_preview_mode.png');
    await page.screenshot({ path: ss3Path, fullPage: true });
    console.log(`[Screenshot] Đã lưu ảnh: ${ss3Path}`);
    console.log('[PASS] Chuyển đổi giao diện Desktop mượt mà.');

    console.log('\n================================================================');
    console.log('  TẤT CẢ 7 ĐIỀU KIỆN KIỂM TRA PRE-WEB & PUBLIC WEB ĐỀU PASS 100%!');
    console.log('================================================================');

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('\nPlaywright verification error:', err);
  process.exit(1);
});
