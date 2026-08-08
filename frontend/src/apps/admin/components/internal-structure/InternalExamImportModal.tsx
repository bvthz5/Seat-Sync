import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, CheckCircle2, AlertTriangle, Loader2, Info, ChevronRight, ChevronDown } from 'lucide-react';
import { InternalExamService } from '../../services/internalExamService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    seriesId: number | string;
}

export const InternalExamImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, seriesId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [formatType, setFormatType] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Grouping state for preview
    const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!file || !seriesId) {
            setPreviewData([]);
            setFormatType('');
            return;
        }

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') setFormatType('Spreadsheet (Multi-Sheet)');
        else if (ext === 'pdf') setFormatType('PDF Document (Text/OCR)');
        else if (ext === 'docx' || ext === 'doc' || ext === 'rtf') setFormatType('Word/RTF Document');
        else setFormatType('Unknown Format');

        const loadPreview = async () => {
            setPreviewLoading(true);
            try {
                const res = await InternalExamService.importTimetable(file, seriesId, true);
                if (res.success && res.preview) {
                    setPreviewData(res.preview);
                    // Auto-expand all semesters
                    const sems = Array.from(new Set(res.preview.map((r: any) => r.semester)));
                    const expandState: Record<string, boolean> = {};
                    sems.forEach(s => expandState[s] = true);
                    setExpandedSemesters(expandState);
                }
            } catch (err) {
                console.error("Preview extraction failed", err);
            } finally {
                setPreviewLoading(false);
            }
        };

        loadPreview();
    }, [file, seriesId]);

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
        if (!file || !seriesId) return;

        setLoading(true);
        setResult(null);

        try {
            // Import for real
            const res = await InternalExamService.importTimetable(file, seriesId, false);
            setResult(res);
            if (res.success && (!res.errors || res.errors.length === 0)) {
                onSuccess();
            }
        } catch (error: any) {
            setResult({
                success: false,
                message: error.response?.data?.message || error.message || 'Import failed',
                errors: error.response?.data?.errors || []
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleSemester = (sem: string) => {
        setExpandedSemesters(prev => ({ ...prev, [sem]: !prev[sem] }));
    };

    // Grouping Logic: Semester -> Slot
    const groupedPreview = previewData.reduce((acc: any, item: any) => {
        if (!acc[item.semester]) acc[item.semester] = {};
        if (!acc[item.semester][item.slot]) acc[item.semester][item.slot] = [];
        acc[item.semester][item.slot].push(item);
        return acc;
    }, {});

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-200/80 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between py-5 px-8 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                            <Upload size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Import Internal Exam Timetable</h2>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Multi-Sheet parser for Excel, PDF, and Word formats</p>
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
                    {/* Upload Zone */}
                    {!result && (
                        <div
                            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer ${
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
                                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.rtf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                                }}
                            />
                            
                            {file ? (
                                <div className="flex flex-col sm:flex-row items-center justify-between w-full p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 gap-4">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-14 h-14 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                                            <FileText className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-extrabold text-slate-900">{file.name}</h3>
                                            <p className="text-xs text-indigo-700 font-bold mt-0.5">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB • {formatType}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        className="px-4 py-2 text-xs font-extrabold text-rose-600 hover:text-rose-700 hover:bg-rose-100/70 rounded-xl transition-all shrink-0 border border-rose-200/60"
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    >
                                        Remove File
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-indigo-600 shadow-sm">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-base font-extrabold text-slate-900 mb-1">Click or drag file to upload</h3>
                                    <p className="text-xs text-slate-500 max-w-md font-medium leading-relaxed mb-4">
                                        Supports multi-sheet Workbooks, merged Excel layouts, ALL BRANCHES mapping, and OCR.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-md bg-slate-200/60 text-slate-700 text-[10px] font-black uppercase">.XLSX</span>
                                        <span className="px-2.5 py-1 rounded-md bg-slate-200/60 text-slate-700 text-[10px] font-black uppercase">.XLS</span>
                                        <span className="px-2.5 py-1 rounded-md bg-slate-200/60 text-slate-700 text-[10px] font-black uppercase">.PDF</span>
                                        <span className="px-2.5 py-1 rounded-md bg-slate-200/60 text-slate-700 text-[10px] font-black uppercase">.DOCX</span>
                                        <span className="px-2.5 py-1 rounded-md bg-slate-200/60 text-slate-700 text-[10px] font-black uppercase">.CSV</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State for Preview */}
                    {previewLoading && (
                        <div className="flex flex-col items-center justify-center p-10 text-indigo-600 font-bold text-xs bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
                            <p className="text-slate-800 font-extrabold">Analyzing timetable structure across all sheets...</p>
                        </div>
                    )}

                    {/* Format Preview Grouped */}
                    {!result && !previewLoading && file && previewData.length > 0 && (
                        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-800">
                                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                        Parsed Timetable Preview ({previewData.length} Subjects)
                                    </h4>
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-[45vh] custom-scrollbar">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="text-[11px] font-black text-slate-700 uppercase bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200/80">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Session</th>
                                            <th className="px-4 py-3">Slot</th>
                                            <th className="px-4 py-3">Branch</th>
                                            <th className="px-4 py-3">Subject Code</th>
                                            <th className="px-4 py-3">Subject Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Object.keys(groupedPreview).sort().map(semester => (
                                            <React.Fragment key={semester}>
                                                <tr 
                                                    className="bg-indigo-50/60 cursor-pointer hover:bg-indigo-100/60 transition-colors"
                                                    onClick={() => toggleSemester(semester)}
                                                >
                                                    <td colSpan={6} className="px-4 py-3 font-extrabold text-slate-900">
                                                        <div className="flex items-center gap-2">
                                                            {expandedSemesters[semester] ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-indigo-600" />}
                                                            Semester {semester} 
                                                            <span className="text-[10px] font-extrabold text-indigo-700 bg-white border border-indigo-200/80 px-2 py-0.5 rounded-full ml-2">
                                                                {Object.values(groupedPreview[semester] as Record<string, any[]>).flat().length} exams
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedSemesters[semester] && Object.keys(groupedPreview[semester]).sort().map(slot => (
                                                    (groupedPreview[semester][slot] as any[]).map((row, i) => (
                                                        <tr key={`${semester}-${slot}-${i}`} className="hover:bg-slate-50/70 transition-colors">
                                                            <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap">{row.date}</td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${
                                                                    row.session === 'FN' 
                                                                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                                                        : 'bg-purple-50 text-purple-800 border-purple-200'
                                                                }`}>
                                                                    {row.session}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-indigo-600 font-black whitespace-nowrap">{row.slot}</td>
                                                            <td className="px-4 py-2.5 text-indigo-700 font-bold max-w-[200px] truncate" title={row.branch}>{row.branch}</td>
                                                            <td className="px-4 py-2.5 text-slate-900 font-mono font-black whitespace-nowrap">{row.subjectCode}</td>
                                                            <td className="px-4 py-2.5 text-slate-700 font-semibold">{row.subjectName}</td>
                                                        </tr>
                                                    ))
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Results / Feedback */}
                    {result && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-6 rounded-2xl border ${
                                result.success 
                                    ? 'bg-emerald-50/90 border-emerald-200' 
                                    : 'bg-rose-50/90 border-rose-200'
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                {result.success ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-1 shrink-0" />
                                ) : (
                                    <AlertTriangle className="w-6 h-6 text-rose-600 mt-1 shrink-0" />
                                )}
                                <div className="flex-1">
                                    <h3 className={`text-base font-extrabold ${result.success ? 'text-emerald-950' : 'text-rose-950'}`}>
                                        {result.message}
                                    </h3>
                                    
                                    {result.success && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                                            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Created</p>
                                                <p className="text-2xl font-black text-emerald-600">{result.successCount || 0}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Updated</p>
                                                <p className="text-2xl font-black text-indigo-600">{result.updatedCount || 0}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Skipped/Errors</p>
                                                <p className="text-2xl font-black text-rose-600">{result.errorCount || 0}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Mode</p>
                                                <p className="text-xs font-black text-purple-600 uppercase mt-2">{result.parseMode || 'Standard'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {result.errors && result.errors.length > 0 && (
                                        <div className="mt-5 bg-white rounded-xl p-4 border border-rose-200 shadow-xs max-h-[200px] overflow-y-auto">
                                            <h4 className="text-xs font-black uppercase text-rose-800 mb-2 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-rose-600" /> Import Warnings ({result.errors.length})
                                            </h4>
                                            <ul className="space-y-1">
                                                {result.errors.map((err: string, i: number) => (
                                                    <li key={i} className="text-xs font-semibold text-rose-700">• {err}</li>
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
                        onClick={result && result.success ? onSuccess : onClose}
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl h-10 px-5 text-xs transition-all"
                        disabled={loading}
                    >
                        {result && result.success ? 'Close' : 'Cancel'}
                    </button>
                    {!result || !result.success ? (
                        <button
                            onClick={handleImport}
                            disabled={!file || previewLoading || loading || previewData.length === 0}
                            className={`flex items-center gap-2 font-bold rounded-xl h-10 px-6 text-xs transition-all shadow-md ${
                                !file || previewLoading || loading || previewData.length === 0
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Importing Data...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Confirm Import
                                </>
                            )}
                        </button>
                    ) : null}
                </div>
            </motion.div>
        </div>
    );
};
