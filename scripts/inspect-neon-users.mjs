import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function main() {
  const users = await pool.query(`
    SELECT id, auth_id, name, email, role, is_admin, status, disabled, passkey_enabled, 
           (password_hash IS NOT NULL) AS has_password_hash,
           created_at, updated_at
    FROM users
    ORDER BY created_at
  `);

  console.log('=== USERS IN NEON POSTGRESQL ===');
  console.table(users.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
