import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const PORT = 3098;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testRateLimit() {
  console.log('--- KIỂM THỬ RATE LIMIT ĐĂNG NHẬP (5 LẦN THẤT BẠI / 15 PHÚT) ---');
  
  const testEmail = 'ratelimit_test@vtauto.test';
  await pool.query(`DELETE FROM auth_login_attempts WHERE identifier LIKE '%ratelimit_test%' OR identifier LIKE '%127.0.0.1%';`);

  const { app } = await import('../dist/index.js');
  const server = app.listen(PORT);

  try {
    for (let i = 1; i <= 6; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'WrongPassword' }),
      });
      const data = await res.json();
      console.log(`Lần thử ${i}: HTTP ${res.status} | Error: ${data.error} | Message: ${data.message}`);

      if (i <= 5) {
        if (res.status !== 401) throw new Error(`Lần ${i} kỳ vọng 401 nhưng nhận ${res.status}`);
      } else {
        if (res.status !== 429) throw new Error(`Lần ${i} kỳ vọng 429 (Too Many Requests) nhưng nhận ${res.status}`);
        console.log('\n=> RATE LIMIT HOẠT ĐỘNG CHÍNH XÁC: Lần thứ 6 đã bị chặn với HTTP 429 Too Many Requests!');
      }
    }
  } finally {
    await pool.query(`DELETE FROM auth_login_attempts WHERE identifier LIKE '%ratelimit_test%' OR identifier LIKE '%127.0.0.1%';`);
    await pool.end();
    server.close();
    process.exit(0);
  }
}

testRateLimit().catch(err => {
  console.error('Lỗi test rate limit:', err.message);
  process.exit(1);
});
