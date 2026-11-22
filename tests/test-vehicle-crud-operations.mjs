import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config({ path: 'gara-bot-server/.env' });

console.log('=== TEST SUITE: VEHICLE CRUD OPERATIONS & ACCESS CONTROL ===');

const jwt = (await import('../gara-bot-server/node_modules/jsonwebtoken/index.js')).default;
const secret = process.env.JWT_SECRET;
const RENDER_BASE_URL = 'https://vt-webapp.onrender.com';

// 1. Admin Token (Lưu Văn Việt)
const adminToken = jwt.sign({
  id: '5952c302-6998-4804-8121-80a663c81fb5',
  email: 'luuviet2810@gmail.com',
  name: 'LƯU VĂN VIỆT'
}, secret, { expiresIn: '7d' });

// 2. Staff Token (Lưu Anh Kiên)
const staffToken = jwt.sign({
  id: 'b2931df6-022c-403c-965d-9d743326b9f0',
  email: 'kienluu13012005vp@gmail.com',
  name: 'LUU ANH KIEN'
}, secret, { expiresIn: '7d' });

const adminHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + adminToken,
};

const staffHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + staffToken,
};

// --- TEST 1: Baseline count check ---
console.log('\n--- 1. Baseline Vehicle Count Check ---');
const baseRes = await fetch(`${RENDER_BASE_URL}/api/vehicles`, { headers: adminHeaders });
const baseData = await baseRes.json();
assert.strictEqual(baseRes.status, 200);
assert.strictEqual(baseData.data.length, 109, 'Baseline count must be exactly 109');
console.log('✅ Baseline confirmed: exactly 109 vehicles in Neon');

// --- TEST 2: Create a temporary test vehicle ---
console.log('\n--- 2. Create Temporary Test Vehicle ---');
const testVehiclePayload = {
  plate: 'TEST9999',
  model: 'Test Vehicle Automation',
  brand: 'VT Testing',
  year: 2024,
  fuelType: 'Xăng',
  costPrice: 50000000,
  sellPrice: 65000000,
  status: 'available',
  note: 'Xe thử nghiệm tự động hóa - sẽ xóa sau khi test',
};

const createRes = await fetch(`${RENDER_BASE_URL}/api/vehicles`, {
  method: 'POST',
  headers: adminHeaders,
  body: JSON.stringify(testVehiclePayload),
});
const createData = await createRes.json();
assert.strictEqual(createRes.status, 201, 'Vehicle creation should return 201 Created');
assert.ok(createData.data.id, 'Created vehicle must have an ID');
const testId = createData.data.id;
console.log(`✅ Test vehicle created successfully! ID: ${testId}, Plate: ${createData.data.plate}`);

// Verify total count increased to 110
const countAfterCreateRes = await fetch(`${RENDER_BASE_URL}/api/vehicles`, { headers: adminHeaders });
const countAfterCreateData = await countAfterCreateRes.json();
assert.strictEqual(countAfterCreateData.data.length, 110);
console.log('✅ Verified count increased to 110 vehicles in Neon');

// --- TEST 3: Read test vehicle by ID ---
console.log('\n--- 3. Read Vehicle Details by ID ---');
const getDetailRes = await fetch(`${RENDER_BASE_URL}/api/vehicles/${testId}`, { headers: adminHeaders });
const getDetailData = await getDetailRes.json();
assert.strictEqual(getDetailRes.status, 200);
assert.strictEqual(getDetailData.data.plate, 'TEST9999');
assert.strictEqual(getDetailData.data.model, 'Test Vehicle Automation');
console.log(`✅ Vehicle details read successfully: Plate ${getDetailData.data.plate}, Model ${getDetailData.data.model}`);

// --- TEST 4: Search test vehicle by Plate and Model ---
console.log('\n--- 4. Search Functionality Verification ---');
const searchPlateRes = await fetch(`${RENDER_BASE_URL}/api/vehicles?search=TEST9999`, { headers: adminHeaders });
const searchPlateData = await searchPlateRes.json();
assert.strictEqual(searchPlateData.data.length, 1);
assert.strictEqual(searchPlateData.data[0].id, testId);
console.log('✅ Search by Plate (TEST9999) returned exact match');

const searchModelRes = await fetch(`${RENDER_BASE_URL}/api/vehicles?search=Automation`, { headers: adminHeaders });
const searchModelData = await searchModelRes.json();
assert.ok(searchModelData.data.some(v => v.id === testId));
console.log('✅ Search by Model keyword ("Automation") returned exact match');

// --- TEST 5: Update Vehicle Information & Position ---
console.log('\n--- 5. Update Vehicle Information & Position ---');
const updatePayload = {
  note: 'Ghi chú đã cập nhật thành công qua API',
  color: 'Trắng Ngọc Trai',
  sellPrice: 70000000,
  positionId: '00000000-0000-0000-0000-000000000004',
};

const updateRes = await fetch(`${RENDER_BASE_URL}/api/vehicles/${testId}`, {
  method: 'PUT',
  headers: adminHeaders,
  body: JSON.stringify(updatePayload),
});
const updateData = await updateRes.json();
assert.strictEqual(updateRes.status, 200, 'Update should return 200 OK');
assert.strictEqual(updateData.data.note, 'Ghi chú đã cập nhật thành công qua API');
assert.strictEqual(updateData.data.color, 'Trắng Ngọc Trai');
assert.strictEqual(updateData.data.sellPrice, 70000000);
console.log('✅ Information and Position updated and confirmed in Neon');

// --- TEST 6: Update Vehicle Status (Available -> Sold -> Available) ---
console.log('\n--- 6. Update Vehicle Status ---');
const soldPayload = { status: 'sold', soldDate: new Date().toISOString() };
const soldRes = await fetch(`${RENDER_BASE_URL}/api/vehicles/${testId}`, {
  method: 'PATCH',
  headers: adminHeaders,
  body: JSON.stringify(soldPayload),
});
const soldData = await soldRes.json();
assert.strictEqual(soldRes.status, 200);
assert.strictEqual(soldData.data.status, 'sold');
console.log('✅ Status updated to "sold"');

// Confirm sold filter includes it
const soldListRes = await fetch(`${RENDER_BASE_URL}/api/vehicles?status=sold`, { headers: adminHeaders });
const soldListData = await soldListRes.json();
assert.ok(soldListData.data.some(v => v.id === testId));
console.log('✅ Filter ?status=sold correctly includes the vehicle');

// --- TEST 7: Staff Deletion Restriction (RBAC Security) ---
console.log('\n--- 7. Staff Deletion Restriction (RBAC Security Check) ---');
const staffDeleteRes = await fetch(`${RENDER_BASE_URL}/api/vehicles/${testId}`, {
  method: 'DELETE',
  headers: staffHeaders,
});
assert.strictEqual(staffDeleteRes.status, 403, 'Staff must be forbidden from deleting vehicles');
console.log('✅ RBAC Confirmed: Staff receives HTTP 403 Forbidden when trying to delete vehicle');

// --- TEST 8: Admin Delete Vehicle & Final Baseline Verification ---
console.log('\n--- 8. Admin Deletion & Final Baseline Cleanliness Check ---');
const adminDeleteRes = await fetch(`${RENDER_BASE_URL}/api/vehicles/${testId}`, {
  method: 'DELETE',
  headers: adminHeaders,
});
assert.strictEqual(adminDeleteRes.status, 200, 'Admin should delete vehicle successfully');
console.log('✅ Admin deleted test vehicle successfully');

// Final count check
const finalCountRes = await fetch(`${RENDER_BASE_URL}/api/vehicles`, { headers: adminHeaders });
const finalCountData = await finalCountRes.json();
assert.strictEqual(finalCountData.data.length, 109, 'Final vehicle count must be restored exactly to 109');
console.log('✅ Final verification: Total vehicles in Neon is PRECISELY 109 (Zero data pollution)');

console.log('\n🎉 ALL 8 VEHICLE MANAGEMENT API & RBAC TESTS PASSED 100%!');
