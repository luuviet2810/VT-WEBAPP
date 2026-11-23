import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const vView = await pool.query(`SELECT pg_get_viewdef('public_vehicles', true) as def`);
  console.log('--- public_vehicles def ---');
  console.log(vView.rows[0].def);

  const imgView = await pool.query(`SELECT pg_get_viewdef('public_vehicle_images', true) as def`);
  console.log('--- public_vehicle_images def ---');
  console.log(imgView.rows[0].def);

  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'vehicles' 
    ORDER BY ordinal_position
  `);
  console.log('--- vehicles columns ---');
  console.log(cols.rows.map(c => `${c.column_name}: ${c.data_type} (default: ${c.column_default})`).join('\n'));

  // Kiểm tra 10 xe đang ẩn (status 'available' AND is_public = false)
  const hidden = await pool.query(`
    SELECT id, model, brand, plate, status, is_public, public_sort_order, sell_price, created_at, updated_at
    FROM vehicles
    WHERE status = 'available' AND (is_public = false OR is_public IS NULL)
    ORDER BY model ASC
  `);
  console.log(`\n--- 10 xe đang ẩn (count = ${hidden.rows.length}) ---`);
  console.log(hidden.rows);

  // Kiểm tra 27 xe đang hiển thị (status 'available' AND is_public = true)
  const visible = await pool.query(`
    SELECT count(*) FROM vehicles WHERE status = 'available' AND is_public = true
  `);
  console.log(`\n--- Số xe đang hiển thị: ${visible.rows[0].count} ---`);

  // Kiểm tra xe sold
  const sold = await pool.query(`
    SELECT count(*) FROM vehicles WHERE status = 'sold'
  `);
  console.log(`--- Số xe sold: ${sold.rows[0].count} ---`);

  const enumVals = await pool.query(`
    SELECT e.enumlabel 
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'vehicle_status'
    ORDER BY e.enumsortorder
  `);
  const ids = hidden.rows.map(r => r.id);
  const imgs = await pool.query(`
    SELECT vehicle_id, category, count(*) 
    FROM vehicle_images 
    WHERE vehicle_id = ANY($1) 
    GROUP BY vehicle_id, category
  `, [ids]);
  console.log('Images for 10 hidden vehicles:', imgs.rows);

  await pool.end();
}

main().catch(console.error);
