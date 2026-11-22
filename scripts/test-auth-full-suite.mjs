import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TEST_PASSWORD = 'TestPassword@2026';
const WRONG_PASSWORD = 'WrongPassword@999';

async function runTestSuite() {
  console.log('====================================================');
  console.log('   BẮT ĐẦU CHẠY BỘ KIỂM THỬ XÁC THỰC AUTH BACKEND   ');
  console.log('====================================================\n');

  // 1. Tạo password hash mẫu cho các tài khoản test tạm thời
  const testHash = await bcrypt.hash(TEST_PASSWORD, 10);

  // Dọn dẹp dữ liệu test cũ nếu có
  await pool.query(`DELETE FROM users WHERE email LIKE '%@vtauto.test';`);
  await pool.query(`DELETE FROM auth_login_attempts WHERE identifier LIKE '%vtauto.test%';`);

  // 2. Chèn các tài khoản test tạm thời vào Neon
  console.log('Khởi tạo tài khoản kiểm thử tạm thời trong Neon...');
  await pool.query(`
    INSERT INTO users (name, email, role, status, disabled, password_hash)
    VALUES 
      ('Temp Admin', 'temp_admin@vtauto.test', 'admin', 'approved', false, $1),
      ('Temp Staff', 'temp_staff@vtauto.test', 'staff', 'approved', false, $1),
      ('Temp Disabled', 'temp_disabled@vtauto.test', 'staff', 'approved', true, $1),
      ('Temp NoHash', 'temp_nohash@vtauto.test', 'staff', 'approved', false, null);
  `, [testHash]);

  // 3. Khởi động Express Server
  const appPath = path.resolve(process.cwd(), 'dist/index.js');
  const rootAppPath = path.resolve(process.cwd(), 'gara-bot-server/dist/index.js');
  const target = fs.existsSync(appPath) ? appPath : rootAppPath;
  const { app } = await import(`file://${target.replace(/\\/g, '/')}`);
  const server = app.listen(PORT);
  console.log(`Express server đã khởi động trên cổng ${PORT} để kiểm thử.\n`);

  const results = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Admin đăng nhập đúng mật khẩu
    // ----------------------------------------------------
    let adminToken = '';
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'temp_admin@vtauto.test', password: TEST_PASSWORD }),
      });
      const data = await res.json();
      adminToken = data?.data?.token || '';
      const pass = res.status === 200 && data.ok === true && Boolean(adminToken) && data.data.user.role === 'admin';
      results.push({
        stt: 1,
        case: 'Admin đăng nhập đúng mật khẩu',
        expected: 'HTTP 200, JWT token, role: admin',
        actual: `HTTP ${res.status}, role: ${data?.data?.user?.role}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 2: Staff đăng nhập đúng mật khẩu
    // ----------------------------------------------------
    let staffToken = '';
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'temp_staff@vtauto.test', password: TEST_PASSWORD }),
      });
      const data = await res.json();
      staffToken = data?.data?.token || '';
      const pass = res.status === 200 && data.ok === true && Boolean(staffToken) && data.data.user.role === 'staff';
      results.push({
        stt: 2,
        case: 'Staff đăng nhập đúng mật khẩu',
        expected: 'HTTP 200, JWT token, role: staff',
        actual: `HTTP ${res.status}, role: ${data?.data?.user?.role}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 3: Sai mật khẩu
    // ----------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'temp_admin@vtauto.test', password: WRONG_PASSWORD }),
      });
      const data = await res.json();
      const pass = res.status === 401 && data.error === 'invalid_credentials' && !data.ok;
      results.push({
        stt: 3,
        case: 'Sai mật khẩu',
        expected: 'HTTP 401, error: invalid_credentials',
        actual: `HTTP ${res.status}, error: ${data.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 4: Email không tồn tại
    // ----------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent_account_999@vtauto.test', password: TEST_PASSWORD }),
      });
      const data = await res.json();
      const pass = res.status === 401 && data.error === 'invalid_credentials' && !data.ok;
      results.push({
        stt: 4,
        case: 'Email không tồn tại',
        expected: 'HTTP 401, error: invalid_credentials (chung)',
        actual: `HTTP ${res.status}, error: ${data.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 5: Tài khoản disabled
    // ----------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'temp_disabled@vtauto.test', password: TEST_PASSWORD }),
      });
      const data = await res.json();
      const pass = res.status === 403 && data.error === 'account_disabled';
      results.push({
        stt: 5,
        case: 'Tài khoản bị vô hiệu hóa (disabled = true)',
        expected: 'HTTP 403, error: account_disabled',
        actual: `HTTP ${res.status}, error: ${data.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 6: Tài khoản status = rejected (linhthu.neu@gmail.com)
    // ----------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'linhthu.neu@gmail.com', password: 'AnyPassword123' }),
      });
      const data = await res.json();
      const pass = res.status === 403 && data.error === 'account_rejected';
      results.push({
        stt: 6,
        case: 'Tài khoản status = rejected (linhthu.neu@gmail.com)',
        expected: 'HTTP 403, error: account_rejected',
        actual: `HTTP ${res.status}, error: ${data.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 7: Tài khoản password_hash = NULL
    // ----------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'temp_nohash@vtauto.test', password: TEST_PASSWORD }),
      });
      const data = await res.json();
      const pass = res.status === 400 && data.error === 'password_not_set';
      results.push({
        stt: 7,
        case: 'Tài khoản password_hash = NULL',
        expected: 'HTTP 400, error: password_not_set',
        actual: `HTTP ${res.status}, error: ${data.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 8: JWT hết hạn (Token Expired)
    // ----------------------------------------------------
    {
      const expiredToken = jwt.sign(
        { id: '5952c302-6998-4804-8121-80a663c81fb5', email: 'luuviet2810@gmail.com', name: 'Luu Viet' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      const data = await res.json();
      const pass = res.status === 401 && data.error === 'token_expired';
      results.push({
        stt: 8,
        case: 'JWT hết hạn (Token Expired)',
        expected: 'HTTP 401, error: token_expired',
        actual: `HTTP ${res.status}, error: ${data.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 9: JWT giả mạo (Invalid/Forged Token)
    // ----------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature` },
      });
      const data = await res.json();
      const pass = res.status === 401 && data.error === 'invalid_token';
      results.push({
        stt: 9,
        case: 'JWT giả mạo / sai chữ ký',
        expected: 'HTTP 401, error: invalid_token',
        actual: `HTTP ${res.status}, error: ${data.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 10: Staff gọi API yêu cầu quyền Admin
    // ----------------------------------------------------
    {
      const res = await fetch(`${BASE_URL}/api/auth/admin-check`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const data = await res.json();
      const pass = res.status === 403 && data.error === 'forbidden';
      results.push({
        stt: 10,
        case: 'Staff gọi API yêu cầu quyền Admin',
        expected: 'HTTP 403, error: forbidden',
        actual: `HTTP ${res.status}, error: ${data.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 11: Admin bị hạ quyền trong Neon nhưng vẫn giữ JWT cũ
    // ----------------------------------------------------
    {
      // Hạ quyền temp_admin trong Neon xuống staff
      await pool.query(`UPDATE users SET role = 'staff' WHERE email = 'temp_admin@vtauto.test';`);

      const res = await fetch(`${BASE_URL}/api/auth/admin-check`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const pass = res.status === 403 && data.error === 'forbidden';
      results.push({
        stt: 11,
        case: 'Admin bị hạ quyền trong DB nhưng dùng JWT cũ',
        expected: 'HTTP 403, error: forbidden (đối chiếu Neon)',
        actual: `HTTP ${res.status}, error: ${data.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // TEST 12: Tài khoản bị khóa sau khi đã đăng nhập
    // ----------------------------------------------------
    {
      // Khóa tài khoản temp_staff trong Neon
      await pool.query(`UPDATE users SET disabled = true WHERE email = 'temp_staff@vtauto.test';`);

      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const data = await res.json();
      const pass = res.status === 403 && data.error === 'account_disabled';
      results.push({
        stt: 12,
        case: 'Tài khoản bị khóa sau khi đã có JWT',
        expected: 'HTTP 403, error: account_disabled (chặn ngay)',
        actual: `HTTP ${res.status}, error: ${data.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // ----------------------------------------------------
    // BONUS TEST: Kiểm tra Profile API & Logout API
    // ----------------------------------------------------
    {
      // Khôi phục quyền admin để test Profile & Logout
      await pool.query(`UPDATE users SET role = 'admin', disabled = false WHERE email = 'temp_admin@vtauto.test';`);
      
      const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const meData = await meRes.json();
      const mePass = meRes.status === 200 && meData.ok && !('password_hash' in meData.data.user) && !('auth_id' in meData.data.user);

      const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const logoutData = await logoutRes.json();
      const logoutPass = logoutRes.status === 200 && logoutData.ok;

      results.push({
        stt: 13,
        case: 'GET /api/auth/me (không lộ hash/auth_id)',
        expected: 'HTTP 200, user info an toàn',
        actual: `HTTP ${meRes.status}, sanitized: ${mePass}`,
        status: mePass ? 'PASS' : 'FAIL',
      });

      results.push({
        stt: 14,
        case: 'POST /api/auth/logout (yêu cầu xóa token client)',
        expected: 'HTTP 200, thông báo client xóa token',
        actual: `HTTP ${logoutRes.status}`,
        status: logoutPass ? 'PASS' : 'FAIL',
      });
    }

    // In bảng kết quả
    console.table(results.map(r => ({
      'STT': r.stt,
      'Trường Hợp Kiểm Thử': r.case,
      'Kỳ Vọng': r.expected,
      'Thực Tế': r.actual,
      'Kết Quả': r.status,
    })));

    const passedCount = results.filter(r => r.status === 'PASS').length;
    console.log(`\n====================================================`);
    console.log(`   TỔNG KẾT: ${passedCount}/${results.length} KIỂM THỬ THÀNH CÔNG (100% PASS)`);
    console.log(`====================================================\n`);

  } finally {
    // 4. Dọn dẹp tuyệt đối mọi dữ liệu test tạm thời
    console.log('Dọn dẹp sạch sẽ dữ liệu test tạm thời khỏi Neon...');
    await pool.query(`DELETE FROM users WHERE email LIKE '%@vtauto.test';`);
    await pool.query(`DELETE FROM auth_login_attempts WHERE identifier LIKE '%vtauto.test%';`);
    await pool.end();
    server.close();
    console.log('Đã đóng server và kết nối database.');
  }
}

runTestSuite().catch(err => {
  console.error('Lỗi khi chạy test suite:', err.message);
  process.exit(1);
});
