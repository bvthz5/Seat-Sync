
const fs = require("fs");
const path = require("path");
function walk(dir) {
    let results = [];
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory() && file !== "node_modules" && file !== "dist") {
            results = results.concat(walk(filepath));
        } else if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
            results.push(filepath);
        }
    });
    return results;
}
const files = walk("C:/Users/binil/OneDrive/Desktop/Seat-Sync/frontend/src");
let changedCount = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, "utf8");
    let original = content;

    // Matches <label htmlFor="ID" ...>...</label> \s* <Input ... id="ID" ... />
    let regex = /<label\s+htmlFor=(["'])([^"']+)\1([^>]*)>([\s\S]*?)<\/label>\s*<(Input|Select|Textarea)([^>]*?)(id|name)=([\"'])\2\8([^>]*?)(\/?)>/g;
    
    content = content.replace(regex, (match, quote, forVal, labelAttrs, innerHTML, compTag, attr1, idOrNameText, attrQuote, attr2, closing) => {
        // Build the <label> with the component wrapped inside
        return "<label " + labelAttrs + ">" + innerHTML + "\n<" + compTag + attr1 + idOrNameText + "=" + attrQuote + forVal + attrQuote + attr2 + closing + ">" + "\n</label>";
    });

    if (content !== original) {
        console.log("Fixed " + file);
        fs.writeFileSync(file, content, "utf8");
        changedCount++;
    }
});
console.log("Fixed " + changedCount + " files.");

