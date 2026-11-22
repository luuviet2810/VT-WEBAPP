import fs from 'fs';
import path from 'path';

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        scanDir(fullPath, fileList);
      }
    } else if (/\.(tsx?|jsx?)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = scanDir(path.resolve('src'));
const targetModules = [
  'lib/supabase',
  'services/realtime.service',
  'services/storage.service',
  'services/vehicleMedia.service',
  'services/vehicleOption.service',
  'services/vehicleWorkflow.service',
  'services/websiteSettings.service',
  'services/notification.service',
  'services/locationService',
  'public/publicApi',
  'services/publicWeb.service'
];

for (const tm of targetModules) {
  const base = path.basename(tm);
  const importers = [];
  for (const f of allFiles) {
    const rel = path.relative(process.cwd(), f).replace(/\\/g, '/');
    if (rel.includes(tm)) continue;
    const content = fs.readFileSync(f, 'utf-8');
    if (content.includes(base) || content.includes(tm)) {
      importers.push(rel);
    }
  }
  console.log(`\nModule: ${tm} is imported by:`);
  importers.forEach(imp => console.log(`  -> ${imp}`));
}
