const fs = require('fs');
const p = require('path');

function walk(d) {
    let list = [];
    fs.readdirSync(d).forEach(f => {
        const sub = p.join(d, f);
        if (fs.statSync(sub).isDirectory()) {
            list = list.concat(walk(sub));
        } else {
            list.push(sub);
        }
    });
    return list;
}

const rx = /(<Input|<Select|<Textarea)(?![^>]*\b(?:name|id)=)/g;

walk('./src').filter(f => f.endsWith('.tsx')).forEach(f => {
    let c = fs.readFileSync(f, 'utf-8');
    if (rx.test(c)) {
        c = c.replace(rx, '$1 name="custom-input" ');
        fs.writeFileSync(f, c);
    }
});