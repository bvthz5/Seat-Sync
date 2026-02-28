import React, { useEffect, useState, useCallback } from 'react';
import {
    Card, CardBody, CardHeader, Button, Select, SelectItem,
    Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Divider, Tooltip, Progress,
    Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input
} from '@heroui/react';
import {
    LayoutGrid, Zap, Save, Trash2, Printer,
    Building2, Users, CheckCircle2, AlertCircle, RefreshCw,
    Calendar, Sun, Moon, Armchair, ClipboardList, ChevronRight, Ban, Eye,
    MoreVertical, Pencil, Power, XCircle, Shuffle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SeatingService } from '../services/seatingService';
import api from '../../../services/api';

/* ─── Types ───────────────────────────────────────── */
interface Hall { RoomID: number; RoomCode: string; Capacity: number; TotalRows: number; BenchesPerRow: number; SeatsPerBench: number; }
interface Dept { DepartmentID: number; DepartmentName: string; DepartmentCode: string; studentCount: number; }
interface SeatInfo { SeatID: number; RowLabel: string; BenchNumber: number; SeatNumber: number; IsActive: boolean; }
interface Bench { rowLabel: string; benchNumber: number; seats: SeatInfo[]; }
interface Assignment { seatId: number; studentId: number; studentName: string; registerNumber: string; deptCode: string; side: 'left' | 'right'; }
interface Series { ExamSeriesID: number; SeriesName: string; IsActive: boolean; }
interface ExamDateSlot { examDate: string; session: string; examCount: number; }
interface HallSummary { hallId: number; hallCode: string; capacity: number; totalSeats: number; filledSeats: number; }

/* ─── High-End Dark NASA Theme Colors ───────────────────────────── */
const DARK_DEPT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    // Cool blues, teals, and soft purples/pinks to match the blueprint theme (No oranges/yellows)
    CSE: { bg: 'rgba(56, 189, 248, 0.05)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },     // Light Blue
    CS: { bg: 'rgba(56, 189, 248, 0.05)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },
    MCA: { bg: 'rgba(45, 212, 191, 0.05)', text: '#2dd4bf', border: 'rgba(45, 212, 191, 0.3)' },     // Teal
    CA: { bg: 'rgba(45, 212, 191, 0.05)', text: '#2dd4bf', border: 'rgba(45, 212, 191, 0.3)' },      // Teal (Explicit mapping for CA)
    ECE: { bg: 'rgba(167, 139, 250, 0.05)', text: '#a78bfa', border: 'rgba(167, 139, 250, 0.3)' },   // Soft Amethyst
    EC: { bg: 'rgba(167, 139, 250, 0.05)', text: '#a78bfa', border: 'rgba(167, 139, 250, 0.3)' },
    EEE: { bg: 'rgba(232, 121, 249, 0.05)', text: '#e879f9', border: 'rgba(232, 121, 249, 0.3)' },   // Soft Fuchsia
    EE: { bg: 'rgba(232, 121, 249, 0.05)', text: '#e879f9', border: 'rgba(232, 121, 249, 0.3)' },
    ME: { bg: 'rgba(96, 165, 250, 0.05)', text: '#60a5fa', border: 'rgba(96, 165, 250, 0.3)' },      // Sky Blue
    CE: { bg: 'rgba(16, 185, 129, 0.05)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },      // Emerald
    MBA: { bg: 'rgba(244, 114, 182, 0.05)', text: '#f472b6', border: 'rgba(244, 114, 182, 0.3)' },   // Soft Pink
    BA: { bg: 'rgba(244, 114, 182, 0.05)', text: '#f472b6', border: 'rgba(244, 114, 182, 0.3)' },
    IT: { bg: 'rgba(129, 140, 248, 0.05)', text: '#818cf8', border: 'rgba(129, 140, 248, 0.3)' },    // Indigo
};

const getDeptStyle = (code: string) => {
    if (DARK_DEPT_COLORS[code]) return DARK_DEPT_COLORS[code];
    const hash = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const keys = Object.keys(DARK_DEPT_COLORS);
    return DARK_DEPT_COLORS[keys[hash % keys.length]] || { bg: 'rgba(148, 163, 184, 0.05)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
};

const fmtDate = (iso: string) => {
    try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
};

/* ═══════════════════════════════════════════════════ */
const SeatingPlans: React.FC = () => {
    const [seriesList, setSeriesList] = useState<Series[]>([]);
    const [examDates, setExamDates] = useState<ExamDateSlot[]>([]);
    const [halls, setHalls] = useState<Hall[]>([]);
    const [departments, setDepartments] = useState<Dept[]>([]);
    const [hallSummary, setHallSummary] = useState<HallSummary[]>([]);

    const [selectedSeries, setSelectedSeries] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedSession, setSelectedSession] = useState<'FN' | 'AN'>('FN');
    const [leftDept, setLeftDept] = useState<string>('');
    const [rightDept, setRightDept] = useState<string>('');
    const [selectedHallIds, setSelectedHallIds] = useState<Set<number>>(new Set());

    const [assigning, setAssigning] = useState(false);
    const [shuffling, setShuffling] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);

    /* detail modal */
    const [detailHall, setDetailHall] = useState<HallSummary | null>(null);
    const [detailBenches, setDetailBenches] = useState<Bench[]>([]);
    const [detailAssignments, setDetailAssignments] = useState<Record<number, Assignment>>({});
    const [detailTotalSeats, setDetailTotalSeats] = useState(0);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);

    /* edit capacity modal */
    const [editHall, setEditHall] = useState<HallSummary | null>(null);
    const [editCapacity, setEditCapacity] = useState<string>('');

    /* derived */
    const availableDates = [...new Set(examDates.filter(d => d.session === selectedSession).map(d => d.examDate))].sort();
    const currentSlot = examDates.find(d => d.examDate === selectedDate && d.session === selectedSession);
    const totalFilled = hallSummary.reduce((s, h) => s + h.filledSeats, 0);
    const totalCapacity = hallSummary.reduce((s, h) => s + h.totalSeats, 0);
    const detailFilled = Object.keys(detailAssignments).length;
    const detailHallObj = halls.find(h => h.RoomID === detailHall?.hallId);

    const toggleHall = (id: number) => {
        setSelectedHallIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const selectAllHalls = () => setSelectedHallIds(new Set(hallSummary.map(h => h.hallId)));
    const clearHallSelection = () => setSelectedHallIds(new Set());

    /* initial load */
    useEffect(() => {
        (async () => {
            try { setSeriesList(await SeatingService.getSeries().then(r => Array.isArray(r) ? r : [])); } catch { }
            try { setExamDates(await SeatingService.getExamDates().then(r => Array.isArray(r) ? r : [])); } catch { toast.error('Failed to load exam dates'); }
            try { setHalls(await SeatingService.getHalls().then(r => Array.isArray(r) ? r : [])); } catch { toast.error('Failed to load halls'); }
            try { setDepartments(await SeatingService.getDepartments().then(r => Array.isArray(r) ? r : [])); } catch { toast.error('Failed to load departments'); }
        })();
    }, []);

    useEffect(() => {
        SeatingService.getExamDates(selectedSeries ? Number(selectedSeries) : undefined)
            .then(r => { setExamDates(Array.isArray(r) ? r : []); setSelectedDate(''); })
            .catch(() => { });
    }, [selectedSeries]);

    const loadSummary = useCallback(async () => {
        if (!selectedDate) { setHallSummary([]); return; }
        setLoadingSummary(true);
        try {
            const data = await SeatingService.getAllocationSummary(selectedDate, selectedSession);
            setHallSummary(Array.isArray(data) ? data : []);
        } catch { toast.error('Failed to load summary'); }
        finally { setLoadingSummary(false); }
    }, [selectedDate, selectedSession]);

    useEffect(() => { loadSummary(); }, [loadSummary]);

    /* bulk assign */
    const handleBulkAssign = async () => {
        if (!selectedDate) { toast.error('Select an exam date first'); return; }
        const ids = selectedHallIds.size > 0 ? [...selectedHallIds] : hallSummary.map(h => h.hallId);
        if (ids.length === 0) { toast.error('No halls available'); return; }
        if (!leftDept && !rightDept) { toast.error('Select at least one department'); return; }
        setAssigning(true);
        try {
            const r = await SeatingService.bulkAssign({
                examDate: selectedDate, session: selectedSession, hallIds: ids,
                leftDeptId: leftDept ? Number(leftDept) : null, rightDeptId: rightDept ? Number(rightDept) : null,
            });
            toast.success(`Assigned ${r.totalLeftAssigned + r.totalRightAssigned} students across ${r.hallResults.length} halls`);
            loadSummary();
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Bulk assign failed'); }
        finally { setAssigning(false); }
    };

    /* global shuffle */
    const executeShuffleGlobal = async () => {
        if (!selectedDate || !selectedSession) return;
        setShuffling(true);
        setShowShuffleConfirm(false); // Close the modal
        try {
            const r = await SeatingService.shuffleGlobal({ examDate: selectedDate, session: selectedSession });
            toast.success(r.message || 'Halls shuffled locally successfully');
            loadSummary();
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Shuffle failed'); }
        finally { setShuffling(false); }
    };

    const handleShuffleGlobal = () => {
        if (!selectedDate || !selectedSession) return;
        setShowShuffleConfirm(true);
    };

    /* detail modal */
    const openHallDetail = async (hs: HallSummary) => {
        setDetailHall(hs); setDetailLoading(true); setDetailBenches([]); setDetailAssignments({});
        try {
            const layout = await SeatingService.getHallLayout(hs.hallId);
            setDetailBenches(layout.benches || []); setDetailTotalSeats(layout.totalSeats || 0);
            if (selectedDate) {
                try { const alloc = await SeatingService.getAllocationForHall(selectedDate, selectedSession, hs.hallId); if (alloc?.assignments) setDetailAssignments(alloc.assignments); } catch { }
            }
        } catch { toast.error('Failed to load hall'); }
        finally { setDetailLoading(false); }
    };

    const handleClearHall = async () => {
        if (!detailHall || !selectedDate) return;
        try { await SeatingService.clearAllocation(selectedDate, selectedSession, detailHall.hallId); setDetailAssignments({}); toast.success('Hall cleared'); loadSummary(); } catch { toast.error('Failed to clear'); }
    };

    const handleSaveHall = async () => {
        if (!detailHall || !selectedDate) return;
        try {
            await SeatingService.saveAllocation({ examDate: selectedDate, session: selectedSession, hallId: detailHall.hallId, assignments: Object.values(detailAssignments).map(a => ({ seatId: a.seatId, studentId: a.studentId })) });
            toast.success('Saved');
        } catch { toast.error('Failed to save'); }
    };

    /* card-level actions */
    const handleCardClearHall = async (h: HallSummary) => {
        if (!selectedDate) return;
        if (!confirm(`Clear all allocations for ${h.hallCode}?`)) return;
        try { await SeatingService.clearAllocation(selectedDate, selectedSession, h.hallId); toast.success(`${h.hallCode} cleared`); loadSummary(); } catch { toast.error('Failed to clear'); }
    };

    const handleDisableHall = async (h: HallSummary) => {
        if (!confirm(`Disable ${h.hallCode}? It will be hidden from future assignments.`)) return;
        try {
            await api.patch(`/rooms/${h.hallId}/disable`);
            toast.success(`${h.hallCode} disabled`);
            setHalls(prev => prev.filter(r => r.RoomID !== h.hallId));
            loadSummary();
        } catch { toast.error('Failed to disable hall'); }
    };

    const handleUpdateCapacity = async () => {
        if (!editHall) return;
        const cap = parseInt(editCapacity);
        if (isNaN(cap) || cap < 1) { toast.error('Enter a valid capacity'); return; }
        try {
            await api.put(`/rooms/${editHall.hallId}`, { Capacity: cap });
            toast.success(`${editHall.hallCode} capacity updated to ${cap}`);
            setHalls(prev => prev.map(r => r.RoomID === editHall.hallId ? { ...r, Capacity: cap } : r));
            setEditHall(null);
            loadSummary();
        } catch { toast.error('Failed to update capacity'); }
    };

    /* ═══════════ RENDER ══════════════════════════════ */
    return (
        <div className="pb-12 bg-[#05080f] min-h-[calc(100vh-3.5rem)] font-sans text-slate-300 antialiased selection:bg-indigo-500/30 selection:text-indigo-200" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(30,58,138,0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(49,46,129,0.15), transparent 40%)' }}>
            {/* Header */}
            <div className="pt-6 px-8 max-w-[1920px] mx-auto">
                <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
                    <span className="w-2 h-6 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></span>
                    Seating Arrangement
                </h1>
                <p className="text-slate-400 text-sm font-medium mt-2 max-w-2xl leading-relaxed">
                    Select an exam slot and departments, then assign students across halls at once.
                </p>
            </div>

            <div className="px-8 py-6 max-w-[1920px] mx-auto">
                <div className="flex flex-col xl:flex-row gap-8 items-start">

                    {/* ═══════ LEFT PANEL ═══════ */}
                    <div className="w-full xl:w-[380px] shrink-0 xl:sticky xl:top-2 z-10 flex flex-col gap-3">

                        {/* ── Exam Slot Section ── */}
                        <Card className="border border-[#1e293b] shadow-2xl bg-[#0b1221]/80 backdrop-blur-xl rounded-2xl overflow-hidden">
                            <CardHeader className="flex gap-3 bg-[#0d1627]/90 border-b border-[#1e293b] px-4 py-3 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg relative z-10">
                                    <ClipboardList size={16} strokeWidth={2} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-[13px] font-semibold text-white tracking-wide">Exam Slot</h3>
                                    <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Series · Date · Session</p>
                                </div>
                            </CardHeader>
                            <CardBody className="px-4 py-3 flex flex-col gap-3">
                                {/* Series */}
                                <div className="space-y-1">
                                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Building2 size={10} className="text-slate-500" /> Series
                                        <span className="text-slate-500 normal-case font-normal">(opt)</span>
                                    </span>
                                    <Select aria-label="Exam Series" placeholder="— All Series —" variant="bordered"
                                        selectedKeys={selectedSeries ? [selectedSeries] : []}
                                        onSelectionChange={(k) => setSelectedSeries(Array.from(k)[0] as string || '')}
                                        classNames={{
                                            trigger: "bg-[#0d1424] border border-[#1e293b] shadow-inner rounded-lg data-[hover=true]:border-indigo-500/50 data-[hover=true]:bg-[#0f172a] transition-all h-9 text-slate-200 text-xs",
                                            popoverContent: "bg-[#0d1424] border border-[#1e293b] text-slate-200"
                                        }}>
                                        {seriesList.map(s => <SelectItem key={String(s.ExamSeriesID)} className="data-[hover=true]:bg-indigo-500/10 data-[hover=true]:text-indigo-300">{s.SeriesName}</SelectItem>)}
                                    </Select>
                                </div>

                                {/* Session */}
                                <div className="space-y-1">
                                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={10} className="text-slate-500" /> Session
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['FN', 'AN'] as const).map(s => (
                                            <button key={s} onClick={() => { setSelectedSession(s); setSelectedDate(''); }}
                                                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all border ${selectedSession === s
                                                    ? s === 'FN'
                                                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[inset_0_0_15px_rgba(99,102,241,0.1)]'
                                                        : 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-[inset_0_0_15px_rgba(249,115,22,0.1)]'
                                                    : 'bg-[#0d1424] text-slate-400 border-[#1e293b] hover:bg-[#0f172a] hover:border-slate-700 hover:text-slate-300'
                                                    }`}
                                            >
                                                {s === 'FN' ? <Sun size={12} className={selectedSession === s ? "text-indigo-400" : "text-slate-500"} /> : <Moon size={12} className={selectedSession === s ? "text-orange-400" : "text-slate-500"} />}
                                                {s === 'FN' ? 'Forenoon' : 'Afternoon'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="space-y-1">
                                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar size={10} className="text-slate-500" /> Date
                                    </span>
                                    <Select aria-label="Exam Date" placeholder="Select date" variant="bordered"
                                        selectedKeys={selectedDate ? [selectedDate] : []}
                                        onSelectionChange={(k) => setSelectedDate(Array.from(k)[0] as string || '')}
                                        classNames={{
                                            trigger: "bg-[#0d1424] border border-[#1e293b] shadow-inner rounded-lg data-[hover=true]:border-indigo-500/50 data-[hover=true]:bg-[#0f172a] transition-all h-9 text-slate-200 text-xs",
                                            popoverContent: "bg-[#0d1424] border border-[#1e293b] text-slate-200"
                                        }}>
                                        {availableDates.map(d => {
                                            const slot = examDates.find(ed => ed.examDate === d && ed.session === selectedSession);
                                            return <SelectItem key={d} className="data-[hover=true]:bg-indigo-500/10 data-[hover=true]:text-indigo-300">{fmtDate(d)} — {slot?.examCount || 0} exam{(slot?.examCount || 0) !== 1 ? 's' : ''}</SelectItem>;
                                        })}
                                    </Select>
                                </div>

                                {selectedDate && currentSlot && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d1424] border border-[#1e293b] shadow-inner">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.8)] animate-pulse" />
                                        <span className="text-[10px] font-medium text-slate-300 tracking-wide">
                                            {fmtDate(selectedDate)} · {selectedSession === 'FN' ? 'FN' : 'AN'} · <span className="text-white font-semibold">{currentSlot.examCount} exam{currentSlot.examCount !== 1 ? 's' : ''}</span>
                                        </span>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        {/* ── Assignment Setup Section ── */}
                        <Card className="border border-[#1e293b] shadow-2xl bg-[#0b1221]/80 backdrop-blur-xl rounded-2xl overflow-hidden">
                            <CardHeader className="flex gap-3 bg-[#0d1627]/90 border-b border-[#1e293b] px-4 py-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-[30px] -translate-y-1/2 -translate-x-1/2"></div>
                                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg relative z-10">
                                    <Users size={16} strokeWidth={2} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-[13px] font-semibold text-white tracking-wide">Assignment Setup</h3>
                                    <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Departments · Halls · Auto-Assign</p>
                                </div>
                            </CardHeader>
                            <CardBody className="px-4 py-3 flex flex-col gap-3">
                                {/* Departments side-by-side */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            <ChevronRight size={10} className="text-slate-500" /> Left Dept
                                        </span>
                                        <Select aria-label="Left Department" placeholder="— None —" variant="bordered"
                                            selectedKeys={leftDept ? [leftDept] : []}
                                            onSelectionChange={(k) => setLeftDept(Array.from(k)[0] as string || '')}
                                            classNames={{
                                                trigger: "bg-[#0d1424] border border-[#1e293b] shadow-inner rounded-lg data-[hover=true]:border-emerald-500/50 data-[hover=true]:bg-[#0f172a] transition-all h-9 text-slate-200 text-xs",
                                                popoverContent: "bg-[#0d1424] border border-[#1e293b] text-slate-200"
                                            }}>
                                            {departments.map(d => <SelectItem key={String(d.DepartmentID)} className="data-[hover=true]:bg-emerald-500/10 data-[hover=true]:text-emerald-300">{d.DepartmentName} ({d.studentCount})</SelectItem>)}
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            <ChevronRight size={10} className="rotate-180 text-slate-500" /> Right Dept
                                        </span>
                                        <Select aria-label="Right Department" placeholder="— None —" variant="bordered"
                                            selectedKeys={rightDept ? [rightDept] : []}
                                            onSelectionChange={(k) => setRightDept(Array.from(k)[0] as string || '')}
                                            classNames={{
                                                trigger: "bg-[#0d1424] border border-[#1e293b] shadow-inner rounded-lg data-[hover=true]:border-emerald-500/50 data-[hover=true]:bg-[#0f172a] transition-all h-9 text-slate-200 text-xs",
                                                popoverContent: "bg-[#0d1424] border border-[#1e293b] text-slate-200"
                                            }}>
                                            {departments.map(d => <SelectItem key={String(d.DepartmentID)} className="data-[hover=true]:bg-emerald-500/10 data-[hover=true]:text-emerald-300">{d.DepartmentName} ({d.studentCount})</SelectItem>)}
                                        </Select>
                                    </div>
                                </div>

                                {/* Hall selector — compact chip grid */}
                                {hallSummary.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Armchair size={10} className="text-slate-500" /> Halls
                                                <span className="text-slate-500 normal-case font-normal tracking-normal">(empty = all)</span>
                                            </span>
                                            <div className="flex items-center gap-0.5 bg-[#0d1424] border border-[#1e293b] rounded-md p-0.5">
                                                <button onClick={selectAllHalls} className="text-[9px] font-medium text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-[#1e293b] transition-colors">All</button>
                                                <span className="text-[#1e293b]">|</span>
                                                <button onClick={clearHallSelection} className="text-[9px] font-medium text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-[#1e293b] transition-colors">None</button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto dark-scrollbar pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#64748b #1e293b' }}>
                                            {hallSummary.map(h => {
                                                const isSelected = selectedHallIds.has(h.hallId);
                                                const pct = h.totalSeats > 0 ? Math.round((h.filledSeats / h.totalSeats) * 100) : 0;
                                                return (
                                                    <button key={h.hallId} onClick={() => toggleHall(h.hallId)}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-200 border ${isSelected
                                                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)] scale-[1.02]'
                                                            : pct >= 100
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/15'
                                                                : pct > 0
                                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/15'
                                                                    : 'bg-[#0d1424] text-slate-400 border-[#1e293b] hover:border-slate-600 hover:text-slate-300'
                                                            }`}
                                                    >
                                                        {h.hallCode}
                                                        {pct > 0 && !isSelected && (
                                                            <span className="text-[8px] font-mono opacity-80 bg-black/20 px-1 py-0.5 rounded">{pct}%</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {selectedHallIds.size > 0 && (
                                            <p className="text-[9px] text-indigo-400 font-medium tracking-wide">{selectedHallIds.size} hall{selectedHallIds.size > 1 ? 's' : ''} selected</p>
                                        )}
                                    </div>
                                )}

                                {/* Assign & Shuffle Buttons */}
                                <div className="flex gap-2">
                                    <Button onPress={handleBulkAssign} isLoading={assigning}
                                        isDisabled={!selectedDate || (!leftDept && !rightDept)}
                                        className="flex-1 font-bold text-white shadow-[0_0_20px_rgba(79,70,229,0.2)] bg-indigo-600 hover:bg-indigo-500 rounded-xl h-10 border border-indigo-500/50 hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all data-[disabled=true]:opacity-50 text-sm"
                                        startContent={!assigning ? <Zap size={16} fill="currentColor" /> : undefined} size="md"
                                    >
                                        {assigning ? 'Assigning…' : `Assign${selectedHallIds.size > 0 ? '' : ' All'}`}
                                    </Button>

                                    <Button onPress={handleShuffleGlobal} isLoading={shuffling}
                                        isDisabled={!selectedDate || totalFilled === 0}
                                        className="font-bold text-white shadow-[0_0_20px_rgba(236,72,153,0.2)] bg-pink-600 hover:bg-pink-500 rounded-xl h-10 w-10 min-w-10 px-0 border border-pink-500/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all data-[disabled=true]:opacity-50 text-sm"
                                        title="Shuffle All Assigned Students"
                                    >
                                        {!shuffling && <Shuffle size={16} />}
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>

                        {/* ── Stats Row (compact) ── */}
                        {selectedDate && hallSummary.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0b1221]/80 border border-[#1e293b] backdrop-blur-xl">
                                <Progress value={totalCapacity > 0 ? (totalFilled / totalCapacity) * 100 : 0} size="sm" className="flex-1"
                                    classNames={{ indicator: `rounded-full transition-all duration-500 ${totalFilled >= totalCapacity ? 'bg-emerald-500' : 'bg-indigo-500'} shadow-[0_0_8px_currentColor]`, track: "rounded-full bg-[#0d1424] border border-[#1e293b]" }}
                                />
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex items-center gap-1">
                                        <LayoutGrid size={11} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-white">{hallSummary.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <CheckCircle2 size={11} className="text-emerald-400" />
                                        <span className="text-[10px] font-bold text-emerald-400">{totalFilled}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <AlertCircle size={11} className="text-amber-400" />
                                        <span className="text-[10px] font-bold text-amber-400">{totalCapacity - totalFilled}</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-slate-300">{totalFilled}<span className="text-slate-500">/{totalCapacity}</span></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══════ RIGHT: HALL CARDS ═══════ */}
                    <div className="flex-1 min-w-0">
                        {selectedDate ? (
                            loadingSummary ? (
                                <Card className="border border-[#1e293b] shadow-2xl bg-[#0b1221]/80 backdrop-blur-xl rounded-[20px] min-h-[400px]">
                                    <CardBody className="py-20 text-center flex flex-col justify-center items-center">
                                        <RefreshCw size={28} className="text-indigo-400 animate-spin mb-5 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                                        <p className="text-slate-300 font-medium tracking-wide">Loading hall status…</p>
                                    </CardBody>
                                </Card>
                            ) : hallSummary.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#1e293b] pb-4 px-2">
                                        <div>
                                            <h2 className="text-[17px] font-semibold text-white tracking-wide flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-lg bg-[#0d1424] border border-[#1e293b] flex items-center justify-center text-indigo-400">
                                                    <LayoutGrid size={16} />
                                                </span>
                                                {fmtDate(selectedDate)} · {selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}
                                            </h2>
                                            <p className="text-[12px] text-slate-400 font-medium mt-2 pl-[44px]">{hallSummary.length} halls · {totalFilled}/{totalCapacity} seats filled</p>
                                        </div>
                                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#0d1424] border border-[#1e293b]">
                                            <div className="text-right">
                                                <span className={`text-[15px] font-bold block ${totalFilled >= totalCapacity && totalCapacity > 0 ? 'text-emerald-400' : totalFilled > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                                                    {totalCapacity > 0 ? Math.round((totalFilled / totalCapacity) * 100) : 0}%
                                                </span>
                                                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">filled</span>
                                            </div>
                                            <Progress value={totalCapacity > 0 ? (totalFilled / totalCapacity) * 100 : 0} size="sm" className="w-20"
                                                classNames={{ indicator: `rounded-full transition-all duration-500 ${totalFilled >= totalCapacity ? 'bg-emerald-500' : totalFilled > 0 ? 'bg-amber-400' : 'bg-slate-400'}`, track: "bg-[#1e293b]" }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
                                        {hallSummary.map((h) => {
                                            const pct = h.totalSeats > 0 ? Math.round((h.filledSeats / h.totalSeats) * 100) : 0;
                                            const isFull = pct >= 100;
                                            const hasData = pct > 0;
                                            return (
                                                <div key={h.hallId}
                                                    className={`relative rounded-[20px] border p-6 group transition-all duration-300 hover:-translate-y-1 ${isFull ? 'bg-[#0d1424]/80 border-emerald-500/30 hover:border-emerald-400/80 shadow-[0_4px_20px_rgba(16,185,129,0.05)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]'
                                                        : hasData ? 'bg-[#0d1424]/80 border-amber-500/30 hover:border-amber-400/80 shadow-[0_4px_20px_rgba(245,158,11,0.05)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]'
                                                            : 'bg-[#0b1221]/80 border-[#1e293b] hover:border-indigo-500/50 hover:bg-[#0d1424] hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)]'}`}
                                                >
                                                    {/* Glowing top lip */}
                                                    <div className={`absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[20px] ${isFull ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : hasData ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-indigo-400 shadow-[0_0_10px_#818cf8]'}`}></div>

                                                    {/* Three-dot menu */}
                                                    <div className="absolute top-4 right-4 z-10">
                                                        <Dropdown placement="bottom-end">
                                                            <DropdownTrigger>
                                                                <button onClick={(e) => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-[#1e293b] transition-all opacity-0 group-hover:opacity-100">
                                                                    <MoreVertical size={16} />
                                                                </button>
                                                            </DropdownTrigger>
                                                            <DropdownMenu aria-label="Hall actions"
                                                                classNames={{ base: 'bg-[#0f1729] border border-[#1e293b] rounded-xl shadow-2xl min-w-[180px]', list: 'gap-0' }}
                                                                onAction={(key) => {
                                                                    if (key === 'edit') { setEditHall(h); setEditCapacity(String(h.capacity)); }
                                                                    else if (key === 'clear') { handleCardClearHall(h); }
                                                                    else if (key === 'disable') { handleDisableHall(h); }
                                                                }}>
                                                                <DropdownItem key="edit" startContent={<Pencil size={14} className="text-blue-400" />}
                                                                    className="text-slate-300 data-[hover]:bg-[#1e293b] data-[hover]:text-white rounded-lg" textValue="Edit Capacity">
                                                                    <span className="text-[12px] font-medium">Edit Capacity</span>
                                                                </DropdownItem>
                                                                <DropdownItem key="clear" startContent={<XCircle size={14} className="text-amber-400" />}
                                                                    className="text-slate-300 data-[hover]:bg-[#1e293b] data-[hover]:text-white rounded-lg" textValue="Clear Allocations"
                                                                    isDisabled={!hasData}>
                                                                    <span className="text-[12px] font-medium">Clear Allocations</span>
                                                                </DropdownItem>
                                                                <DropdownItem key="disable" startContent={<Power size={14} className="text-rose-400" />}
                                                                    className="text-rose-400 data-[hover]:bg-rose-500/10 data-[hover]:text-rose-300 rounded-lg" textValue="Disable Hall">
                                                                    <span className="text-[12px] font-medium">Disable Hall</span>
                                                                </DropdownItem>
                                                            </DropdownMenu>
                                                        </Dropdown>
                                                    </div>

                                                    <div className="flex items-center gap-4 mb-5 cursor-pointer" onClick={() => openHallDetail(h)}>
                                                        <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors border ${isFull ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : hasData ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#1e293b]/50 border-transparent text-slate-500 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20'}`}>
                                                            <Armchair size={22} strokeWidth={2} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[17px] font-bold text-white tracking-wide">{h.hallCode}</h4>
                                                            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Capacity {h.capacity}</p>
                                                        </div>
                                                    </div>

                                                    <div className="cursor-pointer" onClick={() => openHallDetail(h)}>
                                                        <Progress value={pct} size="sm"
                                                            color={isFull ? 'success' : hasData ? 'warning' : 'default'}
                                                            classNames={{ indicator: "rounded-full transition-all duration-500", track: "rounded-full bg-[#1e293b]" }}
                                                            className="mb-4"
                                                        />

                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className={`text-[15px] font-bold ${isFull ? 'text-emerald-400' : hasData ? 'text-amber-400' : 'text-slate-300'}`}>{h.filledSeats}</span>
                                                                <span className="text-[11px] text-slate-500 font-medium"> / {h.totalSeats} seats</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-white transition-colors flex items-center gap-1.5 uppercase tracking-widest bg-[#1e293b]/50 group-hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-lg border border-transparent group-hover:border-indigo-500/30">
                                                                <Eye size={12} /> View
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <Card className="border border-[#1e293b] shadow-2xl bg-[#0b1221]/80 backdrop-blur-xl rounded-[20px] min-h-[400px]">
                                    <CardBody className="py-24 text-center flex flex-col items-center justify-center">
                                        <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-6">
                                            <AlertCircle size={36} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                                        </div>
                                        <p className="text-white font-semibold text-[17px] tracking-wide">No Halls Found</p>
                                        <p className="text-slate-400 text-sm mt-2 font-medium">No active halls are available.</p>
                                    </CardBody>
                                </Card>
                            )
                        ) : (
                            <Card className="border border-[#1e293b] shadow-2xl bg-[#0b1221]/80 backdrop-blur-xl rounded-[20px] min-h-[500px]">
                                <CardBody className="py-24 text-center flex flex-col items-center justify-center">
                                    <div className="p-6 bg-[#0d1424] border border-[#1e293b] rounded-3xl mb-8 group hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all">
                                        <Calendar size={48} className="text-slate-600 group-hover:text-indigo-400 transition-colors" strokeWidth={1.5} />
                                    </div>
                                    <p className="text-[19px] font-bold text-slate-200 tracking-wide">Select an Exam Date</p>
                                    <p className="text-slate-400 text-[13px] mt-3 max-w-[320px] mx-auto leading-relaxed font-medium">
                                        Choose a series, session, and date from the panel to see hall availability and assign students.
                                    </p>
                                </CardBody>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ HALL DETAIL — BLUEPRINT FLOOR PLAN ═══ */}
            <Modal isOpen={!!detailHall} onOpenChange={(open) => { if (!open) { setDetailHall(null); loadSummary(); } }} backdrop="blur" size="full" scrollBehavior="inside"
                classNames={{
                    backdrop: "bg-black/60 backdrop-blur-xl",
                    base: "max-w-[96vw] max-h-[94vh] m-auto rounded-2xl bg-[#171c28] border border-[#253040] shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col",
                    body: "p-0 overflow-y-auto flex-1"
                }}>
                <ModalContent>
                    {() => (<>
                        {/* ── Refined Header ── */}
                        <ModalHeader className="shrink-0 flex justify-between items-center px-8 py-4 border-b border-[#253040] sticky top-0 z-50" style={{ background: 'linear-gradient(180deg, #1d2335 0%, #171c28 100%)' }}>
                            <div className="flex items-center gap-5">
                                <div className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-900/25">
                                    <Armchair size={20} className="text-white" />
                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#171c28] border border-[#253040] rounded-md text-[8px] font-extrabold text-amber-400 tracking-widest whitespace-nowrap">
                                        {detailHall?.hallCode}
                                    </div>
                                </div>
                                <div className="ml-1">
                                    <h2 className="text-[17px] font-bold text-white tracking-tight">Seating Layout</h2>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] font-medium text-slate-400">{selectedDate && fmtDate(selectedDate)}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span className="text-[10px] font-medium text-slate-400">{selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span className="text-[10px] font-bold text-emerald-400">{detailFilled}<span className="text-slate-500 font-normal"> / {detailTotalSeats}</span></span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {detailFilled > 0 && (<>
                                    <Button size="sm" variant="flat" onPress={handleSaveHall}
                                        className="font-semibold text-[11px] text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 rounded-lg h-8 px-4 transition-all" startContent={<Save size={13} />}>Save</Button>
                                    <Button size="sm" variant="flat" onPress={() => setShowPrintModal(true)}
                                        className="font-semibold text-[11px] text-slate-300 bg-slate-500/10 hover:bg-slate-500/15 border border-slate-500/20 rounded-lg h-8 px-4 transition-all" startContent={<Printer size={13} />}>Print</Button>
                                    <Button size="sm" variant="flat" onPress={handleClearHall}
                                        className="font-semibold text-[11px] text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg h-8 px-4 transition-all" startContent={<Trash2 size={13} />}>Clear</Button>
                                </>)}
                            </div>
                        </ModalHeader>

                        {/* ── Body with subtle grid pattern ── */}
                        <ModalBody className="p-8" style={{
                            backgroundColor: '#141824',
                            backgroundImage: `
                                linear-gradient(rgba(37,48,64,0.3) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(37,48,64,0.3) 1px, transparent 1px)
                            `,
                            backgroundSize: '40px 40px'
                        }}>
                            {detailLoading ? (
                                <div className="py-32 text-center">
                                    <RefreshCw size={28} className="text-amber-400 animate-spin mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium text-sm">Loading layout…</p>
                                </div>
                            ) : (
                                <div>
                                    {/* Department Legend */}
                                    {detailFilled > 0 && (
                                        <div className="flex items-center gap-3 mb-8">
                                            {(() => {
                                                const depts = new Set<string>();
                                                Object.values(detailAssignments).forEach(a => depts.add(a.deptCode));
                                                return [...depts].map(d => {
                                                    const st = getDeptStyle(d);
                                                    return (
                                                        <div key={d} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide bg-[#1d2335] border border-[#253040]"
                                                            style={{ color: st.text }}>
                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.text, boxShadow: `0 0 8px ${st.text}50` }} />
                                                            {d}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}

                                    {/* ── Bench Grid — Desk-style ── */}
                                    <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${detailHallObj?.BenchesPerRow || 6}, minmax(0, 1fr))` }}>
                                        {detailBenches.map((bench) => {
                                            const ls = bench.seats.find(s => s.SeatNumber === 1);
                                            const rs = bench.seats.find(s => s.SeatNumber === 2);
                                            const la = ls ? detailAssignments[ls.SeatID] : undefined;
                                            const ra = rs ? detailAssignments[rs.SeatID] : undefined;
                                            const lSt = la ? getDeptStyle(la.deptCode) : null;
                                            const rSt = ra ? getDeptStyle(ra.deptCode) : null;
                                            const ld = ls && !ls.IsActive;
                                            const rd = rs && !rs.IsActive;
                                            return (
                                                <div key={`${bench.rowLabel}-${bench.benchNumber}`} className="group">
                                                    {/* ─── DESK TOP (the shared desk/table) ─── */}
                                                    <div className="bg-gradient-to-r from-[#2a3245] to-[#252d40] rounded-t-xl px-3 py-1.5 flex items-center justify-between border border-b-0 border-[#344058] group-hover:from-[#303a50] group-hover:to-[#2a3348] transition-all">
                                                        <span className="text-[9px] font-extrabold text-slate-400 group-hover:text-slate-200 tracking-[0.2em] uppercase transition-colors">
                                                            {bench.rowLabel}{bench.benchNumber}
                                                        </span>
                                                        <span className="text-[8px] text-slate-500 font-mono">
                                                            ROW {bench.rowLabel}
                                                        </span>
                                                    </div>

                                                    {/* ─── TWO SEATS (chairs at the desk) ─── */}
                                                    <div className="grid grid-cols-2 gap-[2px]">
                                                        {/* Left Seat */}
                                                        <Tooltip content={ld ? 'Disabled' : la ? `${la.registerNumber} — ${la.studentName}` : 'Empty'} delay={200} classNames={{ content: 'bg-[#1d2335] text-white text-[11px] font-medium rounded-lg border border-[#344058] shadow-2xl' }}>
                                                            <div className={`relative rounded-bl-xl overflow-hidden cursor-default transition-all duration-200 ${ld ? '' : 'hover:brightness-110'}`}
                                                                style={{
                                                                    background: ld
                                                                        ? 'repeating-linear-gradient(45deg, #1a1f2e, #1a1f2e 3px, #1e2436 3px, #1e2436 6px)'
                                                                        : la ? '#1a2035' : '#181d2b',
                                                                    borderLeft: lSt && !ld ? `3px solid ${lSt.text}` : '3px solid transparent',
                                                                    borderBottom: `1px solid ${lSt && !ld ? lSt.text + '30' : '#253040'}`,
                                                                    borderRight: '1px solid #253040'
                                                                }}>
                                                                <div className="px-3 py-4 min-h-[80px] flex flex-col items-center justify-center text-center">
                                                                    {ld ? <Ban size={16} className="text-slate-600" />
                                                                        : la ? (
                                                                            <div className="flex flex-col items-center w-full gap-1.5">
                                                                                <span className="text-[13px] font-bold font-mono tracking-wide w-full leading-none" style={{ color: lSt!.text }}>{la.registerNumber}</span>
                                                                                <span className="text-[9px] text-slate-400 font-medium w-full truncate leading-none">{la.studentName}</span>
                                                                            </div>
                                                                        )
                                                                            : (
                                                                                <div className="flex flex-col items-center gap-1">
                                                                                    <Armchair size={14} className="text-slate-700" />
                                                                                    <span className="text-[8px] text-slate-600 font-medium">EMPTY</span>
                                                                                </div>
                                                                            )}
                                                                </div>
                                                            </div>
                                                        </Tooltip>

                                                        {/* Right Seat */}
                                                        <Tooltip content={rd ? 'Disabled' : ra ? `${ra.registerNumber} — ${ra.studentName}` : 'Empty'} delay={200} classNames={{ content: 'bg-[#1d2335] text-white text-[11px] font-medium rounded-lg border border-[#344058] shadow-2xl' }}>
                                                            <div className={`relative rounded-br-xl overflow-hidden cursor-default transition-all duration-200 ${rd ? '' : 'hover:brightness-110'}`}
                                                                style={{
                                                                    background: rd
                                                                        ? 'repeating-linear-gradient(45deg, #1a1f2e, #1a1f2e 3px, #1e2436 3px, #1e2436 6px)'
                                                                        : ra ? '#1a2035' : '#181d2b',
                                                                    borderRight: rSt && !rd ? `3px solid ${rSt.text}` : '3px solid transparent',
                                                                    borderBottom: `1px solid ${rSt && !rd ? rSt.text + '30' : '#253040'}`,
                                                                    borderLeft: '1px solid #253040'
                                                                }}>
                                                                <div className="px-3 py-4 min-h-[80px] flex flex-col items-center justify-center text-center">
                                                                    {rd ? <Ban size={16} className="text-slate-600" />
                                                                        : ra ? (
                                                                            <div className="flex flex-col items-center w-full gap-1.5">
                                                                                <span className="text-[13px] font-bold font-mono tracking-wide w-full leading-none" style={{ color: rSt!.text }}>{ra.registerNumber}</span>
                                                                                <span className="text-[9px] text-slate-400 font-medium w-full truncate leading-none">{ra.studentName}</span>
                                                                            </div>
                                                                        )
                                                                            : (
                                                                                <div className="flex flex-col items-center gap-1">
                                                                                    <Armchair size={14} className="text-slate-700" />
                                                                                    <span className="text-[8px] text-slate-600 font-medium">EMPTY</span>
                                                                                </div>
                                                                            )}
                                                                </div>
                                                            </div>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </ModalBody>
                    </>)}
                </ModalContent>
            </Modal>
            {/* ═══ Edit Capacity Modal ═══ */}
            <Modal isOpen={!!editHall} onOpenChange={(open) => { if (!open) setEditHall(null); }} backdrop="blur" size="md">
                <ModalContent className="bg-[#151923] border border-[#2d3348] rounded-[24px] shadow-2xl">
                    <ModalHeader className="border-b border-[#2d3348]/60 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                <Pencil size={18} />
                            </div>
                            <div>
                                <h3 className="text-[17px] font-bold text-white tracking-wide">Edit Capacity</h3>
                                <p className="text-[12px] text-slate-400 font-medium">{editHall?.hallCode}</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="p-6">
                        <label className="text-[13px] font-semibold text-slate-300 mb-2 block">New Room Capacity</label>
                        <Input
                            type="number"
                            value={editCapacity}
                            onValueChange={setEditCapacity}
                            placeholder="e.g. 60"
                            classNames={{
                                inputWrapper: "bg-[#1a1f2e] border-2 border-[#2d3348] hover:border-blue-500/50 focus-within:border-blue-500! rounded-xl h-14 shadow-inner",
                                input: "text-white text-[15px] font-bold"
                            }}
                            startContent={<Users size={18} className="text-slate-500 mr-2" />}
                            autoFocus
                        />
                        <p className="text-[12px] text-slate-500 mt-3 flex items-start gap-2 leading-relaxed">
                            <AlertCircle size={14} className="mt-0.5 shrink-0 text-blue-400" />
                            Updating the capacity will not affect the current physical bench layout. It only limits how many students can be auto-assigned.
                        </p>
                    </ModalBody>
                    <ModalFooter className="border-t border-[#2d3348]/60 px-6 py-4">
                        <Button variant="light" onPress={() => setEditHall(null)} className="text-slate-400 hover:text-white font-medium text-[13px]">Cancel</Button>
                        <Button onPress={handleUpdateCapacity} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[13px] shadow-lg shadow-blue-600/20">Save Capacity</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* ═══ Print Modal (Clean White layout for actual printing) ═══ */}
            <Modal isOpen={showPrintModal} onOpenChange={setShowPrintModal} backdrop="blur" size="2xl" scrollBehavior="inside">
                <ModalContent>
                    {(onClose) => (<>
                        <ModalHeader>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Seating Chart — {detailHall?.hallCode}</h2>
                                <p className="text-xs text-slate-500 mt-1">{selectedDate && fmtDate(selectedDate)} · {selectedSession} · {detailFilled} students</p>
                            </div>
                        </ModalHeader>
                        <ModalBody className="p-0 sm:p-6">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50">
                                        {['Bench', 'Left Reg No', 'Left Name', 'Right Reg No', 'Right Name'].map(h => (
                                            <th key={h} className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-600 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailBenches.map(b => {
                                        const ls = b.seats.find(s => s.SeatNumber === 1); const rs = b.seats.find(s => s.SeatNumber === 2);
                                        const la = ls ? detailAssignments[ls.SeatID] : undefined; const ra = rs ? detailAssignments[rs.SeatID] : undefined;
                                        return (
                                            <tr key={`${b.rowLabel}${b.benchNumber}`} className="hover:bg-slate-50">
                                                <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-800">{b.rowLabel}{b.benchNumber}</td>
                                                <td className="border border-slate-200 px-3 py-2 font-mono text-slate-700">{la?.registerNumber || '—'}</td>
                                                <td className="border border-slate-200 px-3 py-2 text-slate-700">{la?.studentName || '—'}</td>
                                                <td className="border border-slate-200 px-3 py-2 font-mono text-slate-700">{ra?.registerNumber || '—'}</td>
                                                <td className="border border-slate-200 px-3 py-2 text-slate-700">{ra?.studentName || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" onPress={onClose}>Close</Button>
                            <Button onPress={() => window.print()} className="font-bold bg-slate-900 text-white" startContent={<Printer size={14} />}>Print</Button>
                        </ModalFooter>
                    </>)}
                </ModalContent>
            </Modal>

            {/* ═══ Global Shuffle Confirmation Modal ═══ */}
            <Modal isOpen={showShuffleConfirm} onOpenChange={setShowShuffleConfirm} placement="center" backdrop="blur" classNames={{ base: "bg-[#0b1221] border border-[#1e293b] shadow-2xl overflow-hidden", backdrop: "bg-[#05080f]/80 backdrop-blur-md" }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            <ModalHeader className="flex flex-col gap-1 border-b border-[#1e293b] px-6 py-5 relative z-10">
                                <div className="p-3 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl inline-flex w-fit mb-3">
                                    <Shuffle size={20} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    Global Reshuffle
                                </h3>
                            </ModalHeader>
                            <ModalBody className="px-6 py-6 pb-8">
                                <div className="space-y-4">
                                    <p className="text-[14px] text-slate-300 leading-relaxed font-medium">
                                        You are about to randomly scramble all currently assigned students across the entire campus for <br /><span className="text-white font-bold bg-[#1e293b] px-2 py-0.5 rounded shadow-inner inline-block mt-1">Date: {selectedDate ? fmtDate(selectedDate) : ''} · Session: {selectedSession}</span>
                                    </p>

                                    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 space-y-3 shadow-inner">
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-[#1e293b] pb-2">What happens next:</h4>
                                        <ul className="text-[13px] text-slate-300 space-y-3 font-medium">
                                            <li className="flex items-start gap-2.5">
                                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                                Left-side students will be completely randomized across all available Left seats.
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                                Right-side students will be completely randomized across all available Right seats.
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                                                <span className="text-amber-200/90">This action cannot be undone.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="border-t border-[#1e293b] px-6 py-4 bg-[#0d1627]/50 relative z-10 flex justify-end gap-3">
                                <Button className="font-semibold text-slate-300 hover:text-white" variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button className="font-bold text-white shadow-[0_0_20px_rgba(236,72,153,0.2)] bg-pink-600 hover:bg-pink-500 border border-pink-500/50" onPress={executeShuffleGlobal} startContent={<Shuffle size={16} />}>
                                    Yes, Shuffle All
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

        </div>
    );
};

export default SeatingPlans;
