
const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) results = results.concat(walk(filepath));
        else if (file.endsWith('.tsx') || file.endsWith('.jsx')) results.push(filepath);
    });
    return results;
}
const files = walk('C:/Users/binil/OneDrive/Desktop/Seat-Sync/frontend/src');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const regex = /htmlFor=[\"'']([^\"'']+)[\"'']/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const val = match[1];
        if (content.includes('name=\"' + val + '\"')) {
            console.log(file + ' : ' + val);
        }
    }
});

