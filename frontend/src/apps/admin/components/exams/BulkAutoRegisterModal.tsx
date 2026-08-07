import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Progress, Chip } from '@heroui/react';
import { 
    UserCheck, 
    Sparkles, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    BookOpen, 
    Layers, 
    Check,
    X,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import { InternalStudentService } from '../../services/internalStudentService';
import toast from 'react-hot-toast';

interface BulkAutoRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    seriesId: string;
    seriesName: string;
    totalExamsCount: number;
    onSuccess: () => void;
}

const STAGES = [
    { title: "Initializing Registration Engine", desc: "Setting up database transactions and active student indexes..." },
    { title: "Matching Academic Criteria", desc: "Filtering active students by department codes, programs, and semester levels..." },
    { title: "Generating Exam Registrations", desc: "Assigning eligible students to exam rosters across series subjects..." },
    { title: "Syncing & Finalizing", desc: "Completing transaction logs and verifying enrollment records..." }
];

export const BulkAutoRegisterModal: React.FC<BulkAutoRegisterModalProps> = ({
    isOpen,
    onClose,
    seriesId,
    seriesName,
    totalExamsCount,
    onSuccess
}) => {
    const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [stageIndex, setStageIndex] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [summary, setSummary] = useState<{
        totalMapped: number;
        totalMatched: number;
        examsProcessed: number;
        message: string;
    } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const timerRef = useRef<any>(null);
    const progressIntervalRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        if (isOpen) {
            startRegistration();
        } else {
            resetState();
        }
        return () => {
            clearInterval(timerRef.current);
            clearInterval(progressIntervalRef.current);
        };
    }, [isOpen]);

    const resetState = () => {
        setStatus('idle');
        setProgress(0);
        setStageIndex(0);
        setElapsedMs(0);
        setSummary(null);
        setErrorMessage('');
        clearInterval(timerRef.current);
        clearInterval(progressIntervalRef.current);
    };

    const startRegistration = async () => {
        if (!seriesId) return;

        setStatus('running');
        setProgress(5);
        setStageIndex(0);
        setElapsedMs(0);
        setSummary(null);
        setErrorMessage('');

        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            setElapsedMs(Date.now() - startTimeRef.current);
        }, 80);

        // Smooth simulated progress
        progressIntervalRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev < 30) {
                    setStageIndex(0);
                    return prev + Math.random() * 8;
                } else if (prev < 65) {
                    setStageIndex(1);
                    return prev + Math.random() * 6;
                } else if (prev < 90) {
                    setStageIndex(2);
                    return prev + Math.random() * 4;
                } else if (prev < 95) {
                    setStageIndex(3);
                    return prev + 0.5;
                }
                return prev;
            });
        }, 300);

        try {
            const res = await InternalStudentService.bulkAutoMapSeries(parseInt(seriesId));
            clearInterval(progressIntervalRef.current);

            if (res.success) {
                setProgress(100);
                setStageIndex(3);
                setStatus('completed');
                setSummary({
                    totalMapped: res.totalMapped || 0,
                    totalMatched: res.totalMatched || 0,
                    examsProcessed: res.examsProcessed || totalExamsCount || 0,
                    message: res.message || 'Bulk auto registration completed successfully!'
                });
                toast.success(`Successfully registered students across ${res.examsProcessed || totalExamsCount} exams!`);
            } else {
                setStatus('error');
                setErrorMessage(res.message || 'Failed to auto register students.');
                toast.error(res.message || 'Auto registration failed');
            }
        } catch (err: any) {
            clearInterval(progressIntervalRef.current);
            setStatus('error');
            const msg = err.response?.data?.message || 'Server error occurred during bulk auto registration.';
            setErrorMessage(msg);
            toast.error(msg);
        } finally {
            clearInterval(timerRef.current);
        }
    };

    if (!isOpen) return null;

    const formattedTime = (elapsedMs / 1000).toFixed(1);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="relative p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-inner">
                                    <UserCheck className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Chip size="sm" variant="flat" className="bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-400/30">
                                            {seriesName || 'Exam Series'}
                                        </Chip>
                                    </div>
                                    <h2 className="text-xl font-black tracking-tight text-white mt-1">
                                        Bulk Auto Registration
                                    </h2>
                                </div>
                            </div>
                            
                            {status !== 'running' && (
                                <button
                                    onClick={onClose}
                                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-6 sm:p-8 space-y-6">
                        {status === 'running' && (
                            <div className="space-y-6">
                                {/* Timer Badge & Status */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                                        <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
                                        <span>Processing Examinations...</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 font-mono font-bold text-xs px-3 py-1.5 rounded-full border border-slate-200">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        <span>{formattedTime}s</span>
                                    </div>
                                </div>

                                {/* Progress Bar Card */}
                                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                                    <div className="flex justify-between items-center text-sm font-black">
                                        <span className="text-slate-800 tracking-tight">Overall Progress</span>
                                        <span className="text-indigo-600 font-mono">{Math.round(progress)}%</span>
                                    </div>
                                    <Progress
                                        value={progress}
                                        color="secondary"
                                        size="md"
                                        radius="full"
                                        classNames={{
                                            indicator: "bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"
                                        }}
                                    />
                                </div>

                                {/* Live Stage Card */}
                                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                        <Layers className="w-4 h-4 animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="text-indigo-950 font-bold text-sm">
                                            {STAGES[stageIndex]?.title}
                                        </h4>
                                        <p className="text-indigo-900/70 text-xs mt-0.5 leading-relaxed">
                                            {STAGES[stageIndex]?.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {status === 'completed' && summary && (
                            <div className="space-y-6">
                                {/* Success Header Card */}
                                <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                                        <CheckCircle2 className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-emerald-950 text-base">
                                            Auto Registration Complete!
                                        </h3>
                                        <p className="text-emerald-800 text-xs mt-0.5">
                                            Finished in <span className="font-bold">{formattedTime} seconds</span>. All eligible students are registered.
                                        </p>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Exams</p>
                                        <p className="text-2xl font-black text-slate-900 mt-1">{summary.examsProcessed}</p>
                                    </div>
                                    <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-4 text-center">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">New Mapped</p>
                                        <p className="text-2xl font-black text-emerald-700 mt-1">{summary.totalMapped}</p>
                                    </div>
                                    <div className="bg-indigo-50/60 border border-indigo-200/60 rounded-2xl p-4 text-center">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Total Matched</p>
                                        <p className="text-2xl font-black text-indigo-700 mt-1">{summary.totalMatched}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-4">
                                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-rose-950 text-base">Registration Failed</h3>
                                        <p className="text-rose-800 text-xs mt-1 leading-relaxed">
                                            {errorMessage}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                        {status === 'running' ? (
                            <Button
                                isDisabled
                                className="bg-slate-200 text-slate-500 font-bold rounded-xl text-sm"
                            >
                                Processing...
                            </Button>
                        ) : status === 'completed' ? (
                            <Button
                                onPress={() => {
                                    onSuccess();
                                    onClose();
                                }}
                                className="bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 hover:bg-indigo-700 rounded-xl text-sm px-6"
                            >
                                Done & Refresh
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="flat"
                                    onPress={onClose}
                                    className="text-slate-600 font-bold rounded-xl text-sm"
                                >
                                    Close
                                </Button>
                                <Button
                                    onPress={startRegistration}
                                    className="bg-indigo-600 text-white font-bold rounded-xl text-sm px-6"
                                >
                                    Retry
                                </Button>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
