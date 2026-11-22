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
const matches = [];

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/supabase/i.test(line)) {
      matches.push({
        file: path.relative(process.cwd(), f).replace(/\\/g, '/'),
        lineNum: idx + 1,
        line: line.trim(),
      });
    }
  });
}

console.log(`Found ${matches.length} matches in src:`);
const byFile = {};
for (const m of matches) {
  if (!byFile[m.file]) byFile[m.file] = [];
  byFile[m.file].push(m);
}

for (const [f, list] of Object.entries(byFile)) {
  console.log(`\n=== ${f} (${list.length} matches) ===`);
  list.forEach(m => console.log(`  L${m.lineNum}: ${m.line}`));
}
