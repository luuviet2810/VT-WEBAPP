import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const { query } = await import('../gara-bot-server/dist/database/index.js');

async function main() {
  const vehId = '5f0c65ef-66c8-405b-a03c-6700de924cd3';
  const res = await query(`
    SELECT id, vehicle_id, path, url, category, sort_order, thumbnail, created_at
    FROM vehicle_images
    WHERE vehicle_id = $1
    ORDER BY category, sort_order
  `, [vehId]);

  console.log(`Vehicle 8737 has ${res.rows.length} image records:`);
  res.rows.forEach((r, idx) => {
    console.log(`[${idx}] ID: ${r.id} | Cat: ${r.category} | Order: ${r.sort_order} | Path: ${r.path}`);
    console.log(`     URL: ${r.url}`);
    console.log(`     Thumb: ${r.thumbnail}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
