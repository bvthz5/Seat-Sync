
const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory() && file !== 'node_modules' && file !== 'dist') {
            results = results.concat(walk(filepath));
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            results.push(filepath);
        }
    });
    return results;
}
const files = walk('C:/Users/binil/OneDrive/Desktop/Seat-Sync/frontend/src');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const regex = /<(input|select|textarea|Input|Select|Textarea)[^>]*name=[\"'']([^\"'']+)[\"''][^>]*>/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const tag = match[0];
        const val = match[2];
        if (!tag.includes('id=')) {
            console.log(file + ' : tag has name=' + val + ' but NO id!');
        }
    }
});

