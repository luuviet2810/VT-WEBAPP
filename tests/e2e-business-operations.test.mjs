import express from '../gara-bot-server/node_modules/express/index.js';
import http from 'http';
import dotenv from '../gara-bot-server/node_modules/dotenv/lib/main.js';
import path from 'path';
import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

// Import router from compiled dist or ts
import router from '../gara-bot-server/dist/routes/index.js';
import { query } from '../gara-bot-server/dist/database/index.js';

const app = express();
app.use(express.json());
app.use(router);

let server;
const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function main() {
  console.log('====================================================');
  console.log('KIỂM THỬ TÍCH HỢP TOÀN DIỆN (E2E BUSINESS OPERATIONS)');
  console.log('====================================================');

  await new Promise((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`Test server đang chạy tại ${BASE_URL}`);
      resolve();
    });
  });

  try {
    // 1. Tạo JWT Token hợp lệ cho Admin (luuviet2810@gmail.com)
    const adminUserRes = await query(`SELECT id, email, name, role FROM users WHERE email = 'luuviet2810@gmail.com'`);
    if (adminUserRes.rows.length === 0) throw new Error('Không tìm thấy tài khoản admin');
    const admin = adminUserRes.rows[0];

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET || 'vtauto-backend-jwt-secret-key-change-in-prod-2026',
      { expiresIn: '1h' }
    );

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // TEST 1: POSITIONS
    console.log('\n--- TEST 1: GET /api/positions ---');
    const posRes = await fetch(`${BASE_URL}/api/positions`, { headers });
    const posJson = await posRes.json();
    console.log(`Status: ${posRes.status}, Count: ${posJson.data?.length}`);
    if (posRes.status !== 200 || posJson.data?.length !== 7) {
      throw new Error(`TEST 1 FAILED: Expected 7 positions, got ${posJson.data?.length}`);
    }
    console.log('✅ TEST 1 PASSED: 7/7 positions đọc chính xác!');

    // TEST 2: VEHICLES
    console.log('\n--- TEST 2: GET /api/vehicles ---');
    const vehRes = await fetch(`${BASE_URL}/api/vehicles`, { headers });
    const vehJson = await vehRes.json();
    console.log(`Status: ${vehRes.status}, Count: ${vehJson.data?.length}`);
    if (vehRes.status !== 200 || vehJson.data?.length !== 109) {
      throw new Error(`TEST 2 FAILED: Expected 109 vehicles, got ${vehJson.data?.length}`);
    }
    const sampleVehicle = vehJson.data[0];
    console.log(`Xe mẫu: ID=${sampleVehicle.id}, Biển số=${sampleVehicle.plate}, Model=${sampleVehicle.model}, Status=${sampleVehicle.status}, Images=${sampleVehicle.images?.length}, Docs=${sampleVehicle.documents?.length}`);
    console.log('✅ TEST 2 PASSED: 109/109 xe đọc chính xác từ Neon!');

    // TEST 2B: GET VEHICLE BY PLATE & ID
    console.log('\n--- TEST 2B: GET /api/vehicles/by-plate/:plate & /:id ---');
    const plateRes = await fetch(`${BASE_URL}/api/vehicles/by-plate/${encodeURIComponent(sampleVehicle.plate)}`, { headers });
    const plateJson = await plateRes.json();
    if (plateRes.status !== 200 || plateJson.data?.id !== sampleVehicle.id) {
      throw new Error('TEST 2B FAILED: Tìm xe theo biển số thất bại');
    }
    const idRes = await fetch(`${BASE_URL}/api/vehicles/${sampleVehicle.id}`, { headers });
    const idJson = await idRes.json();
    if (idRes.status !== 200 || idJson.data?.plate !== sampleVehicle.plate) {
      throw new Error('TEST 2B FAILED: Tìm xe theo ID thất bại');
    }
    console.log('✅ TEST 2B PASSED: Tìm xe theo biển số và theo ID hoạt động chính xác!');

    // TEST 3: CHECKSHEETS
    console.log('\n--- TEST 3: GET /api/checksheets ---');
    const csRes = await fetch(`${BASE_URL}/api/checksheets`, { headers });
    const csJson = await csRes.json();
    console.log(`Status: ${csRes.status}, Count: ${csJson.data?.length}`);
    if (csRes.status !== 200 || csJson.data?.length !== 116) {
      throw new Error(`TEST 3 FAILED: Expected 116 checksheets, got ${csJson.data?.length}`);
    }
    console.log('✅ TEST 3 PASSED: 116/116 phiếu kiểm tra đọc chính xác từ Neon!');

    // TEST 4: TASKS
    console.log('\n--- TEST 4: GET /api/tasks ---');
    const taskRes = await fetch(`${BASE_URL}/api/tasks`, { headers });
    const taskJson = await taskRes.json();
    console.log(`Status: ${taskRes.status}, Count: ${taskJson.data?.length}`);
    if (taskRes.status !== 200 || taskJson.data?.length !== 213) {
      throw new Error(`TEST 4 FAILED: Expected 213 tasks, got ${taskJson.data?.length}`);
    }
    console.log('✅ TEST 4 PASSED: 213/213 nhiệm vụ đọc chính xác từ Neon!');

    // TEST 5: EMPLOYEES
    console.log('\n--- TEST 5: GET /api/employees ---');
    const empRes = await fetch(`${BASE_URL}/api/employees`, { headers });
    const empJson = await empRes.json();
    console.log(`Status: ${empRes.status}, Count: ${empJson.data?.length}`);
    if (empRes.status !== 200 || empJson.data?.length !== 7) {
      throw new Error(`TEST 5 FAILED: Expected 7 employees, got ${empJson.data?.length}`);
    }
    // Verify no password_hash or auth_id leaked
    for (const u of empJson.data) {
      if (u.password_hash !== undefined || u.passwordHash !== undefined || u.auth_id !== undefined || u.authId !== undefined) {
        throw new Error(`TEST 5 FAILED: Rò rỉ thông tin nhạy cảm của user ${u.email}`);
      }
    }
    console.log('✅ TEST 5 PASSED: 7/7 nhân viên an toàn tuyệt đối, không rò rỉ hash!');

    // TEST 6: MOVE LOGS
    console.log('\n--- TEST 6: GET /api/move-logs ---');
    const mlRes = await fetch(`${BASE_URL}/api/move-logs`, { headers });
    const mlJson = await mlRes.json();
    console.log(`Status: ${mlRes.status}, Count: ${mlJson.data?.length}`);
    if (mlRes.status !== 200 || mlJson.data?.length !== 184) {
      throw new Error(`TEST 6 FAILED: Expected 184 move logs, got ${mlJson.data?.length}`);
    }
    console.log('✅ TEST 6 PASSED: 184/184 log di chuyển xe đọc chính xác từ Neon!');

    // TEST 7: ATTENDANCE
    console.log('\n--- TEST 7: GET /api/attendance ---');
    const attRes = await fetch(`${BASE_URL}/api/attendance`, { headers });
    const attJson = await attRes.json();
    console.log(`Status: ${attRes.status}, Count: ${attJson.data?.length}`);
    if (attRes.status !== 200 || attJson.data?.length !== 1) {
      throw new Error(`TEST 7 FAILED: Expected 1 attendance entry, got ${attJson.data?.length}`);
    }
    console.log('✅ TEST 7 PASSED: 1/1 bản ghi chấm công đọc chính xác từ Neon!');

    console.log('\n====================================================');
    console.log('🎉 TOÀN BỘ 7/7 BÀI KIỂM THỬ E2E ĐẠT 100% THÀNH CÔNG!');
    console.log('====================================================');
  } finally {
    if (server) server.close();
  }
}

main().catch((err) => {
  console.error('\n❌ E2E TEST THẤT BÀI:', err);
  if (server) server.close();
  process.exit(1);
});
