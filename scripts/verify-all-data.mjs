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
  const res = await pool.query(`
    SELECT 'positions' AS table_name, count(*)::int AS count FROM positions
    UNION ALL
    SELECT 'users', count(*)::int FROM users
    UNION ALL
    SELECT 'vehicles', count(*)::int FROM vehicles
    UNION ALL
    SELECT 'check_sheets', count(*)::int FROM check_sheets
    UNION ALL
    SELECT 'vehicle_images', count(*)::int FROM vehicle_images
    UNION ALL
    SELECT 'vehicle_documents', count(*)::int FROM vehicle_documents
    UNION ALL
    SELECT 'tasks', count(*)::int FROM tasks
    UNION ALL
    SELECT 'vehicle_workflow_logs', count(*)::int FROM vehicle_workflow_logs
    UNION ALL
    SELECT 'move_logs', count(*)::int FROM move_logs
    UNION ALL
    SELECT 'attendance', count(*)::int FROM attendance
    UNION ALL
    SELECT 'settings', count(*)::int FROM settings
    UNION ALL
    SELECT 'website_settings', count(*)::int FROM website_settings
    UNION ALL
    SELECT 'vehicle_option_defs', count(*)::int FROM vehicle_option_defs
    UNION ALL
    SELECT 'public_vehicles (view)', count(*)::int FROM public_vehicles
    UNION ALL
    SELECT 'public_vehicle_images (view)', count(*)::int FROM public_vehicle_images
    ORDER BY table_name;
  `);

  console.log('=== COMPLETE DATABASE ROW INVENTORY ON NEON ===');
  console.table(res.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
