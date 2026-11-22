import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

const backupDir = path.resolve(process.cwd(), 'backups');

// Helper to extract tuples from INSERT INTO ... VALUES (...)
// Each file is INSERT INTO public.<table> (<columns>) VALUES <tuples>;
function parseInsertFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return { table: '', columns: [], rowsCount: 0, rawSql: '' };

  const match = content.match(/INSERT\s+INTO\s+public\.(\w+)\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+);?$/i);
  if (!match) {
    return { table: 'unknown', columns: [], rowsCount: 0, rawSql: content };
  }

  const table = match[1];
  const columns = match[2].split(',').map(c => c.trim());
  const valuesStr = match[3];

  return {
    table,
    columns,
    rawSql: content,
  };
}

async function main() {
  console.log('=== COMPREHENSIVE BACKUP AUDIT & VALIDATION ===\n');

  // Let's inspect Neon tables current row counts
  const tables = [
    'positions',
    'users',
    'vehicles',
    'check_sheets',
    'vehicle_images',
    'vehicle_documents',
    'tasks',
    'vehicle_workflow_logs',
    'move_logs',
    'attendance',
    'settings',
    'website_settings',
    'vehicle_option_defs',
  ];

  console.log('Current rows in Neon:');
  for (const t of tables) {
    const res = await pool.query(`SELECT count(*)::int AS count FROM public.${t}`);
    console.log(`- ${t}: ${res.rows[0].count} rows`);
  }
  console.log('');

  // Now let's test running each file in a temporary dry-run transaction (ROLLBACK at the end)
  const client = await pool.connect();
  try {
    console.log('Starting DRY-RUN transaction on Neon to test SQL syntax and FK constraints...\n');
    await client.query('BEGIN');

    // 1. positions_rows.sql
    console.log('1. Testing positions_rows.sql (with ON CONFLICT DO NOTHING)...');
    const posContent = fs.readFileSync(path.join(backupDir, 'positions_rows.sql'), 'utf8').trim().replace(/;$/, '');
    const posSql = `${posContent} ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, updated_at = EXCLUDED.updated_at;`;
    const posRes = await client.query(posSql);
    console.log(`   Positions upserted. Affected rows: ${posRes.rowCount}`);

    // Verify positions count in transaction
    const posCount = await client.query('SELECT count(*)::int AS count FROM public.positions');
    console.log(`   Total positions in Neon: ${posCount.rows[0].count}`);

    // 2. Ensure password_hash exists on users
    console.log('2. Checking users table schema on Neon...');
    await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;');

    // Testing users_rows.sql
    console.log('   Testing users_rows.sql...');
    const userContent = fs.readFileSync(path.join(backupDir, 'users_rows.sql'), 'utf8').trim().replace(/;$/, '');
    const userSql = `${userContent} ON CONFLICT (id) DO NOTHING;`;
    const userRes = await client.query(userSql);
    console.log(`   Users inserted. Affected rows: ${userRes.rowCount}`);

    // 3. vehicles_rows.sql
    console.log('3. Testing vehicles_rows.sql...');
    const vehContent = fs.readFileSync(path.join(backupDir, 'vehicles_rows.sql'), 'utf8').trim();
    const vehRes = await client.query(vehContent);
    console.log(`   Vehicles inserted. Affected rows: ${vehRes.rowCount}`);

    // 4. check_sheets_rows.sql
    console.log('4. Testing check_sheets_rows.sql...');
    const csContent = fs.readFileSync(path.join(backupDir, 'check_sheets_rows.sql'), 'utf8').trim();
    const csRes = await client.query(csContent);
    console.log(`   CheckSheets inserted. Affected rows: ${csRes.rowCount}`);

    // 5. vehicle_images_rows.sql
    console.log('5. Testing vehicle_images_rows.sql...');
    const viContent = fs.readFileSync(path.join(backupDir, 'vehicle_images_rows.sql'), 'utf8').trim();
    const viRes = await client.query(viContent);
    console.log(`   VehicleImages inserted. Affected rows: ${viRes.rowCount}`);

    // 6. vehicle_documents_rows.sql
    console.log('6. Testing vehicle_documents_rows.sql...');
    const vdContent = fs.readFileSync(path.join(backupDir, 'vehicle_documents_rows.sql'), 'utf8').trim();
    const vdRes = await client.query(vdContent);
    console.log(`   VehicleDocuments inserted. Affected rows: ${vdRes.rowCount}`);

    // 7. tasks_rows.sql
    console.log('7. Testing tasks_rows.sql...');
    const taskContent = fs.readFileSync(path.join(backupDir, 'tasks_rows.sql'), 'utf8').trim();
    const taskRes = await client.query(taskContent);
    console.log(`   Tasks inserted. Affected rows: ${taskRes.rowCount}`);

    // 8. vehicle_workflow_logs_rows.sql
    console.log('8. Testing vehicle_workflow_logs_rows.sql...');
    const vwlContent = fs.readFileSync(path.join(backupDir, 'vehicle_workflow_logs_rows.sql'), 'utf8').trim();
    const vwlRes = await client.query(vwlContent);
    console.log(`   VehicleWorkflowLogs inserted. Affected rows: ${vwlRes.rowCount}`);

    // 9. move_logs_rows.sql
    console.log('9. Testing move_logs_rows.sql...');
    const mlContent = fs.readFileSync(path.join(backupDir, 'move_logs_rows.sql'), 'utf8').trim();
    const mlRes = await client.query(mlContent);
    console.log(`   MoveLogs inserted. Affected rows: ${mlRes.rowCount}`);

    // 10. attendance_rows.sql
    console.log('10. Testing attendance_rows.sql...');
    const attContent = fs.readFileSync(path.join(backupDir, 'attendance_rows.sql'), 'utf8').trim();
    const attRes = await client.query(attContent);
    console.log(`   Attendance inserted. Affected rows: ${attRes.rowCount}`);

    // 11. settings_rows.sql
    console.log('11. Testing settings_rows.sql (with ON CONFLICT DO UPDATE)...');
    const setContent = fs.readFileSync(path.join(backupDir, 'settings_rows.sql'), 'utf8').trim().replace(/;$/, '');
    const setSql = `${setContent} ON CONFLICT (id) DO UPDATE SET company_name = EXCLUDED.company_name, work_start_hour = EXCLUDED.work_start_hour, work_end_hour = EXCLUDED.work_end_hour;`;
    const setRes = await client.query(setSql);
    console.log(`   Settings upserted. Affected rows: ${setRes.rowCount}`);

    // Verify Views
    console.log('\nTesting Views queryability in transaction:');
    const pvCount = await client.query('SELECT count(*)::int AS count FROM public.public_vehicles');
    console.log(`- public_vehicles view count: ${pvCount.rows[0].count}`);
    const pviCount = await client.query('SELECT count(*)::int AS count FROM public.public_vehicle_images');
    console.log(`- public_vehicle_images view count: ${pviCount.rows[0].count}`);

    // Checking for any orphans:
    const orphanCS = await client.query('SELECT count(*)::int AS count FROM check_sheets WHERE vehicle_id NOT IN (SELECT id FROM vehicles)');
    console.log(`- Orphan check_sheets (invalid vehicle_id): ${orphanCS.rows[0].count}`);
    const orphanVI = await client.query('SELECT count(*)::int AS count FROM vehicle_images WHERE vehicle_id NOT IN (SELECT id FROM vehicles)');
    console.log(`- Orphan vehicle_images (invalid vehicle_id): ${orphanVI.rows[0].count}`);
    const orphanVD = await client.query('SELECT count(*)::int AS count FROM vehicle_documents WHERE vehicle_id NOT IN (SELECT id FROM vehicles)');
    console.log(`- Orphan vehicle_documents (invalid vehicle_id): ${orphanVD.rows[0].count}`);
    const orphanTasks = await client.query('SELECT count(*)::int AS count FROM tasks WHERE vehicle_id IS NOT NULL AND vehicle_id NOT IN (SELECT id FROM vehicles)');
    console.log(`- Orphan tasks (invalid vehicle_id): ${orphanTasks.rows[0].count}`);
    const orphanMoveLogs = await client.query('SELECT count(*)::int AS count FROM move_logs WHERE vehicle_id NOT IN (SELECT id FROM vehicles)');
    console.log(`- Orphan move_logs (invalid vehicle_id): ${orphanMoveLogs.rows[0].count}`);

    console.log('\n--- DRY-RUN VALIDATION SUCCEEDED COMPLETELY! ---');
    console.log('Rolling back transaction so database remains pristine until actual import execution...');
    await client.query('ROLLBACK');
    console.log('Rollback finished cleanly.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nDRY RUN FAILED WITH ERROR:');
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
