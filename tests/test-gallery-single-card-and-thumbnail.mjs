import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env') });
config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const require = createRequire(path.resolve(__dirname, '../gara-bot-server/node_modules'));
const jwt = require('jsonwebtoken');

const { query } = await import('../gara-bot-server/dist/database/index.js');
const { headObject, isR2Configured } = await import('../gara-bot-server/dist/storage/r2.service.js');

const BACKEND_URL = 'http://localhost:3001';

const ADMIN_USER = {
  id: '5952c302-6998-4804-8121-80a663c81fb5',
  email: 'luuviet2810@gmail.com',
  name: 'LƯU VĂN VIỆT',
  role: 'admin',
};

const JWT_SECRET = process.env.JWT_SECRET || 'vtauto-backend-jwt-secret-key-change-in-prod-2026';

function getAdminToken() {
  return jwt.sign(
    { id: ADMIN_USER.id, email: ADMIN_USER.email, name: ADMIN_USER.name },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

const adminToken = getAdminToken();

// 1x1 valid JPEG test image
const SAMPLE_JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);
// Smaller 1x1 JPEG for thumbnail
const SAMPLE_THUMB = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

async function runTests() {
  console.log('================================================================');
  console.log('  VT AUTO – AUDIT: GALLERY SINGLE-CARD & THUMBNAIL/FULLSIZE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // --- 1. LEGACY VEHICLE CHECK (Vehicle 8737 with 24 images) ---
  console.log('--- 1. Kiểm tra xe thực tế có nhiều ảnh (Xe 8737: 24 ảnh legacy) ---');
  const legacyVehId = '5f0c65ef-66c8-405b-a03c-6700de924cd3';
  const legacyRes = await fetch(`${BACKEND_URL}/api/vehicles/${legacyVehId}/images`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then(r => r.json());

  assert(legacyRes.ok, 'API GET /api/vehicles/:id/images trả về thành công');
  assert(Array.isArray(legacyRes.data), 'Dữ liệu trả về là mảng ảnh');
  assert(legacyRes.data.length === 24, `Xe 8737 trả về đúng 24 bản ghi (thực tế: ${legacyRes.data.length})`);

  // Kiểm tra mỗi ảnh có downloadUrl và thumbnail riêng biệt
  let allHaveUrls = true;
  let allHaveThumbnails = true;
  for (const img of legacyRes.data) {
    if (!img.downloadUrl || !img.downloadUrl.startsWith('http')) allHaveUrls = false;
    if (!img.thumbnail || !img.thumbnail.startsWith('http')) allHaveThumbnails = false;
  }
  assert(allHaveUrls, '100% ảnh legacy có downloadUrl hợp lệ (ảnh gốc fullsize)');
  assert(allHaveThumbnails, '100% ảnh legacy có thumbnail hợp lệ (URL ảnh thu nhỏ)');

  // Kiểm tra phân tách giữa thumbnail và ảnh gốc
  const sampleLegacy = legacyRes.data[0];
  assert(
    sampleLegacy.downloadUrl !== sampleLegacy.thumbnail,
    `Ảnh gốc và thumbnail có URL riêng biệt (Gốc: ...${sampleLegacy.downloadUrl.slice(-20)} | Thumb: ...${sampleLegacy.thumbnail.slice(-25)})`
  );

  // Kiểm tra quy tắc hiển thị: mỗi bản ghi chỉ tạo đúng 1 card
  const seenIds = new Set();
  let hasDuplicateCards = false;
  for (const img of legacyRes.data) {
    if (seenIds.has(img.id)) hasDuplicateCards = true;
    seenIds.add(img.id);
  }
  assert(!hasDuplicateCards, 'Không có bản ghi nào bị trùng lặp ID trong danh sách');
  assert(seenIds.size === 24, 'Mỗi bản ghi đại diện cho đúng 1 card duy nhất trong Gallery');

  // --- 2. TẠO XE TEST VÀ UPLOAD ẢNH MỚI VỚI THUMBNAIL LƯU TRÊN R2 ---
  console.log('\n--- 2. Kiểm tra upload ảnh mới (Chỉ tạo DUY NHẤT 1 card và 1 record Neon) ---');
  const plate = `TEST-${Date.now().toString().slice(-4)}`;
  const vCreateRes = await fetch(`${BACKEND_URL}/api/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      plate,
      model: 'Single Card Test Car',
      brand: 'VT Testing',
      year: 2024,
      fuelType: 'Xăng',
      status: 'available',
      note: 'Kiểm thử không nhân đôi card ảnh',
    }),
  }).then(r => r.json());

  assert(vCreateRes.ok, `Tạo xe thử nghiệm thành công: ${plate} (ID: ${vCreateRes.data.id})`);
  const testVehicleId = vCreateRes.data.id;

  let testImgId = null;
  let testOriginalKey = null;
  let testThumbKey = null;

  try {
    // 2.1 Upload thumbnail trực tiếp lên R2 KHÔNG gọi confirm-upload
    console.log('2.1 Upload thumbnail lên Cloudflare R2 (không chèn row DB)...');
    const thumbFileName = `thumb_cover_${Date.now()}.jpg`;
    const presignedThumb = await fetch(`${BACKEND_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        fileName: thumbFileName,
        fileSize: SAMPLE_THUMB.length,
        mimeType: 'image/jpeg',
        vehicleId: testVehicleId,
      }),
    }).then(r => r.json());

    assert(presignedThumb.ok, 'Tạo Presigned URL cho thumbnail thành công');
    testThumbKey = presignedThumb.data.key;

    const putThumbRes = await fetch(presignedThumb.data.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: SAMPLE_THUMB,
    });
    assert(putThumbRes.ok, 'PUT thumbnail trực tiếp lên R2 thành công');

    // 2.2 Upload ảnh gốc và gọi confirm-upload với thumbnail = testThumbKey
    console.log('2.2 Upload ảnh gốc và confirm upload (chỉ tạo đúng 1 row DB)...');
    const origFileName = `cover_full_${Date.now()}.jpg`;
    const presignedOrig = await fetch(`${BACKEND_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        fileName: origFileName,
        fileSize: SAMPLE_JPG.length,
        mimeType: 'image/jpeg',
        vehicleId: testVehicleId,
      }),
    }).then(r => r.json());

    assert(presignedOrig.ok, 'Tạo Presigned URL cho ảnh gốc thành công');
    testOriginalKey = presignedOrig.data.key;

    const putOrigRes = await fetch(presignedOrig.data.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: SAMPLE_JPG,
    });
    assert(putOrigRes.ok, 'PUT ảnh gốc trực tiếp lên R2 thành công');

    // Confirm upload cho ảnh gốc (lưu kèm thumbnail key)
    const confirmRes = await fetch(`${BACKEND_URL}/api/storage/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        key: testOriginalKey,
        vehicleId: testVehicleId,
        category: 'vehicle',
        sortOrder: 0,
        thumbnail: testThumbKey,
      }),
    }).then(r => r.json());

    assert(confirmRes.ok, 'confirm-upload thành công cho ảnh gốc');
    testImgId = confirmRes.data.id;

    // 2.3 Kiểm tra số bản ghi trong bảng vehicle_images của xe test
    const countRes = await query(
      `SELECT count(*) as count FROM vehicle_images WHERE vehicle_id = $1`,
      [testVehicleId]
    );
    assert(
      parseInt(countRes.rows[0].count, 10) === 1,
      `Chỉ có DUY NHẤT 1 bản ghi trong Neon DB (thực tế: ${countRes.rows[0].count})`
    );

    // Kiểm tra bản ghi trong DB lưu đúng R2 Key (không lưu presigned URL hết hạn)
    const dbRow = await query(`SELECT * FROM vehicle_images WHERE id = $1`, [testImgId]);
    const r = dbRow.rows[0];
    assert(r.path === testOriginalKey, 'DB lưu Object Key vĩnh viễn cho ảnh gốc: ' + r.path);
    assert(r.thumbnail === testThumbKey, 'DB lưu Object Key vĩnh viễn cho thumbnail: ' + r.thumbnail);

    // 2.4 Kiểm tra API GET /api/vehicles/:id/images
    console.log('2.4 Kiểm tra dữ liệu GET trả về cho Frontend...');
    const getRes = await fetch(`${BACKEND_URL}/api/vehicles/${testVehicleId}/images`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.json());

    assert(getRes.ok, 'GET danh sách ảnh xe test thành công');
    assert(getRes.data.length === 1, `Chỉ trả về 1 item ảnh cho xe (thực tế: ${getRes.data.length})`);

    const imgData = getRes.data[0];
    assert(
      imgData.downloadUrl && imgData.downloadUrl.startsWith('http') && imgData.downloadUrl.includes(testOriginalKey),
      'downloadUrl là Presigned GET URL hợp lệ trỏ tới ảnh gốc'
    );
    assert(
      imgData.thumbnail && imgData.thumbnail.startsWith('http') && imgData.thumbnail.includes(testThumbKey),
      'thumbnail là Presigned GET URL hợp lệ trỏ tới thumbnail R2'
    );
    assert(
      imgData.downloadUrl !== imgData.thumbnail,
      'URL ảnh gốc và URL thumbnail phân biệt rõ ràng (không trùng lặp)'
    );

    // 2.5 Kiểm tra tải nội dung từ cả hai URL
    const fetchOrig = await fetch(imgData.downloadUrl);
    assert(fetchOrig.ok && (await fetchOrig.arrayBuffer()).byteLength === SAMPLE_JPG.length, 'Tải ảnh gốc từ downloadUrl thành công (HTTP 200)');

    const fetchThumb = await fetch(imgData.thumbnail);
    assert(fetchThumb.ok && (await fetchThumb.arrayBuffer()).byteLength === SAMPLE_THUMB.length, 'Tải thumbnail từ thumbnail URL thành công (HTTP 200)');

    // 2.6 Kiểm tra giả lập Refresh trang
    console.log('2.6 Giả lập người dùng refresh lại trang (F5)...');
    const refreshRes = await fetch(`${BACKEND_URL}/api/vehicles/${testVehicleId}/images`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.json());
    assert(refreshRes.data.length === 1, 'Sau khi refresh trang: Vẫn chỉ có DUY NHẤT 1 card ảnh hiển thị');

    // --- 3. KIỂM TRA XÓA ĐỒNG BỘ ẢNH GỐC VÀ THUMBNAIL TRÊN R2 ---
    console.log('\n--- 3. Kiểm tra xóa đồng bộ cả ảnh gốc và thumbnail ---');
    const delRes = await fetch(`${BACKEND_URL}/api/vehicles/images/${testImgId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.json());

    assert(delRes.ok, 'DELETE ảnh trả về thành công');

    const checkDbAfterDel = await query(`SELECT count(*) as count FROM vehicle_images WHERE id = $1`, [testImgId]);
    assert(parseInt(checkDbAfterDel.rows[0].count, 10) === 0, 'Bản ghi Neon DB đã bị xóa hoàn toàn');

    const checkOrigR2 = await headObject('images', testOriginalKey);
    assert(!checkOrigR2.exists, 'Ảnh gốc trên Cloudflare R2 đã bị xóa (exists: false)');

    const checkThumbR2 = await headObject('images', testThumbKey);
    assert(!checkThumbR2.exists, 'Thumbnail trên Cloudflare R2 đã bị xóa sạch (exists: false)');

  } finally {
    // Dọn dẹp xe test
    if (testVehicleId) {
      await query(`DELETE FROM vehicles WHERE id = $1`, [testVehicleId]);
      console.log('Đã dọn dẹp xe test sạch sẽ.');
    }
  }

  // --- 4. DATA SAFETY AUDIT (749 ẢNH SUPABASE CŨ) ---
  console.log('\n--- 4. Kiểm tra bảo toàn dữ liệu 749 ảnh Supabase cũ ---');
  const legacyCountRes = await query("SELECT count(*) as count FROM vehicle_images WHERE url LIKE '%supabase%' OR url LIKE '%storage/v1/object%'");
  const totalCountRes = await query("SELECT count(*) as count FROM vehicle_images");

  assert(parseInt(legacyCountRes.rows[0].count, 10) === 749, `Số lượng ảnh cũ Supabase: 749/749 (thực tế: ${legacyCountRes.rows[0].count})`);
  assert(parseInt(totalCountRes.rows[0].count, 10) >= 749, `Tổng số bản ghi trong bảng vehicle_images: >= 749 (thực tế: ${totalCountRes.rows[0].count})`);

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
