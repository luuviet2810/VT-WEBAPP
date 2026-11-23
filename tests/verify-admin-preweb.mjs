/**
 * VT AUTO – Playwright Verification: Admin Pre-Web 3 Tabs & State Management
 */

import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import pg from 'pg';
import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'fa456d3ac1fb2a116fc1bc3f9346ea8f3530fcdf3a46b39c104bf20d3139a429';

async function testAdminPreWeb() {
  console.log('=== KIỂM THỬ ADMIN PRE-WEB 3 TABS & QUẢN LÝ TRẠNG THÁI ===\n');

  // Lấy Admin user
  const client = await pool.connect();
  let adminToken = '';
  try {
    const userRes = await client.query("SELECT id, email, name, role FROM users WHERE role = 'admin' LIMIT 1");
    const admin = userRes.rows[0];
    console.log(`[1] Tạo token xác thực Admin cho: ${admin.email} (${admin.name || 'Admin'})...`);
    adminToken = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name || 'Admin' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    );
    console.log('✓ Token JWT Admin đã được tạo thành công.');
  } finally {
    client.release();
    await pool.end();
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  // Nạp token vào localStorage trước khi load trang
  await context.addInitScript((token) => {
    window.localStorage.setItem('vtauto_auth_token', token);
  }, adminToken);

  const page = await context.newPage();

  try {
    // 2. Mở Pre-Web
    console.log('\n[2] Truy cập http://localhost:5173/pre-web...');
    await page.goto('http://localhost:5173/pre-web', { waitUntil: 'networkidle' });
    await page.waitForSelector('h1:has-text("PRE-WEB")', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // 3. Kiểm tra 3 Tabs
    console.log('\n[3] Kiểm tra 3 Tabs hiển thị trên Pre-Web:');
    const tabVisibleText = await page.locator('button:has-text("Đang hiển thị")').innerText();
    const tabComingSoonText = await page.locator('button:has-text("Sắp về")').innerText();
    const tabHiddenText = await page.locator('button:has-text("Đang ẩn")').innerText();

    console.log(`  ✓ Tab 1: ${tabVisibleText} (Kỳ vọng: 27)`);
    console.log(`  ✓ Tab 2: ${tabComingSoonText} (Kỳ vọng: 10)`);
    console.log(`  ✓ Tab 3: ${tabHiddenText} (Kỳ vọng: 0)`);

    if (!tabVisibleText.includes('27')) throw new Error(`Tab Đang hiển thị ghi: ${tabVisibleText}`);
    if (!tabComingSoonText.includes('10')) throw new Error(`Tab Sắp về ghi: ${tabComingSoonText}`);
    if (!tabHiddenText.includes('0')) throw new Error(`Tab Đang ẩn ghi: ${tabHiddenText}`);

    // 4. Mở Tab "Sắp về"
    console.log('\n[4] Mở Tab "Sắp về"...');
    await page.locator('button:has-text("Sắp về")').click();
    await page.waitForTimeout(600);

    const comingRowsCount = await page.locator('select[aria-label="Trạng thái hiển thị trên website"]').count();
    console.log(`  ✓ Số xe hiển thị trong tab Sắp về: ${comingRowsCount} (Kỳ vọng: 10)`);
    if (comingRowsCount !== 10) throw new Error(`Tab Sắp về hiển thị ${comingRowsCount} hàng thay vì 10!`);

    // 5. Kiểm thử chuyển 1 xe từ "Sắp về" sang "Đang ẩn"
    console.log('\n[5] Chuyển xe đầu tiên từ "Sắp về" sang "Đang ẩn"...');
    const firstSelect = page.locator('select[aria-label="Trạng thái hiển thị trên website"]').first();
    await firstSelect.selectOption('hidden');
    await page.waitForTimeout(1500);

    const tabComingAfter = await page.locator('button:has-text("Sắp về")').innerText();
    const tabHiddenAfter = await page.locator('button:has-text("Đang ẩn")').innerText();
    console.log(`  ✓ Sau khi ẩn: Tab Sắp về: ${tabComingAfter} (Kỳ vọng: 9)`);
    console.log(`  ✓ Sau khi ẩn: Tab Đang ẩn: ${tabHiddenAfter} (Kỳ vọng: 1)`);
    if (!tabComingAfter.includes('9')) throw new Error(`Tab Sắp về sau khi chuyển: ${tabComingAfter}`);
    if (!tabHiddenAfter.includes('1')) throw new Error(`Tab Đang ẩn sau khi chuyển: ${tabHiddenAfter}`);

    // 6. Chuyển xe đó từ "Đang ẩn" trở lại "Sắp về"
    console.log('\n[6] Mở Tab "Đang ẩn" và chuyển xe trở lại "Sắp về"...');
    await page.locator('button:has-text("Đang ẩn")').click();
    await page.waitForTimeout(600);

    const hiddenSelect = page.locator('select[aria-label="Trạng thái hiển thị trên website"]').first();
    await hiddenSelect.selectOption('coming_soon');
    await page.waitForTimeout(1500);

    const tabComingRestored = await page.locator('button:has-text("Sắp về")').innerText();
    const tabHiddenRestored = await page.locator('button:has-text("Đang ẩn")').innerText();
    console.log(`  ✓ Sau khi khôi phục: Tab Sắp về: ${tabComingRestored} (Kỳ vọng: 10)`);
    console.log(`  ✓ Sau khi khôi phục: Tab Đang ẩn: ${tabHiddenRestored} (Kỳ vọng: 0)`);
    if (!tabComingRestored.includes('10')) throw new Error(`Tab Sắp về sau khi khôi phục: ${tabComingRestored}`);
    if (!tabHiddenRestored.includes('0')) throw new Error(`Tab Đang ẩn sau khi khôi phục: ${tabHiddenRestored}`);

    // 7. Chụp ảnh màn hình Pre-Web
    await page.screenshot({ path: 'tests/screenshots/admin_preweb.png', fullPage: true });
    console.log('  ✓ Đã lưu ảnh Admin Pre-Web: tests/screenshots/admin_preweb.png');

    console.log('\n=============================================');
    console.log('🎉 KIỂM THỬ ADMIN PRE-WEB 3 TABS PASS 100%!');
    console.log('=============================================');

  } finally {
    await browser.close();
  }
}

testAdminPreWeb().catch((err) => {
  console.error('❌ KIỂM THỬ ADMIN PRE-WEB THẤT BẠI:', err);
  process.exit(1);
});
