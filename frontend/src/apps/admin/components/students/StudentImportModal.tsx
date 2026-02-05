import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info, Hash } from 'lucide-react';
import academicService from '../../services/academicService';
import toast from 'react-hot-toast';
import { Button } from '@heroui/react';

interface StudentImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const StudentImportModal: React.FC<StudentImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState<{ success: number; errors: number; active: boolean }>({
        success: 0,
        errors: 0,
        active: false
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadStats({ ...uploadStats, active: false });
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        try {
            const response = await academicService.importStudents(file);
            setUploadStats({
                success: response.successCount,
                errors: response.errorCount,
                active: true
            });

            if (response.errorCount === 0) {
                toast.success(`Successfully imported ${response.successCount} students!`);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            } else {
                toast.error(`Imported ${response.successCount} students with ${response.errorCount} errors.`);
            }
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.message || "Failed to upload file. Please check the format.";
            toast.error(errorMessage);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white border border-gray-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                Import Students
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">Bulk upload students via Excel</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="p-8 space-y-8 overflow-y-auto">

                        {/* Smart Features Info */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Hash className="w-24 h-24 text-blue-600" />
                            </div>
                            <h3 className="text-blue-700 font-bold flex items-center gap-2 mb-3">
                                <Info className="w-4 h-4" /> Smart Import Enabled
                            </h3>
                            <p className="text-blue-900/80 text-sm leading-relaxed">
                                The system automatically detects <strong>Batch Year</strong>, <strong>Department</strong>, and <strong>Program</strong> from the Register Number (e.g., <code className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700 font-mono font-bold">SJC24MCA2058</code>).
                            </p>
                            <div className="mt-4 flex gap-4 text-xs text-blue-800/70 font-medium">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Auto-Detects Year
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Auto-Detects Department
                                </div>
                            </div>
                        </div>

                        {/* File Upload Area */}
                        <div className={`
              border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all group cursor-pointer
              ${file ? 'border-green-500/30 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'}
            `}
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                            />

                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${file ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                {file ? <FileSpreadsheet className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                            </div>

                            {file ? (
                                <div>
                                    <h3 className="text-gray-900 font-bold text-lg">{file.name}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB • Ready to upload</p>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-gray-900 font-bold text-lg">Click to Upload Excel</h3>
                                    <p className="text-gray-400 text-sm mt-1">or drag and drop file here</p>
                                </div>
                            )}
                        </div>

                        {/* Formatting Guide */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <h4 className="text-gray-700 text-sm font-bold mb-3">Required Columns</h4>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                <ul className="space-y-2 text-xs text-gray-500">
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>Register Number</li>
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>Name</li>
                                </ul>
                                <ul className="space-y-2 text-xs text-gray-500">
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>Program</li>
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>Semester</li>
                                </ul>
                            </div>
                        </div>

                        {/* Results */}
                        {uploadStats.active && (
                            <div className={`p-4 rounded-xl flex items-start gap-3 ${uploadStats.errors > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                                {uploadStats.errors > 0 ? <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" /> : <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />}
                                <div>
                                    <h4 className={`font-medium ${uploadStats.errors > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                                        {uploadStats.errors > 0 ? 'Import Completed with Issues' : 'Import Successful'}
                                    </h4>
                                    <p className="text-gray-600 text-sm mt-1">
                                        Injected <strong>{uploadStats.success}</strong> students successfully.
                                        {uploadStats.errors > 0 && ` Failed to import ${uploadStats.errors} rows.`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <Button variant="light" onPress={onClose} className="text-gray-600 font-medium">
                            Cancel
                        </Button>
                        <Button
                            onPress={handleUpload}
                            isLoading={isUploading}
                            isDisabled={!file}
                            className={`bg-gray-900 text-white shadow-lg border-0 font-medium ${!file ? 'opacity-50' : 'hover:scale-[1.02]'}`}
                        >
                            Start Import
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default StudentImportModal;
