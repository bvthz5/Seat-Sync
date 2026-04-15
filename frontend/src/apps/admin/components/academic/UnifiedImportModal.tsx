import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { Upload, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { toast } from '../../../../utils/toast';

interface UnifiedImportModalProps {
    isOpen: boolean;
    onOpenChange: () => void;
    onSuccess: () => void;
}

export const UnifiedImportModal = ({ isOpen, onOpenChange, onSuccess }: UnifiedImportModalProps) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await academicService.downloadUnifiedTemplate();
            toast.success('Template downloaded successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to download template');
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            toast.error('Please select a file first');
            return;
        }

        setImporting(true);
        try {
            const result = await academicService.importUnifiedAcademic(selectedFile);
            toast.success(
                `Successfully imported: ${result.summary.departments} departments, ${result.summary.programs} programs, ${result.summary.subjects} subjects`
            );
            setSelectedFile(null);
            onSuccess();
            onOpenChange();
        } catch (error: any) {
            console.error(error);
            const errorMsg = error.response?.data?.message || 'Failed to import academic data';
            toast.error(errorMsg);
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        onOpenChange();
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={handleClose}
            size="2xl"
            backdrop="blur"
            classNames={{
                wrapper: "z-[999]",
                backdrop: "z-[998] bg-black/50",
                base: "bg-white"
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 border-b pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <FileSpreadsheet className="text-blue-600" size={24} />
                                </div>
                                <span className="text-xl font-bold text-slate-900">
                                    Import Academic Data
                                </span>
                            </div>
                        </ModalHeader>
                        <ModalBody className="py-6">
                            <div className="space-y-6">
                                {/* Info Section */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex gap-2">
                                        <CheckCircle2 className="text-blue-600 flex-shrink-0" size={20} />
                                        <div className="text-sm text-blue-800">
                                            <p className="font-semibold mb-1">Unified Import</p>
                                            <p>Import departments, programs, and subjects from a single Excel file. The system will automatically organize and link the data.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Template Download */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-slate-900">Download Template</p>
                                        <p className="text-sm text-slate-600">Get the Excel template with sample data</p>
                                    </div>
                                    <Button
                                        color="primary"
                                        variant="flat"
                                        startContent={<Download size={18} />}
                                        onPress={handleDownloadTemplate}
                                    >
                                        Download
                                    </Button>
                                </div>

                                {/* File Upload */}
                                <div>
                                    <div className="block text-sm font-medium text-slate-700 mb-2">
                                        Upload Excel File
                                    </div>
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <div className="cursor-pointer">
                                            <Upload className="mx-auto text-slate-400 mb-2" size={40} />
                                            {selectedFile ? (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {(selectedFile.size / 1024).toFixed(2)} KB
                                                    </p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                                                    <p className="text-xs text-slate-500 mt-1">Excel files only (.xlsx, .xls)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expected Format */}
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-sm font-semibold text-slate-900 mb-2">Expected Columns:</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                        <div>• ProgramCode</div>
                                        <div>• ProgramName</div>
                                        <div>• DepartmentCode</div>
                                        <div>• DepartmentName</div>
                                        <div>• SubjectCode</div>
                                        <div>• SubjectName</div>
                                    </div>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter className="border-t pt-4">
                            <Button variant="light" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button
                                color="primary"
                                onPress={handleImport}
                                isLoading={importing}
                                isDisabled={!selectedFile || importing}
                                startContent={!importing && <Upload size={18} />}
                                className="text-white font-semibold"
                            >
                                {importing ? 'Importing...' : 'Import Data'}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
