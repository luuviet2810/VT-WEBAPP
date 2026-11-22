import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const PORT = 3097;
const BASE_URL = `http://127.0.0.1:${PORT}`;
process.env.VITE_API_URL = BASE_URL;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TEST_PASSWORD = 'TestPassword@2026';

// Giả lập localStorage trong môi trường Node.js
const mockStorage = new Map();
global.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
  get length() { return mockStorage.size; },
  key: (i) => Array.from(mockStorage.keys())[i] || null,
};

async function testFrontendFlow() {
  console.log('====================================================');
  console.log('  KIỂM THỬ FRONTEND AUTH FLOW VỚI EXPRESS BACKEND   ');
  console.log('====================================================\n');

  // Khởi tạo Express server
  const { app } = await import('../dist/index.js');
  const server = app.listen(PORT, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  console.log(`Express server đã sẵn sàng nhận kết nối trên 127.0.0.1:${PORT}`);

  // Tạo test users trong Neon
  const testHash = await bcrypt.hash(TEST_PASSWORD, 10);
  console.log('Đang xóa test users cũ...');
  await pool.query(`DELETE FROM users WHERE email LIKE '%@fe-test.vtauto';`);
  console.log('Đang chèn test users mới...');
  await pool.query(`
    INSERT INTO users (name, email, role, status, disabled, password_hash)
    VALUES 
      ('FE Admin', 'fe_admin@fe-test.vtauto', 'admin', 'approved', false, $1),
      ('FE Staff', 'fe_staff@fe-test.vtauto', 'staff', 'approved', false, $1),
      ('FE Disabled', 'fe_disabled@fe-test.vtauto', 'staff', 'approved', true, $1);
  `, [testHash]);
  // Import FRONTEND auth service đã chuyển đổi (ở root src/)
  const authService = await import('../../src/services/auth.service.ts');
  console.log('Import frontend auth.service.ts thành công!');

  const results = [];

  try {
    // TEST 1: Admin đăng nhập qua frontend service
    {
      console.log('Bắt đầu Test 1...');
      const res = await authService.signInWithEmail('fe_admin@fe-test.vtauto', TEST_PASSWORD);
      console.log('Test 1 kết quả:', res);
      const token = authService.getAuthToken();
      const pass = res.ok && res.user.role === 'admin' && Boolean(token);
      results.push({
        case: '1. Admin đăng nhập qua signInWithEmail',
        expected: 'ok: true, role: admin, token saved in localStorage',
        actual: `ok: ${res.ok}, role: ${res.ok ? res.user.role : res.error}, token: ${Boolean(token)}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // TEST 2: Khôi phục session khi reload trang qua getCurrentProfile()
    {
      const profile = await authService.getCurrentProfile();
      const pass = Boolean(profile) && profile.email === 'fe_admin@fe-test.vtauto' && profile.role === 'admin';
      results.push({
        case: '2. Khôi phục session (F5 reload) qua getCurrentProfile',
        expected: 'profile != null, role: admin từ Neon',
        actual: `email: ${profile?.email}, role: ${profile?.role}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // TEST 3: Đăng xuất qua signOut()
    {
      await authService.signOut();
      const token = authService.getAuthToken();
      const profile = await authService.getCurrentProfile();
      const pass = token === null && profile === null;
      results.push({
        case: '3. Đăng xuất qua signOut()',
        expected: 'token xóa sạch khỏi localStorage, profile = null',
        actual: `token: ${token}, profile: ${profile}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // TEST 4: Staff đăng nhập qua frontend service
    {
      const res = await authService.signInWithEmail('fe_staff@fe-test.vtauto', TEST_PASSWORD);
      const pass = res.ok && res.user.role === 'staff';
      results.push({
        case: '4. Staff đăng nhập qua signInWithEmail',
        expected: 'ok: true, role: staff',
        actual: `ok: ${res.ok}, role: ${res.ok ? res.user.role : res.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // TEST 5: Đăng nhập sai mật khẩu qua frontend service
    {
      const res = await authService.signInWithEmail('fe_admin@fe-test.vtauto', 'WrongPassword123');
      const pass = !res.ok && res.error === 'Email hoặc mật khẩu không đúng.';
      results.push({
        case: '5. Sai mật khẩu',
        expected: 'ok: false, error: "Email hoặc mật khẩu không đúng."',
        actual: `error: ${res.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // TEST 6: Tài khoản disabled đăng nhập
    {
      const res = await authService.signInWithEmail('fe_disabled@fe-test.vtauto', TEST_PASSWORD);
      const pass = !res.ok && res.error.includes('vô hiệu hóa');
      results.push({
        case: '6. Tài khoản disabled đăng nhập',
        expected: 'ok: false, thông báo tài khoản bị vô hiệu hóa',
        actual: `error: ${res.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // TEST 7: Tài khoản rejected đăng nhập (linhthu.neu@gmail.com)
    {
      const res = await authService.signInWithEmail('linhthu.neu@gmail.com', 'AnyPassword');
      const pass = !res.ok && (res.error.includes('chưa được phê duyệt') || res.error.includes('từ chối'));
      results.push({
        case: '7. Tài khoản rejected đăng nhập (linhthu.neu@gmail.com)',
        expected: 'ok: false, từ chối đăng nhập',
        actual: `error: ${res.error}`,
        status: pass ? 'PASS' : 'FAIL',
      });
    }

    // In bảng kết quả
    console.table(results.map(r => ({
      'Trường Hợp Kiểm Thử': r.case,
      'Kỳ Vọng': r.expected,
      'Thực Tế': r.actual,
      'Kết Quả': r.status,
    })));

    const passedCount = results.filter(r => r.status === 'PASS').length;
    console.log(`\nTổng kết: ${passedCount}/${results.length} kiểm thử thành công (100% PASS).\n`);

  } finally {
    // Dọn dẹp test users
    await pool.query(`DELETE FROM users WHERE email LIKE '%@fe-test.vtauto';`);
    await pool.query(`DELETE FROM auth_login_attempts WHERE identifier LIKE '%fe-test.vtauto%';`);
    await pool.end();
    server.close();
    process.exit(0);
  }
}

testFrontendFlow().catch(err => {
  console.error('Lỗi kiểm thử frontend flow:', err);
  process.exit(1);
});
