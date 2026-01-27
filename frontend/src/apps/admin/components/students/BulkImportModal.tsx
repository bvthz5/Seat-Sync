import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Progress } from '@heroui/react';
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import api from '../../../../services/api';
import { toast } from 'react-hot-toast';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [summary, setSummary] = useState<{ success: number; errors: string[] } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadStatus('idle');
            setSummary(null);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setUploadStatus('idle');
        setSummary(null);
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/students/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSummary({
                success: response.data.successCount,
                errors: response.data.errors || []
            });
            setUploadStatus('success');
            toast.success('Import process completed');
            if (response.data.successCount > 0) {
                onSuccess();
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            setUploadStatus('error');
            toast.error(error.response?.data?.message || 'Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setUploadStatus('idle');
        setSummary(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={reset}
            size="2xl"
            backdrop="blur"
            classNames={{
                base: "bg-white  border border-gray-100  shadow-2xl rounded-2xl",
                header: "border-b border-gray-100  p-6",
                footer: "bg-gray-50/50  border-t border-gray-100  p-4"
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-row gap-4 items-start">
                    <div className="p-3 bg-gray-100  rounded-xl text-gray-600 ">
                        <FileSpreadsheet size={24} strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xl font-semibold text-gray-900  tracking-tight">Import Students</span>
                        <span className="text-sm font-medium text-gray-500 ">Upload an Excel file to bulk add student records.</span>
                    </div>
                </ModalHeader>
                <ModalBody className="p-6">
                    <div className="flex flex-col gap-6">
                        {/* File Selection State */}
                        {!file ? (
                            <div className="relative group border-2 border-dashed border-gray-200  hover:border-gray-400  rounded-xl p-10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer bg-gray-50/30  hover:bg-white ">
                                <div className="p-4 bg-white  rounded-full shadow-sm border border-gray-100 ">
                                    <Upload className="text-gray-400 " size={28} strokeWidth={1.5} />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-gray-700  text-lg">
                                        <span className="text-primary font-semibold hover:underline">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">.xlsx or .xls files (max 5MB)</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                />
                            </div>
                        ) : (
                            // File Selected View
                            <div className="border border-gray-200  rounded-xl p-4 bg-white  shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-50  text-green-600  rounded-lg">
                                        <FileSpreadsheet size={24} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900 ">{file.name}</span>
                                        <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB • Ready to import</span>
                                    </div>
                                </div>
                                {!isUploading && uploadStatus !== 'success' && (
                                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={handleRemoveFile} className="opacity-50 group-hover:opacity-100">
                                        <X size={18} />
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Progress */}
                        {isUploading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium text-gray-500">
                                    <span>Processing file...</span>
                                    <span>{Math.round(Math.random() * 30 + 10)}%</span>
                                </div>
                                <Progress size="sm" isIndeterminate color="primary" className="w-full" />
                            </div>
                        )}

                        {/* Import Summary Report */}
                        {uploadStatus === 'success' && summary && (
                            <div className="bg-emerald-50/50  border border-emerald-100  rounded-xl p-5 fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-3 text-emerald-800  font-semibold text-lg mb-1">
                                    <CheckCircle size={20} className="fill-emerald-100  text-emerald-600 " />
                                    Import Complete
                                </div>
                                <p className="text-gray-600  ml-8 text-sm">
                                    Successfully processed data from <span className="font-medium text-gray-900 ">{file?.name}</span>.
                                </p>
                                <div className="ml-8 mt-3 flex gap-4 text-sm">
                                    <div className="px-3 py-1 bg-white  border border-emerald-200  rounded-md text-emerald-700  font-medium shadow-sm">
                                        {summary.success} Students Added
                                    </div>
                                    {summary.errors.length > 0 && (
                                        <div className="px-3 py-1 bg-white  border border-red-200  rounded-md text-red-600  font-medium shadow-sm">
                                            {summary.errors.length} Errors Found
                                        </div>
                                    )}
                                </div>

                                {summary.errors.length > 0 && (
                                    <div className="ml-8 mt-4">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Error Log</p>
                                        <div className="bg-white  border border-gray-200  rounded-lg p-3 max-h-40 overflow-y-auto custom-scrollbar">
                                            <ul className="text-xs text-red-500 space-y-1.5">
                                                {summary.errors.map((err, idx) => (
                                                    <li key={idx} className="flex gap-2 items-start">
                                                        <span className="select-none mt-0.5">•</span>
                                                        <span className="leading-relaxed">{err}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter className="flex justify-end items-center bg-gray-50/50">
                    <div className="flex gap-3">
                        <Button variant="light" color="default" onPress={reset} isDisabled={isUploading} className="font-medium text-gray-600">
                            Cancel
                        </Button>
                        <Button
                            color="primary"
                            className="bg-gray-900  text-white  font-medium px-6 shadow-md shadow-gray-200 "
                            onPress={handleUpload}
                            isLoading={isUploading}
                            isDisabled={!file || uploadStatus === 'success'}
                            startContent={!isUploading && <Upload size={18} />}
                        >
                            Import Students
                        </Button>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
