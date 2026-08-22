const fs = require('fs');
let code = fs.readFileSync('src/pages/VehicleList.tsx', 'utf8');

// Windows line endings: \r\n
const search = '</div>\r\n    </div>\r\n\r\n      {/* Hidden export layout';
const replace = '</div>\r\n\r\n      {/* Hidden export layout';

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('src/pages/VehicleList.tsx', code);
  console.log('Fixed: removed extra </div> before export layout');
} else {
  console.log('Pattern not found. The text has different whitespace.');
  // Show exact text around the pattern
  const idx = code.indexOf('Hidden export layout');
  if (idx >= 0) {
    const before = code.substring(idx - 100, idx);
    console.log('Exact text:', JSON.stringify(before));
    console.log('---');
    console.log(before);
  }
}