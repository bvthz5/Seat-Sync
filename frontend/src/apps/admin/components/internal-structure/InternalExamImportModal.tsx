import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, CheckCircle2, AlertTriangle, Loader2, Info, ChevronRight, ChevronDown, Layers } from 'lucide-react';
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
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [formatType, setFormatType] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Grouping state for preview
    const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});
    const [expandedProgrammes, setExpandedProgrammes] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setResult(null);
        setPreviewError(null);
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
            setPreviewError(null);
            try {
                const res = await InternalExamService.importTimetable(file, seriesId, true);
                if (res.success && res.preview && res.preview.length > 0) {
                    setPreviewData(res.preview);

                    const semExpandState: Record<string, boolean> = {};
                    const progExpandState: Record<string, boolean> = {};

                    res.preview.forEach((r: any) => {
                        const sem = String(r.semester || 'S3').toUpperCase().trim();
                        const prog = r.programmeLabel || r.programmeCode || 'B.Tech';
                        semExpandState[sem] = true;
                        progExpandState[`${sem}-${prog}`] = true;
                    });

                    setExpandedSemesters(semExpandState);
                    setExpandedProgrammes(progExpandState);
                } else {
                    setPreviewData([]);
                    if (res.message) {
                        setPreviewError(res.message);
                    }
                }
            } catch (err: any) {
                console.error("Preview extraction failed", err);
                const errMsg = err.response?.data?.message || err.message || "Failed to extract timetable preview.";
                setPreviewError(errMsg);
                setPreviewData([]);
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

    const [importProgress, setImportProgress] = useState<number>(0);
    const [importStage, setImportStage] = useState<string>('');

    const handleImport = async () => {
        if (!file || !seriesId) return;

        setLoading(true);
        setResult(null);
        setImportProgress(10);
        setImportStage('Reading timetable file...');

        const timer = setInterval(() => {
            setImportProgress(prev => {
                if (prev < 35) {
                    setImportStage('Parsing multi-semester schedules...');
                    return prev + 12;
                } else if (prev < 70) {
                    setImportStage('Building exam patterns & branch scopes...');
                    return prev + 10;
                } else if (prev < 90) {
                    setImportStage('Saving database records & student eligibility mapping...');
                    return prev + 5;
                }
                return prev;
            });
        }, 300);

        try {
            // Import for real
            const res = await InternalExamService.importTimetable(file, seriesId, false);
            clearInterval(timer);
            setImportProgress(100);
            setImportStage('Import Completed Successfully!');
            setResult(res);
            if (res.success && (!res.errors || res.errors.length === 0)) {
                onSuccess();
            }
        } catch (error: any) {
            clearInterval(timer);
            setImportProgress(0);
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

    const toggleProgramme = (semProgKey: string) => {
        setExpandedProgrammes(prev => ({ ...prev, [semProgKey]: !prev[semProgKey] }));
    };

    // Grouping Logic: Semester -> Programme -> Exams
    const groupedPreview = previewData.reduce((acc: Record<string, Record<string, any[]>>, item: any) => {
        let semRaw = String(item.semester || 'S3').toUpperCase().trim();
        if (!semRaw.startsWith('S') && /^\d+$/.test(semRaw)) semRaw = `S${semRaw}`;
        if (!semRaw.startsWith('S')) semRaw = `S${semRaw}`;

        const progLabel = item.programmeLabel || item.programmeCode || 'B.Tech';

        if (!acc[semRaw]) acc[semRaw] = {};
        if (!acc[semRaw][progLabel]) acc[semRaw][progLabel] = [];
        acc[semRaw][progLabel].push(item);
        return acc;
    }, {});

    const uniqueSemesters = Object.keys(groupedPreview).sort();
    const allProgrammesSet = new Set<string>();
    uniqueSemesters.forEach(s => {
        Object.keys(groupedPreview[s]).forEach(p => allProgrammesSet.add(p));
    });

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
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Multi-Semester & Multi-Programme parser for Excel, PDF, and Word formats</p>
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
                            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer ${isDragging
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
                                        Supports multi-semester workbooks, multi-programme schedules (B.Tech, MCA, Integrated MCA), and OCR.
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
                            <p className="text-slate-800 font-extrabold">Analyzing multi-semester & multi-programme timetable structure...</p>
                        </div>
                    )}

                    {/* Error State for Preview */}
                    {!result && !previewLoading && file && previewError && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-bold text-amber-900 mb-0.5">Could not extract timetable preview</h4>
                                <p className="text-xs text-amber-700 leading-relaxed font-medium">{previewError}</p>
                            </div>
                        </div>
                    )}

                    {/* Hierarchical Preview Grouped by Semester -> Programme */}
                    {!result && !previewLoading && file && previewData.length > 0 && (
                        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs space-y-0">
                            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-slate-800">
                                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                        Parsed Timetable Preview ({previewData.length} Total Exams)
                                    </h4>
                                </div>

                                {/* Summary Statistics Pills */}
                                <div className="flex items-center gap-2 text-[11px] font-extrabold">
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
                                        {uniqueSemesters.length} Semester{uniqueSemesters.length > 1 ? 's' : ''} ({uniqueSemesters.join(', ')})
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 border border-purple-200">
                                        {allProgrammesSet.size} Programme{allProgrammesSet.size > 1 ? 's' : ''} ({Array.from(allProgrammesSet).join(', ')})
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-x-auto max-h-[48vh] custom-scrollbar">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="text-[11px] font-black text-slate-700 uppercase bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200/80">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Session</th>
                                            <th className="px-4 py-3">Slot</th>
                                            <th className="px-4 py-3">Branch Scope</th>
                                            <th className="px-4 py-3">Subject Code</th>
                                            <th className="px-4 py-3">Subject Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {uniqueSemesters.map(semester => {
                                            const semTotalExams = Object.values(groupedPreview[semester]).flat().length;
                                            const semProgrammes = Object.keys(groupedPreview[semester]).sort();

                                            return (
                                                <React.Fragment key={semester}>
                                                    {/* Semester Group Header */}
                                                    <tr
                                                        className="bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700 transition-colors"
                                                        onClick={() => toggleSemester(semester)}
                                                    >
                                                        <td colSpan={6} className="px-4 py-3 font-extrabold text-white">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    {expandedSemesters[semester] ? <ChevronDown className="w-4 h-4 text-indigo-200" /> : <ChevronRight className="w-4 h-4 text-indigo-200" />}
                                                                    <span className="text-sm font-black tracking-wide">Semester {semester}</span>
                                                                </div>
                                                                <span className="text-[11px] font-extrabold bg-white/20 backdrop-blur-xs text-white border border-white/30 px-3 py-0.5 rounded-full">
                                                                    {semTotalExams} exam{semTotalExams > 1 ? 's' : ''} across {semProgrammes.length} programme{semProgrammes.length > 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Nested Programmes under Semester */}
                                                    {expandedSemesters[semester] && semProgrammes.map(progLabel => {
                                                        const semProgKey = `${semester}-${progLabel}`;
                                                        const progRows = groupedPreview[semester][progLabel];

                                                        return (
                                                            <React.Fragment key={semProgKey}>
                                                                {/* Programme Sub-header */}
                                                                <tr
                                                                    className="bg-slate-100/90 cursor-pointer hover:bg-slate-200/80 transition-colors border-y border-slate-200/80"
                                                                    onClick={() => toggleProgramme(semProgKey)}
                                                                >
                                                                    <td colSpan={6} className="px-6 py-2.5 font-extrabold text-slate-800">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                {expandedProgrammes[semProgKey] ? <ChevronDown className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />}
                                                                                <span className="font-bold text-slate-900">{progLabel}</span>
                                                                            </div>
                                                                            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                                                                                {progRows.length} exam{progRows.length > 1 ? 's' : ''}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                </tr>

                                                                {/* Exam Rows */}
                                                                {expandedProgrammes[semProgKey] && progRows.map((row: any, i: number) => (
                                                                    <tr key={`${semProgKey}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                                                                        <td className="px-6 py-2.5 font-bold text-slate-800 whitespace-nowrap">{row.date}</td>
                                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${row.session === 'FN'
                                                                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                                    : 'bg-purple-50 text-purple-800 border-purple-200'
                                                                                }`}>
                                                                                {row.session}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-indigo-600 font-black whitespace-nowrap">{row.slot}</td>
                                                                        <td className="px-4 py-2.5 text-indigo-700 font-bold max-w-[200px] truncate" title={row.branch}>{row.branch}</td>
                                                                        <td className="px-4 py-2.5 text-slate-900 font-mono font-black whitespace-nowrap">{row.subjectCode}</td>
                                                                        <td className="px-4 py-2.5 text-slate-700 font-semibold">
                                                                            {row.subjectName && row.subjectName.toUpperCase() !== (row.subjectCode || '').toUpperCase() ? (
                                                                                row.subjectName
                                                                            ) : (
                                                                                <span className="text-amber-600 font-bold text-[11px] flex items-center gap-1" title="Subject name could not be detected for this course code">
                                                                                    <AlertTriangle className="w-3.5 h-3.5 inline text-amber-500" /> Name Not Specified
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Animated Import Progress Bar */}
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
                                        <h4 className="text-sm font-black text-slate-900 tracking-tight">Importing Timetable...</h4>
                                        <p className="text-xs text-indigo-700 font-extrabold mt-0.5 animate-pulse">{importStage}</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-black text-indigo-600 font-mono tracking-tight">{importProgress}%</span>
                            </div>

                            {/* Animated Gradient Progress Bar Track */}
                            <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200 shadow-inner relative z-10 overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300 shadow-sm"
                                    style={{ width: `${importProgress}%` }}
                                />
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-500 relative z-10 pt-1">
                                <span className={importProgress >= 10 ? "text-indigo-700 font-black" : ""}>Step 1: Reading File</span>
                                <span className={importProgress >= 50 ? "text-indigo-700 font-black" : ""}>Step 2: Sorting Semesters</span>
                                <span className={importProgress >= 80 ? "text-indigo-700 font-black" : ""}>Step 3: Creating Exams</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Results / Feedback */}
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-6 rounded-2xl border ${result.success
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
                                        <>
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

                                            {/* Semester & Programme Breakdown Card */}
                                            {result.semesters && result.semesters.length > 0 && (
                                                <div className="mt-4 bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs space-y-3">
                                                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                                                        <Layers className="w-4 h-4 text-emerald-600" />
                                                        Imported Semester & Programme Breakdown ({result.semesters.length} Semesters)
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {result.semesters.map((s: any) => (
                                                            <div key={s.semester} className="bg-slate-50 p-3 rounded-lg border border-slate-200/70 flex flex-col gap-1.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="px-2 py-0.5 text-xs font-black rounded-md bg-indigo-100 text-indigo-800">
                                                                        Semester {s.semester}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-slate-600">
                                                                        {s.examCount} exams
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                                    {s.programmes?.map((p: any) => (
                                                                        <span key={p.programme} className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-white border border-slate-200 text-slate-700">
                                                                            {p.programmeLabel || p.programme}: {p.examCount}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
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
                            className={`flex items-center gap-2 font-bold rounded-xl h-10 px-6 text-xs transition-all shadow-md ${!file || previewLoading || loading || previewData.length === 0
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
