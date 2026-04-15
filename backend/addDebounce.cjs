const fs = require('fs');
const file = '../frontend/src/apps/admin/components/structure/LayoutConfig.tsx';
let content = fs.readFileSync(file, 'utf-8');

const regex = /const \[isSaved, setIsSaved\] = useState\(true\);\s*const /;
if (!content.includes('useEffect(() => {') && content.includes('const [isSaved')) {
    // Add debounce effect just after isSaved declaration
}
// since the user states "Add debounce", we will inject it after handleSave

if(!content.includes('const debounceSave = setTimeout')) {
    const debounceHook = `
    useEffect(() => {
        if (!isSaved && selectedRoomId) {
            const debounceSave = setTimeout(() => {
                handleSave();
            }, 1000);
            return () => clearTimeout(debounceSave);
        }
    }, [config, isSaved, selectedRoomId]);
    
    // `;
    content = content.replace('const handleSave = async () => {', debounceHook + 'const handleSave = async () => {');
    
    fs.writeFileSync(file, content, 'utf-8');
    console.log('Debounce effect added');
}
