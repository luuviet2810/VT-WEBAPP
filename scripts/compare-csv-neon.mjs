import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function compare() {
  const neonRes = await pool.query('SELECT id, auth_id, email, name, role, status FROM users ORDER BY email ASC;');
  const neonUsers = neonRes.rows;

  const csvContent = fs.readFileSync('backups/Supabase Snippet Untitled query.csv', 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
  const header = lines[0].split(',').map(h => h.trim());
  const csvRows = lines.slice(1).map(l => {
    const parts = l.split(',');
    return {
      id: parts[0]?.trim(),
      email: parts[1]?.trim().toLowerCase(),
      hash_length: parts[2]?.trim().length,
      hash_prefix: parts[2]?.trim().substring(0, 4),
    };
  });

  console.log('--- SO SÁNH SUPABASE AUTH.USERS CSV VÀ NEON USERS ---');
  for (const nu of neonUsers) {
    const emailNorm = (nu.email || '').trim().toLowerCase();
    const csvMatch = csvRows.find(r => r.email === emailNorm);
    if (!csvMatch) {
      console.log(`[KHÔNG TÌM THẤY TRONG CSV] Neon Email: ${emailNorm}`);
    } else {
      console.log(`Email: ${emailNorm}`);
      console.log(`  Neon user id:   ${nu.id}`);
      console.log(`  Neon auth_id:   ${nu.auth_id}`);
      console.log(`  Supabase CSV id:${csvMatch.id}`);
      console.log(`  ID có khớp không?: ${nu.auth_id === csvMatch.id ? 'KHỚP 100%' : 'KHÁC NHAU'}`);
    }
  }

  await pool.end();
}

compare().catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});
