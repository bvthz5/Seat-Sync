const fs = require('fs');
const file = '../frontend/src/apps/admin/components/structure/LayoutConfig.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Ensure setIsSaved(false) is in handleBenchCountChange
if (!content.includes('setIsSaved(false)') || content.includes('const handleBenchCountChange = (index: number, value: number) => {\n        const newLayout')) {
    content = content.replace(/const handleBenchCountChange = \(index: number, value: number\) => \{/, 'const handleBenchCountChange = (index: number, value: number) => {\n        setIsSaved(false);');
    content = content.replace(/const handleAddRow = \(\) => \{/, 'const handleAddRow = () => {\n        setIsSaved(false);');
    content = content.replace(/setConfig\(prev/, 'setIsSaved(false);\n        setConfig(prev'); // for handleConfigChange
}

fs.writeFileSync(file, content, 'utf-8');
console.log('Finished UI triggers');
