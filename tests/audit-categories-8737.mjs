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
    SELECT path, array_agg(category) as categories, count(*) as count
    FROM vehicle_images
    WHERE vehicle_id = $1
    GROUP BY path
    ORDER BY count DESC
  `, [vehId]);

  console.table(res.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
