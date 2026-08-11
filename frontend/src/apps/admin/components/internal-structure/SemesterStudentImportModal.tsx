import React, { useState, useRef } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Tooltip } from '@heroui/react';
import { Upload, FileText, CheckCircle2, AlertTriangle, X, Loader2, Users, GraduationCap, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';
import { InternalStudentService, InternalStudentImportResult } from '../../services/internalStudentService';

interface SemesterStudentImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    seriesId?: string | number;
    semesterKey: string; // e.g. 'S3', 'S5'
}

export const SemesterStudentImportModal: React.FC<SemesterStudentImportModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    seriesId,
    semesterKey
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStage, setImportStage] = useState('');
    const [result, setResult] = useState<InternalStudentImportResult | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setLoading(true);
        setResult(null);
        setImportProgress(10);
        setImportStage(`Reading Semester ${semesterKey} student list...`);

        const timer = setInterval(() => {
            setImportProgress(prev => {
                if (prev < 35) {
                    setImportStage(`Parsing multi-batch student records for ${semesterKey}...`);
                    return prev + 12;
                } else if (prev < 70) {
                    setImportStage(`Upserting student records into database...`);
                    return prev + 10;
                } else if (prev < 90) {
                    setImportStage(`Auto-registering students to Semester ${semesterKey} exams...`);
                    return prev + 5;
                }
                return prev;
            });
        }, 300);

        try {
            const res = await InternalStudentService.importStudents(file, {
                seriesId,
                semester: semesterKey
            });
            clearInterval(timer);
            setImportProgress(100);
            setImportStage('Student Import & Exam Registration Complete!');
            setResult(res);
            onSuccess();
        } catch (error: any) {
            clearInterval(timer);
            setImportProgress(0);
            setResult({
                message: error.response?.data?.message || error.message || 'Import failed',
                importType: 'INTERNAL',
                examId: 0,
                examName: `Semester ${semesterKey} Import`,
                studentsImported: 0,
                studentsMapped: 0,
                errorCount: 1,
                errors: [{ row: 0, reason: error.response?.data?.message || error.message || 'Import failed' }]
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-200/80 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between py-5 px-8 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                            <GraduationCap size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                Import Students for Semester {semesterKey}
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black">
                                    Semester {semesterKey}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Upload multi-batch student list for Semester {semesterKey}. Students will auto-map to all Semester {semesterKey} exams.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 space-y-6 bg-white custom-scrollbar">
                    {/* Format Guidelines Banner */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> 
                                Semester {semesterKey} Student File Guidelines
                            </h3>
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                                Multi-Batch Auto Parser
                            </span>
                        </div>

                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Upload your official institutional student Excel or CSV file. The system automatically detects batch section headers (e.g., <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-extrabold">Batch : &lt;Department Batch Name&gt; ({semesterKey})</code>) and column headers (<code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono font-bold">Class Roll No</code>, <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono font-bold">Name</code>, <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono font-bold">Batch</code>).
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                            <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-black uppercase text-slate-400">Student Name</p>
                                <p className="text-xs font-extrabold text-slate-800 mt-0.5">Name / Full Name</p>
                            </div>
                            <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-black uppercase text-slate-400">Roll / Sl No</p>
                                <p className="text-xs font-extrabold text-slate-800 mt-0.5">Class Roll No / Sl No</p>
                            </div>
                            <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-black uppercase text-slate-400">Batch Header</p>
                                <p className="text-xs font-extrabold text-slate-800 mt-0.5">Batch : &lt;BatchName&gt;</p>
                            </div>
                            <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-black uppercase text-slate-400">Target Semester</p>
                                <p className="text-xs font-extrabold text-indigo-600 mt-0.5">Semester {semesterKey}</p>
                            </div>
                        </div>
                    </div>

                    {/* Upload Zone */}
                    {!result && (
                        <div
                            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${
                                isDragging 
                                    ? 'border-indigo-600 bg-indigo-50/80 scale-[0.99]' 
                                    : 'border-slate-200 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/30'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                                }}
                            />
                            
                            {file ? (
                                <div className="flex flex-col sm:flex-row items-center justify-between w-full p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 gap-4">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-extrabold text-slate-900">{file.name}</h3>
                                            <p className="text-xs text-indigo-700 font-bold mt-0.5">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for Semester {semesterKey}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        className="bg-white text-slate-600 hover:text-rose-600 border border-slate-200 font-bold rounded-xl text-xs h-9"
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                    >
                                        Change File
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center space-y-3">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-xs">
                                        <Upload className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-extrabold text-slate-900">
                                            Click or drop Semester {semesterKey} student file here
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium mt-1">
                                            Supports Excel (.xlsx, .xls) and CSV (.csv) containing all department batches
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Progress Bar */}
                    {loading && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-100/60 border border-indigo-100 space-y-4 relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 tracking-tight">Processing Semester {semesterKey} Import...</h4>
                                        <p className="text-xs text-indigo-700 font-extrabold mt-0.5 animate-pulse">{importStage}</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-black text-indigo-600 font-mono tracking-tight">{importProgress}%</span>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200 shadow-inner relative z-10 overflow-hidden">
                                <motion.div 
                                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300 shadow-sm"
                                    style={{ width: `${importProgress}%` }}
                                />
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-500 relative z-10 pt-1">
                                <span className={importProgress >= 10 ? "text-indigo-700 font-black" : ""}>Step 1: Read Batches</span>
                                <span className={importProgress >= 50 ? "text-indigo-700 font-black" : ""}>Step 2: Upsert Students</span>
                                <span className={importProgress >= 80 ? "text-indigo-700 font-black" : ""}>Step 3: Auto-Map to Exams</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Results / Feedback */}
                    {result && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-6 rounded-2xl border ${
                                result.studentsImported > 0 
                                    ? 'bg-emerald-50/90 border-emerald-200' 
                                    : 'bg-rose-50/90 border-rose-200'
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                {result.studentsImported > 0 ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-1 shrink-0" />
                                ) : (
                                    <AlertTriangle className="w-6 h-6 text-rose-600 mt-1 shrink-0" />
                                )}
                                <div className="flex-1">
                                    <h3 className={`text-base font-extrabold ${result.studentsImported > 0 ? 'text-emerald-950' : 'text-rose-950'}`}>
                                        {result.message}
                                    </h3>
                                    
                                    {result.studentsImported > 0 && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
                                            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Students Imported</p>
                                                <p className="text-2xl font-black text-emerald-600">{result.studentsImported || 0}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Exams Auto-Mapped</p>
                                                <p className="text-2xl font-black text-indigo-600">{(result as any).examsMappedCount || 0}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Target Semester</p>
                                                <p className="text-base font-black text-purple-600 mt-1">Semester {semesterKey}</p>
                                            </div>
                                        </div>
                                    )}

                                    {result.errors && result.errors.length > 0 && (
                                        <div className="mt-5 bg-white rounded-xl p-4 border border-rose-200 shadow-xs max-h-[160px] overflow-y-auto">
                                            <h4 className="text-xs font-black uppercase text-rose-800 mb-2 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-rose-600" /> Warnings ({result.errors.length})
                                            </h4>
                                            <ul className="space-y-1">
                                                {result.errors.map((err: any, i: number) => (
                                                    <li key={i} className="text-xs font-semibold text-rose-700">• {err.reason || err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <div className="py-4 px-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl h-10 px-5 text-xs transition-all"
                        disabled={loading}
                    >
                        {result && result.studentsImported > 0 ? 'Close' : 'Cancel'}
                    </button>
                    {(!result || result.studentsImported === 0) && (
                        <button
                            onClick={handleImport}
                            disabled={!file || loading}
                            className={`flex items-center gap-2 font-bold rounded-xl h-10 px-6 text-xs transition-all shadow-md ${
                                !file || loading
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Users className="w-4 h-4" />
                                    Import & Map Semester {semesterKey} Students
                                </>
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
