import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, CheckCircle2, AlertTriangle, Loader2, Info, Users, ArrowRight } from 'lucide-react';
import { InternalStudentService } from '../../services/internalStudentService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    examId?: number;
    initialCourseCode?: string;
    initialCourseName?: string;
}

export const SubjectEligibilityImportModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onSuccess,
    examId,
    initialCourseCode = '',
    initialCourseName = ''
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [courseCode, setCourseCode] = useState<string>(initialCourseCode);
    const [courseName, setCourseName] = useState<string>(initialCourseName);
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const res = await InternalStudentService.importSubjectEligibility(file, {
                manualCourseCode: courseCode,
                manualCourseName: courseName,
                examId
            });
            if (res.success) {
                setResult(res);
            } else {
                setError(res.message || 'Import failed');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Error importing subject eligibility list');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100"
                >
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-base">Import Subject Eligibility Roster</h3>
                                <p className="text-xs text-slate-500 font-medium">Upload subject-wise student list (Excel, CSV, PDF, Word)</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                        {/* Course Code / Name Manual Override (Optional) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Course Code</label>
                                <input
                                    type="text"
                                    value={courseCode}
                                    onChange={(e) => setCourseCode(e.target.value)}
                                    placeholder="e.g. 24SJMNECT529"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Subject Name (Optional)</label>
                                <input
                                    type="text"
                                    value={courseName}
                                    onChange={(e) => setCourseName(e.target.value)}
                                    placeholder="e.g. Medical Embedded Systems"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* File Upload Drop Area */}
                        {!result && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
                                    className="hidden"
                                />
                                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-3">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-extrabold text-slate-800">
                                    {file ? file.name : 'Click or drop subject list file here'}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 font-medium">
                                    Supports Excel (.xlsx), CSV, PDF & Word documents containing Admission Nos and Student Names
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold">
                                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Result Output Card */}
                        {result && (
                            <div className="space-y-4">
                                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-extrabold text-emerald-950">Subject Roster Imported Successfully!</h4>
                                            <p className="text-xs text-emerald-700 font-medium">Course Code: <span className="font-mono font-bold">{result.result?.subjectCode}</span></p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mt-4">
                                        <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
                                            <p className="text-[10px] font-black uppercase text-slate-400">Total Parsed</p>
                                            <p className="text-xl font-black text-slate-800">{result.result?.totalParsed || 0}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
                                            <p className="text-[10px] font-black uppercase text-slate-400">Matched Students</p>
                                            <p className="text-xl font-black text-emerald-600">{result.result?.resolvedCount || 0}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
                                            <p className="text-[10px] font-black uppercase text-slate-400">Unresolved</p>
                                            <p className="text-xl font-black text-amber-600">{result.result?.unresolvedCount || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Parsed Records Sample Table */}
                                {result.result?.records && result.result.records.length > 0 && (
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-2">Roll</th>
                                                    <th className="px-4 py-2">Admission No</th>
                                                    <th className="px-4 py-2">Student Name</th>
                                                    <th className="px-4 py-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {result.result.records.map((r: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 font-medium">
                                                        <td className="px-4 py-2 font-mono text-indigo-600 font-bold">{r.pseudoRoll}</td>
                                                        <td className="px-4 py-2 font-mono font-bold text-slate-800">{r.admissionNumber}</td>
                                                        <td className="px-4 py-2 text-slate-700">{r.studentName}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                                                                r.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                {r.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button
                            onClick={result ? () => { onSuccess(); onClose(); } : onClose}
                            className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold rounded-xl h-10 px-5 text-xs transition-all"
                            disabled={loading}
                        >
                            {result ? 'Done' : 'Cancel'}
                        </button>
                        {!result && (
                            <button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className={`flex items-center gap-2 font-bold rounded-xl h-10 px-6 text-xs transition-all shadow-md ${
                                    !file || loading
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                                }`}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                Upload & Parse Roster
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
