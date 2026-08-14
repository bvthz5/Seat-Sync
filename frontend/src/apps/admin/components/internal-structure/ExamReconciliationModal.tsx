import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle, Loader2, RefreshCw, ShieldCheck, UserCheck, UserX, AlertCircle, Layers } from 'lucide-react';
import { InternalStudentService } from '../../services/internalStudentService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    examId: number;
    subjectCode: string;
    subjectName: string;
    onReconciliationUpdated?: () => void;
}

export const ExamReconciliationModal: React.FC<Props> = ({
    isOpen,
    onClose,
    examId,
    subjectCode,
    subjectName,
    onReconciliationUpdated
}) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [reconciliation, setReconciliation] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'REGISTERED' | 'MISSING' | 'UNRESOLVED' | 'BREAKDOWN'>('REGISTERED');
    const [autoMapping, setAutoMapping] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReconciliation = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await InternalStudentService.getExamReconciliation(examId);
            if (res.success && res.reconciliation) {
                setReconciliation(res.reconciliation);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Error fetching reconciliation');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && examId) {
            fetchReconciliation();
        }
    }, [isOpen, examId]);

    const handleAutoMap = async () => {
        setAutoMapping(true);
        try {
            await InternalStudentService.autoMapStudents(examId);
            await fetchReconciliation();
            if (onReconciliationUpdated) onReconciliationUpdated();
        } catch (err: any) {
            setError(err.message || 'Auto-mapping failed');
        } finally {
            setAutoMapping(false);
        }
    };

    if (!isOpen) return null;

    const isVerified = reconciliation?.status === 'VERIFIED';
    const isMissing = reconciliation?.status === 'MISSING_STUDENTS';
    const isUnresolved = reconciliation?.status === 'UNRESOLVED_STUDENTS';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
                >
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base flex items-center gap-2">
                                    Reconciliation & Eligibility Audit
                                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-500/30 border border-indigo-400/30 text-indigo-200">
                                        {subjectCode}
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-300 font-medium truncate max-w-md">{subjectName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Modal Content Area */}
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {loading ? (
                            <div className="py-16 text-center text-slate-400 space-y-3">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                                <p className="text-xs font-extrabold">Auditing Student Eligibility & Registrations...</p>
                            </div>
                        ) : error ? (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold">
                                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                                <span>{error}</span>
                            </div>
                        ) : reconciliation ? (
                            <>
                                {/* Status Banner Card */}
                                <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
                                    isVerified 
                                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950' 
                                        : isUnresolved 
                                            ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                                            : 'bg-rose-50/90 border-rose-200 text-rose-950'
                                }`}>
                                    {isVerified ? (
                                        <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-black uppercase tracking-wider">
                                                Status: {reconciliation.status}
                                            </h4>
                                            <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-white border shadow-xs uppercase font-mono">
                                                Source: {reconciliation.eligibilitySource || 'MASTER_BATCH_RULE'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-semibold mt-1">{reconciliation.message}</p>
                                    </div>
                                </div>

                                {/* Metric Stat Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                                        <p className="text-[10px] font-black uppercase text-slate-500">Expected</p>
                                        <p className="text-2xl font-black text-slate-800 mt-1">{reconciliation.expectedCount || 0}</p>
                                    </div>
                                    <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 text-center">
                                        <p className="text-[10px] font-black uppercase text-emerald-700">Registered</p>
                                        <p className="text-2xl font-black text-emerald-600 mt-1">{reconciliation.registeredCount || 0}</p>
                                    </div>
                                    <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200 text-center">
                                        <p className="text-[10px] font-black uppercase text-rose-700">Missing</p>
                                        <p className="text-2xl font-black text-rose-600 mt-1">{reconciliation.missingCount || 0}</p>
                                    </div>
                                    <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 text-center">
                                        <p className="text-[10px] font-black uppercase text-amber-700">Unresolved</p>
                                        <p className="text-2xl font-black text-amber-600 mt-1">{reconciliation.unresolvedCount || 0}</p>
                                    </div>
                                    <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200 text-center col-span-2 md:col-span-1">
                                        <p className="text-[10px] font-black uppercase text-indigo-700">Seating Ready</p>
                                        <p className={`text-base font-black mt-2 uppercase ${isVerified ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {isVerified ? '✓ READY' : '✕ BLOCKED'}
                                        </p>
                                    </div>
                                </div>

                                {/* Navigation Tabs */}
                                <div className="flex border-b border-slate-200 gap-6 text-xs font-extrabold">
                                    <button
                                        onClick={() => setActiveTab('REGISTERED')}
                                        className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'REGISTERED' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Registered ({reconciliation.eligibleStudents?.length || 0})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('MISSING')}
                                        className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'MISSING' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Missing ({reconciliation.missingStudents?.length || 0})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('UNRESOLVED')}
                                        className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'UNRESOLVED' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Unresolved ({reconciliation.unresolvedStudents?.length || 0})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('BREAKDOWN')}
                                        className={`pb-2.5 transition-colors border-b-2 ${activeTab === 'BREAKDOWN' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Branch & Batch Breakdown
                                    </button>
                                </div>

                                {/* Tab Content View */}
                                <div className="border border-slate-200 rounded-2xl overflow-hidden min-h-[200px] max-h-[300px] overflow-y-auto">
                                    {activeTab === 'REGISTERED' && (
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-2">Reg No</th>
                                                    <th className="px-4 py-2">Name</th>
                                                    <th className="px-4 py-2">Branch</th>
                                                    <th className="px-4 py-2">Batch/Div</th>
                                                    <th className="px-4 py-2">Semester</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {reconciliation.eligibleStudents?.map((s: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 font-medium">
                                                        <td className="px-4 py-2 font-mono font-bold text-slate-800">{s.registerNumber}</td>
                                                        <td className="px-4 py-2 text-slate-900 font-bold">{s.fullName}</td>
                                                        <td className="px-4 py-2 text-indigo-600 font-bold">{s.departmentCode}</td>
                                                        <td className="px-4 py-2 text-slate-600">{s.batch} (Div {s.division})</td>
                                                        <td className="px-4 py-2 text-slate-700 font-bold">{s.semester}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {activeTab === 'MISSING' && (
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-rose-50 text-rose-800 font-bold border-b border-rose-200">
                                                <tr>
                                                    <th className="px-4 py-2">Reg No</th>
                                                    <th className="px-4 py-2">Name</th>
                                                    <th className="px-4 py-2">Branch</th>
                                                    <th className="px-4 py-2">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {reconciliation.missingStudents?.length > 0 ? (
                                                    reconciliation.missingStudents.map((s: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-rose-50/20 font-medium text-rose-900">
                                                            <td className="px-4 py-2 font-mono font-bold">{s.registerNumber}</td>
                                                            <td className="px-4 py-2 font-bold">{s.fullName}</td>
                                                            <td className="px-4 py-2 font-bold">{s.departmentCode}</td>
                                                            <td className="px-4 py-2 text-rose-700">{s.reason || 'Eligible but Unregistered'}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-bold">No missing students! All eligible students are registered.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {activeTab === 'UNRESOLVED' && (
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-amber-50 text-amber-800 font-bold border-b border-amber-200">
                                                <tr>
                                                    <th className="px-4 py-2">Pseudo Roll</th>
                                                    <th className="px-4 py-2">Admission No</th>
                                                    <th className="px-4 py-2">Roster Name</th>
                                                    <th className="px-4 py-2">Issue</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {reconciliation.unresolvedStudents?.length > 0 ? (
                                                    reconciliation.unresolvedStudents.map((s: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-amber-50/20 font-medium text-amber-900">
                                                            <td className="px-4 py-2 font-mono font-bold">{s.pseudoRoll}</td>
                                                            <td className="px-4 py-2 font-mono font-bold">{s.admissionNumber}</td>
                                                            <td className="px-4 py-2 font-bold">{s.studentName}</td>
                                                            <td className="px-4 py-2 text-amber-700">{s.reason || 'Missing in Master Student Registry'}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-bold">No unresolved students. All roster entries resolved to master registry!</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {activeTab === 'BREAKDOWN' && (
                                        <div className="p-4 space-y-4">
                                            <h5 className="text-xs font-black uppercase text-slate-500 tracking-wider">Branch-Wise Registration Breakdown</h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {reconciliation.branchBreakdown?.map((b: any, idx: number) => (
                                                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold">
                                                        <div>
                                                            <span className="font-mono text-indigo-600">{b.departmentCode}</span>
                                                            <span className="text-slate-600 block text-[10px] font-semibold">{b.departmentName}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-slate-800 font-black">{b.registered} / {b.expected}</span>
                                                            <span className={`block text-[10px] ${b.missing === 0 ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}`}>
                                                                {b.missing === 0 ? '✓ Complete' : `${b.missing} missing`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <button
                            onClick={fetchReconciliation}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-xs font-extrabold transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh Audit
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold rounded-xl h-10 px-5 text-xs transition-all"
                            >
                                Close
                            </button>

                            {reconciliation?.missingCount > 0 && (
                                <button
                                    onClick={handleAutoMap}
                                    disabled={autoMapping}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-6 text-xs transition-all shadow-md shadow-indigo-200 flex items-center gap-2"
                                >
                                    {autoMapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                    Auto-Map Missing Students ({reconciliation.missingCount})
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
