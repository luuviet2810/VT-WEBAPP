import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const vId = '74cd5ba2-3c93-4148-9748-c3de2a10afa5';
  const res = await pool.query(`
    SELECT id, path, thumbnail, url, category, sort_order, size_bytes, created_at
    FROM vehicle_images
    WHERE vehicle_id = $1
    ORDER BY sort_order ASC, created_at ASC
  `, [vId]);

  console.log(`Auditing pairs for vehicle 0123 (${res.rows.length} rows):`);

  const thumbRows = res.rows.filter(r => r.path && r.path.includes('_thumb_'));
  const origRows = res.rows.filter(r => r.path && !r.path.includes('_thumb_'));

  console.log(`Thumbnail rows: ${thumbRows.length}`);
  console.log(`Original rows: ${origRows.length}`);

  console.log('\n--- Checking Pair Matching ---');
  thumbRows.forEach(t => {
    // Find the original row whose thumbnail contains t.path
    const matchedOrig = origRows.find(o => o.thumbnail && o.thumbnail.includes(t.path));
    if (matchedOrig) {
      console.log(`MATCHED PAIR:`);
      console.log(`  Thumb Row ID: ${t.id} | Size: ${t.size_bytes}B | Sort: ${t.sort_order}`);
      console.log(`    Path: ${t.path}`);
      console.log(`  Orig  Row ID: ${matchedOrig.id} | Size: ${matchedOrig.size_bytes}B | Sort: ${matchedOrig.sort_order}`);
      console.log(`    Path: ${matchedOrig.path}`);
      console.log(`    Thumbnail points to: ${matchedOrig.thumbnail.substring(0, 100)}...`);
    } else {
      console.log(`UNMATCHED THUMB ROW: ID ${t.id} | Path: ${t.path}`);
    }
  });

  const unmatchedOrigs = origRows.filter(o => !thumbRows.some(t => o.thumbnail && o.thumbnail.includes(t.path)));
  console.log(`\nOriginal rows without matched thumb row: ${unmatchedOrigs.length}`);
  unmatchedOrigs.forEach(o => {
    console.log(`  ID: ${o.id} | Path: ${o.path} | Thumbnail: ${o.thumbnail}`);
  });

  await pool.end();
}

main().catch(console.error);
