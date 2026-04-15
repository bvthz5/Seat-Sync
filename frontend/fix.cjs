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

walk('./src').filter(f => f.endsWith('.tsx')).forEach(f => {
    let c = fs.readFileSync(f, 'utf-8');
    let changed = false;
    if (c.includes('<Select name="custom-input" Item')) {
        c = c.replace(/<Select name="custom-input" Item/g, '<SelectItem');
        changed = true;
    }
    if (c.includes('<Input name="custom-input" FieldProps')) {
        c = c.replace(/<Input name="custom-input" FieldProps/g, '<InputFieldProps');
        changed = true;
    }
    if (changed) fs.writeFileSync(f, c);
});
