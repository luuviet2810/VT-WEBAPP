import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from both local directory and project root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '../.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  database: {
    url: process.env.DATABASE_URL || '',
    urlUnpooled: process.env.DATABASE_URL_UNPOOLED || '',
    maxConnections: Number(process.env.DB_MAX_CONNECTIONS || 20),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'vtauto-backend-jwt-secret-key-change-in-prod-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '80e789d50d0c2f3b097ab46200987613',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    endpoint: process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : 'https://80e789d50d0c2f3b097ab46200987613.r2.cloudflarestorage.com'),
    buckets: {
      images: process.env.R2_BUCKET_IMAGES || 'vehicle-images',
      documents: process.env.R2_BUCKET_DOCUMENTS || 'vehicle-documents',
      photos: process.env.R2_BUCKET_PHOTOS || 'checksheet-photos',
    },
    presignedUrlExpiresIn: Number(process.env.R2_PRESIGNED_EXPIRES_IN || 900), // 15 minutes
  },
};
