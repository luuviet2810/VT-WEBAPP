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
  const views = ['public_vehicles', 'public_vehicle_images'];
  for (const v of views) {
    const res = await pool.query(`
      SELECT definition FROM pg_views WHERE schemaname = 'public' AND viewname = $1
    `, [v]);
    console.log(`\n=== VIEW: ${v} ===`);
    console.log(res.rows[0]?.definition);
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
