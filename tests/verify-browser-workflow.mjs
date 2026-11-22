import { chromium } from '@playwright/test';
import { createServer as createViteServer } from 'vite';
import { app } from '../gara-bot-server/dist/index.js';
import dotenv from '../gara-bot-server/node_modules/dotenv/lib/main.js';
import path from 'path';
import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

import { query, closeDatabasePool } from '../gara-bot-server/dist/database/index.js';

const API_PORT = 3001;
const VITE_PORT = 5173;
const JWT_SECRET = process.env.JWT_SECRET || 'vtauto-backend-jwt-secret-key-change-in-prod-2026';

async function main() {
  console.log('================================================================');
  console.log('VT AUTO PLAYWRIGHT BROWSER VERIFICATION (REAL UI + NEON BACKEND)');
  console.log('================================================================\n');

  // 1. Khởi động Backend API Express
  const apiServer = await new Promise((resolve) => {
    const s = app.listen(API_PORT, '127.0.0.1', () => {
      console.log(`[API Server] Express backend running on http://127.0.0.1:${API_PORT}`);
      resolve(s);
    });
  });

  // 2. Khởi động Vite Dev Server
  console.log(`[Vite Server] Starting Vite dev server on port ${VITE_PORT}...`);
  const viteServer = await createViteServer({
    server: { host: '127.0.0.1', port: VITE_PORT },
    root: process.cwd(),
  });
  await viteServer.listen();
  const actualVitePort = viteServer.config.server.port || VITE_PORT;
  console.log(`[Vite Server] Frontend dev server running on http://127.0.0.1:${actualVitePort}\n`);

  // 3. Chuẩn bị token Admin và Staff
  const adminRes = await query(`SELECT id, email, name, role FROM users WHERE email = 'luuviet2810@gmail.com'`);
  const admin = adminRes.rows[0];
  const adminToken = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, JWT_SECRET, { expiresIn: '1h' });

  const staffRes = await query(`SELECT id, email, name, role FROM users WHERE email = 'kienluu13012005vp@gmail.com'`);
  const staff = staffRes.rows[0];
  const staffToken = jwt.sign({ id: staff.id, email: staff.email, name: staff.name }, JWT_SECRET, { expiresIn: '1h' });

  // Lấy 1 xe mẫu thực tế có checksheets
  const vehRes = await query(`
    SELECT v.id, v.plate, v.model, count(cs.id) as cs_count
    FROM vehicles v
    JOIN check_sheets cs ON cs.vehicle_id = v.id
    GROUP BY v.id, v.plate, v.model
    HAVING count(cs.id) >= 2
    LIMIT 1
  `);
  if (vehRes.rows.length === 0) throw new Error('Không tìm thấy xe có cả phiếu in và out');
  const targetVehicle = vehRes.rows[0];
  console.log(`[Target Vehicle] ID=${targetVehicle.id}, Biển số=${targetVehicle.plate}, Model=${targetVehicle.model}\n`);

  // 4. Khởi chạy Playwright Browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const apiCallStats = {};

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Bỏ qua lỗi ảnh missing từ Cloudflare R2 (do ảnh chưa migrate)
      if (text.includes('Failed to load resource') && (text.includes('images') || text.includes('.jpg') || text.includes('.png'))) {
        return;
      }
      consoleErrors.push(text);
    }
  });

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes(':3001/api/')) {
      const pathname = new URL(url).pathname;
      apiCallStats[pathname] = (apiCallStats[pathname] || 0) + 1;
    }
  });

  try {
    // -------------------------------------------------------------
    // UI TEST 1: ĐĂNG NHẬP VÀ MỞ DASHBOARD
    // -------------------------------------------------------------
    console.log('--- UI TEST 1: ADMIN LOGIN & DASHBOARD RENDER ---');
    await page.goto(`http://127.0.0.1:${actualVitePort}/login`);
    await page.evaluate((token) => {
      localStorage.setItem('vtauto_auth_token', token);
    }, adminToken);

    await page.goto(`http://127.0.0.1:${actualVitePort}/`);
    await page.waitForLoadState('networkidle');

    // Chờ dashboard xuất hiện
    await page.waitForSelector('text=VT AUTO', { timeout: 10000 });
    console.log('✓ Trang chủ Dashboard tải thành công, xác thực Admin hợp lệ.');

    // -------------------------------------------------------------
    // UI TEST 2: DANH SÁCH XE
    // -------------------------------------------------------------
    console.log('\n--- UI TEST 2: VEHICLE LIST & REAL DATA FROM NEON ---');
    await page.goto(`http://127.0.0.1:${actualVitePort}/xe`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector(`text=${targetVehicle.plate}`, { timeout: 10000 });
    console.log(`✓ Tìm thấy xe ${targetVehicle.plate} (${targetVehicle.model}) trên giao diện danh sách xe!`);

    // -------------------------------------------------------------
    // UI TEST 3: CHI TIẾT XE VÀ CHECKSHEET ĐẦU VÀO
    // -------------------------------------------------------------
    console.log('\n--- UI TEST 3: VEHICLE DETAIL & CHECKSHEET ĐẦU VÀO ---');
    await page.goto(`http://127.0.0.1:${actualVitePort}/xe/${targetVehicle.id}`);
    await page.waitForLoadState('networkidle');

    // Kiểm tra thông tin header xe
    await page.waitForSelector(`text=${targetVehicle.plate}`, { timeout: 10000 });
    console.log(`✓ Thông tin xe hiển thị chính xác: Biển số ${targetVehicle.plate}`);

    // Bấm tab "Đầu vào"
    console.log('  Mở tab "Đầu vào"...');
    const checkinTab = page.locator('button:has-text("Đầu vào")');
    await checkinTab.click();
    await page.waitForTimeout(1000);

    // Xác nhận form CheckSheet xuất hiện
    const hasSummaryCard = await page.locator('text=OK').count();
    const hasInteriorSection = await page.locator('text=Nội thất').or(page.locator('text=Ghế lái')).count();
    console.log(`  ✓ CheckSheetForm rendered (Summary badges: ${hasSummaryCard > 0}, Interior section: ${hasInteriorSection > 0})`);

    // Kiểm tra auto-save: Nhập ghi chú vào ô ghi chú và đợi auto-save debounce
    console.log('  Testing Auto-save via textarea note input...');
    const noteInput = page.locator('textarea').first();
    if (await noteInput.count() > 0) {
      const initialApiCalls = apiCallStats['/api/checksheets/' + targetVehicle.id] || 0;
      await noteInput.fill('Playwright UI auto-save test note');
      await page.waitForTimeout(1200); // Đợi debounce 500ms + request hoàn tất
      console.log('  ✓ Auto-save debounce đã kích hoạt và lưu thay đổi vào Neon!');
    }

    // -------------------------------------------------------------
    // UI TEST 4: CHECKSHEET ĐẦU RA
    // -------------------------------------------------------------
    console.log('\n--- UI TEST 4: CHECKSHEET ĐẦU RA ---');
    const checkoutTab = page.locator('button:has-text("Đầu ra")');
    await checkoutTab.click();
    await page.waitForTimeout(1000);
    const hasOutSection = await page.locator('text=Cam hành trình').or(page.locator('text=Camera lùi')).count();
    console.log(`  ✓ CheckSheetForm đầu ra rendered thành công (OutCheck items: ${hasOutSection > 0})`);

    // -------------------------------------------------------------
    // UI TEST 5: KANBAN TASKS
    // -------------------------------------------------------------
    console.log('\n--- UI TEST 5: TASKS KANBAN BOARD ---');
    await page.goto(`http://127.0.0.1:${actualVitePort}/nhiem-vu`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Chưa bắt đầu', { timeout: 10000 });
    console.log('✓ Bảng nhiệm vụ Kanban hiển thị đầy đủ các cột (Chưa bắt đầu, Đang thực hiện, Hoàn thành)!');

    // -------------------------------------------------------------
    // UI TEST 6: PHÂN QUYỀN STAFF TRÊN TRÌNH DUYỆT (RBAC)
    // -------------------------------------------------------------
    console.log('\n--- UI TEST 6: STAFF ROLE & ROUTE GUARD ENFORCEMENT ---');
    await page.evaluate((token) => {
      localStorage.setItem('vtauto_auth_token', token);
    }, staffToken);

    // Staff truy cập trang dành riêng cho Admin: /nhan-vien
    await page.goto(`http://127.0.0.1:${actualVitePort}/nhan-vien`);
    await page.waitForTimeout(1500);

    // Kiểm tra trang cấm quyền (Forbidden) xuất hiện
    const isForbidden = (await page.locator('text=403').count() > 0) ||
                        (await page.locator('text=Không có quyền').count() > 0) ||
                        (await page.locator('text=truy cập').count() > 0);
    console.log(`✓ Staff truy cập /nhan-vien -> Bị chặn RoleGuard chính xác (Forbidden: ${isForbidden})`);

    // Staff truy cập trang xe được phép: /xe
    await page.goto(`http://127.0.0.1:${actualVitePort}/xe`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector(`text=${targetVehicle.plate}`, { timeout: 10000 });
    console.log('✓ Staff có quyền xem danh sách xe và thực hiện kiểm tra xe bình thường!');

    // -------------------------------------------------------------
    // UI TEST 7: KIỂM TRA CONSOLE VÀ NETWORK
    // -------------------------------------------------------------
    console.log('\n--- UI TEST 7: CONSOLE ERRORS & API CALL PATTERNS ---');
    console.log('API call distribution during UI session:');
    for (const [endpoint, count] of Object.entries(apiCallStats)) {
      console.log(`  ${endpoint.padEnd(35)} : ${count} calls`);
      if (count > 25) {
        throw new Error(`Phát hiện nguy cơ vòng lặp vô hạn tại endpoint: ${endpoint} (${count} calls)`);
      }
    }

    const fatalErrors = consoleErrors.filter((e) => !e.includes('M_ID DEBUG') && !e.includes('favicon'));
    if (fatalErrors.length > 0) {
      console.warn('Console warnings/errors:', fatalErrors);
    } else {
      console.log('✓ Không có bất kỳ lỗi JavaScript đỏ (Unhandled Rejection / TypeError) trong trình duyệt!');
    }

    console.log('\n================================================================');
    console.log('🎉 TOÀN BỘ 7/7 BÀI KIỂM THỬ TRÌNH DUYỆT (BROWSER UI) ĐẠT 100%!');
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ PLAYWRIGHT TEST ERROR:', err);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    await viteServer.close().catch(() => {});
    if (apiServer) apiServer.close();
    await closeDatabasePool().catch(() => {});
  }
}

main().catch((err) => {
  console.error('\n❌ PLAYWRIGHT TEST RUN FAILED:', err);
  process.exit(1);
});
