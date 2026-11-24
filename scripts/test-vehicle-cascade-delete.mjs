import dotenv from 'dotenv';
import pg from 'pg';
import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';
import { randomUUID } from 'crypto';

dotenv.config();
dotenv.config({ path: 'gara-bot-server/.env' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const API_BASE = 'http://localhost:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'vt-auto-secret-key-change-in-prod';

async function runTest() {
  console.log('=== VT AUTO CASCADE VEHICLE DELETION TEST SUITE ===\n');

  // 1. Lấy thông tin user Admin và Staff từ database
  const adminRes = await pool.query("SELECT id, email, name, role FROM users WHERE role = 'admin' AND status = 'approved' LIMIT 1");
  if (adminRes.rows.length === 0) {
    throw new Error('Không tìm thấy tài khoản admin nào trong database để test.');
  }
  const adminUser = adminRes.rows[0];

  let staffUser;
  const staffRes = await pool.query("SELECT id, email, name, role FROM users WHERE role = 'staff' AND status = 'approved' LIMIT 1");
  if (staffRes.rows.length > 0) {
    staffUser = staffRes.rows[0];
  } else {
    // Tạo staff tạm để test RBAC
    const tempStaffId = randomUUID();
    await pool.query(
      "INSERT INTO users (id, email, password_hash, name, role, status) VALUES ($1, $2, 'dummy', 'Test Staff', 'staff', 'approved')",
      [tempStaffId, `test.staff.${Date.now()}@vtauto.vn`]
    );
    staffUser = { id: tempStaffId, email: `test.staff.${Date.now()}@vtauto.vn`, name: 'Test Staff', role: 'staff' };
  }

  const adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, name: adminUser.name }, JWT_SECRET, { expiresIn: '1h' });
  const staffToken = jwt.sign({ id: staffUser.id, email: staffUser.email, name: staffUser.name }, JWT_SECRET, { expiresIn: '1h' });

  console.log(`[AUTH] Admin user: ${adminUser.email} (${adminUser.id})`);
  console.log(`[AUTH] Staff user: ${staffUser.email} (${staffUser.id})`);

  // Dọn dẹp bất kỳ xe test cũ nào nếu còn sót từ các lần test trước
  await pool.query("DELETE FROM checksheet_logs WHERE checksheet_id IN (SELECT id FROM check_sheets WHERE vehicle_id IN (SELECT id FROM vehicles WHERE plate LIKE 'TEST-%'))");
  await pool.query("DELETE FROM check_sheets WHERE vehicle_id IN (SELECT id FROM vehicles WHERE plate LIKE 'TEST-%')");
  await pool.query("DELETE FROM task_activity_logs WHERE task_id IN (SELECT id FROM tasks WHERE vehicle_id IN (SELECT id FROM vehicles WHERE plate LIKE 'TEST-%'))");
  await pool.query("DELETE FROM tasks WHERE vehicle_id IN (SELECT id FROM vehicles WHERE plate LIKE 'TEST-%')");
  await pool.query("DELETE FROM vehicle_images WHERE vehicle_id IN (SELECT id FROM vehicles WHERE plate LIKE 'TEST-%')");
  await pool.query("DELETE FROM vehicle_documents WHERE vehicle_id IN (SELECT id FROM vehicles WHERE plate LIKE 'TEST-%')");
  await pool.query("DELETE FROM move_logs WHERE vehicle_id IN (SELECT id FROM vehicles WHERE plate LIKE 'TEST-%')");
  await pool.query("DELETE FROM vehicle_workflow_logs WHERE vehicle_id IN (SELECT id FROM vehicles WHERE plate LIKE 'TEST-%')");
  await pool.query("DELETE FROM vehicles WHERE plate LIKE 'TEST-%'");

  // Đếm số lượng xe thật ban đầu
  const countRealBefore = await pool.query("SELECT count(*) FROM vehicles WHERE plate NOT LIKE 'TEST-%'");
  const initialRealCount = parseInt(countRealBefore.rows[0].count, 10);
  console.log(`[BASELINE] Số lượng xe thật trong hệ thống trước khi test: ${initialRealCount} xe\n`);

  // 2. Tạo một xe TEST giả định
  const testVehicleId = randomUUID();
  const testPlate = `TEST-CASCADE-${Math.floor(1000 + Math.random() * 9000)}`;
  const testModel = 'Mazda CX-5 Test Cascade Deletion';

  console.log(`[SETUP] Tạo xe TEST: ${testPlate} (ID: ${testVehicleId})...`);
  await pool.query(
    `INSERT INTO vehicles (id, plate, model, year, status, cost_price, sell_price, created_at, updated_at)
     VALUES ($1, $2, $3, 2022, 'available', 500000000, 560000000, now(), now())`,
    [testVehicleId, testPlate, testModel]
  );

  // Gắn đầy đủ dữ liệu con giả lập:
  // a) 1 checksheet
  const testCsId = randomUUID();
  await pool.query(
    `INSERT INTO check_sheets (id, vehicle_id, type, check_date, exterior_photos, created_at, updated_at)
     VALUES ($1, $2, 'in', now(), $3, now(), now())`,
    [testCsId, testVehicleId, JSON.stringify({ front: ['checksheets/test/front_scratch.jpg'], rear: ['checksheets/test/rear_light.jpg'] })]
  );

  // a.1) 1 checksheet_log
  const testCsLogId = randomUUID();
  await pool.query(
    `INSERT INTO checksheet_logs (id, checksheet_id, editor_id, field, old_value, new_value, created_at)
     VALUES ($1, $2, $3, 'fuel_level', '"1/4"', '"1/2"', now())`,
    [testCsLogId, testCsId, adminUser.id]
  );

  // b) 2 tasks
  const testTaskId1 = randomUUID();
  const testTaskId2 = randomUUID();
  await pool.query(
    `INSERT INTO tasks (id, vehicle_id, title, status, priority, created_at)
     VALUES 
       ($1, $2, 'Rửa xe chi tiết Test 1', 'todo', 'medium', now()),
       ($3, $2, 'Sơn dặm cản trước Test 2', 'doing', 'high', now())`,
    [testTaskId1, testVehicleId, testTaskId2]
  );
  // b.1) 2 task_activity_logs
  await pool.query(
    `INSERT INTO task_activity_logs (id, task_id, user_id, action, created_at)
     VALUES 
       (gen_random_uuid(), $1, $3, 'Bắt đầu rửa xe', now()),
       (gen_random_uuid(), $2, $3, 'Đang pha sơn', now())`,
    [testTaskId1, testTaskId2, adminUser.id]
  );

  // c) 1 move_log
  await pool.query(
    `INSERT INTO move_logs (id, vehicle_id, to_position_id, created_at)
     VALUES (gen_random_uuid(), $1, '00000000-0000-0000-0000-000000000001', now())`,
    [testVehicleId]
  );

  // d) 1 vehicle_workflow_log
  await pool.query(
    `INSERT INTO vehicle_workflow_logs (id, vehicle_id, status, created_by, created_at)
     VALUES (gen_random_uuid(), $1, 'received', 'admin', now())`,
    [testVehicleId]
  );

  // e) 1 vehicle_image
  await pool.query(
    `INSERT INTO vehicle_images (id, vehicle_id, path, bucket, url, sort_order, category, created_at)
     VALUES (gen_random_uuid(), $1, 'vehicles/test/overview.jpg', 'vehicle-images', 'https://r2.test/vehicles/test/overview.jpg', 0, 'exterior', now())`,
    [testVehicleId]
  );

  // f) 1 vehicle_document
  await pool.query(
    `INSERT INTO vehicle_documents (id, vehicle_id, label, path, bucket, url, sort_order, created_at)
     VALUES (gen_random_uuid(), $1, 'Đăng kiểm', 'documents/test/dangkiem.pdf', 'vehicle-documents', 'https://r2.test/documents/test/dangkiem.pdf', 0, now())`,
    [testVehicleId]
  );

  // g) 1 notification
  await pool.query(
    `INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
     VALUES (gen_random_uuid(), $1, 'vehicle_added', 'Xe mới', 'Đã thêm xe test', $2, now())`,
    [adminUser.id, JSON.stringify({ vehicle_id: testVehicleId, plate: testPlate })]
  );

  // h) 1 activity_log
  await pool.query(
    `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, description, metadata, created_at)
     VALUES (gen_random_uuid(), $1, 'create', 'vehicle', $2, 'Tạo xe test', $3, now())`,
    [adminUser.id, testVehicleId, JSON.stringify({ vehicle_id: testVehicleId })]
  );

  console.log('[SETUP] Đã tạo thành công xe TEST và toàn bộ 10 bản ghi liên kết.\n');

  // 3. TEST PHÂN QUYỀN: Staff cố gắng xóa xe -> Kỳ vọng 403 Forbidden
  console.log('--- TEST 1: PHÂN QUYỀN (Staff cố gắng xóa xe) ---');
  const staffDeleteRes = await fetch(`${API_BASE}/vehicles/${testVehicleId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${staffToken}`,
    },
  });
  console.log(`Staff DELETE HTTP Status: ${staffDeleteRes.status}`);
  const staffJson = await staffDeleteRes.json();
  console.log('Staff DELETE Response:', staffJson);

  if (staffDeleteRes.status !== 403) {
    throw new Error(`Kỳ vọng HTTP 403 Forbidden nhưng nhận được: ${staffDeleteRes.status}`);
  }
  console.log('✅ TEST 1 PASSED: Staff bị chặn chính xác với HTTP 403.\n');

  // 4. TEST CASCADE DELETE: Admin xóa xe -> Kỳ vọng 200 OK
  console.log('--- TEST 2: ADMIN CASCADE DELETE ---');
  const adminDeleteRes = await fetch(`${API_BASE}/vehicles/${testVehicleId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  console.log(`Admin DELETE HTTP Status: ${adminDeleteRes.status}`);
  const adminJson = await adminDeleteRes.json();
  console.log('Admin DELETE Response:', JSON.stringify(adminJson, null, 2));

  if (adminDeleteRes.status !== 200 || !adminJson.ok) {
    throw new Error(`Admin DELETE thất bại: HTTP ${adminDeleteRes.status} - ${adminJson.message}`);
  }
  console.log('✅ TEST 2 PASSED: Admin xóa xe thành công qua API.\n');

  // 5. TEST ZERO ORPHANS: Kiểm tra triệt để toàn bộ database Neon
  console.log('--- TEST 3: KIỂM TRA ZERO ORPHANS TRONG NEON POSTGRESQL ---');
  const checks = [
    { name: 'vehicles', query: 'SELECT count(*) FROM vehicles WHERE id = $1', params: [testVehicleId] },
    { name: 'check_sheets', query: 'SELECT count(*) FROM check_sheets WHERE vehicle_id = $1', params: [testVehicleId] },
    { name: 'checksheet_logs', query: 'SELECT count(*) FROM checksheet_logs WHERE checksheet_id = $1', params: [testCsId] },
    { name: 'tasks', query: 'SELECT count(*) FROM tasks WHERE vehicle_id = $1', params: [testVehicleId] },
    { name: 'task_activity_logs', query: 'SELECT count(*) FROM task_activity_logs WHERE task_id IN ($1, $2)', params: [testTaskId1, testTaskId2] },
    { name: 'vehicle_images', query: 'SELECT count(*) FROM vehicle_images WHERE vehicle_id = $1', params: [testVehicleId] },
    { name: 'vehicle_documents', query: 'SELECT count(*) FROM vehicle_documents WHERE vehicle_id = $1', params: [testVehicleId] },
    { name: 'move_logs', query: 'SELECT count(*) FROM move_logs WHERE vehicle_id = $1', params: [testVehicleId] },
    { name: 'vehicle_workflow_logs', query: 'SELECT count(*) FROM vehicle_workflow_logs WHERE vehicle_id = $1', params: [testVehicleId] },
    { name: 'notifications (data->>vehicle_id)', query: "SELECT count(*) FROM notifications WHERE data->>'vehicle_id' = $1", params: [testVehicleId] },
  ];

  let orphanFound = false;
  for (const c of checks) {
    const res = await pool.query(c.query, c.params);
    const count = parseInt(res.rows[0].count, 10);
    console.log(`- Bảng ${c.name.padEnd(35)}: ${count} bản ghi`);
    if (count !== 0) {
      orphanFound = true;
      console.error(`❌ PHÁT HIỆN DỮ LIỆU RÁC MỒ CÔI TẠI BẢNG ${c.name}: ${count} bản ghi!`);
    }
  }

  if (orphanFound) {
    throw new Error('Test thất bại: Còn tồn tại dữ liệu mồ côi trong database sau khi xóa xe!');
  }
  console.log('✅ TEST 3 PASSED: 100% bản ghi phụ thuộc đã được dọn sạch hoàn toàn, không có orphan.\n');

  // 6. TEST AUDIT LOG: Kiểm tra bản ghi audit xóa xe trong activity_logs
  console.log('--- TEST 4: KIỂM TRA AUDIT LOG GHI NHẬN HÀNH ĐỘNG XÓA ---');
  const auditRes = await pool.query(
    "SELECT action, entity_type, entity_id, description, metadata FROM activity_logs WHERE action = 'delete' AND entity_id = $1",
    [testVehicleId]
  );
  if (auditRes.rows.length === 0) {
    throw new Error('Không tìm thấy bản ghi audit log xóa xe trong activity_logs!');
  }
  console.log('Audit log entry:', auditRes.rows[0]);
  console.log('✅ TEST 4 PASSED: Audit log ghi nhận đầy đủ hành động xóa của Admin.\n');

  // 7. TEST REAL VEHICLES INTACT: Đảm bảo xe thật không bị ảnh hưởng
  console.log('--- TEST 5: KIỂM TRA TOÀN VẸN CÁC XE THẬT KHÁC ---');
  const countRealAfter = await pool.query("SELECT count(*) FROM vehicles WHERE plate NOT LIKE 'TEST-%'");
  const finalRealCount = parseInt(countRealAfter.rows[0].count, 10);
  console.log(`Số lượng xe thật trước test: ${initialRealCount} xe`);
  console.log(`Số lượng xe thật sau test:  ${finalRealCount} xe`);
  if (initialRealCount !== finalRealCount) {
    throw new Error(`Số lượng xe thật bị thay đổi! Trước: ${initialRealCount}, Sau: ${finalRealCount}`);
  }
  console.log('✅ TEST 5 PASSED: Toàn bộ xe thật của khách hàng còn nguyên vẹn 100%.\n');

  // 8. TEST IDEMPOTENCY / NOT FOUND: Xóa lại lần nữa -> 404
  console.log('--- TEST 6: XÓA XE ĐÃ XÓA (Kỳ vọng 404 Not Found) ---');
  const secondDeleteRes = await fetch(`${API_BASE}/vehicles/${testVehicleId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  console.log(`Second DELETE HTTP Status: ${secondDeleteRes.status}`);
  if (secondDeleteRes.status !== 404) {
    throw new Error(`Kỳ vọng 404 Not Found khi xóa lại xe đã bị xóa, nhận được: ${secondDeleteRes.status}`);
  }
  console.log('✅ TEST 6 PASSED: Trả về HTTP 404 Not Found chính xác.\n');

  console.log('========================================================');
  console.log('🎉 TẤT CẢ 6/6 BÀI KIỂM THỬ CASCADE DELETE ĐỀU ĐẠT 100%!');
  console.log('========================================================\n');

  await pool.end();
}

runTest().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  pool.end();
  process.exit(1);
});
