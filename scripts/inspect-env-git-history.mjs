import { execSync } from 'child_process';

const commits = ['4e49903', '5d7c7c5', 'a58e314', 'ab088e6', 'c1d5533', '1159149'];
const files = ['.env', '.env.publicweb', 'gara-bot-server/.env'];

console.log('=== RÀ SOÁT BIẾN MÔI TRƯỜNG TRONG LỊCH SỬ COMMIT ===\n');

for (const commit of commits) {
  console.log(`Commit: ${commit}`);
  try {
    const logInfo = execSync(`git log -1 --pretty=format:"%h - %an (%ad): %s" ${commit}`).toString().trim();
    console.log(`Thông tin: ${logInfo}`);
  } catch {}

  for (const file of files) {
    try {
      const show = execSync(`git show ${commit}:${file}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const lines = show.split('\n');
      const varNames = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const varName = trimmed.split('=')[0].trim();
          if (varName && !varNames.includes(varName)) {
            varNames.push(varName);
          }
        }
      }
      if (varNames.length > 0) {
        console.log(`  File [${file}] có các biến: ${varNames.join(', ')}`);
      }
    } catch {
      // File didn't exist in this commit
    }
  }
  console.log('');
}
