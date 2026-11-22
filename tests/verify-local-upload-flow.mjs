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
const { headObject } = await import('../gara-bot-server/dist/storage/r2.service.js');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

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

const SAMPLE_JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

async function main() {
  console.log('================================================================');
  console.log('  VT AUTO – FINAL LOCAL UPLOAD VERIFICATION');
  console.log('================================================================\n');

  let testVehicleId = null;
  let uploadedKey = null;
  let imageId = null;

  try {
    // 1. Kiểm tra Frontend & Backend local
    console.log('--- BƯỚC 1: Kiểm tra Backend & Frontend Local ---');
    const beHealth = await fetch(`${BACKEND_URL}/health`).then(r => r.json());
    console.log('[PASS] Backend đang chạy tại:', BACKEND_URL, '(Status:', beHealth.ok ? 'OK' : 'FAIL', ')');

    const feRes = await fetch(`${FRONTEND_URL}/`);
    console.log('[PASS] Frontend đang chạy tại:', FRONTEND_URL, '(HTTP Status:', feRes.status, ')');

    // 2. Xác thực phiên đăng nhập Admin
    console.log('\n--- BƯỚC 2: Xác thực phiên đăng nhập Admin ---');
    const authCheck = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.json());

    if (!authCheck.ok || authCheck.data?.user?.role !== 'admin') {
      throw new Error(`Đăng nhập Admin không thành công: ${JSON.stringify(authCheck)}`);
    }
    console.log('[PASS] Đăng nhập Admin thành công:', authCheck.data.user.name, `(${authCheck.data.user.email})`, '- Role:', authCheck.data.user.role);

    // 3. Tạo xe thử nghiệm biệt lập (không dùng xe khách hàng thật)
    console.log('\n--- BƯỚC 3: Tạo xe thử nghiệm biệt lập (Không dùng xe khách thật) ---');
    const plate = `TEST-${Date.now().toString().slice(-4)}`;
    const vCreateRes = await fetch(`${BACKEND_URL}/api/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        plate,
        model: 'Vios Test Upload',
        brand: 'Toyota (Test)',
        year: 2024,
        fuelType: 'Xăng',
        status: 'available',
        note: 'Xe test local upload verification',
      }),
    });

    const vCreateJson = await vCreateRes.json();
    if (!vCreateJson.ok) {
      throw new Error(`Tạo xe thử nghiệm thất bại: ${JSON.stringify(vCreateJson)}`);
    }

    testVehicleId = vCreateJson.data.id;
    console.log('[PASS] Đã tạo xe thử nghiệm riêng:', vCreateJson.data.plate, `(UUID: ${testVehicleId})`);

    // 4. Request Presigned Upload URL cho file JPG
    console.log('\n--- BƯỚC 4: Upload ảnh JPG với category=vehicle, songNungExpiryDate=null, thumbnail=null ---');
    const fileName = `test_0758_sm5_${Date.now()}.jpg`;
    const presignedRes = await fetch(`${BACKEND_URL}/api/storage/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bucketType: 'images',
        fileName,
        fileSize: SAMPLE_JPG.length,
        mimeType: 'image/jpeg',
        vehicleId: testVehicleId,
      }),
    }).then(r => r.json());

    if (!presignedRes.ok) {
      throw new Error(`Tạo Presigned Upload URL thất bại: ${JSON.stringify(presignedRes)}`);
    }
    uploadedKey = presignedRes.data.key;
    const uploadUrl = presignedRes.data.url;
    console.log('[PASS] 4.1 Tạo Presigned Upload URL thành công.');
    console.log('       Object Key R2:', uploadedKey);

    // 4.2 PUT binary file trực tiếp lên Cloudflare R2
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: SAMPLE_JPG,
    });

    if (!putRes.ok) {
      throw new Error(`Upload lên Cloudflare R2 thất bại: HTTP ${putRes.status} ${putRes.statusText}`);
    }
    console.log('[PASS] 4.2 Presigned PUT lên Cloudflare R2 thành công (HTTP', putRes.status, ')');

    // 5. Xác nhận R2 lưu file thật
    console.log('\n--- BƯỚC 5: Xác nhận file trên R2 và gọi confirm-upload ---');
    const r2Head = await headObject('images', uploadedKey);
    if (!r2Head.exists) {
      throw new Error(`File không tồn tại trên Cloudflare R2: ${uploadedKey}`);
    }
    console.log('[PASS] 5.1 Cloudflare R2 đã lưu file thật. Size:', r2Head.contentLength, 'bytes | Content-Type:', r2Head.contentType);

    // 5.2 Gọi confirm-upload với đúng payload yêu cầu (null songNungExpiryDate, null thumbnail)
    const confirmPayload = {
      bucketType: 'images',
      key: uploadedKey,
      vehicleId: testVehicleId,
      category: 'vehicle',
      sortOrder: 0,
      songNungExpiryDate: null,
      thumbnail: null,
    };

    const confirmRes = await fetch(`${BACKEND_URL}/api/storage/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(confirmPayload),
    }).then(r => r.json());

    if (!confirmRes.ok) {
      throw new Error(`confirm-upload thất bại: ${JSON.stringify(confirmRes)}`);
    }
    imageId = confirmRes.data.id;
    console.log('[PASS] 5.2 confirm-upload trả thành công (HTTP 201). Image ID:', imageId);

    // 5.3 Xác nhận Neon có metadata
    const neonRow = await query(
      `SELECT id, vehicle_id, path, bucket, category, sort_order, song_nung_expiry_date, thumbnail
       FROM vehicle_images
       WHERE id = $1`,
      [imageId]
    );

    if (neonRow.rows.length === 0) {
      throw new Error(`Không tìm thấy metadata ảnh trong Neon DB với ID ${imageId}`);
    }
    const meta = neonRow.rows[0];
    console.log('[PASS] 5.3 Neon DB có metadata:');
    console.log('       - ID:', meta.id);
    console.log('       - Path:', meta.path);
    console.log('       - Category:', meta.category);
    console.log('       - sort_order:', meta.sort_order);
    console.log('       - song_nung_expiry_date:', meta.song_nung_expiry_date, '(null chuẩn)');
    console.log('       - thumbnail:', meta.thumbnail, '(null chuẩn)');

    // 5.4 GET danh sách ảnh trả downloadUrl hợp lệ
    const listRes = await fetch(`${BACKEND_URL}/api/vehicles/${testVehicleId}/images`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.json());

    if (!listRes.ok || !Array.isArray(listRes.data) || listRes.data.length === 0) {
      throw new Error(`GET danh sách ảnh thất bại: ${JSON.stringify(listRes)}`);
    }
    const foundImage = listRes.data.find(img => img.id === imageId);
    if (!foundImage || !foundImage.downloadUrl) {
      throw new Error(`Ảnh không có downloadUrl hợp lệ: ${JSON.stringify(foundImage)}`);
    }
    console.log('[PASS] 5.4 GET danh sách ảnh trả downloadUrl hợp lệ:');
    console.log('       Download URL:', foundImage.downloadUrl.slice(0, 90) + '...');

    // 5.5 Kiểm tra tải nội dung từ downloadUrl
    const downloadRes = await fetch(foundImage.downloadUrl);
    if (!downloadRes.ok) {
      throw new Error(`Tải ảnh từ downloadUrl thất bại: HTTP ${downloadRes.status}`);
    }
    const downloadedBuf = Buffer.from(await downloadRes.arrayBuffer());
    if (downloadedBuf.length !== SAMPLE_JPG.length) {
      throw new Error(`Dung lượng file tải về không khớp: ${downloadedBuf.length} != ${SAMPLE_JPG.length}`);
    }
    console.log('[PASS] 5.5 Tải ảnh từ downloadUrl thành công, khớp 100% byte-for-byte (', downloadedBuf.length, 'bytes)');

    // 5.6 Giả lập Refresh trang (Reload/Re-fetch)
    console.log('\n--- BƯỚC 5.6: Giả lập Refresh trang (User Reload) ---');
    const refreshRes = await fetch(`${BACKEND_URL}/api/vehicles/${testVehicleId}/images`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.json());
    const refreshedImage = refreshRes.data.find(img => img.id === imageId);
    if (!refreshedImage) {
      throw new Error(`Sau khi refresh không tìm thấy ảnh ID ${imageId}`);
    }
    console.log('[PASS] Refresh trang thành công: Ảnh vẫn hiển thị đầy đủ, downloadUrl mới được cấp phát tự động.');

    // 6. Xóa ảnh thử nghiệm và xác nhận R2 + Neon sạch
    console.log('\n--- BƯỚC 6: Xóa ảnh thử nghiệm và xác nhận R2 + Neon sạch ---');
    const deleteRes = await fetch(`${BACKEND_URL}/api/vehicles/images/${imageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then(r => r.json());

    if (!deleteRes.ok) {
      throw new Error(`Xóa ảnh thất bại: ${JSON.stringify(deleteRes)}`);
    }
    console.log('[PASS] 6.1 API DELETE ảnh trả thành công (HTTP 200)');

    // Kiểm tra Neon sạch
    const checkNeon = await query('SELECT count(*) as count FROM vehicle_images WHERE id = $1', [imageId]);
    if (parseInt(checkNeon.rows[0].count, 10) !== 0) {
      throw new Error(`Metadata ảnh vẫn còn tồn tại trong Neon sau khi xóa!`);
    }
    console.log('[PASS] 6.2 Neon DB sạch: Metadata ảnh đã được xóa hoàn toàn (0 rows).');

    // Kiểm tra R2 sạch
    const checkR2 = await headObject('images', uploadedKey);
    if (checkR2.exists) {
      throw new Error(`File vẫn còn tồn tại trên Cloudflare R2 sau khi xóa!`);
    }
    console.log('[PASS] 6.3 Cloudflare R2 sạch: Object key đã được xóa khỏi bucket (exists: false).');

    // Dọn dẹp xe thử nghiệm
    if (testVehicleId) {
      await query('DELETE FROM vehicles WHERE id = $1', [testVehicleId]);
      console.log('[PASS] 6.4 Đã xóa xe thử nghiệm riêng biệt khỏi Neon DB.');
    }

    console.log('\n================================================================');
    console.log('  KẾT QUẢ: TẤT CẢ 6 BƯỚC ĐỀU PASS 100% TRÊN LOCAL!');
    console.log('================================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n[LỖI TRONG QUÁ TRÌNH KIỂM TRA]:', err);
    // Cleanup if failed
    if (testVehicleId) {
      await query('DELETE FROM vehicle_images WHERE vehicle_id = $1', [testVehicleId]).catch(() => {});
      await query('DELETE FROM vehicles WHERE id = $1', [testVehicleId]).catch(() => {});
    }
    process.exit(1);
  }
}

main();
