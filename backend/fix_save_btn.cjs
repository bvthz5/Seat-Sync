const fs = require('fs');
let c = fs.readFileSync('../frontend/src/apps/admin/components/structure/LayoutConfig.tsx', 'utf8');
c = c.replace(/<Button color=\{isSaved \? "success" : "primary"\} className=\{!isSaved \? "animate-pulse" : ""\}([\s\S]*?)>([\s\S]*?)<\/Button>/, '<Button color={isSaved ? "success" : "primary"} className={!isSaved ? "animate-pulse" : ""} isLoading={loading} isDisabled={!isDirty || capacityCount === 0} onPress={handleSave} startContent={!isSaved ? <Save size={18} /> : null}>{isSaved ? "Saved \u2713" : "Save"}</Button>');
fs.writeFileSync('../frontend/src/apps/admin/components/structure/LayoutConfig.tsx', c);
console.log('Done');
