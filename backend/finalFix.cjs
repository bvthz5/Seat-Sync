const fs = require('fs');
const file = '../frontend/src/apps/admin/components/structure/LayoutConfig.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Inject setIsSaved(false) when layout gets changed
content = content.replace(/const handleConfigChange = \(key.*?\) => \{([\s\S]*?)setConfig\(prev/g, 'const handleConfigChange = (key: keyof typeof config, value: any) => {\n$1setIsSaved(false);\n        setConfig(prev');

content = content.replace(/const handleRowBenchChange = \(index.*?\) => \{([\s\S]*?)const newLayout/g, 'const handleRowBenchChange = (index: number, benches: number) => {\n$1setIsSaved(false);\n        const newLayout');

content = content.replace(/const handleAddRow = \(\) => \{([\s\S]*?)const newLayout/g, 'const handleAddRow = () => {\n$1setIsSaved(false);\n        const newLayout');

content = content.replace(/const handleRemoveRow = \(\) => \{([\s\S]*?)const newLayout/g, 'const handleRemoveRow = () => {\n$1setIsSaved(false);\n        const newLayout');

content = content.replace(/<span className="text-\[10px\] text-slate-400">Max:[^<]+<\/span>/, '<span className="text-[10px] text-slate-400">Calculated</span>');


// Validate step 9 logic in handleSave
if (!content.includes('throw new Error("Capacity mismatch")') && !content.includes('Capacity mismatch')) {
   const validationAdd = `
        const calculatedCapacity = config.rowLayout.reduce((acc, curr) => acc + (curr * config.seatsPerBench), 0);
        if (capacityCount !== calculatedCapacity) {
             toast.error("Capacity mismatch");
             return;
        }
   `;
   content = content.replace('setLoading(true);', validationAdd + 'setLoading(true);');
}

fs.writeFileSync(file, content, 'utf-8');
console.log('Final frontend fixes applied');
