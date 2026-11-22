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
  const tables = ['vehicle_workflow_logs', 'move_logs', 'vehicle_documents'];
  for (const t of tables) {
    const colRes = await pool.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [t]);

    console.log(`\nTable: ${t}`);
    console.table(colRes.rows);
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
