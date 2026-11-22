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

async function main() {
  console.log('=== EXECUTING VT AUTO DATA IMPORT ON NEON POSTGRESQL ===\n');

  const client = await pool.connect();

  try {
    console.log('Starting atomic transaction for Priority Import...');
    await client.query('BEGIN');

    // 1. Prerequisites: positions
    console.log('Step 1: Upserting positions (to satisfy vehicles.position_id FK)...');
    const posContent = fs.readFileSync(path.join(backupDir, 'positions_rows.sql'), 'utf8').trim().replace(/;$/, '');
    const posSql = `${posContent} ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, updated_at = EXCLUDED.updated_at;`;
    const posRes = await client.query(posSql);
    console.log(`   Positions upserted. Affected count: ${posRes.rowCount}`);

    // 2. Prerequisites: users
    console.log('Step 2: Ensuring users schema and importing users (to satisfy assignee_id and checker_id FKs)...');
    await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;');
    const userContent = fs.readFileSync(path.join(backupDir, 'users_rows.sql'), 'utf8').trim().replace(/;$/, '');
    const userSql = `${userContent} ON CONFLICT (id) DO NOTHING;`;
    const userRes = await client.query(userSql);
    console.log(`   Users inserted. Affected count: ${userRes.rowCount}`);

    // 3. Priority 1: vehicles
    console.log('Step 3: Importing Priority 1 - vehicles_rows.sql...');
    const vehContent = fs.readFileSync(path.join(backupDir, 'vehicles_rows.sql'), 'utf8').trim();
    const vehRes = await client.query(vehContent);
    console.log(`   Vehicles inserted: ${vehRes.rowCount} rows`);

    // 4. Priority 2: check_sheets
    console.log('Step 4: Importing Priority 2 - check_sheets_rows.sql...');
    const csContent = fs.readFileSync(path.join(backupDir, 'check_sheets_rows.sql'), 'utf8').trim();
    const csRes = await client.query(csContent);
    console.log(`   CheckSheets inserted: ${csRes.rowCount} rows`);

    // 5. Priority 3: vehicle_images
    console.log('Step 5: Importing Priority 3 - vehicle_images_rows.sql...');
    const viContent = fs.readFileSync(path.join(backupDir, 'vehicle_images_rows.sql'), 'utf8').trim();
    const viRes = await client.query(viContent);
    console.log(`   VehicleImages inserted: ${viRes.rowCount} rows`);

    // Integrity checks before committing
    console.log('\nPerforming integrity checks before committing...');
    const orphanCS = await client.query('SELECT count(*)::int AS count FROM check_sheets WHERE vehicle_id NOT IN (SELECT id FROM vehicles)');
    const orphanVI = await client.query('SELECT count(*)::int AS count FROM vehicle_images WHERE vehicle_id NOT IN (SELECT id FROM vehicles)');

    if (orphanCS.rows[0].count > 0 || orphanVI.rows[0].count > 0) {
      throw new Error(`Integrity check failed: orphanCS=${orphanCS.rows[0].count}, orphanVI=${orphanVI.rows[0].count}`);
    }

    console.log('Integrity verification passed: 0 orphaned check sheets, 0 orphaned vehicle images.');

    await client.query('COMMIT');
    console.log('\n--- TRANSACTION COMMITTED SUCCESSFULLY! ---\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nIMPORT FAILED! Transaction rolled back cleanly.');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }

  // Verify post-commit state
  console.log('=== POST-IMPORT ACTUAL ROW COUNTS ON NEON ===');
  const counts = await pool.query(`
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
    SELECT 'public_vehicles (view)', count(*)::int FROM public_vehicles
    UNION ALL
    SELECT 'public_vehicle_images (view)', count(*)::int FROM public_vehicle_images
  `);
  console.table(counts.rows);

  // Status breakdown of vehicles
  const vehStatus = await pool.query(`
    SELECT status, count(*)::int AS count 
    FROM vehicles 
    GROUP BY status 
    ORDER BY count DESC
  `);
  console.log('Vehicles by Status:');
  console.table(vehStatus.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
