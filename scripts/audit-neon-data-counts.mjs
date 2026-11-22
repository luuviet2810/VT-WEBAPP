import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  const tables = [
    'users',
    'vehicles',
    'check_sheets',
    'tasks',
    'vehicle_images',
    'vehicle_documents',
    'move_logs',
    'vehicle_workflow_logs',
    'positions',
    'attendance',
    'vehicle_option_defs',
    'website_settings',
    'settings'
  ];

  const results = {};
  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT count(*) FROM "${t}"`);
      results[t] = parseInt(res.rows[0].count, 10);
    } catch (err) {
      results[t] = `Error: ${err.message}`;
    }
  }

  try {
    const v1 = await pool.query('SELECT count(*) FROM public_vehicles');
    results['public_vehicles (view)'] = parseInt(v1.rows[0].count, 10);
  } catch (err) {
    results['public_vehicles (view)'] = `Error: ${err.message}`;
  }

  try {
    const v2 = await pool.query('SELECT count(*) FROM public_vehicle_images');
    results['public_vehicle_images (view)'] = parseInt(v2.rows[0].count, 10);
  } catch (err) {
    results['public_vehicle_images (view)'] = `Error: ${err.message}`;
  }

  console.log(JSON.stringify(results, null, 2));
  await pool.end();
}

check().catch(err => {
  console.error('Lỗi khi truy vấn:', err.message);
  process.exit(1);
});
