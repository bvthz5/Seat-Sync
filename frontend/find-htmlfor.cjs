const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const fileLines = execSync('dir /B /S *.tsx', { encoding: 'utf-8' }).split('\r\n').filter(l => l.trim().length > 0);
  
  for (const file of fileLines) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const regex = /htmlFor="([^"]+)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const targetId = match[1];
      if (!content.includes(`id="${targetId}"`) && !content.includes(`id={'${targetId}'}`)) {
        console.log(`[Missing ID] '${targetId}' in ${file}`);
      }
    }
  }
} catch (e) {
    console.error(e.message);
}