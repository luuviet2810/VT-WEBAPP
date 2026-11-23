import crypto from 'crypto';
import pg from 'pg';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const outDir = 'screenshots/registration-verification';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Neon Database connection for assertions and cleanup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const jwtSecret = 'fa456d3ac1fb2a116fc1bc3f9346ea8f3530fcdf3a46b39c104bf20d3139a429';

function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      iat: now,
      exp: now + 7 * 86400,
    })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const adminUser = {
  id: '5952c302-6998-4804-8121-80a663c81fb5',
  email: 'luuviet2810@gmail.com',
  name: 'LƯU VĂN VIỆT',
};
const adminToken = createToken(adminUser);

const staffUser = {
  id: 'b2931df6-022c-403c-965d-9d743326b9f0',
  email: 'kienluu13012005vp@gmail.com',
  name: 'LUU ANH KIEN',
};
const staffToken = createToken(staffUser);

const TEST_EMAIL_A = 'test_approval_user_99@vtauto-test.com';
const TEST_EMAIL_B = 'test_rejection_user_88@vtauto-test.com';
const TEST_PASSWORD = 'TestPassword123!';

async function runTests() {
  console.log('====================================================');
  console.log('VT AUTO — REGISTRATION & APPROVAL TEST SUITE');
  console.log('====================================================\n');

  const results = [];

  // Cleanup any leftover test users first
  await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [TEST_EMAIL_A, TEST_EMAIL_B]);
  await pool.query('DELETE FROM activity_logs WHERE description LIKE $1', ['%vtauto-test.com%']);

  let testUserAId = null;
  let testUserBId = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Đăng ký tài khoản mới thành công (Account A)
    // ----------------------------------------------------
    console.log('--- TEST 1: Đăng ký tài khoản mới thành công ---');
    const res1 = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Nguyễn Văn Test Duyệt',
        email: TEST_EMAIL_A,
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
      }),
    });
    const data1 = await res1.json();
    console.log('Status:', res1.status, data1);
    const pass1 = res1.status === 201 && data1.ok && data1.data?.user?.status === 'pending' && data1.data?.user?.role === 'staff';
    results.push({ name: '1. Đăng ký tài khoản mới thành công', pass: pass1, data: data1 });
    if (!pass1) throw new Error('Test 1 failed');
    testUserAId = data1.data.user.id;

    // ----------------------------------------------------
    // TEST 2: Tài khoản được lưu ở trạng thái pending trong DB
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Kiểm tra trạng thái pending trong Database Neon ---');
    const dbRes2 = await pool.query('SELECT id, name, email, role, status, is_admin, disabled, password_hash FROM users WHERE id = $1', [testUserAId]);
    const row2 = dbRes2.rows[0];
    const pass2 = row2 && row2.status === 'pending' && row2.role === 'staff' && row2.is_admin === false && row2.disabled === false && !!row2.password_hash;
    console.log('DB Row 2:', row2 ? { id: row2.id, email: row2.email, role: row2.role, status: row2.status, has_hash: !!row2.password_hash } : null);
    results.push({ name: '2. Tài khoản được lưu ở trạng thái pending trong DB', pass: pass2 });
    if (!pass2) throw new Error('Test 2 failed');

    // ----------------------------------------------------
    // TEST 3: Đăng nhập khi pending bị từ chối
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Đăng nhập khi pending bị từ chối ---');
    const res3 = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL_A,
        password: TEST_PASSWORD,
      }),
    });
    const data3 = await res3.json();
    console.log('Status:', res3.status, data3);
    const pass3 = res3.status === 403 && data3.error === 'account_pending' && data3.message?.includes('phê duyệt');
    results.push({ name: '3. Đăng nhập khi pending bị từ chối', pass: pass3, message: data3.message });
    if (!pass3) throw new Error('Test 3 failed');

    // ----------------------------------------------------
    // TEST 4: Staff không thể duyệt tài khoản (Bảo mật RBAC)
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Staff không thể duyệt tài khoản ---');
    const res4 = await fetch(`http://localhost:3001/api/employees/${testUserAId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
    });
    const data4 = await res4.json();
    console.log('Status:', res4.status, data4);
    const pass4 = res4.status === 403;
    results.push({ name: '4. Staff không thể duyệt tài khoản (403 Forbidden)', pass: pass4, status: res4.status });
    if (!pass4) throw new Error('Test 4 failed');

    // ----------------------------------------------------
    // TEST 5: Admin duyệt thành công
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Admin duyệt thành công ---');
    const res5 = await fetch(`http://localhost:3001/api/employees/${testUserAId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const data5 = await res5.json();
    console.log('Status:', res5.status, data5);
    const dbRes5 = await pool.query('SELECT status FROM users WHERE id = $1', [testUserAId]);
    const pass5 = res5.status === 200 && data5.ok && dbRes5.rows[0]?.status === 'approved';
    results.push({ name: '5. Admin duyệt thành công', pass: pass5, newStatus: dbRes5.rows[0]?.status });
    if (!pass5) throw new Error('Test 5 failed');

    // ----------------------------------------------------
    // TEST 6: Tài khoản vừa duyệt đăng nhập thành công
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Tài khoản vừa duyệt đăng nhập thành công ---');
    const res6 = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL_A,
        password: TEST_PASSWORD,
      }),
    });
    const data6 = await res6.json();
    console.log('Status:', res6.status, { ok: data6.ok, user: data6.data?.user, hasToken: !!data6.data?.token });
    const pass6 = res6.status === 200 && data6.ok && data6.data?.user?.status === 'approved' && !!data6.data?.token;
    results.push({ name: '6. Tài khoản vừa duyệt đăng nhập thành công và nhận JWT', pass: pass6 });
    if (!pass6) throw new Error('Test 6 failed');

    // ----------------------------------------------------
    // TEST 7: Admin từ chối tài khoản khác (Account B)
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Đăng ký Account B và Admin từ chối ---');
    const res7a = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Trần Văn Test Từ Chối',
        email: TEST_EMAIL_B,
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
      }),
    });
    const data7a = await res7a.json();
    testUserBId = data7a.data.user.id;

    const res7b = await fetch(`http://localhost:3001/api/employees/${testUserBId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const data7b = await res7b.json();
    console.log('Status 7b:', res7b.status, data7b);
    const dbRes7 = await pool.query('SELECT status FROM users WHERE id = $1', [testUserBId]);
    const pass7 = res7b.status === 200 && data7b.ok && dbRes7.rows[0]?.status === 'rejected';
    results.push({ name: '7. Admin từ chối tài khoản khác thành công', pass: pass7, status: dbRes7.rows[0]?.status });
    if (!pass7) throw new Error('Test 7 failed');

    // ----------------------------------------------------
    // TEST 8: Tài khoản rejected không thể đăng nhập
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Tài khoản rejected không thể đăng nhập ---');
    const res8 = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL_B,
        password: TEST_PASSWORD,
      }),
    });
    const data8 = await res8.json();
    console.log('Status 8:', res8.status, data8);
    const pass8 = res8.status === 403 && data8.error === 'account_rejected';
    results.push({ name: '8. Tài khoản rejected không thể đăng nhập', pass: pass8, message: data8.message });
    if (!pass8) throw new Error('Test 8 failed');

    // ----------------------------------------------------
    // TEST 9: Email trùng bị từ chối
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Email trùng bị từ chối ---');
    const res9 = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Người Trùng Email',
        email: TEST_EMAIL_A,
        password: 'AnotherPassword123!',
        confirmPassword: 'AnotherPassword123!',
      }),
    });
    const data9 = await res9.json();
    console.log('Status 9:', res9.status, data9);
    const pass9 = res9.status === 409 && data9.error === 'email_exists';
    results.push({ name: '9. Email trùng bị từ chối (409 Conflict)', pass: pass9, message: data9.message });
    if (!pass9) throw new Error('Test 9 failed');

    // ----------------------------------------------------
    // TEST 10: Các tài khoản Admin và Staff cũ vẫn đăng nhập bình thường
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Kiểm tra tài khoản Admin và Staff cũ ---');
    const pass10 = true; // Sẽ đối chiếu trong DB
    const adminCheck = await pool.query("SELECT email, role, status, (password_hash IS NOT NULL) as has_pass FROM users WHERE email = 'luuviet2810@gmail.com'");
    const staffCheck = await pool.query("SELECT email, role, status, (password_hash IS NOT NULL) as has_pass FROM users WHERE email = 'kienluu13012005vp@gmail.com'");
    console.log('Admin check:', adminCheck.rows[0]);
    console.log('Staff check:', staffCheck.rows[0]);
    results.push({
      name: '10. Các tài khoản Admin và Staff cũ vẫn giữ nguyên vẹn',
      pass: adminCheck.rows[0]?.status === 'approved' && staffCheck.rows[0]?.status === 'approved',
      admin: adminCheck.rows[0],
      staff: staffCheck.rows[0],
    });

  } finally {
    // ----------------------------------------------------
    // CLEANUP: Xóa các tài khoản thử nghiệm
    // ----------------------------------------------------
    console.log('\n--- CLEANUP: Dọn dẹp tài khoản thử nghiệm ---');
    if (testUserAId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserAId]);
      console.log('✓ Đã dọn dẹp testUserA:', testUserAId);
    }
    if (testUserBId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserBId]);
      console.log('✓ Đã dọn dẹp testUserB:', testUserBId);
    }
    await pool.query('DELETE FROM activity_logs WHERE description LIKE $1', ['%vtauto-test.com%']);
    console.log('✓ Đã dọn dẹp activity_logs test');
    await pool.end();
  }

  // ----------------------------------------------------
  // PLAYWRIGHT UI VERIFICATION & SCREENSHOTS
  // ----------------------------------------------------
  console.log('\n--- Bắt đầu chụp ảnh kiểm tra trực quan giao diện ---');
  const browser = await chromium.launch();
  const context = await browser.newContext();

  try {
    // 1. Trang /register
    const page1 = await context.newPage();
    await page1.setViewportSize({ width: 1280, height: 900 });
    await page1.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
    await page1.fill('input[placeholder="Nhập họ và tên"]', 'Đỗ Thành Long');
    await page1.fill('input[placeholder="email@example.com"]', 'long.do@vtauto.vn');
    await page1.fill('input[placeholder="Ít nhất 6 ký tự"]', 'MatKhauBaoMat123');
    await page1.fill('input[placeholder="Nhập lại mật khẩu"]', 'MatKhauBaoMat123');
    await page1.waitForTimeout(600);
    await page1.screenshot({ path: path.join(outDir, '1-register-form.png') });
    console.log('✓ 1-register-form.png');

    // 2. Click Đăng ký để hiển thị màn hình pending
    await page1.click('button[type="submit"]');
    await page1.waitForSelector('text=Đăng ký thành công!', { timeout: 10000 });
    await page1.waitForTimeout(800);
    await page1.screenshot({ path: path.join(outDir, '2-register-pending-screen.png') });
    console.log('✓ 2-register-pending-screen.png');
    await page1.close();

    // 3. Admin Employees Page showing Pending registration section
    const contextAdmin = await browser.newContext();
    const page2 = await contextAdmin.newPage();
    await page2.setViewportSize({ width: 1280, height: 900 });
    await page2.addInitScript((token) => {
      localStorage.setItem('vtauto_auth_token', token);
    }, adminToken);
    await page2.goto('http://localhost:5173/nhan-vien', { waitUntil: 'networkidle' });
    await page2.waitForTimeout(1500);
    await page2.screenshot({ path: path.join(outDir, '3-admin-employees-approval.png') });
    console.log('✓ 3-admin-employees-approval.png');
    await page2.close();
    await contextAdmin.close();

    // 4. Login error message when logging in with pending account
    const contextAnon = await browser.newContext();
    const page3 = await contextAnon.newPage();
    await page3.setViewportSize({ width: 1280, height: 900 });
    await page3.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page3.fill('input[type="email"]', 'long.do@vtauto.vn');
    await page3.fill('input[type="password"]', 'MatKhauBaoMat123');
    await page3.click('button[type="submit"]');
    await page3.waitForTimeout(1200);
    await page3.screenshot({ path: path.join(outDir, '4-login-pending-error.png') });
    console.log('✓ 4-login-pending-error.png');
    await page3.close();
    await contextAnon.close();

  } finally {
    await browser.close();

    // Dọn dẹp tài khoản tạo qua UI Playwright
    const poolClean = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await poolClean.query("DELETE FROM users WHERE email = 'long.do@vtauto.vn'");
    await poolClean.query("DELETE FROM activity_logs WHERE description LIKE '%long.do@vtauto.vn%'");
    await poolClean.end();
    console.log('✓ Đã dọn dẹp tài khoản test UI (long.do@vtauto.vn)');
  }

  console.log('\n====================================================');
  console.log('TỔNG HỢP KẾT QUẢ KIỂM THỬ:');
  console.log('====================================================');
  results.forEach((r, idx) => {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
  });
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
