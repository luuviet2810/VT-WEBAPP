import sharp from 'sharp';
import { execSync } from 'child_process';

async function compare() {
  const prevBuf = execSync('git show 2c13ca1:src/assets/logo-vtauto.png', { maxBuffer: 50 * 1024 * 1024 });
  const prevTrimmed = await sharp(prevBuf).trim().toBuffer({ resolveWithObject: true });
  console.log('2c13ca1 trimmed:', prevTrimmed.info);

  const curTrimmed = await sharp('src/assets/logo-vtauto.png').trim().toBuffer({ resolveWithObject: true });
  console.log('Current trimmed:', curTrimmed.info);

  // Ratio comparison
  console.log('2c13ca1 trimmed ratio:', (prevTrimmed.info.width / prevTrimmed.info.height).toFixed(4));
  console.log('Current trimmed ratio:', (curTrimmed.info.width / curTrimmed.info.height).toFixed(4));
}
compare().catch(console.error);
