import dotenv from 'dotenv';
import pg from 'pg';
import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';

dotenv.config();
dotenv.config({ path: 'gara-bot-server/.env' });

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 10000,
});

const jwtSecret = process.env.JWT_SECRET || 'vtauto-backend-jwt-secret-key-change-in-prod-2026';

async function runAudit() {
  console.log('========================================================================');
  console.log('VT AUTO — API & DATABASE PERFORMANCE AUDIT');
  console.log('========================================================================\n');

  // 1. Direct Neon Query Benchmarks
  console.log('--- 1. NEON POSTGRESQL DIRECT QUERY BENCHMARKS ---');
  const userRes = await pool.query("SELECT id, email, role, status FROM users WHERE role = 'admin' LIMIT 1");
  const adminUser = userRes.rows[0];
  console.log(`Testing with Admin User: ${adminUser.email} (${adminUser.id})`);

  // Generate test JWT token for Admin
  const authToken = jwt.sign(
    {
      sub: adminUser.id,
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    },
    jwtSecret,
    { expiresIn: '1h' }
  );

  const directQueries = [
    { name: 'SELECT vehicles (All 110)', sql: 'SELECT * FROM vehicles ORDER BY created_at DESC' },
    { name: 'SELECT vehicle_images (category vehicle)', sql: "SELECT vehicle_id, url, thumbnail, sort_order FROM vehicle_images WHERE category = 'vehicle' OR category IS NULL ORDER BY sort_order ASC" },
    { name: 'SELECT vehicle_documents', sql: 'SELECT vehicle_id, url, sort_order FROM vehicle_documents ORDER BY sort_order ASC' },
    { name: 'SELECT check_sheets', sql: 'SELECT * FROM check_sheets ORDER BY created_at DESC' },
    { name: 'SELECT tasks', sql: 'SELECT * FROM tasks ORDER BY created_at DESC' },
    { name: 'SELECT positions', sql: 'SELECT * FROM positions ORDER BY sort_order ASC' },
    { name: 'SELECT users/employees', sql: 'SELECT id, email, name, role, status, phone FROM users ORDER BY created_at DESC' },
    { name: 'SELECT attendance', sql: 'SELECT * FROM attendance ORDER BY date DESC, created_at DESC' },
    { name: 'SELECT move_logs', sql: 'SELECT * FROM move_logs ORDER BY created_at DESC' },
    { name: 'SELECT public vehicles (is_public=true)', sql: 'SELECT * FROM vehicles WHERE is_public = true AND status != $1 ORDER BY COALESCE(public_sort_order, 999999) ASC', params: ['sold'] },
    { name: 'SELECT public images (category website)', sql: "SELECT * FROM vehicle_images WHERE category = 'website' ORDER BY sort_order ASC" },
  ];

  for (const q of directQueries) {
    const t0 = performance.now();
    const res = await pool.query(q.sql, q.params || []);
    const dur = (performance.now() - t0).toFixed(1);
    console.log(`* ${q.name.padEnd(42)}: ${dur.padStart(6)}ms | rows: ${res.rows.length}`);
  }

  // 2. Local Backend API Benchmarks (http://localhost:3001)
  console.log('\n--- 2. LOCAL EXPRESS API BENCHMARKS (http://localhost:3001) ---');
  const localBase = 'http://localhost:3001';
  const endpoints = [
    { name: 'Health check', path: '/health', auth: false },
    { name: 'Health full (DB+R2)', path: '/health/full', auth: false },
    { name: 'Auth Me', path: '/api/auth/me', auth: true },
    { name: 'Public Vehicles', path: '/api/public/vehicles', auth: false },
    { name: 'Public Images', path: '/api/public/images', auth: false },
    { name: 'Admin Vehicles List', path: '/api/vehicles', auth: true },
    { name: 'Admin Positions', path: '/api/positions', auth: true },
    { name: 'Admin Employees', path: '/api/employees', auth: true },
    { name: 'Admin Tasks', path: '/api/tasks', auth: true },
    { name: 'Admin CheckSheets', path: '/api/checksheets', auth: true },
    { name: 'Admin Attendance', path: '/api/attendance', auth: true },
    { name: 'Admin Move Logs', path: '/api/move-logs', auth: true },
  ];

  for (const ep of endpoints) {
    const headers = {};
    if (ep.auth) headers['Authorization'] = `Bearer ${authToken}`;
    const t0 = performance.now();
    try {
      const res = await fetch(`${localBase}${ep.path}`, { headers });
      const elapsed = (performance.now() - t0).toFixed(1);
      const text = await res.text();
      const sizeBytes = Buffer.byteLength(text, 'utf8');
      console.log(`* [HTTP ${res.status}] ${ep.name.padEnd(26)} (${ep.path.padEnd(23)}): ${elapsed.padStart(6)}ms | ${sizeBytes.toString().padStart(6)} bytes`);
    } catch (e) {
      console.log(`* [FAIL]     ${ep.name.padEnd(26)} (${ep.path}): ${e.message}`);
    }
  }

  // 3. Production Render Backend API Benchmarks (https://vt-webapp.onrender.com)
  console.log('\n--- 3. PRODUCTION RENDER API BENCHMARKS (https://vt-webapp.onrender.com) ---');
  const prodBase = 'https://vt-webapp.onrender.com';
  for (const ep of endpoints) {
    const headers = {};
    if (ep.auth) headers['Authorization'] = `Bearer ${authToken}`;
    const t0 = performance.now();
    try {
      const res = await fetch(`${prodBase}${ep.path}`, { headers });
      const elapsed = (performance.now() - t0).toFixed(1);
      const text = await res.text();
      const sizeBytes = Buffer.byteLength(text, 'utf8');
      console.log(`* [HTTP ${res.status}] ${ep.name.padEnd(26)} (${ep.path.padEnd(23)}): ${elapsed.padStart(6)}ms | ${sizeBytes.toString().padStart(6)} bytes`);
    } catch (e) {
      console.log(`* [FAIL]     ${ep.name.padEnd(26)} (${ep.path}): ${e.message}`);
    }
  }

  // 4. Measure Waterfall in initializeStore
  console.log('\n--- 4. FRONTEND INITIALIZATION WATERFALL SIMULATION ---');
  const startAll = performance.now();
  const initPromises = [
    fetch(`${prodBase}/api/vehicles`, { headers: { Authorization: `Bearer ${authToken}` } }),
    fetch(`${prodBase}/api/positions`, { headers: { Authorization: `Bearer ${authToken}` } }),
    fetch(`${prodBase}/api/employees`, { headers: { Authorization: `Bearer ${authToken}` } }),
    fetch(`${prodBase}/api/tasks`, { headers: { Authorization: `Bearer ${authToken}` } }),
    fetch(`${prodBase}/api/checksheets`, { headers: { Authorization: `Bearer ${authToken}` } }),
    fetch(`${prodBase}/api/attendance`, { headers: { Authorization: `Bearer ${authToken}` } }),
    fetch(`${prodBase}/api/move-logs`, { headers: { Authorization: `Bearer ${authToken}` } }),
  ];

  const results = await Promise.allSettled(initPromises);
  const totalInitMs = (performance.now() - startAll).toFixed(1);
  console.log(`Total duration for all 7 parallel modules on Production Render: ${totalInitMs}ms`);
  results.forEach((r, idx) => {
    const name = ['vehicles', 'positions', 'employees', 'tasks', 'checksheets', 'attendance', 'move-logs'][idx];
    console.log(`- ${name.padEnd(15)}: ${r.status === 'fulfilled' ? `OK (HTTP ${r.value.status})` : 'FAILED'}`);
  });

  await pool.end();
}

runAudit().catch(err => {
  console.error('Audit error:', err);
  process.exit(1);
});
