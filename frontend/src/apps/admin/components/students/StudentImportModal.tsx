import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info, Hash } from 'lucide-react';
import academicService from '../../services/academicService';
import toast from 'react-hot-toast';
import { Button } from '@heroui/react';

interface StudentImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isInternal?: boolean;
    internalExamId?: number;
}

import { InternalStudentService } from '../../services/internalStudentService';

const StudentImportModal: React.FC<StudentImportModalProps> = ({ isOpen, onClose, onSuccess, isInternal = false, internalExamId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadStats, setUploadStats] = useState<{ success: number; errors: number; active: boolean; errorList?: Array<any> }>({
        success: 0,
        errors: 0,
        active: false,
        errorList: []
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadStats({ ...uploadStats, active: false });
            setProgress(0);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setUploadStats({ success: 0, errors: 0, active: false, errorList: [] });
            setProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [isOpen]);

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setProgress(10);
        
        // Progress bar simulation
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                const step = Math.random() * 15;
                return prev + step < 90 ? prev + step : prev;
            });
        }, 500);

        try {
            let response;
            if (isInternal) {
                response = await InternalStudentService.importStudents(file, internalExamId as any);
            } else {
                response = await academicService.importStudents(file);
            }
            clearInterval(progressInterval);
            setProgress(100);
            
            const errorCount = response.failedCount || response.errorCount || 0;
            
            setUploadStats({
                success: response.successCount || 0,
                errors: errorCount,
                active: true,
                errorList: response.errors || []
            });

            if (errorCount === 0) {
                toast.success(`Successfully imported ${response.successCount} students!`);
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            } else {
                toast.error(`Imported ${response.successCount} students with ${errorCount} errors.`);
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (error: any) {
            clearInterval(progressInterval);
            setProgress(0);
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
                            <p className="text-gray-500 text-sm mt-1">Bulk upload students via Excel or CSV</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="p-8 space-y-8 overflow-y-auto">
                        
                    {uploadStats.active && (
                        <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold mb-4">Import Results</h3>
                            <div className="flex gap-4 mb-4">
                                <div className="bg-green-50 p-4 rounded-lg flex-1">
                                    <p className="text-sm text-green-600 font-semibold">✔ Imported</p>
                                    <p className="text-2xl font-bold text-green-700">{uploadStats.success}</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg flex-1">
                                    <p className="text-sm text-red-600 font-semibold">✖ Failed</p>
                                    <p className="text-2xl font-bold text-red-700">{uploadStats.errors}</p>
                                </div>
                            </div>
                            {uploadStats.errors > 0 && uploadStats.errorList && uploadStats.errorList.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <p className="text-sm text-red-800 font-bold mb-2">Error List:</p>
                                    <ul className="list-disc list-inside text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                                        {uploadStats.errorList.map((e: any, i: number) => (
                                            <li key={i}>Row {e.row}: {e.reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

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
                            onClick={() => {
                                if (fileInputRef.current) {
                                    fileInputRef.current.click();
                                }
                            }}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                name="fileUpload"
                                aria-label="Upload Excel File"
                                className="hidden"
                                accept=".xlsx, .xls, .csv"
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
                                    <h3 className="text-gray-900 font-bold text-lg">Click to Upload Excel or CSV</h3>
                                    <p className="text-gray-400 text-sm mt-1">or drag and drop file here</p>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        {isUploading && (
                            <div className="mt-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700">Uploading and Parsing...</span>
                                    <span className="text-sm font-bold text-blue-600">{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <motion.div 
                                        className="bg-blue-600 h-2.5 rounded-full" 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ ease: "easeOut", duration: 0.5 }}
                                    ></motion.div>
                                </div>
                            </div>
                        )}

                        {/* Formatting Guide */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <h4 className="text-blue-900 text-base font-semibold mb-3 flex items-center gap-2">
  <Info className="w-4 h-4 text-blue-500" /> Expected File Columns
</h4>
<div className="grid grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-2">
  <ul className="space-y-2 text-sm text-blue-900/80 font-medium">
    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-600 rounded-full"></div>Name</li>
    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-600 rounded-full"></div>Register Number</li>
    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-600 rounded-full"></div>Email</li>
  </ul>
  <ul className="space-y-2 text-sm text-blue-900/80 font-medium">
    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-600 rounded-full"></div>Program</li>
    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-600 rounded-full"></div>Semester</li>
    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-600 rounded-full"></div>Batch</li>
  </ul>
  <ul className="space-y-2 text-sm text-blue-900/80 font-medium">
    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-600 rounded-full"></div>Department</li>
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
