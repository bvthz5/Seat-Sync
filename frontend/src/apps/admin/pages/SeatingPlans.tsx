import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    LayoutGrid, ChevronDown, Zap, Save, Trash2, Printer,
    Building2, Users, CheckCircle2, AlertCircle, X, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SeatingService } from '../services/seatingService';

/* ─── Types ─────────────────────────────────────────────── */
interface Hall { RoomID: number; RoomCode: string; Capacity: number; TotalRows: number; BenchesPerRow: number; SeatsPerBench: number; }
interface Dept { DepartmentID: number; DepartmentName: string; DepartmentCode: string; studentCount: number; }
interface SeatInfo { SeatID: number; RowLabel: string; BenchNumber: number; SeatNumber: number; }
interface Bench { rowLabel: string; benchNumber: number; seats: SeatInfo[]; }
interface Assignment { seatId: number; studentId: number; studentName: string; registerNumber: string; deptCode: string; side: 'left' | 'right'; }
interface Exam { ExamID: number; Title?: string; SubjectName?: string; ExamDate?: string; }

/* ─── Helpers ───────────────────────────────────────────── */
const deptColor = (code: string) => {
    const palette: Record<string, { bg: string; text: string; border: string }> = {
        CSE: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
        MCA: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
        ECE: { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
        EEE: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
        ME: { bg: '#fefce8', text: '#a16207', border: '#fde68a' },
        CE: { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' },
        MBA: { bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8' },
        IT: { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
    };
    const key = code.toUpperCase().replace(/\s/g, '');
    return palette[key] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
};

/* ─── Sub-components ────────────────────────────────────── */
const KpiCard = ({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent: string }) => (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center gap-3 hover:shadow-md transition-all">
        <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center shrink-0`}>{icon}</div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
        </div>
    </div>
);

const DeptBadge = ({ code }: { code: string }) => {
    const c = deptColor(code);
    return (
        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ background: c.bg, color: c.text, borderColor: c.border }}>
            {code}
        </span>
    );
};

/* ─── Main Component ────────────────────────────────────── */
const SeatingPlans: React.FC = () => {
    /* ── state ── */
    const [exams, setExams] = useState<Exam[]>([]);
    const [halls, setHalls] = useState<Hall[]>([]);
    const [departments, setDepartments] = useState<Dept[]>([]);

    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
    const [selectedHallId, setSelectedHallId] = useState<number | null>(null);
    const [leftDeptId, setLeftDeptId] = useState<number | null>(null);
    const [rightDeptId, setRightDeptId] = useState<number | null>(null);

    const [benches, setBenches] = useState<Bench[]>([]);
    const [totalSeats, setTotalSeats] = useState(0);
    const [assignments, setAssignments] = useState<Record<number, Assignment>>({});

    const [isLoadingLayout, setIsLoadingLayout] = useState(false);
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showPrint, setShowPrint] = useState(false);

    /* ── derived ── */
    const selectedHall = halls.find(h => h.RoomID === selectedHallId);
    const selectedExam = exams.find(e => e.ExamID === selectedExamId);
    const filledCount = Object.keys(assignments).length;
    const fillPct = totalSeats > 0 ? Math.round((filledCount / totalSeats) * 100) : 0;

    /* ── initial data ── */
    useEffect(() => {
        const load = async () => {
            // Load each independently so one failure doesn't block the rest
            try {
                const examData = await SeatingService.getExams();
                setExams(Array.isArray(examData) ? examData : []);
            } catch (e: any) {
                console.error('Failed to load exams:', e?.response?.data || e?.message);
                toast.error('Failed to load exams');
            }

            try {
                const hallData = await SeatingService.getHalls();
                setHalls(Array.isArray(hallData) ? hallData : []);
            } catch (e: any) {
                console.error('Failed to load halls:', e?.response?.data || e?.message);
                toast.error('Failed to load halls');
            }

            try {
                const deptData = await SeatingService.getDepartments();
                setDepartments(Array.isArray(deptData) ? deptData : []);
            } catch (e: any) {
                console.error('Failed to load departments:', e?.response?.data || e?.message);
                toast.error('Failed to load departments');
            }
        };
        load();
    }, []);

    /* ── load hall layout when hall or exam changes ── */
    const loadHallLayout = useCallback(async (hallId: number) => {
        setIsLoadingLayout(true);
        setAssignments({});
        setBenches([]);
        try {
            const layout = await SeatingService.getHallLayout(hallId);
            setBenches(layout.benches || []);
            setTotalSeats(layout.totalSeats || 0);

            // Load existing allocation if exam is also selected
            if (selectedExamId) {
                try {
                    const existing = await SeatingService.getAllocationForHall(selectedExamId, hallId);
                    setAssignments(existing.assignments || {});
                } catch { /* no existing allocation */ }
            }
        } catch {
            toast.error('Failed to load hall layout');
        } finally {
            setIsLoadingLayout(false);
        }
    }, [selectedExamId]);

    useEffect(() => {
        if (selectedHallId) loadHallLayout(selectedHallId);
        else { setBenches([]); setTotalSeats(0); setAssignments({}); }
    }, [selectedHallId, loadHallLayout]);

    /* ── auto assign ── */
    const handleAutoAssign = async () => {
        if (!selectedExamId || !selectedHallId) {
            toast.error('Please select an exam and a hall first');
            return;
        }
        if (!leftDeptId && !rightDeptId) {
            toast.error('Please select at least one department');
            return;
        }
        setIsAutoAssigning(true);
        try {
            const result = await SeatingService.autoAssign({
                examId: selectedExamId,
                hallId: selectedHallId,
                leftDeptId,
                rightDeptId,
            });
            setAssignments(result.assignments || {});
            toast.success(`Auto-assigned: ${result.leftAssigned} left + ${result.rightAssigned} right students`);
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Auto-assign failed');
        } finally {
            setIsAutoAssigning(false);
        }
    };

    /* ── save ── */
    const handleSave = async () => {
        if (!selectedExamId || !selectedHallId) return;
        setIsSaving(true);
        try {
            const payload = Object.values(assignments).map(a => ({ seatId: a.seatId, studentId: a.studentId }));
            await SeatingService.saveAllocation({ examId: selectedExamId, hallId: selectedHallId, assignments: payload });
            toast.success('Seating arrangement saved!');
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    /* ── clear ── */
    const handleClear = async () => {
        if (!selectedExamId || !selectedHallId) return;
        setIsClearing(true);
        try {
            await SeatingService.clearAllocation(selectedExamId, selectedHallId);
            setAssignments({});
            setShowClearConfirm(false);
            toast.success('Hall allocation cleared');
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Clear failed');
        } finally {
            setIsClearing(false);
        }
    };

    /* ── print ── */
    const printableRows = benches.map(b => ({
        row: b.rowLabel,
        bench: b.benchNumber,
        left: assignments[b.seats.find(s => s.SeatNumber === 1)?.SeatID ?? -1],
        right: assignments[b.seats.find(s => s.SeatNumber === 2)?.SeatID ?? -1],
    }));

    /* ═══════════════════ RENDER ═══════════════════════════ */
    return (
        <div className="min-h-screen bg-[#F7F8FA]">

            {/* ── Page Header ───────────────────────────── */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-[1300px] mx-auto px-8 py-6">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Exam Management</p>
                            <h1 className="text-[28px] font-bold text-slate-900 leading-tight mb-1">Seating Arrangement</h1>
                            <p className="text-slate-500 text-sm max-w-[520px] leading-relaxed">
                                Assign students to halls and desks. Select an exam, pick a hall, choose
                                departments for left and right seats, then auto-assign or fill manually.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 shrink-0">
                            {selectedHallId && selectedExamId && (
                                <>
                                    <button
                                        onClick={() => setShowPrint(true)}
                                        className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
                                    >
                                        <Printer size={15} /> Export / Print
                                    </button>
                                    <button
                                        onClick={() => setShowClearConfirm(true)}
                                        className="h-10 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 font-semibold text-sm flex items-center gap-2 hover:bg-rose-100 transition-colors"
                                    >
                                        <Trash2 size={15} /> Clear Hall
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving || filledCount === 0}
                                        className="h-10 px-5 rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
                                    >
                                        {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1300px] mx-auto px-8 py-7 flex flex-col gap-6">

                {/* ── Step 1: Exam + Hall selector ──────────── */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                        Step 1 — Select Exam &amp; Hall
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Exam */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">Exam</label>
                            <div className="relative">
                                <select
                                    className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 font-medium outline-none appearance-none cursor-pointer focus:border-slate-400 focus:bg-white transition-colors"
                                    value={selectedExamId ?? ''}
                                    onChange={e => setSelectedExamId(e.target.value ? Number(e.target.value) : null)}
                                >
                                    <option value="">Select an exam…</option>
                                    {exams.map((ex: any) => (
                                        <option key={ex.ExamID} value={ex.ExamID}>
                                            {ex.Title || ex.SubjectName || `Exam #${ex.ExamID}`}
                                            {ex.ExamDate ? ` — ${new Date(ex.ExamDate).toLocaleDateString()}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Hall */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">Hall / Room</label>
                            <div className="relative">
                                <select
                                    className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 font-medium outline-none appearance-none cursor-pointer focus:border-slate-400 focus:bg-white transition-colors"
                                    value={selectedHallId ?? ''}
                                    onChange={e => setSelectedHallId(e.target.value ? Number(e.target.value) : null)}
                                >
                                    <option value="">Select a hall…</option>
                                    {halls.map(h => (
                                        <option key={h.RoomID} value={h.RoomID}>
                                            {h.RoomCode} — {h.Capacity} seats
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── KPI row ───────────────────────────────── */}
                {selectedHall && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <KpiCard label="Total Seats" value={totalSeats} icon={<LayoutGrid size={18} className="text-slate-500" />} accent="bg-slate-100" />
                        <KpiCard label="Filled" value={filledCount} icon={<CheckCircle2 size={18} className="text-emerald-600" />} accent="bg-emerald-50" />
                        <KpiCard label="Remaining" value={totalSeats - filledCount} icon={<AlertCircle size={18} className="text-amber-500" />} accent="bg-amber-50" />
                        <KpiCard label="Capacity" value={`${fillPct}%`} icon={<Users size={18} className="text-blue-600" />} accent="bg-blue-50" />
                    </div>
                )}

                {/* ── Step 2: Department assignment ─────────── */}
                {selectedHallId && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                            Step 2 — Assign Departments (Left / Right Desk Side)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Left */}
                            <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-3 h-3 rounded-sm bg-blue-500" />
                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Left Side</span>
                                    <span className="text-[10px] text-slate-400 ml-auto">Seat #1 on each bench</span>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full h-11 px-4 pr-10 rounded-xl border border-blue-200 bg-white text-sm text-slate-800 font-medium outline-none appearance-none cursor-pointer focus:border-blue-400 transition-colors"
                                        value={leftDeptId ?? ''}
                                        onChange={e => setLeftDeptId(e.target.value ? Number(e.target.value) : null)}
                                    >
                                        <option value="">None / Skip left side</option>
                                        {departments.map(d => (
                                            <option key={d.DepartmentID} value={d.DepartmentID}>
                                                {d.DepartmentName} ({d.DepartmentCode}) — {d.studentCount} students
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                {leftDeptId && (
                                    <p className="mt-2 text-xs text-blue-600 font-medium">
                                        {departments.find(d => d.DepartmentID === leftDeptId)?.studentCount ?? 0} students available
                                    </p>
                                )}
                            </div>

                            {/* Right */}
                            <div className="border border-emerald-100 bg-emerald-50/40 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Right Side</span>
                                    <span className="text-[10px] text-slate-400 ml-auto">Seat #2 on each bench</span>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full h-11 px-4 pr-10 rounded-xl border border-emerald-200 bg-white text-sm text-slate-800 font-medium outline-none appearance-none cursor-pointer focus:border-emerald-400 transition-colors"
                                        value={rightDeptId ?? ''}
                                        onChange={e => setRightDeptId(e.target.value ? Number(e.target.value) : null)}
                                    >
                                        <option value="">None / Skip right side</option>
                                        {departments.map(d => (
                                            <option key={d.DepartmentID} value={d.DepartmentID}>
                                                {d.DepartmentName} ({d.DepartmentCode}) — {d.studentCount} students
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                {rightDeptId && (
                                    <p className="mt-2 text-xs text-emerald-600 font-medium">
                                        {departments.find(d => d.DepartmentID === rightDeptId)?.studentCount ?? 0} students available
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Auto-assign button */}
                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={handleAutoAssign}
                                disabled={isAutoAssigning || !selectedExamId}
                                className="h-11 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-200 disabled:opacity-50"
                            >
                                {isAutoAssigning ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                                {isAutoAssigning ? 'Assigning...' : 'Auto Assign'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Hall Grid ──────────────────────── */}
                {selectedHallId && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center gap-3">
                            <Building2 size={16} className="text-slate-500" />
                            <span className="font-bold text-slate-800 text-sm">
                                {selectedHall?.RoomCode} — Hall Preview
                            </span>
                            <span className="ml-auto text-xs text-slate-400 font-medium">
                                {benches.length} benches · {totalSeats} seats total
                            </span>
                        </div>

                        {/* Legend */}
                        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
                                <span className="text-[11px] text-slate-500 font-medium">Left dept seat</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                                <span className="text-[11px] text-slate-500 font-medium">Right dept seat</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
                                <span className="text-[11px] text-slate-500 font-medium">Unassigned</span>
                            </div>
                        </div>

                        {/* Grid */}
                        {isLoadingLayout ? (
                            <div className="flex items-center justify-center py-24">
                                <RefreshCw size={28} className="text-slate-300 animate-spin" />
                            </div>
                        ) : benches.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                    <LayoutGrid size={28} className="text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-semibold text-sm">No seats configured for this hall</p>
                                <p className="text-slate-400 text-xs mt-1">Go to College Structure to add seats to this room</p>
                            </div>
                        ) : (
                            <div className="px-6 py-5">
                                {/* Group by row */}
                                {Array.from(new Set(benches.map(b => b.rowLabel))).sort().map(row => (
                                    <div key={row} className="mb-5">
                                        {/* Row label */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                                {row}
                                            </div>
                                            <div className="flex-1 h-px bg-slate-100" />
                                        </div>

                                        {/* Benches in this row */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                            {benches
                                                .filter(b => b.rowLabel === row)
                                                .sort((a, b) => a.benchNumber - b.benchNumber)
                                                .map(bench => {
                                                    const leftSeat = bench.seats.find(s => s.SeatNumber === 1);
                                                    const rightSeat = bench.seats.find(s => s.SeatNumber === 2);
                                                    const leftAssign = leftSeat ? assignments[leftSeat.SeatID] : undefined;
                                                    const rightAssign = rightSeat ? assignments[rightSeat.SeatID] : undefined;

                                                    return (
                                                        <div key={bench.benchNumber}
                                                            className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                            {/* Bench header */}
                                                            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                    Bench {bench.benchNumber}
                                                                </span>
                                                                <span className="text-[10px] text-slate-300 font-mono">
                                                                    {row}{bench.benchNumber}
                                                                </span>
                                                            </div>

                                                            {/* Desk visual: 2 seats side by side */}
                                                            <div className="flex divide-x divide-slate-100">
                                                                {/* Left seat */}
                                                                <div className={`flex-1 p-2.5 min-h-[80px] flex flex-col justify-between ${leftAssign ? 'bg-blue-50/60' : 'bg-white'}`}>
                                                                    <span className="text-[9px] font-bold text-blue-400 uppercase mb-1">Left</span>
                                                                    {leftAssign ? (
                                                                        <div>
                                                                            <p className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2">{leftAssign.studentName}</p>
                                                                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{leftAssign.registerNumber}</p>
                                                                            <div className="mt-1">
                                                                                <DeptBadge code={leftAssign.deptCode} />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-[10px] text-slate-300 italic">Unassigned</p>
                                                                    )}
                                                                </div>

                                                                {/* Right seat */}
                                                                <div className={`flex-1 p-2.5 min-h-[80px] flex flex-col justify-between ${rightAssign ? 'bg-emerald-50/60' : 'bg-white'}`}>
                                                                    <span className="text-[9px] font-bold text-emerald-500 uppercase mb-1">Right</span>
                                                                    {rightAssign ? (
                                                                        <div>
                                                                            <p className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2">{rightAssign.studentName}</p>
                                                                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{rightAssign.registerNumber}</p>
                                                                            <div className="mt-1">
                                                                                <DeptBadge code={rightAssign.deptCode} />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-[10px] text-slate-300 italic">Unassigned</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Bottom action bar */}
                        {benches.length > 0 && (
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                {/* Capacity bar */}
                                <div className="flex items-center gap-3 flex-1 mr-8">
                                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                        {filledCount} / {totalSeats} seats filled
                                    </span>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${fillPct}%`,
                                                background: fillPct === 100
                                                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                                    : fillPct > 60
                                                        ? 'linear-gradient(90deg, #3b82f6, #6366f1)'
                                                        : 'linear-gradient(90deg, #f59e0b, #ef4444)'
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{fillPct}%</span>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || filledCount === 0}
                                    className="h-9 px-5 rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    {isSaving ? 'Saving...' : 'Save Arrangement'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Empty state (no hall selected) ──────────── */}
                {!selectedHallId && (
                    <div className="bg-white border border-slate-200 rounded-2xl py-24 text-center shadow-sm">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-5">
                            <LayoutGrid size={36} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">No Hall Selected</h3>
                        <p className="text-slate-400 text-sm max-w-[360px] mx-auto leading-relaxed">
                            Select an exam and a hall above to start building the seating arrangement.
                        </p>
                    </div>
                )}
            </div>

            {/* ══ Clear Confirmation Modal ══════════════════ */}
            {showClearConfirm && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setShowClearConfirm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200">
                        <div className="px-8 pt-8 pb-8 text-center">
                            <div className="flex items-center justify-center mb-5">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg,#fff1f2,#fecdd3)', border: '1px solid #fecaca' }}>
                                    <Trash2 size={26} className="text-rose-500" strokeWidth={1.75} />
                                </div>
                            </div>
                            <h3 className="text-[18px] font-bold text-slate-900 mb-2">Clear Hall Allocation?</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                All seat assignments for <span className="font-semibold text-slate-800">{selectedHall?.RoomCode}</span> will be permanently removed
                                for this exam. This cannot be undone.
                            </p>
                            <div className="my-6 h-px bg-slate-100" />
                            <div className="flex gap-3">
                                <button onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 h-11 rounded-xl font-semibold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleClear} disabled={isClearing}
                                    className="flex-1 h-11 rounded-xl font-bold text-sm text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-md disabled:opacity-70">
                                    {isClearing ? 'Clearing...' : 'Clear Hall'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ══ Print / Export Modal ══════════════════════ */}
            {showPrint && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setShowPrint(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden border border-slate-200"
                        style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        {/* Print header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-lg font-bold text-slate-900">Seating Chart — {selectedHall?.RoomCode}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {selectedExam?.Title || selectedExam?.SubjectName || `Exam #${selectedExamId}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => window.print()}
                                    className="h-9 px-4 rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center gap-2">
                                    <Printer size={14} /> Print
                                </button>
                                <button onClick={() => setShowPrint(false)}
                                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Printable table */}
                        <div className="p-6">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="border border-slate-200 px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Row</th>
                                        <th className="border border-slate-200 px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Bench</th>
                                        <th className="border border-slate-200 px-3 py-2.5 text-left text-xs font-bold text-blue-600 uppercase tracking-wider">Left Seat</th>
                                        <th className="border border-slate-200 px-3 py-2.5 text-left text-xs font-bold text-blue-600 uppercase tracking-wider">Reg No (L)</th>
                                        <th className="border border-slate-200 px-3 py-2.5 text-left text-xs font-bold text-emerald-600 uppercase tracking-wider">Right Seat</th>
                                        <th className="border border-slate-200 px-3 py-2.5 text-left text-xs font-bold text-emerald-600 uppercase tracking-wider">Reg No (R)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {printableRows.map((r, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                            <td className="border border-slate-200 px-3 py-2 font-bold text-slate-700">{r.row}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-slate-500">{r.bench}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-slate-800">{r.left?.studentName || '—'}</td>
                                            <td className="border border-slate-200 px-3 py-2 font-mono text-xs text-slate-500">{r.left?.registerNumber || '—'}</td>
                                            <td className="border border-slate-200 px-3 py-2 text-slate-800">{r.right?.studentName || '—'}</td>
                                            <td className="border border-slate-200 px-3 py-2 font-mono text-xs text-slate-500">{r.right?.registerNumber || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {printableRows.length === 0 && (
                                <p className="text-center text-slate-400 py-8 text-sm">No assignments to display</p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SeatingPlans;
