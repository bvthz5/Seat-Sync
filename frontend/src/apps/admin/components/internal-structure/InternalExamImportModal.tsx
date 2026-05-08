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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#161616]">
                    <div>
                        <h2 className="text-xl font-bold text-white">Import Internal Exam Timetable</h2>
                        <p className="text-sm text-gray-400 mt-1">Multi-Sheet parser for Excel, PDF, and Word formats</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                    {/* Upload Zone */}
                    {!result && (
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
                                isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
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
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-medium text-white">{file.name}</h3>
                                    <p className="text-sm text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB • {formatType}</p>
                                    <button 
                                        className="mt-4 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    >
                                        Remove File
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-gray-400">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-medium text-white mb-2">Click or drag file to upload</h3>
                                    <p className="text-sm text-gray-400 max-w-sm">
                                        Supports multi-sheet Workbooks, merged Excel layouts, ALL BRANCHES mapping, and OCR.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State for Preview */}
                    {previewLoading && (
                        <div className="flex flex-col items-center justify-center p-8 text-blue-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p>Analyzing timetable structure across all sheets...</p>
                        </div>
                    )}

                    {/* Format Preview Grouped */}
                    {!result && !previewLoading && file && previewData.length > 0 && (
                        <div className="bg-[#161616] border border-white/5 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <Info className="w-4 h-4 text-blue-400" />
                                    <h4 className="text-sm font-medium">Parsed Timetable Preview ({previewData.length} Subjects)</h4>
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-[50vh] custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Date</th>
                                            <th className="px-4 py-3 font-medium">Session</th>
                                            <th className="px-4 py-3 font-medium">Slot</th>
                                            <th className="px-4 py-3 font-medium">Branch</th>
                                            <th className="px-4 py-3 font-medium">Subject Code</th>
                                            <th className="px-4 py-3 font-medium">Subject Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {Object.keys(groupedPreview).sort().map(semester => (
                                            <React.Fragment key={semester}>
                                                <tr 
                                                    className="bg-white/[0.03] cursor-pointer hover:bg-white/[0.05]"
                                                    onClick={() => toggleSemester(semester)}
                                                >
                                                    <td colSpan={6} className="px-4 py-3 font-bold text-white">
                                                        <div className="flex items-center gap-2">
                                                            {expandedSemesters[semester] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                            Semester {semester} 
                                                            <span className="text-xs font-normal text-gray-400 bg-black/30 px-2 py-0.5 rounded-full ml-2">
                                                                {Object.values(groupedPreview[semester] as Record<string, any[]>).flat().length} exams
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedSemesters[semester] && Object.keys(groupedPreview[semester]).sort().map(slot => (
                                                    (groupedPreview[semester][slot] as any[]).map((row, i) => (
                                                        <tr key={`${semester}-${slot}-${i}`} className="hover:bg-white/[0.02]">
                                                            <td className="px-4 py-2 text-gray-300 whitespace-nowrap">{row.date}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap">
                                                                <span className={`px-2 py-1 text-xs font-medium rounded-md ${row.session === 'FN' ? 'bg-orange-500/10 text-orange-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                                                    {row.session}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-blue-400 font-bold whitespace-nowrap">{row.slot}</td>
                                                            <td className="px-4 py-2 text-purple-300 max-w-[200px] truncate" title={row.branch}>{row.branch}</td>
                                                            <td className="px-4 py-2 text-emerald-400 font-medium whitespace-nowrap">{row.subjectCode}</td>
                                                            <td className="px-4 py-2 text-gray-400">{row.subjectName}</td>
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
                            className={`p-6 rounded-xl border ${result.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}
                        >
                            <div className="flex items-start gap-4">
                                {result.success ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                                ) : (
                                    <AlertTriangle className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <h3 className={`text-lg font-bold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.message}
                                    </h3>
                                    
                                    {result.success && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                            <div className="bg-black/20 p-4 rounded-lg">
                                                <p className="text-sm text-gray-400 mb-1">Created</p>
                                                <p className="text-2xl font-bold text-white">{result.successCount || 0}</p>
                                            </div>
                                            <div className="bg-black/20 p-4 rounded-lg">
                                                <p className="text-sm text-gray-400 mb-1">Updated</p>
                                                <p className="text-2xl font-bold text-blue-400">{result.updatedCount || 0}</p>
                                            </div>
                                            <div className="bg-black/20 p-4 rounded-lg">
                                                <p className="text-sm text-gray-400 mb-1">Skipped/Errors</p>
                                                <p className="text-2xl font-bold text-red-400">{result.errorCount || 0}</p>
                                            </div>
                                            <div className="bg-black/20 p-4 rounded-lg">
                                                <p className="text-sm text-gray-400 mb-1">Mode</p>
                                                <p className="text-sm font-bold text-purple-400 mt-2 uppercase">{result.parseMode || 'Standard'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {result.errors && result.errors.length > 0 && (
                                        <div className="mt-6 bg-black/40 rounded-lg p-4 border border-white/5 max-h-[200px] overflow-y-auto">
                                            <h4 className="text-sm font-medium text-red-300 mb-2 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" /> Import Warnings ({result.errors.length})
                                            </h4>
                                            <ul className="space-y-1">
                                                {result.errors.map((err: string, i: number) => (
                                                    <li key={i} className="text-xs text-red-200/80">• {err}</li>
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
                <div className="p-6 border-t border-white/10 bg-[#161616] flex justify-end gap-3">
                    <button
                        onClick={result && result.success ? onSuccess : onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                        disabled={loading}
                    >
                        {result && result.success ? 'Close' : 'Cancel'}
                    </button>
                    {!result || !result.success ? (
                        <button
                            onClick={handleImport}
                            disabled={!file || previewLoading || loading || previewData.length === 0}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg ${
                                !file || previewLoading || loading || previewData.length === 0
                                    ? 'bg-white/10 text-gray-500 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
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
