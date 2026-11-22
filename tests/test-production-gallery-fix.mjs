import pg from 'pg';
import dotenv from 'dotenv';
import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';

dotenv.config();
import fs from 'fs';
if (fs.existsSync('gara-bot-server/.env')) {
  dotenv.config({ path: 'gara-bot-server/.env' });
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'vtauto-backend-jwt-secret-key-change-in-prod-2026';
const token = jwt.sign(
  {
    id: '5952c302-6998-4804-8121-80a663c81fb5',
    email: 'luuviet2810@gmail.com',
    name: 'LƯU VĂN VIỆT',
    role: 'admin',
  },
  JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

async function main() {
  console.log('================================================================');
  console.log('  VT AUTO – VERIFICATION: VEHICLE 0123 GALLERY DUPLICATE FIX');
  console.log('================================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
    }
  }

  // --- 1. KIỂM TRA XE 0123 TRÊN API MỚI ---
  console.log('--- 1. Kiểm tra xe biển số 0123 qua API GET /api/vehicles/:id/images ---');
  const v0123Id = '74cd5ba2-3c93-4148-9748-c3de2a10afa5';
  
  const res0123 = await fetch(`http://localhost:3001/api/vehicles/${v0123Id}/images`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(res0123.status === 200, `API trả về HTTP 200 (thực tế: ${res0123.status})`);
  
  const json0123 = await res0123.json();
  assert(json0123.ok === true, 'Response body có ok === true');
  assert(Array.isArray(json0123.data), 'Response data là mảng');
  
  console.log(`API trả về số lượng ảnh: ${json0123.data.length} (Trước đây: 27)`);
  assert(json0123.data.length === 14, `API trả về đúng 14 ảnh vật lý duy nhất (thực tế: ${json0123.data.length})`);

  // Kiểm tra không có bất kỳ ảnh nào có path chứa _thumb_
  const thumbPaths = json0123.data.filter(img => (img.path || '').includes('_thumb_') || (img.path || '').includes('/thumb_'));
  assert(thumbPaths.length === 0, `Không có bất kỳ bản ghi thumbnail nào bị trả về như ảnh độc lập (thực tế: ${thumbPaths.length})`);

  // Kiểm tra tính duy nhất của ID và Path
  const ids = new Set(json0123.data.map(img => img.id));
  assert(ids.size === 14, `14 bản ghi có 14 ID duy nhất (thực tế: ${ids.size})`);
  const paths = new Set(json0123.data.map(img => img.path));
  assert(paths.size === 14, `14 bản ghi có 14 Path ảnh gốc duy nhất (thực tế: ${paths.size})`);

  // Kiểm tra thumbnail gắn kèm ảnh gốc
  const withThumbnail = json0123.data.filter(img => Boolean(img.thumbnail));
  console.log(`Số lượng ảnh có thumbnail hợp lệ: ${withThumbnail.length}/14`);
  assert(withThumbnail.length === 14, `100% (14/14) ảnh có thumbnail hợp lệ (13 ảnh có thumbnail R2 riêng + 1 ảnh PNG fallback sang downloadUrl)`);

  // Thử fetch 1 ảnh gốc và 1 thumbnail thật từ URL được ký
  const sample = json0123.data.find(img => img.thumbnail && img.downloadUrl);
  if (sample) {
    const fetchOrig = await fetch(sample.downloadUrl);
    assert(fetchOrig.status === 200, `Tải ảnh gốc fullsize thành công (HTTP ${fetchOrig.status})`);
    const fetchThumb = await fetch(sample.thumbnail);
    assert(fetchThumb.status === 200, `Tải thumbnail thành công (HTTP ${fetchThumb.status})`);
  }

  // --- 2. GIẢ LẬP FRONTEND LOAD VÀ RENDER CATEGORY ---
  console.log('\n--- 2. Giả lập Frontend xử lý CategorizedPhotoViewer trên xe 0123 ---');
  // Giả lập logic trong loadImages() và byCategory()
  const isThumbRecord = (r) => {
    const p = r.path || r.url || '';
    return p.includes('_thumb_') || p.includes('/thumb_') || p.startsWith('thumb_');
  };

  const rows = json0123.data;
  const seenIds = new Set();
  const seenPaths = new Set();
  const uniqueRows = rows.filter((r) => {
    if (isThumbRecord(r)) return false;
    if (seenIds.has(r.id)) return false;
    seenIds.add(r.id);
    if (r.path) {
      if (seenPaths.has(r.path)) return false;
      seenPaths.add(r.path);
    }
    return true;
  });

  assert(uniqueRows.length === 14, `uniqueRows sau loadImages có đúng 14 ảnh (thực tế: ${uniqueRows.length})`);

  // byCategory
  const CATEGORIES = ['website', 'documents', 'error', 'song_nung', 'vehicle'];
  const byCategory = {};
  for (const c of CATEGORIES) byCategory[c] = [];

  const catSeenIds = new Set();
  const catSeenPaths = new Set();
  for (const row of uniqueRows) {
    if (catSeenIds.has(row.id)) continue;
    catSeenIds.add(row.id);

    const rowPath = row.path || row.url || '';
    if (rowPath && (rowPath.includes('_thumb_') || rowPath.includes('/thumb_') || rowPath.startsWith('thumb_'))) continue;

    if (row.path && catSeenPaths.has(row.path)) continue;
    if (row.path) catSeenPaths.add(row.path);

    const cat = row.category || 'vehicle';
    if (byCategory[cat]) byCategory[cat].push(row);
    else byCategory[cat] = [row];
  }

  console.log(`Số card render trong danh mục "website": ${byCategory['website'].length}`);
  assert(byCategory['website'].length === 14, `Giao diện render đúng 14 cards trong danh mục "website" (thực tế: ${byCategory['website'].length})`);
  assert(byCategory['website'][0].id === '5747319c-4864-412b-b1ae-c8761c9977c7', `Ảnh đầu tiên (Cover/Ảnh đại diện website) là ảnh gốc chính xác (ID: ${byCategory['website'][0].id})`);

  // Giả lập refresh trang 5 lần liên tục
  console.log('\n--- 3. Giả lập người dùng F5 / Refresh trang liên tục 5 lần ---');
  let stable = true;
  for (let i = 1; i <= 5; i++) {
    const resReload = await fetch(`http://localhost:3001/api/vehicles/${v0123Id}/images`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const jsonReload = await resReload.json();
    if (jsonReload.data.length !== 14) {
      stable = false;
      break;
    }
  }
  assert(stable, 'Số lượng card luôn giữ ổn định 14 card qua 5 lần refresh trang liên tiếp');

  // --- 4. KIỂM TRA MỘT XE KHÁC ĐỂ TRÁNH HARDCODE BIỂN SỐ 0123 ---
  console.log('\n--- 4. Kiểm tra xe khác (Xe 8737 - 24 ảnh legacy) ---');
  const v8737 = await pool.query(`SELECT id, plate, model FROM vehicles WHERE plate ILIKE '%8737%' LIMIT 1`);
  if (v8737.rows.length > 0) {
    const vOtherId = v8737.rows[0].id;
    console.log(`Xe kiểm tra chéo: ${v8737.rows[0].plate} (${v8737.rows[0].model}, ID: ${vOtherId})`);
    
    const resOther = await fetch(`http://localhost:3001/api/vehicles/${vOtherId}/images`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const jsonOther = await resOther.json();
    assert(jsonOther.ok === true, 'Xe 8737 tải ảnh thành công qua API');
    assert(jsonOther.data.length === 24, `Xe 8737 có đủ 24 ảnh legacy (thực tế: ${jsonOther.data.length})`);
    const otherIds = new Set(jsonOther.data.map(img => img.id));
    assert(otherIds.size === 24, `Xe 8737 không có bất kỳ ID trùng lặp nào`);
  }

  // --- 5. BẢO TOÀN DỮ LIỆU DATABASE ---
  console.log('\n--- 5. Kiểm tra an toàn dữ liệu Database Neon ---');
  const totalImg = await pool.query(`SELECT COUNT(*) as count FROM vehicle_images`);
  console.log(`Tổng số bản ghi trong vehicle_images hiện tại: ${totalImg.rows[0].count}`);
  assert(Number(totalImg.rows[0].count) === 763, `Tổng số bản ghi trong vehicle_images chuẩn hóa: 763 (749 legacy + 14 xe 0123) (thực tế: ${totalImg.rows[0].count})`);

  const supabaseImg = await pool.query(`SELECT COUNT(*) as count FROM vehicle_images WHERE url ILIKE '%supabase.co%'`);
  assert(Number(supabaseImg.rows[0].count) === 749, `749 bản ghi ảnh legacy Supabase nguyên vẹn 100%`);

  const rows0123InDb = await pool.query(`SELECT COUNT(*) as count FROM vehicle_images WHERE vehicle_id = $1`, [v0123Id]);
  assert(Number(rows0123InDb.rows[0].count) === 14, `Xe 0123 trong Neon DB có đúng 14 bản ghi ảnh gốc sạch sẽ (thực tế: ${rows0123InDb.rows[0].count})`);

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`========================================`);

  await pool.end();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
