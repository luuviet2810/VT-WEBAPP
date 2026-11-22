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

function prepareInsertSql(fileName) {
  const filePath = path.join(backupDir, fileName);
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  return raw.replace(/;$/, '') + ' ON CONFLICT (id) DO NOTHING;';
}

async function main() {
  console.log('=== VT AUTO HISTORY DATA IMPORT ON NEON POSTGRESQL ===\n');

  // 1. Thống kê số bản ghi trước import
  const historyTables = [
    'settings',
    'attendance',
    'vehicle_documents',
    'move_logs',
    'vehicle_workflow_logs',
    'tasks'
  ];

  console.log('1. PRE-IMPORT ROW COUNTS:');
  const preCounts = {};
  for (const t of historyTables) {
    const res = await pool.query(`SELECT count(*)::int AS count FROM public.${t}`);
    preCounts[t] = res.rows[0].count;
    console.log(`- ${t}: ${preCounts[t]} rows`);
  }
  console.log('');

  const client = await pool.connect();
  const importResults = {};

  try {
    console.log('2. Starting atomic transaction for history import...');
    await client.query('BEGIN');

    // 1. settings_rows.sql
    console.log('   Step 1: Importing settings_rows.sql...');
    const setSql = prepareInsertSql('settings_rows.sql');
    const setRes = await client.query(setSql);
    importResults['settings'] = setRes.rowCount;
    console.log(`   -> settings inserted: ${setRes.rowCount} rows`);

    // 2. attendance_rows.sql
    console.log('   Step 2: Importing attendance_rows.sql...');
    const attSql = prepareInsertSql('attendance_rows.sql');
    const attRes = await client.query(attSql);
    importResults['attendance'] = attRes.rowCount;
    console.log(`   -> attendance inserted: ${attRes.rowCount} rows`);

    // 3. vehicle_documents_rows.sql
    console.log('   Step 3: Importing vehicle_documents_rows.sql...');
    const vdSql = prepareInsertSql('vehicle_documents_rows.sql');
    const vdRes = await client.query(vdSql);
    importResults['vehicle_documents'] = vdRes.rowCount;
    console.log(`   -> vehicle_documents inserted: ${vdRes.rowCount} rows`);

    // 4. move_logs_rows.sql
    console.log('   Step 4: Importing move_logs_rows.sql...');
    const mlSql = prepareInsertSql('move_logs_rows.sql');
    const mlRes = await client.query(mlSql);
    importResults['move_logs'] = mlRes.rowCount;
    console.log(`   -> move_logs inserted: ${mlRes.rowCount} rows`);

    // 5. vehicle_workflow_logs_rows.sql
    console.log('   Step 5: Importing vehicle_workflow_logs_rows.sql...');
    const vwlSql = prepareInsertSql('vehicle_workflow_logs_rows.sql');
    const vwlRes = await client.query(vwlSql);
    importResults['vehicle_workflow_logs'] = vwlRes.rowCount;
    console.log(`   -> vehicle_workflow_logs inserted: ${vwlRes.rowCount} rows`);

    // 6. tasks_rows.sql
    console.log('   Step 6: Importing tasks_rows.sql...');
    const taskSql = prepareInsertSql('tasks_rows.sql');
    const taskRes = await client.query(taskSql);
    importResults['tasks'] = taskRes.rowCount;
    console.log(`   -> tasks inserted: ${taskRes.rowCount} rows`);

    // 3. Kiểm tra tính toàn vẹn (Orphan check)
    console.log('\n3. VERIFYING FOREIGN KEY INTEGRITY IN TRANSACTION:');
    
    // Check vehicle_documents orphans
    const orphanVD = await client.query(`
      SELECT count(*)::int AS count FROM vehicle_documents WHERE vehicle_id NOT IN (SELECT id FROM vehicles)
    `);
    console.log(`   - Orphan vehicle_documents (invalid vehicle_id): ${orphanVD.rows[0].count}`);

    // Check move_logs orphans
    const orphanMLVeh = await client.query(`
      SELECT count(*)::int AS count FROM move_logs WHERE vehicle_id NOT IN (SELECT id FROM vehicles)
    `);
    const orphanMLFromPos = await client.query(`
      SELECT count(*)::int AS count FROM move_logs WHERE from_position_id IS NOT NULL AND from_position_id NOT IN (SELECT id FROM positions)
    `);
    const orphanMLToPos = await client.query(`
      SELECT count(*)::int AS count FROM move_logs WHERE to_position_id NOT IN (SELECT id FROM positions)
    `);
    const orphanMLUser = await client.query(`
      SELECT count(*)::int AS count FROM move_logs WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)
    `);
    console.log(`   - Orphan move_logs (invalid vehicle_id): ${orphanMLVeh.rows[0].count}`);
    console.log(`   - Orphan move_logs (invalid from_position_id): ${orphanMLFromPos.rows[0].count}`);
    console.log(`   - Orphan move_logs (invalid to_position_id): ${orphanMLToPos.rows[0].count}`);
    console.log(`   - Orphan move_logs (invalid user_id): ${orphanMLUser.rows[0].count}`);

    // Check vehicle_workflow_logs orphans
    const orphanVWL = await client.query(`
      SELECT count(*)::int AS count FROM vehicle_workflow_logs WHERE vehicle_id NOT IN (SELECT id FROM vehicles)
    `);
    console.log(`   - Orphan vehicle_workflow_logs (invalid vehicle_id): ${orphanVWL.rows[0].count}`);

    // Check tasks orphans
    const orphanTaskVeh = await client.query(`
      SELECT count(*)::int AS count FROM tasks WHERE vehicle_id IS NOT NULL AND vehicle_id NOT IN (SELECT id FROM vehicles)
    `);
    const orphanTaskAssignee = await client.query(`
      SELECT count(*)::int AS count FROM tasks WHERE assignee_id IS NOT NULL AND assignee_id NOT IN (SELECT id FROM users)
    `);
    console.log(`   - Orphan tasks (invalid vehicle_id): ${orphanTaskVeh.rows[0].count}`);
    console.log(`   - Orphan tasks (invalid assignee_id): ${orphanTaskAssignee.rows[0].count}`);

    // Check attendance orphans
    const orphanAtt = await client.query(`
      SELECT count(*)::int AS count FROM attendance WHERE user_id NOT IN (SELECT id FROM users)
    `);
    console.log(`   - Orphan attendance (invalid user_id): ${orphanAtt.rows[0].count}`);

    const totalOrphans = orphanVD.rows[0].count +
      orphanMLVeh.rows[0].count + orphanMLFromPos.rows[0].count + orphanMLToPos.rows[0].count + orphanMLUser.rows[0].count +
      orphanVWL.rows[0].count +
      orphanTaskVeh.rows[0].count + orphanTaskAssignee.rows[0].count +
      orphanAtt.rows[0].count;

    if (totalOrphans > 0) {
      throw new Error(`Foreign key integrity check failed! Total orphan records detected: ${totalOrphans}`);
    }

    console.log('\nAll foreign key integrity checks PASSED (0 orphan records). Committing transaction...');
    await client.query('COMMIT');
    console.log('--- TRANSACTION COMMITTED SUCCESSFULLY! ---\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nHISTORY IMPORT FAILED! Transaction rolled back cleanly.');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }

  // 4. Thống kê số bản ghi sau import
  console.log('4. POST-IMPORT ACTUAL ROW COUNTS:');
  const postCounts = {};
  for (const t of historyTables) {
    const res = await pool.query(`SELECT count(*)::int AS count FROM public.${t}`);
    postCounts[t] = res.rows[0].count;
  }

  const comparison = historyTables.map(t => ({
    table_name: t,
    pre_import: preCounts[t],
    rows_inserted: importResults[t] || 0,
    post_import: postCounts[t],
    status: postCounts[t] === (preCounts[t] + (importResults[t] || 0)) ? 'VERIFIED' : 'MISMATCH'
  }));
  console.table(comparison);

  // 5. Xác nhận chi tiết Task & Workflow
  console.log('\n5. TASKS BREAKDOWN BY STATUS:');
  const taskStatus = await pool.query(`
    SELECT status, count(*)::int AS count FROM tasks GROUP BY status ORDER BY count DESC
  `);
  console.table(taskStatus.rows);

  console.log('TASKS BREAKDOWN BY PRIORITY:');
  const taskPriority = await pool.query(`
    SELECT priority, count(*)::int AS count FROM tasks GROUP BY priority ORDER BY count DESC
  `);
  console.table(taskPriority.rows);

  console.log('WORKFLOW LOGS BREAKDOWN BY STATUS:');
  const wflStatus = await pool.query(`
    SELECT status, count(*)::int AS count FROM vehicle_workflow_logs GROUP BY status ORDER BY count DESC
  `);
  console.table(wflStatus.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
