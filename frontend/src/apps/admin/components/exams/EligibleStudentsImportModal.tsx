import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ExamService } from '../../services/examService';

interface BranchOption {
    examId: number;
    departmentId: number;
    departmentCode: string;
    departmentName: string;
    registrationCount?: number;
}

interface ImportResultState {
    message?: string;
    isError?: boolean;
    total?: number;
    eligibleCount?: number;
    ineligibleCount?: number;
    createdStudents: number;
    registrationsCreated: number;
    registrationsUpdated?: number;
    registrationsSkipped: number;
    errorCount: number;
    errors: Array<{ row: number; reason: string }>;
    detectedHeaders?: string[];
}

interface EligibleStudentsImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    examName: string;
    branches: BranchOption[];
    onSuccess: () => void;
}

const EligibleStudentsImportModal: React.FC<EligibleStudentsImportModalProps> = ({
    isOpen,
    onClose,
    examName,
    branches,
    onSuccess
}) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importLabel, setImportLabel] = useState('');
    const [result, setResult] = useState<ImportResultState | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setSelectedExamId('');
            setIsUploading(false);
            setImportProgress(0);
            setImportLabel('');
            setResult(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } else if (branches.length > 0) {
            const existsInBranches = branches.some(b => String(b.examId) === selectedExamId);
            if (!selectedExamId || !existsInBranches) {
                setSelectedExamId(String(branches[0].examId));
            }
        }
    }, [isOpen, branches, selectedExamId]);

    const selectedBranch = useMemo(
        () => branches.find(branch => String(branch.examId) === selectedExamId) || branches[0] || null,
        [branches, selectedExamId]
    );

    const handleUpload = async () => {
        if (!file || !selectedBranch) {
            toast.error('Select a branch and file first');
            return;
        }

        setIsUploading(true);
        setImportProgress(0);
        setImportLabel('Preparing import…');
        setResult(null);

        // Simulate early progress while server processes
        const progressInterval = setInterval(() => {
            setImportProgress(prev => {
                if (prev < 85) return prev + Math.random() * 8;
                return prev;
            });
        }, 400);

        try {
            setImportLabel(`Processing ${file.name}…`);
            const response = await ExamService.importEligibleStudents(selectedBranch.examId, file);
            clearInterval(progressInterval);
            setImportProgress(100);
            setImportLabel('Import finished!');

            const mappedCount =
                Number(response?.registrationsCreated || 0) +
                Number(response?.registrationsUpdated || 0) +
                Number(response?.registrationsSkipped || 0);
            const errorCount = Number(response?.errorCount || 0);

            const normalizedResult: ImportResultState = {
                message: response?.message,
                isError: mappedCount === 0,
                total: Number(response?.total ?? mappedCount),
                eligibleCount: Number(response?.eligibleCount || 0),
                ineligibleCount: Number(response?.ineligibleCount || 0),
                createdStudents: Number(response?.createdStudents || 0),
                registrationsCreated: Number(response?.registrationsCreated || 0),
                registrationsUpdated: Number(response?.registrationsUpdated || 0),
                registrationsSkipped: Number(response?.registrationsSkipped || 0),
                errorCount,
                errors: Array.isArray(response?.errors) ? response.errors : [],
                detectedHeaders: Array.isArray(response?.detectedHeaders) ? response.detectedHeaders : undefined
            };

            setResult(normalizedResult);

            if (mappedCount > 0) {
                onSuccess();
            }

            if (mappedCount === 0) {
                toast.error(response?.message || 'No students could be mapped from this file. Check the details below.');
            } else if (errorCount > 0) {
                toast.success(`Mapped ${mappedCount} student(s) with ${errorCount} skipped row(s). Review details below.`);
            } else {
                await new Promise(r => setTimeout(r, 700));
                toast.success(`Mapped ${mappedCount} student(s) to ${selectedBranch.departmentCode} successfully`);
                onClose();
            }
        } catch (error: any) {
            clearInterval(progressInterval);
            setImportProgress(0);
            setImportLabel('');
            console.error(error);
            const errData = error?.response?.data;
            const errMsg = errData?.message || 'Failed to import eligible students';
            toast.error(errMsg);
            if (errData) {
                setResult({
                    message: errMsg,
                    isError: true,
                    total: 0,
                    eligibleCount: 0,
                    ineligibleCount: 0,
                    createdStudents: Number(errData.createdStudents || 0),
                    registrationsCreated: Number(errData.registrationsCreated || 0),
                    registrationsUpdated: Number(errData.registrationsUpdated || 0),
                    registrationsSkipped: Number(errData.registrationsSkipped || 0),
                    errorCount: Number(errData.errorCount || (Array.isArray(errData.errors) ? errData.errors.length : 1)),
                    errors: Array.isArray(errData.errors) ? errData.errors : [{ row: 0, reason: errMsg }],
                    detectedHeaders: Array.isArray(errData.detectedHeaders) ? errData.detectedHeaders : undefined
                });
            }
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white border border-slate-200/80 shadow-2xl w-full max-w-xl max-h-[90vh] rounded-[24px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="text-left">
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2.5 tracking-tight">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm border border-indigo-100/40">
                                <FileSpreadsheet className="w-4.5 h-4.5" />
                            </div>
                            Import Eligible Students
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1.5 ml-0.5">{examName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all active:scale-95">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto">
                    <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/30 text-xs font-semibold text-indigo-700/80 leading-relaxed text-left">
                        Upload any Excel or CSV student list containing names and register numbers in any column order. Title headers, blank rows, and alternate header names are detected automatically.
                    </div>

                    {/* Branch Selection Dropdown (Only if there are multiple branches) */}
                    {branches.length > 1 && (
                        <div className="space-y-2 flex flex-col text-left">
                            <label htmlFor="branch-select" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Branch / Department</label>
                            <select
                                id="branch-select"
                                value={selectedExamId}
                                onChange={(e) => setSelectedExamId(e.target.value)}
                                className="h-11 px-4 border border-slate-200 bg-white rounded-xl text-[13px] font-bold text-slate-700 transition-all hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                            >
                                {branches.map(b => (
                                    <option key={b.examId} value={String(b.examId)}>
                                        {b.departmentCode} - {b.departmentName}
                                        {typeof b.registrationCount === 'number' && b.registrationCount > 0 ? ` (${b.registrationCount} mapped)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* File upload zone */}
                    <div
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            file
                                ? 'border-indigo-400 bg-indigo-50/20 shadow-inner'
                                : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/10 group'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv,.tsv"
                            className="hidden"
                            onChange={(e) => {
                                const nextFile = e.target.files?.[0] || null;
                                setFile(nextFile);
                                setResult(null);
                            }}
                        />
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all ${file ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:scale-105'}`}>
                            {file ? <FileSpreadsheet className="w-6 h-6 animate-pulse" /> : <Upload className="w-6 h-6" />}
                        </div>
                        <h3 className="text-slate-800 font-extrabold text-[14px]">
                            {file ? file.name : 'Click to upload student file'}
                        </h3>
                        <p className="text-slate-400 text-xs mt-1">
                            {file ? 'File loaded successfully. Click to change.' : 'Supports .xlsx, .xls, and .csv formats'}
                        </p>
                    </div>

                    {/* Expected Columns Badge Container */}
                    <div className="space-y-2 text-left">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supported Columns (Any Order or Format)</span>
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                            {[
                                'Name / Student Name / Candidate',
                                'Reg. No. / Register Number / KTU ID / Roll No',
                                'Eligibility (optional)',
                                'Email (optional)',
                                'Department / Program / Semester (optional)'
                            ].map((col) => (
                                <span key={col} className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-200/60 rounded-lg shadow-sm">
                                    {col}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* ── Import Progress Bar ── */}
                    {isUploading && (
                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {importProgress === 100 ? (
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                                    )}
                                    <span className={`text-xs font-extrabold truncate max-w-[320px] text-left ${importProgress === 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                        {importLabel}
                                    </span>
                                </div>
                                <span className={`text-xs font-black tabular-nums ${importProgress === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                    {Math.round(importProgress)}%
                                </span>
                            </div>

                            {/* Bar track */}
                            <div className="w-full h-2.5 bg-slate-200/50 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ease-out ${importProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                    style={{ width: `${importProgress}%` }}
                                />
                            </div>

                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-left">
                                {importProgress < 100 ? 'Uploading and processing student data on server…' : 'Finalizing records…'}
                            </p>
                        </div>
                    )}

                    {/* Result block */}
                    {result && !isUploading && (
                        <div className={`p-5 rounded-2xl border ${
                            result.isError
                                ? 'bg-rose-50/70 border-rose-200'
                                : result.errorCount > 0
                                    ? 'bg-amber-50/50 border-amber-200'
                                    : 'bg-emerald-50/30 border-emerald-200'
                        }`}>
                            <div className="flex items-start gap-3">
                                {result.isError ? (
                                    <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                                ) : result.errorCount > 0 ? (
                                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                                ) : (
                                    <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                                )}
                                <div className="text-xs space-y-2 text-left w-full">
                                    <p className={`font-extrabold text-[14px] ${result.isError ? 'text-rose-800' : 'text-slate-800'}`}>
                                        {result.isError
                                            ? (result.message || 'No Students Were Mapped')
                                            : result.errorCount > 0
                                                ? (result.message || 'Import Completed With Warnings')
                                                : 'Import Finished Successfully'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 font-bold text-slate-500">
                                        <p>Mapped (New): <span className="text-slate-800 font-extrabold">{result.registrationsCreated}</span></p>
                                        <p>Updated / Existing: <span className="text-slate-800 font-extrabold">{(result.registrationsUpdated || 0) + result.registrationsSkipped}</span></p>
                                        <p>Eligible / Ineligible: <span className="text-emerald-700 font-extrabold">{result.eligibleCount || 0}</span> / <span className="text-rose-600 font-extrabold">{result.ineligibleCount || 0}</span></p>
                                        <p>Errors / Skipped: <span className={result.errorCount > 0 ? "text-rose-600 font-extrabold" : "text-emerald-600 font-extrabold"}>{result.errorCount}</span></p>
                                    </div>
                                    {result.detectedHeaders && result.detectedHeaders.length > 0 && (result.isError || result.errorCount > 0) && (
                                        <p className="text-[11px] text-slate-500 font-semibold pt-1">
                                            Detected headers: <span className="font-mono text-slate-700">{result.detectedHeaders.join(', ')}</span>
                                        </p>
                                    )}
                                    {result.errors && result.errors.length > 0 && (
                                        <div className="mt-3 max-h-[140px] overflow-y-auto border-t border-slate-200/60 pt-2 space-y-1">
                                            {result.errors.slice(0, 50).map((err, i) => (
                                                <p key={i} className="text-[11px] text-rose-600 font-semibold leading-normal">
                                                    {err.row > 0 ? `Row ${err.row}: ` : ''}{err.reason}
                                                </p>
                                            ))}
                                            {result.errors.length > 50 && (
                                                <p className="text-[10px] text-slate-400 font-bold">
                                                    …and {result.errors.length - 50} more row error(s)
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                    <Button
                        variant="flat"
                        onPress={onClose}
                        isDisabled={isUploading}
                        className="h-10 px-5 font-bold rounded-xl border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-[0.98]"
                    >
                        Close
                    </Button>
                    <Button
                        color="primary"
                        onPress={handleUpload}
                        isLoading={isUploading}
                        isDisabled={!file || !selectedBranch || isUploading}
                        className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-100 transition-all hover:shadow-indigo-200 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                        Import Eligible Students
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EligibleStudentsImportModal;
