import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const vehicleId = '74cd5ba2-3c93-4148-9748-c3de2a10afa5';
  const res = await pool.query(`
    SELECT id, vehicle_id, path, thumbnail, url, category, sort_order, size_bytes, mime_type, created_at
    FROM vehicle_images
    WHERE vehicle_id = $1
    ORDER BY sort_order ASC, created_at ASC
  `, [vehicleId]);

  console.log(`Total rows in vehicle_images for 0123 (${vehicleId}): ${res.rows.length}\n`);

  let thumbRows = 0;
  let fullRows = 0;
  const pairs = [];

  res.rows.forEach((r, idx) => {
    const isThumbPath = r.path.includes('thumb_');
    if (isThumbPath) thumbRows++;
    else fullRows++;

    console.log(`[#${idx + 1}] ID: ${r.id} | is_thumb_file: ${isThumbPath}`);
    console.log(`     Path: ${r.path}`);
    console.log(`     Thumbnail col: ${r.thumbnail ? (r.thumbnail.substring(0, 60) + '...') : 'null'}`);
    console.log(`     URL col: ${r.url ? (r.url.substring(0, 60) + '...') : 'null'}`);
    console.log(`     Category: ${r.category} | Sort: ${r.sort_order} | Size: ${r.size_bytes} bytes | Created: ${r.created_at.toISOString()}`);
  });

  console.log(`\nSummary of DB records for 0123:`);
  console.log(`- Total records: ${res.rows.length}`);
  console.log(`- Rows where path has 'thumb_': ${thumbRows}`);
  console.log(`- Rows where path is original: ${fullRows}`);

  await pool.end();
}

main().catch(console.error);
