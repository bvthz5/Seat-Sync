import React, { useState, useRef } from 'react';
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
    const [files, setFiles] = useState<File[]>([]);
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
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    };

    const handleClose = () => {
        if (result && result.studentsImported > 0) {
            onSuccess();
        }
        setResult(null);
        setFiles([]);
        onClose();
    };

    const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleImport = async () => {
        if (files.length === 0) return;

        setLoading(true);
        setResult(null);
        setImportProgress(10);
        setImportStage(`Reading ${files.length} student file(s)...`);

        let totalImported = 0;
        let totalMapped = 0;
        let totalErrors: { row: number; reason: string }[] = [];

        try {
            for (let idx = 0; idx < files.length; idx++) {
                const currentFile = files[idx];
                const pct = Math.round(((idx + 1) / files.length) * 90);
                setImportProgress(pct);
                setImportStage(`Importing [${idx + 1}/${files.length}]: ${currentFile.name}...`);

                const res = await InternalStudentService.importStudents(currentFile, {
                    seriesId,
                    semester: semesterKey
                });

                totalImported += (res.studentsImported || 0);
                totalMapped += (res.studentsMapped || 0);
                if (res.errors && res.errors.length > 0) {
                    totalErrors.push(...res.errors);
                }
            }

            setImportProgress(100);
            setImportStage('Multi-file Student Import Complete!');
            setResult({
                message: `Successfully processed ${files.length} file(s). ${totalImported} master student records created/updated for Semester ${semesterKey}.`,
                importType: 'INTERNAL',
                examId: 0,
                examName: `Semester ${semesterKey} Import`,
                studentsImported: totalImported,
                studentsMapped: totalMapped,
                errorCount: totalErrors.length,
                errors: totalErrors
            });
        } catch (error: any) {
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
                {/* Header */}
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
                                Import master student lists or subject-specific rosters for Semester {semesterKey}.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose} 
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1 space-y-6 bg-white custom-scrollbar">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> 
                                Supported Import Types & Formats
                            </h3>
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                                Multi-File / Multi-Format Parser
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                                <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-indigo-600" /> 1. Master Student List (Batch-wise)
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    Section header: <code className="bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-mono font-bold">Batch : &lt;Dept&gt; ({semesterKey})</code>. Establishes student master identity.
                                </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                                <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                    <GraduationCap className="w-3.5 h-3.5 text-purple-600" /> 2. Subject Roster
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    Course header: <code className="bg-purple-50 text-purple-700 px-1 py-0.5 rounded font-mono font-bold">CourseCode: SubjectName</code>. Maps Admission No to target exam.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* File Dropzone */}
                    {!result && (
                        <div className="space-y-4">
                            <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                                    isDragging 
                                        ? 'border-indigo-500 bg-indigo-50/50' 
                                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
                                }`}
                            >
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept=".csv, .xlsx, .xls"
                                    multiple
                                    className="hidden"
                                    onChange={handleAddFiles}
                                />
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-extrabold text-slate-900">
                                    Click or Drag & Drop Excel / CSV Files
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 font-medium">
                                    Upload single or multiple files (.csv, .xlsx, .xls) together.
                                </p>
                            </div>

                            {files.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-indigo-600" />
                                            Selected Files ({files.length})
                                        </h4>
                                        <button 
                                            onClick={() => setFiles([])}
                                            className="text-xs font-bold text-rose-600 hover:underline"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {files.map((file, i) => (
                                            <div 
                                                key={i}
                                                className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
                                                    <span className="text-xs font-bold text-slate-800 truncate">{file.name}</span>
                                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                                        {(file.size / 1024).toFixed(1)} KB
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveFile(i)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-200 rounded-lg transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Progress Indicator */}
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
                                <span className={importProgress >= 10 ? "text-indigo-700 font-black" : ""}>Step 1: Read Batches & Rosters</span>
                                <span className={importProgress >= 50 ? "text-indigo-700 font-black" : ""}>Step 2: Upsert Master Students</span>
                                <span className={importProgress >= 80 ? "text-indigo-700 font-black" : ""}>Step 3: Map Exam Registrations</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Result Summary */}
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
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Master Students</p>
                                                <p className="text-2xl font-black text-emerald-600">{result.studentsImported || 0}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Exam Registrations</p>
                                                <p className="text-2xl font-black text-indigo-600">{result.studentsMapped || 0}</p>
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
                                                <AlertTriangle className="w-4 h-4 text-rose-600" /> Warnings / Unmatched ({result.errors.length})
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
                        onClick={handleClose}
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl h-10 px-5 text-xs transition-all"
                        disabled={loading}
                    >
                        {result && result.studentsImported > 0 ? 'Done' : 'Cancel'}
                    </button>
                    {(!result || result.studentsImported === 0) && (
                        <button
                            onClick={handleImport}
                            disabled={files.length === 0 || loading}
                            className={`flex items-center gap-2 font-bold rounded-xl h-10 px-6 text-xs transition-all shadow-md ${
                                files.length === 0 || loading
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
                                    Import & Map ({files.length} Files)
                                </>
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
