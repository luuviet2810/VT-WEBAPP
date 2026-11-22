import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const { query } = await import('../gara-bot-server/dist/database/index.js');

async function main() {
  console.log('=== AUDIT DUPLICATE IMAGES IN NEON ===\n');

  // 1. Check rows with 'thumb_' in path or url
  const thumbRows = await query(`
    SELECT id, vehicle_id, path, url, category, thumbnail, created_at 
    FROM vehicle_images 
    WHERE path LIKE '%thumb_%' OR url LIKE '%thumb_%'
    ORDER BY created_at DESC
  `);
  console.log(`1. Total vehicle_images records with 'thumb_' in path/url: ${thumbRows.rows.length}`);
  if (thumbRows.rows.length > 0) {
    console.table(thumbRows.rows.slice(0, 10));
  }

  // 2. Check vehicles with multiple images having similar names or same vehicle_id
  const dupCheck = await query(`
    SELECT vehicle_id, count(*) as count 
    FROM vehicle_images 
    GROUP BY vehicle_id 
    HAVING count(*) > 1 
    ORDER BY count DESC 
    LIMIT 10
  `);
  console.log('\n2. Top vehicles with most image records:');
  console.table(dupCheck.rows);

  // Sample vehicle with most images
  if (dupCheck.rows.length > 0) {
    const topVehId = dupCheck.rows[0].vehicle_id;
    const topVehImgs = await query(`
      SELECT id, vehicle_id, path, category, sort_order, thumbnail, created_at 
      FROM vehicle_images 
      WHERE vehicle_id = $1 
      ORDER BY sort_order ASC, created_at ASC
    `, [topVehId]);
    console.log(`\nSample images for vehicle ${topVehId}:`);
    console.table(topVehImgs.rows);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
