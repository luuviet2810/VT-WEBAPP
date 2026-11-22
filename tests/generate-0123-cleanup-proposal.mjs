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
    SELECT id, vehicle_id, path, thumbnail, url, category, sort_order, size_bytes, created_at
    FROM vehicle_images
    WHERE vehicle_id = $1
    ORDER BY sort_order ASC, created_at ASC
  `, [vId]);

  console.log('=== DETAILED PROPOSAL FOR CLEANUP OF DUPLICATE THUMBNAIL ROWS ===');
  const thumbRows = res.rows.filter(r => r.path && (r.path.includes('_thumb_') || r.path.includes('/thumb_')));
  const origRows = res.rows.filter(r => !r.path || (!r.path.includes('_thumb_') && !r.path.includes('/thumb_')));

  console.log(`Total DB Rows for 0123: ${res.rows.length}`);
  console.log(`Valid Physical Image Rows: ${origRows.length}`);
  console.log(`Redundant Thumbnail Rows: ${thumbRows.length}`);

  console.log('\n--- 13 REDUNDANT THUMBNAIL RECORDS (Candidates for deletion) ---');
  thumbRows.forEach((t, i) => {
    const parent = origRows.find(o => o.thumbnail && o.thumbnail.includes(t.path));
    console.log(`${i+1}. UUID: ${t.id}`);
    console.log(`   Path: ${t.path}`);
    console.log(`   Size: ${t.size_bytes} bytes | Category: ${t.category} | Sort: ${t.sort_order}`);
    console.log(`   Parent Original Image UUID: ${parent ? parent.id : 'N/A'}`);
    console.log(`   Parent Path: ${parent ? parent.path : 'N/A'}`);
    console.log('');
  });

  console.log('\n--- 14 VALID ORIGINAL IMAGE RECORDS (Keep) ---');
  origRows.forEach((o, i) => {
    console.log(`${i+1}. UUID: ${o.id}`);
    console.log(`   Path: ${o.path}`);
    console.log(`   Size: ${o.size_bytes} bytes | Category: ${o.category} | Sort: ${o.sort_order}`);
    console.log(`   Has Thumbnail Attached: ${Boolean(o.thumbnail)}`);
    console.log('');
  });

  await pool.end();
}

main().catch(console.error);
