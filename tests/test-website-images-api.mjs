import jwt from '../gara-bot-server/node_modules/jsonwebtoken/index.js';
import dotenv from 'dotenv';
import fs from 'fs';

const parsed = dotenv.parse(fs.readFileSync('gara-bot-server/.env'));
const token = jwt.sign(
  { id: '5952c302-6998-4804-8121-80a663c81fb5', email: 'luuviet2810@gmail.com', name: 'LƯU VĂN VIỆT', role: 'admin' },
  parsed.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

const res = await fetch('http://localhost:3001/api/vehicles/website-images', {
  headers: { Authorization: `Bearer ${token}` }
});

const json = await res.json();
console.log('API /api/vehicles/website-images status:', res.status);
console.log('Images count:', json.data?.length);
const sample0123 = json.data?.filter(img => img.vehicleId === '74cd5ba2-3c93-4148-9748-c3de2a10afa5');
console.log('Sample 0123 images from API:', sample0123?.slice(0, 2));

const sampleLegacy = json.data?.filter(img => img.url?.includes('supabase.co'));
console.log('Sample legacy images count:', sampleLegacy?.length);
console.log('Sample legacy item:', sampleLegacy?.[0]);
