import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../gara-bot-server/.env') });

const { query } = await import('../gara-bot-server/dist/database/index.js');

async function main() {
  const vehId = '74cd5ba2-3c93-4148-9748-c3de2a10afa5';
  const res = await query(`
    SELECT id, path, category, sort_order, thumbnail, created_at
    FROM vehicle_images
    WHERE vehicle_id = $1
    ORDER BY created_at ASC
  `, [vehId]);

  console.log(`Images for vehicle ${vehId}:`);
  console.table(res.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
