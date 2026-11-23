import sharp from 'sharp';
import fs from 'fs';
import { execSync } from 'child_process';

async function checkPrev() {
  const buf = execSync('git show 2c13ca1:src/assets/logo-vtauto.png', { maxBuffer: 50 * 1024 * 1024 });
  const meta = await sharp(buf).metadata();
  console.log('2c13ca1 metadata:', meta);
  
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let a0 = 0, aSemi = 0, a255 = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i+3];
    if (a === 0) a0++;
    else if (a < 255) aSemi++;
    else a255++;
  }
  const total = info.width * info.height;
  console.log(`2c13ca1: Total=${total}, a0=${a0} (${((a0/total)*100).toFixed(2)}%), aSemi=${aSemi} (${((aSemi/total)*100).toFixed(2)}%), a255=${a255} (${((a255/total)*100).toFixed(2)}%)`);
}
checkPrev().catch(console.error);
