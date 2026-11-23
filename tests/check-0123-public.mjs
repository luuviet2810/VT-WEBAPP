import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

const parsed = dotenv.parse(fs.readFileSync('.env'));
const client = new pg.Client({ connectionString: parsed.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const v0123 = await client.query(`
  SELECT v.id, v.plate, v.model, v.is_public, v.status, v.public_sort_order 
  FROM vehicles v 
  WHERE v.id = '74cd5ba2-3c93-4148-9748-c3de2a10afa5'
`);
console.log('Vehicle 0123 in vehicles table:', v0123.rows);

const pv0123 = await client.query(`
  SELECT * FROM public_vehicles WHERE id = '74cd5ba2-3c93-4148-9748-c3de2a10afa5'
`);
console.log('Vehicle 0123 in public_vehicles view:', pv0123.rows);

const pvi0123 = await client.query(`
  SELECT * FROM public_vehicle_images WHERE vehicle_id = '74cd5ba2-3c93-4148-9748-c3de2a10afa5' ORDER BY sort_order
`);
console.log('Images of 0123 in public_vehicle_images view (count = ' + pvi0123.rows.length + '):');
pvi0123.rows.forEach(r => console.log(r));

await client.end();
