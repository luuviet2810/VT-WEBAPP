import { headObject, getR2Client } from '../gara-bot-server/dist/storage/r2.service.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
if (fs.existsSync('gara-bot-server/.env')) dotenv.config({ path: 'gara-bot-server/.env' });

console.log('--- Checking R2 for legacy images ---');
const testPath = 'vehicles/d0d1ad64-9a94-412b-8195-623f077cc05e/1794801614967_818855668_28575079548794503_877579207163.jpg';
try {
  const res = await headObject('images', testPath);
  console.log('Head object for legacy path in R2:', res);
} catch (e) {
  console.log('Test legacy path not found in R2:', e.name, e.message);
}
