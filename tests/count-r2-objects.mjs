import { getR2Client } from '../gara-bot-server/dist/storage/r2.service.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
if (fs.existsSync('gara-bot-server/.env')) dotenv.config({ path: 'gara-bot-server/.env' });

const s3 = getR2Client();
let totalObjects = 0;
let continuationToken = undefined;

do {
  const { ListObjectsV2Command } = await import('../gara-bot-server/node_modules/@aws-sdk/client-s3/dist-cjs/index.js');
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: 'vehicle-images',
    ContinuationToken: continuationToken,
    MaxKeys: 1000,
  }));
  totalObjects += (res.Contents || []).length;
  continuationToken = res.NextContinuationToken;
} while (continuationToken);

console.log('Total objects in R2 vehicle-images bucket:', totalObjects);
