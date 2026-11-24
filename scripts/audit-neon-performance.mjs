import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

dotenv.config();
dotenv.config({ path: 'gara-bot-server/.env' });

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 10000,
});

async function runBenchmark() {
  console.log('====================================================');
  console.log('1. BENCHMARKING NEON POSTGRESQL DIRECT CONNECTION');
  console.log('====================================================');

  const startPing = performance.now();
  const pingRes = await pool.query('SELECT 1 as ping, NOW() as now, version()');
  const pingTime = (performance.now() - startPing).toFixed(1);
  console.log(`Neon Direct Ping: ${pingTime}ms | PostgreSQL Version: ${pingRes.rows[0].version.split(' on ')[0]}`);

  // Row counts
  const tables = ['vehicles', 'vehicle_images', 'vehicle_documents', 'tasks', 'checksheets', 'users', 'positions', 'attendance', 'move_logs'];
  console.log('\n--- Table Row Counts ---');
  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT count(*) as count FROM ${t}`);
      console.log(`- ${t.padEnd(20)}: ${res.rows[0].count} rows`);
    } catch (e) {
      console.log(`- ${t.padEnd(20)}: Error (${e.message})`);
    }
  }

  // Indexes
  console.log('\n--- Indexes on Main Tables ---');
  const idxRes = await pool.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);
  idxRes.rows.forEach(r => {
    console.log(`[${r.tablename}] ${r.indexname}`);
  });

  // Query Execution Times
  console.log('\n--- Direct Query Latency on Neon ---');
  const queries = [
    { name: 'Vehicles List', sql: 'SELECT * FROM vehicles ORDER BY created_at DESC' },
    { name: 'Vehicle Images', sql: "SELECT vehicle_id, url, thumbnail, sort_order FROM vehicle_images WHERE category = 'vehicle' OR category IS NULL ORDER BY sort_order ASC" },
    { name: 'Tasks List', sql: 'SELECT * FROM tasks ORDER BY created_at DESC' },
    { name: 'CheckSheets List', sql: 'SELECT * FROM checksheets ORDER BY created_at DESC' },
    { name: 'Public Vehicles', sql: 'SELECT * FROM vehicles WHERE is_public = true AND status != $1 ORDER BY COALESCE(public_sort_order, 999999) ASC', params: ['sold'] },
    { name: 'Public Images', sql: "SELECT * FROM vehicle_images WHERE category = 'website' ORDER BY sort_order ASC" },
    { name: 'Employees List', sql: 'SELECT id, email, full_name, role, status, phone FROM users ORDER BY created_at DESC' },
    { name: 'Positions List', sql: 'SELECT * FROM positions ORDER BY sort_order ASC' },
    { name: 'Attendance List', sql: 'SELECT * FROM attendance ORDER BY date DESC, created_at DESC' },
  ];

  for (const q of queries) {
    const t0 = performance.now();
    const res = await pool.query(q.sql, q.params || []);
    const dur = (performance.now() - t0).toFixed(1);
    console.log(`* ${q.name.padEnd(22)}: ${dur.padStart(6)}ms | rows: ${res.rows.length}`);
  }

  await pool.end();
}

runBenchmark().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
