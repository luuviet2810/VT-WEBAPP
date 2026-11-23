/**
 * VT AUTO – Safe Migration: Upcoming Vehicles (Xe Sắp Về)
 * 
 * 1. Queries and creates backup of the 10 hidden vehicles.
 * 2. Adds column `is_coming_soon` to `vehicles` table (default false).
 * 3. Updates `public_vehicles` view with secure CASE WHEN (strips sell_price when is_coming_soon = true).
 * 4. Migrates exactly the 10 hidden vehicles in a transaction.
 * 5. Runs strict assertions to verify data safety and security.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const BACKUP_PATH = path.resolve('scripts/backup_10_hidden_vehicles.json');

async function migrate() {
  console.log('=== BẮT ĐẦU MIGRATION XE SẮP VỀ (UPCOMING VEHICLES) ===');

  const client = await pool.connect();
  try {
    // 1. TRUY VẤN VÀ TẠO BACKUP 10 XE ĐANG ẨN
    console.log('[1] Truy vấn danh sách 10 xe đang ẩn (status = available AND is_public = false)...');
    const hiddenQuery = await client.query(`
      SELECT id, plate, model, brand, year, fuel_type, mileage, color, cost_price, sell_price, 
             status, position_id, assignee_id, is_public, public_sort_order, created_at, updated_at
      FROM vehicles
      WHERE status = 'available' AND (is_public = false OR is_public IS NULL)
      ORDER BY model ASC, id ASC
    `);

    const hiddenVehicles = hiddenQuery.rows;
    console.log(`✓ Đã tìm thấy chính xác ${hiddenVehicles.length} xe đang ẩn.`);

    if (hiddenVehicles.length !== 10) {
      throw new Error(`Kỳ vọng 10 xe đang ẩn nhưng thực tế có ${hiddenVehicles.length} xe! Hủy migration.`);
    }

    // Ghi file backup an toàn
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(hiddenVehicles, null, 2), 'utf-8');
    console.log(`✓ Đã tạo backup 10 xe tại: ${BACKUP_PATH}`);
    console.log('Danh sách 10 xe được backup:');
    hiddenVehicles.forEach((v, idx) => {
      console.log(`  ${idx + 1}. [${v.plate || 'No Plate'}] ${v.model} (${v.brand || 'No Brand'}) - ID: ${v.id} - Giá nội bộ: ${v.sell_price}`);
    });

    // 2. THÊM CỘT is_coming_soon VÀO BẢNG vehicles
    console.log('\n[2] Bổ sung cột is_coming_soon vào bảng vehicles (nếu chưa có)...');
    await client.query(`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS is_coming_soon BOOLEAN DEFAULT false NOT NULL;
    `);
    console.log('✓ Cột is_coming_soon đã sẵn sàng với default = false.');

    // 3. CẬP NHẬT VIEW public_vehicles VỚI CƠ CHẾ BẢO MẬT GIÁ
    console.log('\n[3] Cập nhật view public_vehicles với cơ chế che giá nội bộ cho xe Sắp về...');
    await client.query(`
      CREATE OR REPLACE VIEW public_vehicles AS
      SELECT id,
          model,
          brand,
          year,
          fuel_type,
          mileage,
          color,
          CASE 
            WHEN is_coming_soon = true THEN NULL 
            ELSE sell_price 
          END AS sell_price,
          options,
          created_at,
          updated_at,
          public_sort_order,
          is_coming_soon
      FROM vehicles
      WHERE is_public = true AND status <> 'sold'::vehicle_status AND status <> 'deposited'::vehicle_status;
    `);
    console.log('✓ View public_vehicles đã được cập nhật: sell_price tự động = NULL nếu is_coming_soon = true.');

    // 4. THỰC THI TRANSACTION CẬP NHẬT 10 XE SANG COMING SOON
    console.log('\n[4] Bắt đầu Transaction cập nhật 10 xe sang trạng thái Coming Soon...');
    await client.query('BEGIN');

    const targetIds = hiddenVehicles.map((v) => v.id);
    const updateResult = await client.query(`
      UPDATE vehicles
      SET is_public = true,
          is_coming_soon = true,
          updated_at = now()
      WHERE id = ANY($1)
      RETURNING id, model, plate, is_public, is_coming_soon, sell_price;
    `, [targetIds]);

    if (updateResult.rows.length !== 10) {
      await client.query('ROLLBACK');
      throw new Error(`Cập nhật thất bại: Số lượng xe cập nhật là ${updateResult.rows.length} thay vì 10. Đã Rollback!`);
    }

    await client.query('COMMIT');
    console.log(`✓ Transaction thành công! Đã chuyển ${updateResult.rows.length} xe sang is_public = true, is_coming_soon = true.`);

    // 5. CHẠY CÁC ASSERTION KIỂM TRA TOÀN VẸN VÀ BẢO MẬT
    console.log('\n[5] Kiểm tra toàn vẹn dữ liệu (Assertions)...');

    // Assertion 1: Số xe Available (is_public = true AND is_coming_soon = false)
    const availCheck = await client.query(`
      SELECT count(*) FROM vehicles 
      WHERE status = 'available' AND is_public = true AND is_coming_soon = false
    `);
    const availCount = Number(availCheck.rows[0].count);
    console.log(`✓ Số xe ĐANG CÓ (Available): ${availCount} (Kỳ vọng: 27)`);
    if (availCount !== 27) throw new Error(`Lỗi Assertion 1: Số xe Available là ${availCount} thay vì 27!`);

    // Assertion 2: Số xe Coming Soon (is_public = true AND is_coming_soon = true)
    const comingCheck = await client.query(`
      SELECT count(*) FROM vehicles 
      WHERE status = 'available' AND is_public = true AND is_coming_soon = true
    `);
    const comingCount = Number(comingCheck.rows[0].count);
    console.log(`✓ Số xe SẮP VỀ (Coming Soon): ${comingCount} (Kỳ vọng: 10)`);
    if (comingCount !== 10) throw new Error(`Lỗi Assertion 2: Số xe Coming Soon là ${comingCount} thay vì 10!`);

    // Assertion 3: Số xe Đang ẩn (is_public = false)
    const hiddenCheck = await client.query(`
      SELECT count(*) FROM vehicles 
      WHERE status = 'available' AND is_public = false
    `);
    const currentHiddenCount = Number(hiddenCheck.rows[0].count);
    console.log(`✓ Số xe ĐANG ẨN (Hidden): ${currentHiddenCount} (Kỳ vọng: 0)`);
    if (currentHiddenCount !== 0) throw new Error(`Lỗi Assertion 3: Số xe Hidden là ${currentHiddenCount} thay vì 0!`);

    // Assertion 4: Số xe Đã bán (Sold) không thay đổi
    const soldCheck = await client.query(`SELECT count(*) FROM vehicles WHERE status = 'sold'`);
    const soldCount = Number(soldCheck.rows[0].count);
    console.log(`✓ Số xe ĐÃ BÁN (Sold): ${soldCount} (Kỳ vọng: 73)`);
    if (soldCount !== 73) throw new Error(`Lỗi Assertion 4: Số xe Sold thay đổi thành ${soldCount}!`);

    // Assertion 5: Bảo mật giá trong public_vehicles view
    const viewPriceCheck = await client.query(`
      SELECT id, model, sell_price, is_coming_soon 
      FROM public_vehicles 
      WHERE is_coming_soon = true
    `);
    const leakedPrices = viewPriceCheck.rows.filter(r => r.sell_price != null && r.sell_price > 0);
    if (leakedPrices.length > 0) {
      throw new Error(`Lỗi bảo mật nghiêm trọng: Có ${leakedPrices.length} xe Coming Soon bị lộ giá trong public_vehicles view!`);
    }
    console.log(`✓ Bảo mật View: 100% (${viewPriceCheck.rows.length}/10) xe Coming Soon có sell_price = NULL trong public_vehicles view.`);

    // Assertion 6: Giá nội bộ trong bảng vehicles vẫn được giữ nguyên
    const internalPriceCheck = await client.query(`
      SELECT id, model, sell_price FROM vehicles WHERE id = 'fabba60d-d17f-4a14-ae79-dd3a0e8ddde2'
    `);
    const internalK5Price = Number(internalPriceCheck.rows[0].sell_price);
    console.log(`✓ Kiểm tra giá nội bộ xe K5 (fabba60d): ${internalK5Price} ₩ (Kỳ vọng giữ nguyên: 5600000 ₩)`);
    if (internalK5Price !== 5600000) {
      throw new Error(`Lỗi bảo toàn: Giá nội bộ của xe K5 bị thay đổi thành ${internalK5Price}!`);
    }

    console.log('\n=============================================');
    console.log('🎉 MIGRATION HOÀN TẤT THÀNH CÔNG VÀ AN TOÀN 100%!');
    console.log('=============================================');

  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('❌ MIGRATION THẤT BẠI:', err);
  process.exit(1);
});
