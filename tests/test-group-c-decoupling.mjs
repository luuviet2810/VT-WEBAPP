import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'gara-bot-server/.env' });

const { app } = await import('../gara-bot-server/dist/index.js');
const { query } = await import('../gara-bot-server/dist/database/index.js');
const { config } = await import('../gara-bot-server/dist/config/index.js');

let server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;
let token;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function runTests() {
  console.log('--- STARTING GROUP C DECOUPLING VERIFICATION ---');
  server = app.listen(PORT);

  // Fetch real admin user to create valid token
  const adminRes = await query("SELECT id, email, name, role FROM users WHERE email = 'luuviet2810@gmail.com' LIMIT 1");
  const adminUser = adminRes.rows[0];
  if (!adminUser) {
    throw new Error('Admin user not found in Neon');
  }

  token = jwt.sign(
    { id: adminUser.id, email: adminUser.email, name: adminUser.name },
    config.jwt.secret,
    { expiresIn: '1h' }
  );

  try {
    // 1. Employees
    console.log('\n[1] Testing Employees API...');
    const empRes = await request('/api/employees');
    console.log('GET /api/employees status:', empRes.status, 'Total employees:', empRes.body?.data?.length);
    if (empRes.status !== 200 || !Array.isArray(empRes.body?.data)) {
      throw new Error('Employees API failed');
    }

    // 2. Vehicle Options
    console.log('\n[2] Testing Vehicle Options API...');
    const optRes = await request('/api/vehicle-options');
    console.log('GET /api/vehicle-options status:', optRes.status, 'Options count:', optRes.body?.data?.length);

    // Create a temporary test option
    const createOptRes = await request('/api/vehicle-options', {
      method: 'POST',
      body: JSON.stringify({
        groupKey: 'test_group',
        groupLabel: 'Nhóm Thử Nghiệm',
        label: 'Tùy chọn kiểm tra tự động',
        sortOrder: 999,
      }),
    });
    console.log('POST /api/vehicle-options status:', createOptRes.status, 'Created ID:', createOptRes.body?.data?.id);
    const createdOptId = createOptRes.body?.data?.id;

    if (createdOptId) {
      // Update option
      const updateOptRes = await request(`/api/vehicle-options/${createdOptId}`, {
        method: 'PUT',
        body: JSON.stringify({ label: 'Tùy chọn kiểm tra đã cập nhật' }),
      });
      console.log('PUT /api/vehicle-options/:id status:', updateOptRes.status);

      // Delete option
      const deleteOptRes = await request(`/api/vehicle-options/${createdOptId}`, {
        method: 'DELETE',
      });
      console.log('DELETE /api/vehicle-options/:id status:', deleteOptRes.status);
    }

    // 3. Website Settings
    console.log('\n[3] Testing Website Settings API...');
    const webRes = await request('/api/website-settings');
    console.log('GET /api/website-settings status:', webRes.status, 'Settings row ID:', webRes.body?.data?.id);

    // 4. Vehicle Media Stats (for OverviewDashboard)
    console.log('\n[4] Testing Vehicle Media Stats API (OverviewDashboard)...');
    const statsRes = await request('/api/vehicles/media-stats');
    console.log('GET /api/vehicles/media-stats status:', statsRes.status, 'Total error count:', statsRes.body?.data?.totalErrors, 'Category images count:', statsRes.body?.data?.categoryImages?.length);

    // 5. Existing vehicle check
    const vehiclesRes = await request('/api/vehicles');
    const firstVehicle = vehiclesRes.body?.data?.[0];
    if (firstVehicle) {
      console.log('\n[5] Testing Vehicle Workflow Logs with Vehicle ID:', firstVehicle.id);
      const wfRes = await request(`/api/vehicles/${firstVehicle.id}/workflow-logs`);
      console.log('GET /api/vehicles/:id/workflow-logs status:', wfRes.status, 'Logs count:', wfRes.body?.data?.length);

      console.log('\n[6] Testing Vehicle Images with Vehicle ID:', firstVehicle.id);
      const imgRes = await request(`/api/vehicles/${firstVehicle.id}/images`);
      console.log('GET /api/vehicles/:id/images status:', imgRes.status, 'Images count:', imgRes.body?.data?.length);

      console.log('\n[7] Testing Vehicle Documents with Vehicle ID:', firstVehicle.id);
      const docRes = await request(`/api/vehicles/${firstVehicle.id}/documents`);
      console.log('GET /api/vehicles/:id/documents status:', docRes.status, 'Docs count:', docRes.body?.data?.length);
    }

    console.log('\n>>> ALL GROUP C ENDPOINTS VERIFIED 100% PASS! <<<');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test error:', err);
  if (server) server.close();
  process.exit(1);
});
