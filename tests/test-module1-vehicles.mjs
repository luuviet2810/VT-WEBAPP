import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('--- KIỂM TRA MODULE 1: VEHICLES & POSITIONS TRÊN NEON ---');

  // 1. Positions count
  const posRes = await pool.query('SELECT count(*) FROM positions');
  const posCount = parseInt(posRes.rows[0].count, 10);
  console.log(`Positions count: ${posCount} (kỳ vọng: 7)`);
  if (posCount !== 7) throw new Error(`Positions count không khớp: ${posCount}`);

  // 2. Vehicles count
  const vehRes = await pool.query('SELECT count(*) FROM vehicles');
  const vehCount = parseInt(vehRes.rows[0].count, 10);
  console.log(`Vehicles count: ${vehCount} (kỳ vọng: 109)`);
  if (vehCount !== 109) throw new Error(`Vehicles count không khớp: ${vehCount}`);

  // 3. Vehicles status breakdown
  const statusRes = await pool.query('SELECT status, count(*) FROM vehicles GROUP BY status');
  console.log('Vehicles by status:', statusRes.rows);

  // 4. Test fetch vehicles with images & docs matching controller logic
  const [vehicles, images, docs] = await Promise.all([
    pool.query('SELECT * FROM vehicles ORDER BY created_at DESC'),
    pool.query(`SELECT vehicle_id, url, thumbnail, sort_order FROM vehicle_images WHERE category = 'vehicle' OR category IS NULL ORDER BY sort_order ASC`),
    pool.query('SELECT vehicle_id, url, sort_order FROM vehicle_documents ORDER BY sort_order ASC'),
  ]);

  console.log(`Đọc thành công: ${vehicles.rows.length} xe, ${images.rows.length} ảnh xe, ${docs.rows.length} tài liệu xe.`);
  console.log('✅ MODULE 1 KIỂM TRA THÀNH CÔNG 100%!');

  await pool.end();
}

run().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
