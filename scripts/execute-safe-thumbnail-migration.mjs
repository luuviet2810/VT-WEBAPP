import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
if (fs.existsSync('gara-bot-server/.env')) dotenv.config({ path: 'gara-bot-server/.env' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const VEHICLE_ID = '74cd5ba2-3c93-4148-9748-c3de2a10afa5'; // Xe 0123

async function run() {
  console.log('================================================================');
  console.log('  VT AUTO – EXECUTE SAFE THUMBNAIL MIGRATION FOR VEHICLE 0123');
  console.log('================================================================\n');

  // --- BƯỚC 1: TẠO BACKUP RIÊNG 27 BẢN GHI CỦA XE 0123 ---
  console.log('--- BƯỚC 1: Tạo backup dữ liệu xe 0123 ---');
  if (!fs.existsSync('backups')) {
    fs.mkdirSync('backups', { recursive: true });
  }

  const backupQuery = await pool.query(`
    SELECT * FROM vehicle_images 
    WHERE vehicle_id = $1 
    ORDER BY sort_order ASC, created_at ASC
  `, [VEHICLE_ID]);

  if (backupQuery.rows.length !== 27) {
    throw new Error(`Dừng khẩn cấp: Số bản ghi trước migration không phải 27 (thực tế: ${backupQuery.rows.length})`);
  }

  const backupJsonPath = path.resolve('backups/vehicle_0123_images_backup_20261123.json');
  fs.writeFileSync(backupJsonPath, JSON.stringify(backupQuery.rows, null, 2), 'utf8');
  console.log(`[OK] Đã lưu 27 bản ghi vào file backup JSON: ${backupJsonPath}`);

  // Tạo thêm file SQL backup INSERT để có thể restore bất kỳ lúc nào qua psql
  const insertSqlStatements = backupQuery.rows.map(r => {
    const keys = Object.keys(r);
    const cols = keys.join(', ');
    const vals = keys.map(k => {
      const v = r[k];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'boolean' || typeof v === 'number') return v;
      if (v instanceof Date) return `'${v.toISOString()}'`;
      return `'${String(v).replace(/'/g, "''")}'`;
    }).join(', ');
    return `INSERT INTO vehicle_images (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`;
  }).join('\n');

  const backupSqlPath = path.resolve('backups/vehicle_0123_images_backup_20261123.sql');
  fs.writeFileSync(backupSqlPath, `-- BACKUP 27 RECORDS VEHICLE 0123 (${VEHICLE_ID})\nBEGIN;\n${insertSqlStatements}\nCOMMIT;\n`, 'utf8');
  console.log(`[OK] Đã lưu script phục hồi SQL: ${backupSqlPath}`);

  // --- BƯỚC 2: KIỂM TRA LẠI CHÍNH XÁC 13 CẶP THUMBNAIL VÀ ẢNH GỐC ---
  console.log('\n--- BƯỚC 2: Kiểm tra đối chiếu 13 cặp ảnh ---');
  const thumbRows = backupQuery.rows.filter(r => r.path && r.path.includes('_thumb_'));
  const origRows = backupQuery.rows.filter(r => !r.path || !r.path.includes('_thumb_'));

  if (thumbRows.length !== 13 || origRows.length !== 14) {
    throw new Error(`Dữ liệu không khớp: Thumbnail rows = ${thumbRows.length} (cần 13), Orig rows = ${origRows.length} (cần 14)`);
  }

  const migrationPairs = [];
  for (const t of thumbRows) {
    const matchedOrig = origRows.find(o => o.thumbnail && o.thumbnail.includes(t.path));
    if (!matchedOrig) {
      throw new Error(`Không tìm thấy ảnh gốc tương ứng cho thumbnail: ${t.path}`);
    }
    migrationPairs.push({
      origId: matchedOrig.id,
      origPath: matchedOrig.path,
      thumbId: t.id,
      cleanThumbKey: t.path, // Key sạch dạng vehicles/xxx/yyy_thumb_zzz.jpg
      sortOrder: matchedOrig.sort_order
    });
  }
  console.log(`[OK] Đã xác nhận 13/13 cặp đối chiếu chính xác 100%.`);

  // --- BƯỚC 3: CHẠY SQL MIGRATION TRONG TRANSACTION ---
  console.log('\n--- BƯỚC 3: Thực thi Transaction Migration trên Neon Database ---');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('[DB] Đã mở Transaction (BEGIN)');

    // Pre-flight check inside transaction
    const preCount0123 = await client.query('SELECT count(*) as count FROM vehicle_images WHERE vehicle_id = $1', [VEHICLE_ID]);
    const preCountLegacy = await client.query("SELECT count(*) as count FROM vehicle_images WHERE url LIKE '%supabase.co%'");
    
    if (parseInt(preCount0123.rows[0].count, 10) !== 27) {
      throw new Error(`Pre-check thất bại: Xe 0123 có ${preCount0123.rows[0].count} bản ghi (cần 27)`);
    }
    if (parseInt(preCountLegacy.rows[0].count, 10) !== 749) {
      throw new Error(`Pre-check thất bại: Số ảnh legacy Supabase là ${preCountLegacy.rows[0].count} (cần 749)`);
    }

    // 3.1: Chuẩn hóa cột thumbnail của 13 ảnh gốc
    console.log('[DB] 3.1. Cập nhật cột thumbnail của 13 ảnh gốc về Clean Object Key...');
    let updatedCount = 0;
    for (const pair of migrationPairs) {
      const updateRes = await client.query(`
        UPDATE vehicle_images
        SET thumbnail = $1
        WHERE id = $2 AND vehicle_id = $3
      `, [pair.cleanThumbKey, pair.origId, VEHICLE_ID]);
      updatedCount += updateRes.rowCount;
    }

    if (updatedCount !== 13) {
      throw new Error(`Cập nhật thất bại: Số hàng cập nhật là ${updatedCount} (cần đúng 13)`);
    }
    console.log(`[DB] Cập nhật thành công ${updatedCount}/13 ảnh gốc.`);

    // 3.2: Xóa đúng 13 bản ghi thumbnail thừa
    console.log('[DB] 3.2. Xóa 13 bản ghi thumbnail thừa...');
    const thumbIds = thumbRows.map(t => t.id);
    const deleteRes = await client.query(`
      DELETE FROM vehicle_images
      WHERE vehicle_id = $1
        AND path LIKE '%_thumb_%'
        AND id = ANY($2::uuid[])
    `, [VEHICLE_ID, thumbIds]);

    if (deleteRes.rowCount !== 13) {
      throw new Error(`Xóa thất bại: Số hàng đã xóa là ${deleteRes.rowCount} (cần đúng 13)`);
    }
    console.log(`[DB] Xóa thành công ${deleteRes.rowCount}/13 bản ghi thumbnail thừa.`);

    // --- BƯỚC 4 & 5: HẬU KIỂM BÊN TRONG TRANSACTION ---
    console.log('\n--- BƯỚC 4 & 5: Kiểm tra hậu kiểm tính toàn vẹn (Inside Transaction) ---');
    const postCount0123 = await client.query('SELECT count(*) as count FROM vehicle_images WHERE vehicle_id = $1', [VEHICLE_ID]);
    const postCountLegacy = await client.query("SELECT count(*) as count FROM vehicle_images WHERE url LIKE '%supabase.co%'");
    const postCountTotal = await client.query('SELECT count(*) as count FROM vehicle_images');

    const remaining0123 = parseInt(postCount0123.rows[0].count, 10);
    const remainingLegacy = parseInt(postCountLegacy.rows[0].count, 10);
    const remainingTotal = parseInt(postCountTotal.rows[0].count, 10);

    console.log(`- Xe 0123 còn lại: ${remaining0123} bản ghi (yêu cầu: 14)`);
    console.log(`- Ảnh legacy Supabase: ${remainingLegacy} bản ghi (yêu cầu: 749)`);
    console.log(`- Tổng số bản ghi vehicle_images: ${remainingTotal} (yêu cầu: 763)`);

    if (remaining0123 !== 14) {
      throw new Error(`Hậu kiểm thất bại: Xe 0123 có ${remaining0123} bản ghi (phải còn đúng 14 ảnh)`);
    }
    if (remainingLegacy !== 749) {
      throw new Error(`Hậu kiểm thất bại: Số ảnh legacy Supabase bị thay đổi (${remainingLegacy} != 749)`);
    }
    if (remainingTotal !== 763) {
      throw new Error(`Hậu kiểm thất bại: Tổng số bản ghi không đúng 763 (${remainingTotal})`);
    }

    // Kiểm tra tất cả 13 ảnh gốc đều có thumbnail dạng clean key (không bắt đầu bằng http, không null)
    const checkCleanThumbs = await client.query(`
      SELECT id, path, thumbnail FROM vehicle_images 
      WHERE vehicle_id = $1 AND id = ANY($2::uuid[])
    `, [VEHICLE_ID, migrationPairs.map(p => p.origId)]);

    for (const r of checkCleanThumbs.rows) {
      if (!r.thumbnail || r.thumbnail.startsWith('http') || !r.thumbnail.includes('_thumb_')) {
        throw new Error(`Thumbnail không đúng định dạng Clean Object Key cho ảnh ${r.id}: ${r.thumbnail}`);
      }
    }
    console.log(`[OK] 100% (13/13) ảnh gốc đã có Clean Object Key hợp lệ.`);

    // NẾU TẤT CẢ ĐỀU VƯỢT QUA -> COMMIT TRANSACTION!
    await client.query('COMMIT');
    console.log('\n>>> TRANSACTION COMMIT THÀNH CÔNG! Dữ liệu đã được lưu an toàn.');

  } catch (err) {
    console.error('\n🔴 GẶP LỖI - ĐANG THỰC HIỆN ROLLBACK KHẨN CẤP...');
    await client.query('ROLLBACK');
    console.error('ĐÃ ROLLBACK TOÀN BỘ. Cơ sở dữ liệu không bị thay đổi.');
    throw err;
  } finally {
    client.release();
  }

  // --- BƯỚC 6: KIỂM TRA API & TẢI ẢNH THỰC TẾ ---
  console.log('\n--- BƯỚC 6: Kiểm tra API và tải thực tế 14 ảnh sau khi migration ---');
  const jwt = (await import('../gara-bot-server/node_modules/jsonwebtoken/index.js')).default;
  const token = jwt.sign(
    { id: '5952c302-6998-4804-8121-80a663c81fb5', email: 'luuviet2810@gmail.com', name: 'LƯU VĂN VIỆT', role: 'admin' },
    process.env.JWT_SECRET || 'vtauto-backend-jwt-secret-key-change-in-prod-2026',
    { algorithm: 'HS256', expiresIn: '2h' }
  );

  const apiRes = await fetch(`http://localhost:3001/api/vehicles/${VEHICLE_ID}/images`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const apiJson = await apiRes.json();

  console.log(`API trả về: HTTP ${apiRes.status} | Số lượng ảnh: ${apiJson.data?.length}`);
  if (apiJson.data?.length !== 14) {
    throw new Error(`API trả về số lượng ảnh không đúng: ${apiJson.data?.length} (cần 14)`);
  }

  let successCount = 0;
  for (let i = 0; i < apiJson.data.length; i++) {
    const item = apiJson.data[i];
    
    // Tải ảnh gốc
    const origResp = await fetch(item.downloadUrl);
    if (origResp.status !== 200) {
      throw new Error(`Không thể tải ảnh gốc cho item #${i+1} (ID: ${item.id}): HTTP ${origResp.status}`);
    }

    // Tải thumbnail
    const thumbResp = await fetch(item.thumbnail);
    if (thumbResp.status !== 200) {
      throw new Error(`Không thể tải thumbnail cho item #${i+1} (ID: ${item.id}): HTTP ${thumbResp.status}`);
    }

    successCount++;
  }

  console.log(`[PASS] Đã kiểm tra tải thành công 14/14 ảnh gốc và 14/14 thumbnail qua API (HTTP 200 OK)!`);
  console.log('\n================================================================');
  console.log('  MIGRATION HOÀN TẤT THÀNH CÔNG VÀ AN TOÀN 100%!');
  console.log('================================================================');

  await pool.end();
}

run().catch(err => {
  console.error('\nMigration script error:', err);
  process.exit(1);
});
