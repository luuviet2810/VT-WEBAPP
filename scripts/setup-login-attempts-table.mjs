import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setup() {
  console.log('Khởi tạo bảng auth_login_attempts trên Neon...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_login_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      identifier TEXT NOT NULL,
      attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON auth_login_attempts (identifier, attempted_at DESC);
  `);
  console.log('Bảng auth_login_attempts đã sẵn sàng.');
  await pool.end();
}

setup().catch(err => {
  console.error('Lỗi setup:', err.message);
  process.exit(1);
});
