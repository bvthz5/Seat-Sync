
const fs = require('fs');
let c = fs.readFileSync('../frontend/src/apps/admin/components/structure/StructureImport.tsx', 'utf8');

const uploadSrc = \
    const handleUpload = async (onClose: () => void) => {
        if (!file || errors.length > 0) return;

        setLoading(true);
        setUploadProgress(0);
        setImportStatus('Uploading layout...');

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += (currentProgress < 30) ? 5 : (currentProgress < 75) ? 2 : 1;
            if (currentProgress > 95) currentProgress = 95;
            setUploadProgress(currentProgress);

            if (currentProgress < 30) setImportStatus('Parsing spreadsheet data...');
            else if (currentProgress < 75) setImportStatus('Building row metrics & capacities...');
            else setImportStatus('Generating physical seats and zones. This may take a minute...');
        }, 400);

        try {
            const result = await structureService.importStructure(file, { autoZone, zoneCount });
            
            clearInterval(interval);
            setUploadProgress(100);
            setImportStatus('Import complete! Finalizing...');
            
            let msg = \\\\\Import successful! Added \\\ Blocks, \\\ Floors, \\\ Rooms.\\\\\;
            if (result.roomsUpdated) msg += \\\\\ Updated \\\ Rooms.\\\\\;
            
            setTimeout(() => {
                toast.success(msg);
                if (onChange) onChange();
                onClose();
                setFile(null);
                setPreviewData([]);
                setLoading(false);
            }, 800);
        } catch (error: any) {
            clearInterval(interval);
            toast.error(error.response?.data?.message || 'Import failed');
            setLoading(false);
        }
    };
\;

c = c.replace(/const handleUpload = async \\(onClose: \\(\\) => void\\) => {[\\s\\S]*?  \\};/, uploadSrc.trim());
fs.writeFileSync('../frontend/src/apps/admin/components/structure/StructureImport.tsx', c);
console.log('done handleUpload');

