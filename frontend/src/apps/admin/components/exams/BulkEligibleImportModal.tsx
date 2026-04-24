import React, { useState, useRef, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Progress } from '@heroui/react';
import { Upload, X, CheckCircle, AlertTriangle, XCircle, FileSpreadsheet, Info, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ExamService } from '../../services/examService';

interface BulkEligibleImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    date?: string;
    onSuccess: () => void;
}

const BulkEligibleImportModal: React.FC<BulkEligibleImportModalProps> = ({ isOpen, onClose, date, onSuccess }) => {
    const [selectedDate, setSelectedDate] = useState<string>(date || '');
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).filter(
                file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
            );
            
            if (newFiles.length !== e.target.files.length) {
                toast.error('Only Excel/CSV files are allowed');
            }
            
            setFiles(prev => [...prev, ...newFiles]);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleImport = async () => {
        if (!selectedDate) {
            toast.error('Please select a date');
            return;
        }
        if (files.length === 0) {
            toast.error('Please select at least one file');
            return;
        }

        setIsUploading(true);
        setProgress(0);
        
        // Simulate processing progress
        progressIntervalRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return prev;
                // Start fast, then slow down
                const increment = prev < 40 ? 15 : prev < 70 ? 8 : prev < 90 ? 3 : 1;
                return prev + increment;
            });
        }, 400);

        try {
            const response = await ExamService.bulkImportEligibility(selectedDate, files);
            
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setProgress(100);
            
            // Wait a tiny bit for the 100% animation to show before displaying results
            setTimeout(() => {
                onSuccess();

                const hasErrors = response.errors && response.errors.length > 0;
                const hasSkipped = response.skipped && response.skipped.length > 0;

                if (hasErrors || hasSkipped) {
                    setResult(response);
                    if (response.success && response.success.length > 0) {
                        toast.success(`Successfully imported ${response.success.length} files`);
                    }
                    toast.error('Some files could not be imported. Please check the summary.');
                    setIsUploading(false);
                } else {
                    toast.success(`Successfully imported ${response.success.length} files`);
                    
                    // If 100% successful, hold the green completion screen for 1 second, then auto-close
                    setTimeout(() => {
                        setIsUploading(false);
                        setFiles([]);
                        setResult(null);
                        setProgress(0);
                        if (!date) setSelectedDate('');
                        onClose();
                    }, 1000);
                }
            }, 400);

        } catch (error: any) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            console.error('Bulk import failed', error);
            toast.error(error.response?.data?.message || 'Failed to bulk import eligibility');
            setIsUploading(false);
            setProgress(0);
        }
    };

    const resetAndClose = () => {
        if (isUploading) return;
        setFiles([]);
        setResult(null);
        setProgress(0);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (!date) setSelectedDate('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={resetAndClose} isDismissable={!isUploading} hideCloseButton={isUploading} size="4xl" scrollBehavior="inside" className="bg-white rounded-[32px] overflow-hidden">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50/50 p-6 sm:px-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50 shadow-sm">
                                    <Upload size={24} className="stroke-[2.5]" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Bulk Import Eligibility</h2>
                                    <p className="text-slate-500 text-sm mt-1 font-medium">
                                        Upload multiple Excel files to auto-map and import students to exams{date ? ` on ${new Date(date).toLocaleDateString()}` : ''}.
                                    </p>
                                </div>
                            </div>
                        </ModalHeader>
                        
                        <ModalBody className="p-6 sm:px-8 bg-slate-50/30 relative">
                            {isUploading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 rounded-b-[32px]">
                                    <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100 max-w-md w-full flex flex-col items-center text-center">
                                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner relative">
                                            <Loader2 size={32} className="text-indigo-600 animate-spin" />
                                            {progress === 100 && (
                                                <div className="absolute inset-0 bg-green-500 rounded-2xl flex items-center justify-center animate-in fade-in duration-300">
                                                    <CheckCircle size={32} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-2">
                                            {progress === 100 ? 'Import Complete!' : 'Processing Files...'}
                                        </h3>
                                        <p className="text-slate-500 font-medium text-sm mb-8">
                                            {progress === 100 
                                                ? 'Generating summary report' 
                                                : `Mapping ${files.length} file${files.length > 1 ? 's' : ''} to exam database`}
                                        </p>
                                        
                                        <div className="w-full space-y-2">
                                            <div className="flex justify-between text-xs font-bold text-slate-600">
                                                <span>Progress</span>
                                                <span className="text-indigo-600">{Math.round(progress)}%</span>
                                            </div>
                                            <Progress 
                                                aria-label="Import Progress" 
                                                value={progress} 
                                                className="w-full h-3"
                                                color={progress === 100 ? "success" : "primary"}
                                                radius="full"
                                                classNames={{
                                                    indicator: "transition-all duration-300 ease-out"
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!result ? (
                                <div className="space-y-6">
                                    {!date && (
                                        <div className="bg-white rounded-[24px] border border-slate-200/60 p-6 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">1. Select Date</h3>
                                            <input 
                                                type="date" 
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                className="w-full sm:w-64 h-12 px-4 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-colors bg-white hover:border-slate-300"
                                            />
                                        </div>
                                    )}

                                    <div className="bg-white rounded-[24px] border border-slate-200/60 p-6 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex justify-between items-center">
                                            <span>{!date ? '2' : '1'}. Upload Files</span>
                                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{files.length} selected</span>
                                        </h3>
                                        
                                        <div 
                                            className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 text-center cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-400 transition-all group relative overflow-hidden"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handleFileSelect} 
                                                className="hidden" 
                                                accept=".xlsx,.xls,.csv" 
                                                multiple
                                            />
                                            <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                <FileSpreadsheet size={28} className="text-indigo-500 stroke-[2.5]" />
                                            </div>
                                            <p className="font-bold text-slate-700 text-lg mb-1">Click to browse or drag files here</p>
                                            <p className="text-slate-400 font-medium text-sm">Support for multiple .xlsx, .xls, .csv files</p>
                                        </div>

                                        {files.length > 0 && (
                                            <div className="mt-6 space-y-3">
                                                {files.map((file, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 group hover:bg-white hover:border-slate-300 transition-all">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                                                <FileSpreadsheet size={16} className="stroke-[2.5]" />
                                                            </div>
                                                            <span className="font-semibold text-slate-700 truncate text-sm">{file.name}</span>
                                                        </div>
                                                        <Button 
                                                            isIconOnly 
                                                            size="sm" 
                                                            variant="light" 
                                                            color="danger" 
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onPress={() => removeFile(idx)}
                                                        >
                                                            <X size={16} className="stroke-[3]" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="bg-blue-50/80 border border-blue-100 rounded-[20px] p-5">
                                        <div className="flex gap-3">
                                            <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-bold text-blue-900 text-sm mb-1">How auto-mapping works</h4>
                                                <p className="text-blue-700/80 text-xs font-medium leading-relaxed">
                                                    The system parses the subject name from the file name (e.g., <strong>EligibleList-COMPUTER NETWORKS.xlsx</strong> maps to <strong>Computer Networks</strong>). 
                                                    It strictly checks if the departments of the students inside match the exam's designated departments. Any mismatch or ambiguity will safely reject the file to prevent mixing data.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-[24px] border border-slate-200/60 p-6 shadow-sm">
                                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                            Result Summary
                                        </h3>
                                        
                                        <div className="space-y-8">
                                            {result.success && result.success.length > 0 && (
                                                <div>
                                                    <h4 className="flex items-center gap-2 text-green-600 font-bold text-sm uppercase tracking-widest mb-4">
                                                        <CheckCircle size={16} /> Successfully Imported ({result.success.length})
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {result.success.map((item: any, i: number) => (
                                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-green-50/50 border border-green-100">
                                                                <div className="flex-1 min-w-0 pr-4">
                                                                    <p className="font-bold text-slate-800 truncate text-sm mb-1">{item.file}</p>
                                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                                        <span>Mapped to:</span>
                                                                        <span className="text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">{item.exam}</span>
                                                                        <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${item.session === 'FN' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                                            {item.session === 'FN' ? 'Forenoon (FN)' : item.session === 'AN' ? 'Afternoon (AN)' : item.session}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="shrink-0 flex items-center gap-2">
                                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-extrabold uppercase tracking-wide">
                                                                        {item.imported} Rows
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {result.errors && result.errors.length > 0 && (
                                                <div>
                                                    <h4 className="flex items-center gap-2 text-red-500 font-bold text-sm uppercase tracking-widest mb-4">
                                                        <XCircle size={16} /> Errors / Rejected ({result.errors.length})
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {result.errors.map((item: any, i: number) => (
                                                            <div key={i} className="flex flex-col p-4 rounded-2xl bg-red-50 border border-red-100">
                                                                <p className="font-bold text-slate-800 truncate text-sm mb-1.5">{item.file}</p>
                                                                <p className="text-xs font-bold text-red-600 bg-red-100/50 px-2.5 py-1 rounded-md self-start">
                                                                    {item.reason}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {result.skipped && result.skipped.length > 0 && (
                                                <div>
                                                    <h4 className="flex items-center gap-2 text-amber-500 font-bold text-sm uppercase tracking-widest mb-4">
                                                        <AlertTriangle size={16} /> Skipped ({result.skipped.length})
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {result.skipped.map((item: any, i: number) => (
                                                            <div key={i} className="flex flex-col p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                                                                <p className="font-bold text-slate-800 truncate text-sm mb-1.5">{item.file}</p>
                                                                <p className="text-xs font-bold text-amber-600 bg-amber-100/50 px-2.5 py-1 rounded-md self-start">
                                                                    {item.reason}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </ModalBody>
                        
                        <ModalFooter className="border-t border-slate-100 bg-white p-6 sm:px-8">
                            {!result ? (
                                <>
                                    <Button variant="light" onPress={resetAndClose} className="font-bold text-slate-500 px-6 rounded-xl">
                                        Cancel
                                    </Button>
                                    <Button 
                                        color="primary" 
                                        onPress={handleImport} 
                                        isLoading={isUploading}
                                        className="font-bold bg-indigo-600 shadow-md px-8 rounded-xl hover:-translate-y-0.5 transition-all"
                                        isDisabled={files.length === 0 || !selectedDate}
                                    >
                                        Start Bulk Import
                                    </Button>
                                </>
                            ) : (
                                <Button 
                                    color="primary" 
                                    onPress={resetAndClose}
                                    className="font-bold bg-slate-900 shadow-md px-8 rounded-xl hover:-translate-y-0.5 transition-all"
                                >
                                    Close & Return
                                </Button>
                            )}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default BulkEligibleImportModal;
