import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const envPath = path.resolve(process.cwd(), 'gara-bot-server/.env');

if (!fs.existsSync(envPath)) {
  console.error('LỖI: Không tìm thấy file gara-bot-server/.env');
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');

if (content.includes('JWT_SECRET=')) {
  const line = content.split('\n').find(l => l.startsWith('JWT_SECRET='));
  const val = line ? line.split('=')[1]?.trim() : '';
  if (val && val.length >= 32) {
    console.log('XÁC NHẬN: JWT_SECRET đã tồn tại trong gara-bot-server/.env và đạt tiêu chuẩn an toàn (độ dài >= 256 bit). Không ghi đè.');
    process.exit(0);
  }
}

// Sinh secret 256-bit (32 bytes = 64 ký tự hex)
const randomSecret = crypto.randomBytes(32).toString('hex');

const updated = content.trimEnd() + '\n\n# JWT Authentication (256-bit Random Secret)\nJWT_SECRET=' + randomSecret + '\n';
fs.writeFileSync(envPath, updated, 'utf8');

console.log('XÁC NHẬN: JWT_SECRET ngẫu nhiên 256-bit (64 ký tự hex) đã được sinh và ghi an toàn vào gara-bot-server/.env.');
