const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const fileLines = execSync('dir /B /S *.tsx', { encoding: 'utf-8' }).split('\r\n').filter(l => l.trim().length > 0);
  
  for (const file of fileLines) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    
    const original = content;
    // Remove htmlFor="something"
    content = content.replace(/htmlFor="[^"]+"/g, '');
    // Remove htmlFor={something}
    content = content.replace(/htmlFor=\{[^}]+\}/g, '');
    
    // Clean up multiple spaces left behind if any like <label  className
    content = content.replace(/<label\s+class/g, '<label class');
    content = content.replace(/<label\s+>/g, '<label>');
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed labels in: ' + file);
    }
  }
} catch (e) {
    console.error(e.message);
}