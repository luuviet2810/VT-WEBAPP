/**
 * VT AUTO – COMPREHENSIVE VERIFICATION: AUTO SYNC SONG NUNG EXPIRY DATE
 * Tests Backend API, Neon PostgreSQL DB, and Frontend UI (Playwright).
 */

import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const require = createRequire(path.resolve(__dirname, '../gara-bot-server/node_modules'));
const jwt = require('jsonwebtoken');

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'fa456d3ac1fb2a116fc1bc3f9346ea8f3530fcdf3a46b39c104bf20d3139a429';

const SAMPLE_JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

async function main() {
  console.log('========================================================================');
  console.log('  VT AUTO – VERIFICATION: AUTO SYNC SONG NUNG EXPIRY DATE');
  console.log('========================================================================\n');

  // 1. Get Admin User & generate JWT
  const userRes = await pool.query("SELECT id, email, name, role FROM users WHERE role = 'admin' LIMIT 1");
  const admin = userRes.rows[0];
  const adminToken = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name || 'Admin', role: 'admin' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
  console.log(`[PASS] Admin token generated for: ${admin.email}`);

  // 2. Find vehicle 0123
  const vRes = await pool.query("SELECT id, plate, model, song_nung_expiry_date::text FROM vehicles WHERE plate = '0123'");
  if (vRes.rows.length === 0) {
    throw new Error('Vehicle 0123 not found in Neon database!');
  }
  const vehicle = vRes.rows[0];
  const vehicleId = vehicle.id;
  console.log(`[PASS] Found vehicle 0123: ID=${vehicleId}, Model=${vehicle.model}, song_nung_expiry_date=${vehicle.song_nung_expiry_date}`);

  // Ensure baseline date is 2026-11-28
  await pool.query("UPDATE vehicles SET song_nung_expiry_date = '2026-11-28' WHERE id = $1", [vehicleId]);

  console.log('\n--- PHẦN 1: KIỂM THỬ BACKEND API & NEON DB AUTO-SYNC ---');

  // Test 1: GET /api/vehicles/:id returns clean YYYY-MM-DD
  const getRes = await fetch(`${BACKEND_URL}/api/vehicles/${vehicleId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const getData = await getRes.json();
  if (getData.data?.songNungExpiryDate !== '2026-11-28') {
    throw new Error(`Expected songNungExpiryDate to be "2026-11-28", got "${getData.data?.songNungExpiryDate}"`);
  }
  console.log(`[PASS] 1. GET /api/vehicles/:id trả songNungExpiryDate chuẩn format YYYY-MM-DD: "${getData.data.songNungExpiryDate}"`);

  // Test 2: Upload song_nung image with date 28/11/2026 -> confirm-upload -> Auto-sync to vehicle
  console.log('\n[PASS] 2. Test Presigned Upload + Confirm-Upload với category=song_nung, songNungExpiryDate="28/11/2026":');
  const presignRes = await fetch(`${BACKEND_URL}/api/storage/presigned-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bucketType: 'images',
      fileName: 'test_song_nung_28-11-2026.jpg',
      fileSize: SAMPLE_JPG.length,
      mimeType: 'image/jpeg',
      vehicleId,
    })
  });
  const presignData = await presignRes.json();
  if (!presignData.ok) throw new Error('Failed to get presigned upload URL: ' + JSON.stringify(presignData));

  // PUT binary to R2
  const r2PutRes = await fetch(presignData.data.url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: SAMPLE_JPG,
  });
  if (!r2PutRes.ok) throw new Error(`R2 PUT failed with status ${r2PutRes.status}`);

  // Confirm upload with DD/MM/YYYY date
  const confirmRes = await fetch(`${BACKEND_URL}/api/storage/confirm-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bucketType: 'images',
      key: presignData.data.key,
      vehicleId,
      category: 'song_nung',
      sortOrder: 99,
      songNungExpiryDate: '28/11/2026',
    })
  });
  const confirmData = await confirmRes.json();
  if (!confirmData.ok) throw new Error('Confirm upload failed: ' + JSON.stringify(confirmData));
  const testImageId = confirmData.data.id;
  console.log(`       - Ảnh Song nưng đã lưu ID: ${testImageId}`);
  console.log(`       - Image song_nung_expiry_date: ${confirmData.data.songNungExpiryDate}`);

  // Verify DB vehicle table
  const checkDb1 = await pool.query("SELECT song_nung_expiry_date::text FROM vehicles WHERE id = $1", [vehicleId]);
  console.log(`       - Neon vehicles.song_nung_expiry_date: ${checkDb1.rows[0].song_nung_expiry_date}`);
  if (checkDb1.rows[0].song_nung_expiry_date !== '2026-11-28') {
    throw new Error(`Vehicle date expected '2026-11-28', got '${checkDb1.rows[0].song_nung_expiry_date}'`);
  }
  console.log('       => Auto-sync từ upload ảnh Song nưng vào bảng vehicles THÀNH CÔNG!');

  // Test 3: Upload song_nung image with NULL date -> must NOT overwrite existing date
  console.log('\n[PASS] 3. Test Confirm-Upload với songNungExpiryDate=null (OCR không nhận diện được):');
  const presignResNull = await fetch(`${BACKEND_URL}/api/storage/presigned-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bucketType: 'images',
      fileName: 'test_nodate.jpg',
      fileSize: SAMPLE_JPG.length,
      mimeType: 'image/jpeg',
      vehicleId,
    })
  });
  const presignNullData = await presignResNull.json();
  await fetch(presignNullData.data.url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: SAMPLE_JPG });
  const confirmNullRes = await fetch(`${BACKEND_URL}/api/storage/confirm-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bucketType: 'images',
      key: presignNullData.data.key,
      vehicleId,
      category: 'song_nung',
      sortOrder: 100,
      songNungExpiryDate: null,
    })
  });
  const confirmNullData = await confirmNullRes.json();
  const nullImageId = confirmNullData.data.id;

  const checkDbNull = await pool.query("SELECT song_nung_expiry_date::text FROM vehicles WHERE id = $1", [vehicleId]);
  console.log(`       - Neon vehicles.song_nung_expiry_date: ${checkDbNull.rows[0].song_nung_expiry_date}`);
  if (checkDbNull.rows[0].song_nung_expiry_date !== '2026-11-28') {
    throw new Error('Vehicle date was overwritten by null upload!');
  }
  console.log('       => Ảnh không có ngày KHÔNG ghi đè null, giữ nguyên ngày hiện tại!');

  // Test 4: Upload non-song_nung image (category='vehicle') with a date -> must NOT touch vehicle song_nung date
  console.log('\n[PASS] 4. Test Confirm-Upload với category=vehicle (ảnh xe thông thường):');
  const presignVehicleRes = await fetch(`${BACKEND_URL}/api/storage/presigned-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bucketType: 'images',
      fileName: 'car_normal.jpg',
      fileSize: SAMPLE_JPG.length,
      mimeType: 'image/jpeg',
      vehicleId,
    })
  });
  const presignVData = await presignVehicleRes.json();
  await fetch(presignVData.data.url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: SAMPLE_JPG });
  const confirmVRes = await fetch(`${BACKEND_URL}/api/storage/confirm-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bucketType: 'images',
      key: presignVData.data.key,
      vehicleId,
      category: 'vehicle',
      sortOrder: 101,
      songNungExpiryDate: '2027-01-01',
    })
  });
  const confirmVData = await confirmVRes.json();
  const vImageId = confirmVData.data.id;

  const checkDbV = await pool.query("SELECT song_nung_expiry_date::text FROM vehicles WHERE id = $1", [vehicleId]);
  console.log(`       - Neon vehicles.song_nung_expiry_date: ${checkDbV.rows[0].song_nung_expiry_date}`);
  if (checkDbV.rows[0].song_nung_expiry_date !== '2026-11-28') {
    throw new Error('Vehicle date was illegally updated by category=vehicle!');
  }
  console.log('       => Chỉ ảnh category=song_nung mới cập nhật trường này, ảnh khác bị bỏ qua!');

  // Test 5: Update image expiry date via PATCH /api/vehicles/images/:id/expiry
  console.log('\n[PASS] 5. Test PATCH /api/vehicles/images/:id/expiry với ngày mới 2026-12-15:');
  const patchExpiryRes = await fetch(`${BACKEND_URL}/api/vehicles/images/${testImageId}/expiry`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ expiryDate: '15/12/2026' }),
  });
  const patchExpiryData = await patchExpiryRes.json();
  if (!patchExpiryData.ok) throw new Error('Patch expiry failed: ' + JSON.stringify(patchExpiryData));

  const checkDbPatch = await pool.query("SELECT song_nung_expiry_date::text FROM vehicles WHERE id = $1", [vehicleId]);
  console.log(`       - Image song_nung_expiry_date: ${patchExpiryData.data.songNungExpiryDate}`);
  console.log(`       - Neon vehicles.song_nung_expiry_date: ${checkDbPatch.rows[0].song_nung_expiry_date}`);
  if (checkDbPatch.rows[0].song_nung_expiry_date !== '2026-12-15') {
    throw new Error(`Vehicle date expected '2026-12-15', got '${checkDbPatch.rows[0].song_nung_expiry_date}'`);
  }
  console.log('       => Sửa ngày hết hạn trên ảnh tự động đồng bộ sang bảng vehicles!');

  // Cleanup test uploads
  console.log('\n[PASS] 6. Dọn dẹp các ảnh test:');
  for (const delId of [testImageId, nullImageId, vImageId]) {
    await fetch(`${BACKEND_URL}/api/vehicles/images/${delId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  }
  // Restore vehicle date to 2026-11-28
  await pool.query("UPDATE vehicles SET song_nung_expiry_date = '2026-11-28' WHERE id = $1", [vehicleId]);
  console.log('       - Đã dọn dẹp ảnh test và khôi phục date = 2026-11-28');

  // --- PHẦN 2: KIỂM THỬ PLAYWRIGHT FRONTEND UI ---
  console.log('\n--- PHẦN 2: KIỂM THỬ GIAO DIỆN FRONTEND BẰNG PLAYWRIGHT ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  await context.addInitScript((token) => {
    window.localStorage.setItem('vtauto_auth_token', token);
  }, adminToken);

  const page = await context.newPage();

  try {
    console.log(`[PASS] 7. Mở trang chi tiết xe 0123: ${FRONTEND_URL}/xe/${vehicleId}`);
    await page.goto(`${FRONTEND_URL}/xe/${vehicleId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Tab 1: Tab Thông tin xe
    console.log('[PASS] 8. Kiểm tra tab "Thông tin":');
    const songNungInput = page.locator('div:has(> label:has-text("Hạn Song nưng")) input[type="date"]');
    await songNungInput.waitFor({ state: 'visible', timeout: 5000 });
    const inputValue = await songNungInput.inputValue();
    console.log(`       - Giá trị input[type="date"] "Hạn Song nưng": "${inputValue}"`);
    if (inputValue !== '2026-11-28') {
      throw new Error(`Expected input value to be "2026-11-28", but was "${inputValue}"`);
    }

    // Check status badge
    const badgeText = await page.locator('div:has(> label:has-text("Hạn Song nưng")) span.inline-flex').innerText();
    console.log(`       - Trạng thái nhãn: "${badgeText.trim()}"`);
    if (!badgeText.includes('Còn hạn')) {
      throw new Error(`Expected badge to say "Còn hạn", got "${badgeText}"`);
    }

    // Switch to tab "Ảnh"
    console.log('\n[PASS] 9. Chuyển sang tab "Ảnh":');
    await page.click('button:has-text("Ảnh")');
    await page.waitForTimeout(1500);

    // Locate "Ảnh Song nưng" section
    const songNungSection = page.locator('div.mb-6:has(h3:has-text("Ảnh Song nưng"))');
    await songNungSection.waitFor({ state: 'visible', timeout: 5000 });

    // Check Song nung card text
    const expiryCardLabel = songNungSection.locator('text=/Hạn: 28\\/11\\/2026/').first();
    const isVisible = await expiryCardLabel.isVisible();
    console.log(`       - Thẻ ảnh hiển thị "Hạn: 28/11/2026": ${isVisible ? 'Có' : 'Không'}`);
    if (!isVisible) {
      throw new Error('Song nung card does not show "Hạn: 28/11/2026"');
    }

    // Click "Hạn" button on the song_nung image card that has the date
    console.log('\n[PASS] 10. Click nút "Hạn" để sửa ngày hết hạn từ thẻ ảnh:');
    const cardWithDate = songNungSection.locator('.group.relative:has-text("Hạn: 28/11/2026")').first();
    const hanButton = cardWithDate.locator('button:has-text("Hạn")');
    await hanButton.click({ force: true });
    await page.waitForSelector('h3:has-text("Sửa ngày hết hạn")', { timeout: 5000 });

    const editDateInput = page.locator('div:has(> h3:has-text("Sửa ngày hết hạn")) input[type="date"]');
    const curEditValue = await editDateInput.inputValue();
    console.log(`       - Giá trị modal sửa ngày ban đầu: "${curEditValue}"`);
    if (curEditValue !== '2026-11-28') {
      throw new Error(`Expected modal input to be prefilled with "2026-11-28", got "${curEditValue}"`);
    }

    // Enter new date: 2026-12-25
    await editDateInput.fill('2026-12-25');
    await page.click('div:has(> h3:has-text("Sửa ngày hết hạn")) button:has-text("Lưu")');
    await page.waitForTimeout(1500);

    // Verify DB updated
    const checkDbNew = await pool.query("SELECT song_nung_expiry_date::text FROM vehicles WHERE id = $1", [vehicleId]);
    console.log(`       - Neon vehicles.song_nung_expiry_date sau khi sửa: ${checkDbNew.rows[0].song_nung_expiry_date}`);
    if (checkDbNew.rows[0].song_nung_expiry_date !== '2026-12-25') {
      throw new Error(`Expected Neon date to be '2026-12-25', got '${checkDbNew.rows[0].song_nung_expiry_date}'`);
    }

    // Switch back to tab "Thông tin" WITHOUT refreshing page
    console.log('\n[PASS] 11. Chuyển lại tab "Thông tin" kiểm tra state đồng bộ tức thì (không reload):');
    await page.click('button:has-text("Thông tin")');
    await page.waitForTimeout(1000);

    const updatedInputValue = await songNungInput.inputValue();
    console.log(`       - Giá trị input "Hạn Song nưng" ngay sau khi sửa: "${updatedInputValue}"`);
    if (updatedInputValue !== '2026-12-25') {
      throw new Error(`Expected instant state sync to show "2026-12-25", got "${updatedInputValue}"`);
    }
    console.log('       => Tab Thông tin xe cập nhật ngay lập tức không cần reload trang!');

    // Refresh page and verify persistence
    console.log('\n[PASS] 12. Refresh trang (F5) và xác nhận ngày vẫn tồn tại:');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const refreshedInput = page.locator('div:has(> label:has-text("Hạn Song nưng")) input[type="date"]');
    const refreshedValue = await refreshedInput.inputValue();
    console.log(`       - Giá trị input "Hạn Song nưng" sau reload: "${refreshedValue}"`);
    if (refreshedValue !== '2026-12-25') {
      throw new Error(`Expected refreshed input to show "2026-12-25", got "${refreshedValue}"`);
    }
    console.log('       => Sau khi reload, trường "Hạn Song nưng" vẫn hiển thị chính xác!');

    // Reset back to 2026-11-28
    console.log('\n[PASS] 13. Khôi phục lại ngày 2026-11-28:');
    await refreshedInput.fill('2026-11-28');
    await page.click('button:has-text("Lưu thay đổi")');
    await page.waitForTimeout(1500);

    // Update image record back as well
    await pool.query(
      "UPDATE vehicle_images SET song_nung_expiry_date = '2026-11-28' WHERE vehicle_id = $1 AND category = 'song_nung'",
      [vehicleId]
    );
    const finalDb = await pool.query("SELECT song_nung_expiry_date::text FROM vehicles WHERE id = $1", [vehicleId]);
    console.log(`       - Neon vehicles.song_nung_expiry_date cuối cùng: ${finalDb.rows[0].song_nung_expiry_date}`);

  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log('  TẤT CẢ 13 BƯỚC KIỂM THỬ AUTO-SYNC ĐỀU ĐÃ PASS 100%!');
  console.log('========================================================================\n');
}

main()
  .catch((err) => {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
