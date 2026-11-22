import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('--- KIỂM TRA MODULE 2: CHECKSHEETS TRÊN NEON ---');

  const csRes = await pool.query('SELECT count(*) FROM check_sheets');
  const csCount = parseInt(csRes.rows[0].count, 10);
  console.log(`CheckSheets count: ${csCount} (kỳ vọng: 116)`);
  if (csCount !== 116) throw new Error(`CheckSheets count không khớp: ${csCount}`);

  const typeRes = await pool.query('SELECT type, count(*) FROM check_sheets GROUP BY type');
  console.log('Checksheets by type:', typeRes.rows);

  console.log('✅ MODULE 2 KIỂM TRA THÀNH CÔNG 100%!');
  await pool.end();
}

run().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
