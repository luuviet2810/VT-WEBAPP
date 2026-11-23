import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';
import dotenv from 'dotenv';
import fs from 'fs';
import pg from 'pg';

const parsed = dotenv.parse(fs.readFileSync('gara-bot-server/.env'));
const rootEnv = dotenv.parse(fs.readFileSync('.env'));

const client = new pg.Client({ connectionString: rootEnv.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const pvRes = await client.query('SELECT * FROM public_vehicles ORDER BY public_sort_order ASC NULLS LAST');
console.log('27 Public vehicles in DB:');

const token = jwt.sign(
  { id: '5952c302-6998-4804-8121-80a663c81fb5', email: 'luuviet2810@gmail.com', name: 'LƯU VĂN VIỆT', role: 'admin' },
  parsed.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

const res = await fetch('http://localhost:3001/api/vehicles/website-images', {
  headers: { Authorization: `Bearer ${token}` }
});
const json = await res.json();
const imagesByVehicle = {};
for (const img of json.data || []) {
  if (!imagesByVehicle[img.vehicleId]) imagesByVehicle[img.vehicleId] = [];
  imagesByVehicle[img.vehicleId].push(img);
}

for (const v of pvRes.rows) {
  const imgs = imagesByVehicle[v.id] || [];
  const cover = imgs[0];
  console.log(`[${v.id}] ${v.model} - Images: ${imgs.length} | Cover thumb: ${cover?.thumbnail?.substring(0, 70)}... | Cover url: ${cover?.url?.substring(0, 70)}...`);
}

await client.end();
