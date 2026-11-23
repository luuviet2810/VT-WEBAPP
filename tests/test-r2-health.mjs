import { checkR2Health, getR2Client } from '../gara-bot-server/dist/storage/r2.service.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
if (fs.existsSync('gara-bot-server/.env')) dotenv.config({ path: 'gara-bot-server/.env' });

console.log('--- Checking R2 Health ---');
const health = await checkR2Health();
console.log('R2 Health result:', health);
