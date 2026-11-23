import { getR2Client } from '../gara-bot-server/dist/storage/r2.service.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
if (fs.existsSync('gara-bot-server/.env')) dotenv.config({ path: 'gara-bot-server/.env' });

const s3 = getR2Client();
const { ListObjectsV2Command } = await import('../gara-bot-server/node_modules/@aws-sdk/client-s3/dist-cjs/index.js');
const res = await s3.send(new ListObjectsV2Command({
  Bucket: 'vehicle-images',
  MaxKeys: 100,
}));

console.log('R2 Objects in vehicle-images:');
const byPrefix = {};
(res.Contents || []).forEach(c => {
  const parts = c.Key.split('/');
  const prefix = parts.slice(0, 2).join('/');
  if (!byPrefix[prefix]) byPrefix[prefix] = 0;
  byPrefix[prefix]++;
});
console.log('By vehicle prefix:', byPrefix);
