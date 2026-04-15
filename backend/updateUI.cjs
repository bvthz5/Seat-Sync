const fs = require('fs');

const file = '../frontend/src/apps/admin/components/structure/LayoutConfig.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. add isSaved state
if(!content.includes('const [isSaved, setIsSaved] = useState(true)')) {
   content = content.replace('const [loading, setLoading] = useState(false);', 'const [isSaved, setIsSaved] = useState(true);\n    const [loading, setLoading] = useState(false);');
}

// 2. setIsSaved(false) when changing layout
content = content.replace(/handleConfigChange\((.*?)\)\s*\{([\s\S]*?)setConfig\(prev/g, (match, p1, p2) => {
   return `handleConfigChange(${p1}) {${p2}setIsSaved(false);\n        setConfig(prev`;
});
content = content.replace(/handleRowBenchChange\((.*?)\)\s*\{([\s\S]*?)const newLayout/g, (match, p1, p2) => {
   return `handleRowBenchChange(${p1}) {${p2}setIsSaved(false);\n        const newLayout`;
});
content = content.replace(/handleAddRow\((.*?)\)\s*\{([\s\S]*?)const newLayout/g, (match, p1, p2) => {
   return `handleAddRow(${p1}) {${p2}setIsSaved(false);\n        const newLayout`;
});
content = content.replace(/handleRemoveRow\((.*?)\)\s*\{([\s\S]*?)const newLayout/g, (match, p1, p2) => {
   return `handleRemoveRow(${p1}) {${p2}setIsSaved(false);\n        const newLayout`;
});

// 3. Set capacity logic
content = content.replace(/if \(capacityCount > room\.Capacity\)\s*\{\s*toast\.error[^}]+\};\s*return;\s*\}/, '');

content = content.replace(/const isLayoutSame(.*?)seatsPerBench;/g, `const isLayoutSame = false;`); // force updates

content = content.replace(/toast\.success\("Room layout updated successfully"\);\s+fetchRoomData/, 'toast.success("Room layout updated successfully");\n            setIsSaved(true);\n            fetchRoomData');

// 4. capacityCount update UI
content = content.replace(/<span className="text-\[10px\] text-slate-400">Max:[^<]+<\/span>/, '<span className="text-[10px] text-slate-400">Calculated</span>');

// 5. btn replace
content = content.replace(/<Button color="primary"\n\s+isLoading=\{loading\} isDisabled=\{!isDirty \|\| capacityCount === 0\} onPress=\{handleSave\} startContent=\{<Save size=\{18\} \/>\}>Save<\/Button>/g, 
`<Button color={isSaved ? "success" : "primary"} isLoading={loading} isDisabled={!isDirty || capacityCount === 0} onPress={handleSave} startContent={<Save size={18} />}>{isSaved ? "Saved \u2713" : "Save"}</Button>`);
content = content.replace(/<Button color="primary"\s+isLoading=\{loading\} isDisabled=\{!isDirty \|\| capacityCount === 0\}\s+onPress=\{handleSave\} startContent=\{<Save size=\{18\} \/>\}>Save<\/Button>/g, 
`<Button className={!isSaved ? "animate-pulse" : ""} color={isSaved ? "success" : "primary"} isLoading={loading} isDisabled={!isDirty || capacityCount === 0} onPress={handleSave} startContent={!isSaved ? <Save size={18} /> : null}>{isSaved ? "Saved \u2713" : "Save"}</Button>`);

fs.writeFileSync(file, content, 'utf-8');
console.log('LayoutConfig updated successfully');
