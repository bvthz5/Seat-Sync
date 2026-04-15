import React, { useEffect, useState, useCallback, useTransition, useMemo } from 'react';
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
    MoreVertical, Power, XCircle, Shuffle, FileSpreadsheet, FileDown, Sheet
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
interface AssignFeedback {
    assigned: number;
    unassigned: number;
    hallsUsed: number;
    hallIds: number[];
}

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

const normalizeDeptCode = (value?: string) => {
    const raw = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    if (!raw) return '';
    if (raw === 'IMCA' || raw === 'INMCA' || raw === 'INTMCA') return 'INT_MCA';
    return raw;
};

const formatDeptLabel = (dept: Dept) => {
    const code = normalizeDeptCode(dept.DepartmentCode);
    const name = String(dept.DepartmentName || '').trim();
    if (code && name) return `${code} - ${name}`;
    return code || name || 'Department';
};

/* ═══════════════════════════════════════════════════ */
const SeatingPlans: React.FC = () => {
    const [, startTransition] = useTransition();
    const [seriesList, setSeriesList] = useState<Series[]>([]);
    const [examDates, setExamDates] = useState<ExamDateSlot[]>([]);
    const [halls, setHalls] = useState<Hall[]>([]);
    const [departments, setDepartments] = useState<Dept[]>([]);
    const [hallSummary, setHallSummary] = useState<HallSummary[]>([]);

    const [selectedSeries, setSelectedSeries] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedSession, setSelectedSession] = useState<'FN' | 'AN'>('FN');
    const [assignmentMode, setAssignmentMode] = useState<'single' | 'two-alternate' | 'auto-balanced'>('auto-balanced');
    const [primaryDept, setPrimaryDept] = useState<string>('');
    const [secondaryDept, setSecondaryDept] = useState<string>('');
    const [avoidSameDeptBench, setAvoidSameDeptBench] = useState(true);
    const [shuffleRooms, setShuffleRooms] = useState(false);
    const [selectedHallIds, setSelectedHallIds] = useState<Set<number>>(new Set());
    const [hallSearch, setHallSearch] = useState('');
    const [hallFilter, setHallFilter] = useState<'all' | 'empty' | 'partial' | 'full'>('all');

    const [assigning, setAssigning] = useState(false);
    const [shuffling, setShuffling] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [addingSlot, setAddingSlot] = useState(false);

    /* student search */
    const [searchQ, setSearchQ] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    /* detail modal */
    const [detailHall, setDetailHall] = useState<HallSummary | null>(null);
    const [detailBenches, setDetailBenches] = useState<Bench[]>([]);
    const [detailAssignments, setDetailAssignments] = useState<Record<number, Assignment>>({});
    const [detailTotalSeats, setDetailTotalSeats] = useState(0);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);
    const [globalDownloading, setGlobalDownloading] = useState(false);
    const [seatingDownloading, setSeatingDownloading] = useState(false);
    const [assignmentFeedback, setAssignmentFeedback] = useState<AssignFeedback | null>(null);

    /* derived */
    const availableDates = [...new Set(examDates.filter(d => d.session === selectedSession).map(d => d.examDate))].sort();
    const currentSlot = examDates.find(d => d.examDate === selectedDate && d.session === selectedSession);
    const totalFilled = hallSummary.reduce((s, h) => s + h.filledSeats, 0);
    const totalCapacity = hallSummary.reduce((s, h) => s + h.totalSeats, 0);
    const detailFilled = Object.keys(detailAssignments).length;
    const detailHallObj = halls.find(h => h.RoomID === detailHall?.hallId);
    const detailBenchRows = useMemo(() => {
        const rows: Record<string, Bench[]> = {};
        for (const bench of detailBenches) {
            if (!rows[bench.rowLabel]) rows[bench.rowLabel] = [];
            rows[bench.rowLabel].push(bench);
        }
        return Object.keys(rows)
            .sort()
            .map((rowLabel) => ({
                rowLabel,
                benches: (rows[rowLabel] || []).sort((a, b) => a.benchNumber - b.benchNumber),
            }));
    }, [detailBenches]);
    const primaryDeptObj = departments.find(d => String(d.DepartmentID) === primaryDept);
    const secondaryDeptObj = departments.find(d => String(d.DepartmentID) === secondaryDept);
    const eligibleStudentCount = (() => {
        const primaryCount = Number(primaryDeptObj?.studentCount || 0);
        const secondaryCount = Number(secondaryDeptObj?.studentCount || 0);
        if (assignmentMode === 'auto-balanced') {
            return departments.reduce((sum, d) => sum + Number(d.studentCount || 0), 0);
        }
        if (assignmentMode === 'single') return primaryCount;
        if (!primaryDept || !secondaryDept) return 0;
        if (primaryDept === secondaryDept) return primaryCount;
        return primaryCount + secondaryCount;
    })();
    const visibleHalls = hallSummary.filter(h => {
        const q = hallSearch.trim().toLowerCase();
        const pct = h.totalSeats > 0 ? Math.round((h.filledSeats / h.totalSeats) * 100) : 0;
        const searchOk = q.length === 0 || h.hallCode.toLowerCase().includes(q);
        const filterOk = hallFilter === 'all'
            || (hallFilter === 'empty' && pct === 0)
            || (hallFilter === 'partial' && pct > 0 && pct < 100)
            || (hallFilter === 'full' && pct >= 100);
        return searchOk && filterOk;
    });
    const selectedHallList = selectedHallIds.size > 0
        ? hallSummary.filter(h => selectedHallIds.has(h.hallId))
        : hallSummary;
    const selectedSeatCount = selectedHallList.reduce((sum, h) => sum + h.totalSeats, 0);
    const projectedUnassigned = Math.max(eligibleStudentCount - selectedSeatCount, 0);
    const hasPreviewInputs = eligibleStudentCount > 0 || selectedSeatCount > 0;

    const toggleHall = (id: number) => {
        setSelectedHallIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const selectAllHalls = () => setSelectedHallIds(new Set(visibleHalls.map(h => h.hallId)));
    const clearHallSelection = () => setSelectedHallIds(new Set());
    const canAssignByMode = assignmentMode === 'auto-balanced'
        || (assignmentMode === 'single' && !!primaryDept)
        || (assignmentMode === 'two-alternate' && !!primaryDept && !!secondaryDept);

    const onAssignmentModeChange = (value: 'single' | 'two-alternate' | 'auto-balanced') => {
        setAssignmentMode(value);
        if (value === 'auto-balanced') {
            setPrimaryDept('');
            setSecondaryDept('');
        } else if (value === 'single') {
            setSecondaryDept('');
        }
    };

    useEffect(() => {
        if (primaryDept && !departments.some(d => String(d.DepartmentID) === primaryDept)) setPrimaryDept('');
        if (secondaryDept && !departments.some(d => String(d.DepartmentID) === secondaryDept)) setSecondaryDept('');
    }, [departments, primaryDept, secondaryDept]);

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
        if (!selectedDate) {
            SeatingService.getDepartments()
                .then(r => setDepartments(Array.isArray(r) ? r : []))
                .catch(() => { });
            return;
        }

        SeatingService.getExamDepartments(
            selectedDate,
            selectedSession,
            selectedSeries ? Number(selectedSeries) : undefined
        )
            .then(r => setDepartments(Array.isArray(r) ? r : []))
            .catch(() => toast.error('Failed to load exam departments'));
    }, [selectedDate, selectedSession, selectedSeries]);

    useEffect(() => {
        SeatingService.getExamDates(selectedSeries ? Number(selectedSeries) : undefined)
            .then(r => { setExamDates(Array.isArray(r) ? r : []); setSelectedDate(''); })
            .catch(() => { });
    }, [selectedSeries]);

    const loadSummary = useCallback(async () => {
        if (!selectedDate) { startTransition(() => setHallSummary([])); return; }
        setLoadingSummary(true);
        try {
            const data = await SeatingService.getAllocationSummary(selectedDate, selectedSession);
            startTransition(() => setHallSummary(Array.isArray(data) ? data : []));
        } catch { toast.error('Failed to load summary'); }
        finally { setLoadingSummary(false); }
    }, [selectedDate, selectedSession, startTransition]);

    useEffect(() => { loadSummary(); }, [loadSummary]);

    /* quick add slot */
    const handleQuickAddSlot = async () => {
        if (!selectedDate) {
            toast.error("Please type or select a date first");
            return;
        }
        startTransition(() => setAddingSlot(true));
        try {
            await SeatingService.quickAddSlot({
                examDate: selectedDate,
                session: selectedSession,
                seriesId: selectedSeries ? Number(selectedSeries) : undefined
            });
            toast.success(`Exam slot created for ${fmtDate(selectedDate)} ${selectedSession}`);
            const dates = await SeatingService.getExamDates(selectedSeries ? Number(selectedSeries) : undefined);
            startTransition(() => setExamDates(Array.isArray(dates) ? dates : []));
            loadSummary();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to create slot");
        } finally {
            startTransition(() => setAddingSlot(false));
        }
    };

    /* bulk assign */
    const handleBulkAssign = async () => {
        if (!selectedDate) { toast.error('Select an exam date first'); return; }
        let ids = selectedHallIds.size > 0 ? [...selectedHallIds] : hallSummary.map(h => h.hallId);
        if (ids.length === 0) { toast.error('No halls available'); return; }
        if (!canAssignByMode) {
            toast.error(assignmentMode === 'single' ? 'Select a department' : assignmentMode === 'two-alternate' ? 'Select primary and secondary departments' : 'No eligible departments');
            return;
        }

        const seatCount = hallSummary
            .filter(h => ids.includes(h.hallId))
            .reduce((sum, h) => sum + h.totalSeats, 0);
        if (eligibleStudentCount > 0 && seatCount < eligibleStudentCount) {
            const shortBy = eligibleStudentCount - seatCount;
            const autoCandidates = hallSummary.filter(h => !ids.includes(h.hallId));
            let autoIds: number[] = [];
            let autoSeats = seatCount;
            for (const h of autoCandidates) {
                autoIds.push(h.hallId);
                autoSeats += h.totalSeats;
                if (autoSeats >= eligibleStudentCount) break;
            }

            let proceed = false;
            if (autoSeats >= eligibleStudentCount && autoIds.length > 0) {
                const autoPick = window.confirm(
                    `Selected halls are short by ${shortBy} seats. Auto-select ${autoIds.length} more hall(s) to fit all eligible students?`
                );
                if (autoPick) {
                    ids = [...ids, ...autoIds];
                    setSelectedHallIds(new Set(ids));
                    toast.success(`Added ${autoIds.length} hall(s) automatically`);
                    proceed = true;
                }
            }
            if (!proceed) {
                const continueWithShortage = window.confirm(
                    `Capacity is short by ${shortBy} seats. Continue anyway and allow partial assignment?`
                );
                if (!continueWithShortage) return;
            }
        }

        startTransition(() => setAssigning(true));
        try {
            console.log("=== ASSIGN CLICKED ===");
            console.log("Assignment mode:", assignmentMode);
            console.log("Selected halls:", ids);
            console.log("Selected halls length:", ids?.length);
            console.log("Eligible students (preview):", eligibleStudentCount);
            console.log("Payload going to API:", {
                examDate: selectedDate,
                session: selectedSession,
                hallIds: ids,
                mode: assignmentMode,
                primaryDeptId: primaryDept ? Number(primaryDept) : null,
                secondaryDeptId: secondaryDept ? Number(secondaryDept) : null,
                avoidSameDeptBench,
            });
            const r = await SeatingService.bulkAssign({
                examDate: selectedDate, session: selectedSession, hallIds: ids,
                mode: assignmentMode,
                primaryDeptId: primaryDept ? Number(primaryDept) : null,
                secondaryDeptId: secondaryDept ? Number(secondaryDept) : null,
                avoidSameDeptBench,
                shuffleRooms,
            });
            const assigned = Number(r.totalLeftAssigned || 0) + Number(r.totalRightAssigned || 0);
            const totalEligible = Number(r.totalLeftAvailable || 0) + Number(r.totalRightAvailable || 0);
            const unassigned = Math.max(totalEligible - assigned, 0);
            const usedHallIds = (Array.isArray(r.hallResults) ? r.hallResults : [])
                .filter((h: any) => Number(h.filled || 0) > 0)
                .map((h: any) => Number(h.hallId))
                .filter((id: number) => Number.isFinite(id));
            setAssignmentFeedback({
                assigned,
                unassigned,
                hallsUsed: usedHallIds.length,
                hallIds: usedHallIds,
            });
            toast.success(`Assigned ${assigned} student${assigned !== 1 ? 's' : ''}${unassigned > 0 ? ` · ${unassigned} unassigned` : ''}`);
            startTransition(() => loadSummary());
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Bulk assign failed'); }
        finally { startTransition(() => setAssigning(false)); }
    };

    const handleViewAffectedHalls = async () => {
        if (!assignmentFeedback || assignmentFeedback.hallIds.length === 0) return;
        const nextSet = new Set(assignmentFeedback.hallIds);
        setSelectedHallIds(nextSet);
        const first = hallSummary.find(h => nextSet.has(h.hallId));
        if (first) await openHallDetail(first);
    };

    /* global shuffle */
    const executeShuffleGlobal = async () => {
        if (!selectedDate || !selectedSession) return;
        startTransition(() => { setShuffling(true); setShowShuffleConfirm(false); });
        try {
            const r = await SeatingService.shuffleGlobal({ examDate: selectedDate, session: selectedSession });
            toast.success(r.message || 'Halls shuffled successfully');
            startTransition(() => loadSummary());
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Shuffle failed'); }
        finally { startTransition(() => setShuffling(false)); }
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
            startTransition(() => {
                setDetailBenches(layout.benches || []);
                setDetailTotalSeats(layout.totalSeats || 0);
            });
            if (selectedDate) {
                try {
                    const alloc = await SeatingService.getAllocationForHall(selectedDate, selectedSession, hs.hallId);
                    if (alloc?.assignments) startTransition(() => setDetailAssignments(alloc.assignments));
                } catch { }
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

    /* ── Build row data shared by both exporters ── */
    const buildExportRows = () => detailBenches.map(b => {
        const ls = b.seats.find(s => s.SeatNumber === 1);
        const rs = b.seats.find(s => s.SeatNumber === 2);
        const la = ls ? detailAssignments[ls.SeatID] : undefined;
        const ra = rs ? detailAssignments[rs.SeatID] : undefined;
        return {
            bench: `${b.rowLabel}${b.benchNumber}`,
            leftReg: la?.registerNumber ?? '',
            leftName: la?.studentName ?? '',
            leftDept: la?.deptCode ?? '',
            rightReg: ra?.registerNumber ?? '',
            rightName: ra?.studentName ?? '',
            rightDept: ra?.deptCode ?? '',
        };
    });

    const downloadExcel = async () => {
        const XLSX = await import('xlsx');
        const rows = buildExportRows();
        const wsData = [
            [`Seating Arrangement — ${detailHall?.hallCode}`],
            [`Date: ${selectedDate ? fmtDate(selectedDate) : ''}   Session: ${selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}   Students: ${detailFilled}/${detailTotalSeats}`],
            [],
            ['Bench', 'Left — Reg No', 'Left — Student Name', 'Left Dept', 'Right — Reg No', 'Right — Student Name', 'Right Dept'],
            ...rows.map(r => [r.bench, r.leftReg, r.leftName, r.leftDept, r.rightReg, r.rightName, r.rightDept]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 7 }, { wch: 15 }, { wch: 28 }, { wch: 9 }, { wch: 15 }, { wch: 28 }, { wch: 9 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Seating');
        XLSX.writeFile(wb, `Seating_${detailHall?.hallCode}_${selectedDate}_${selectedSession}.xlsx`);
        toast.success('Excel downloaded');
    };

    const downloadPDF = async () => {
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const rows = buildExportRows();
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();

        // ── Header band ──
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageW, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('SEAT-SYNC  EXAMINATION CONTROL', 14, 10);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Official Seating Arrangement Document', 14, 16);
        doc.setTextColor(226, 232, 240);
        doc.setFontSize(7.5);
        doc.text(`Doc: ${detailHall?.hallCode}-${(selectedDate ?? '').replace(/-/g, '')}-${selectedSession}`, pageW - 14, 10, { align: 'right' });
        doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageW - 14, 16, { align: 'right' });

        // ── Info strip ──
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 22, pageW, 14, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(0, 36, pageW, 36);
        const infoCols = [
            { label: 'HALL', value: detailHall?.hallCode ?? '' },
            { label: 'DATE', value: selectedDate ? fmtDate(selectedDate) : '' },
            { label: 'SESSION', value: selectedSession === 'FN' ? 'Forenoon' : 'Afternoon' },
            { label: 'STUDENTS', value: `${detailFilled} / ${detailTotalSeats}` },
        ];
        infoCols.forEach((col, i) => {
            const x = 14 + i * (pageW / 4);
            doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(148, 163, 184);
            doc.text(col.label, x, 28);
            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
            doc.text(col.value, x, 34);
        });

        // ── Table ──
        autoTable(doc, {
            startY: 40,
            head: [['Bench', 'Left Reg No', 'Left Student Name', 'Dept', 'Right Reg No', 'Right Student Name', 'Dept']],
            body: rows.map(r => [r.bench, r.leftReg, r.leftName, r.leftDept, r.rightReg, r.rightName, r.rightDept]),
            styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica', textColor: [30, 41, 59] },
            headStyles: { fillColor: [15, 23, 42], textColor: [226, 232, 240], fontStyle: 'bold', fontSize: 7, halign: 'left' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 13, halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] },
                1: { cellWidth: 26, font: 'courier' },
                2: { cellWidth: 42 },
                3: { cellWidth: 12, halign: 'center' },
                4: { cellWidth: 26, font: 'courier' },
                5: { cellWidth: 42 },
                6: { cellWidth: 12, halign: 'center' },
            },
            didDrawPage: (data: any) => {
                const pCount = (doc as any).internal.getNumberOfPages();
                doc.setFontSize(6.5); doc.setTextColor(148, 163, 184);
                doc.text(
                    `Page ${data.pageNumber} of ${pCount}  ·  CONFIDENTIAL — FOR OFFICIAL USE ONLY`,
                    pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' }
                );
            },
        });

        // ── Signature strip on last page ──
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const sigRoles = ['Invigilator', 'Chief Invigilator', 'Controller of Examinations'];
        const sigW = (pageW - 28) / 3;
        sigRoles.forEach((role, i) => {
            const x = 14 + i * (sigW + 0);
            doc.setDrawColor(71, 85, 105);
            doc.line(x, finalY + 14, x + sigW - 4, finalY + 14);
            doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(71, 85, 105);
            doc.text(role.toUpperCase(), x + (sigW - 4) / 2, finalY + 19, { align: 'center' });
        });

        doc.save(`Seating_${detailHall?.hallCode}_${selectedDate}_${selectedSession}.pdf`);
        toast.success('PDF downloaded');
    };

    /* ── Helper: build compact register-number ranges ──
       e.g. ["23CS001","23CS002","23CS003","23CS005"] → ["23CS001-003", "23CS005"] */
    const buildRegRanges = (regs: string[]): string[] => {
        if (!regs.length) return [];
        const sorted = [...regs].sort();
        const ranges: string[] = [];
        let start = sorted[0], prev = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            const curr = sorted[i];
            const pm = prev.match(/^(.*?)(\d+)$/);
            const cm = curr.match(/^(.*?)(\d+)$/);
            if (pm && cm && pm[1] === cm[1] && parseInt(cm[2]) === parseInt(pm[2]) + 1) {
                prev = curr;
            } else {
                ranges.push(start === prev ? start : `${start}-${prev.match(/\d+$/)?.[0]}`);
                start = curr; prev = curr;
            }
        }
        ranges.push(start === prev ? start : `${start}-${prev.match(/\d+$/)?.[0]}`);
        return ranges;
    };

    /* ── Fetch allocated hall allocations only and return consolidated rows ── */
    const buildGlobalRows = async () => {
        const active = [...hallSummary].sort((a, b) => a.hallCode.localeCompare(b.hallCode));
        const rows: { slNo: number; hallCode: string; regRanges: string; count: number; total: number; isFirstRow: boolean; rowSpan: number }[] = [];
        await Promise.all(active.map(async (hall) => {
            if (!selectedDate) return;
            let assignments: Record<number, Assignment> = {};
            try { const alloc = await SeatingService.getAllocationForHall(selectedDate, selectedSession, hall.hallId); assignments = alloc?.assignments ?? {}; } catch { }
            const deptMap: Record<string, string[]> = {};
            Object.values(assignments).forEach(a => {
                if (!deptMap[a.deptCode]) deptMap[a.deptCode] = [];
                deptMap[a.deptCode].push(a.registerNumber);
            });
            (hall as any).__deptMap = deptMap;
            (hall as any).__total = Object.keys(assignments).length;
        }));
        const allocatedOnly = active.filter(hall => (((hall as any).__total ?? 0) > 0));
        let slNo = 1;
        allocatedOnly.forEach(hall => {
            const deptMap: Record<string, string[]> = (hall as any).__deptMap ?? {};
            const total: number = (hall as any).__total ?? 0;
            const depts = Object.entries(deptMap).sort(([a], [b]) => a.localeCompare(b));
            depts.forEach(([, regs], idx) => {
                const ranges = buildRegRanges(regs);
                const rangeStr = ranges.join(', ');
                rows.push({ slNo, hallCode: hall.hallCode, regRanges: rangeStr, count: regs.length, total, isFirstRow: idx === 0, rowSpan: depts.length });
            });
            slNo++;
        });
        return rows;
    };

    const downloadGlobalExcel = async () => {
        if (!selectedDate) return;
        setGlobalDownloading(true);
        try {
            const XLSX = await import('xlsx');
            const rows = await buildGlobalRows();
            const header = ['Sl.No', 'Hall / Room No.', 'Register Numbers', 'Count', 'Total'];
            const wsData: any[][] = [
                [`CONSOLIDATED SEATING ARRANGEMENT`],
                [`Date: ${fmtDate(selectedDate)}   Session: ${selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}`],
                [],
                header,
                ...rows.map(r => [r.isFirstRow ? r.slNo : '', r.isFirstRow ? r.hallCode : '', r.regRanges, r.count, r.isFirstRow ? r.total : '']),
            ];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{ wch: 7 }, { wch: 14 }, { wch: 50 }, { wch: 8 }, { wch: 8 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Consolidated');
            XLSX.writeFile(wb, `Consolidated_Seating_${selectedDate}_${selectedSession}.xlsx`);
            toast.success('Excel downloaded');
        } catch { toast.error('Failed to generate Excel'); }
        finally { setGlobalDownloading(false); }
    };

    const downloadGlobalPDF = async () => {
        if (!selectedDate) return;
        setGlobalDownloading(true);
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const rows = await buildGlobalRows();
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const sessionLabel = selectedSession === 'FN' ? 'Forenoon' : 'Afternoon';

            // ── Header block ──
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageW, 36, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text("St. Joseph's College of Engineering And Technology, Palai", pageW / 2, 10, { align: 'center' });
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(203, 213, 225);
            doc.text('Examination Control Division', pageW / 2, 16, { align: 'center' });
            doc.setFillColor(99, 102, 241);
            doc.rect(14, 20, pageW - 28, 0.4, 'F');
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.text('CONSOLIDATED SEATING ARRANGEMENT', pageW / 2, 28, { align: 'center' });
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
            doc.text(`${fmtDate(selectedDate)}  \u00b7  ${sessionLabel}`, pageW / 2, 34, { align: 'center' });

            // ── Table ──
            // Pre-process rows to handle row-spanning look (same Sl.No + Hall for merged groups)
            const bodyRows: any[] = [];
            rows.forEach(r => {
                bodyRows.push([
                    r.isFirstRow ? String(r.slNo) : '',
                    r.isFirstRow ? r.hallCode : '',
                    r.regRanges,
                    String(r.count),
                    r.isFirstRow ? String(r.total) : '',
                ]);
            });

            autoTable(doc, {
                startY: 40,
                head: [['Sl.\nNo.', 'HALL /\nROOM No.', 'REGISTER NUMBERS', 'COUNT', 'TOTAL']],
                body: bodyRows,
                styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', textColor: [15, 23, 42], lineColor: [203, 213, 225], lineWidth: 0.3 },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center', valign: 'middle' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 14, halign: 'center' },
                    4: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
                },
                didDrawPage: (data: any) => {
                    const pCount = (doc as any).internal.getNumberOfPages();
                    doc.setFontSize(6.5); doc.setTextColor(148, 163, 184);
                    doc.text(
                        `Page ${data.pageNumber} of ${pCount}  \u00b7  CONFIDENTIAL \u2014 FOR OFFICIAL USE ONLY`,
                        pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' }
                    );
                },
            });

            doc.save(`Consolidated_Seating_${selectedDate}_${selectedSession}.pdf`);
            toast.success('PDF downloaded');
        } catch { toast.error('Failed to generate PDF'); }
        finally { setGlobalDownloading(false); }
    };

    /* ── Download Seating Excel: one sheet per allocated hall ── */
    const downloadSeatingExcel = async () => {
        if (!selectedDate) return;
        setSeatingDownloading(true);
        try {
            if (hallSummary.filter(h => h.filledSeats > 0).length === 0) {
                toast.error('No halls have assigned seats');
                return;
            }

            const blob = await SeatingService.exportSeating(selectedDate, selectedSession);
            if (!blob || blob.size === 0) {
                toast.error('Empty response from server');
                return;
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Seating_${selectedDate}_${selectedSession}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Seating downloaded');
        } catch (err: any) {
            console.error('downloadSeatingExcel error:', err);
            toast.error('Failed to generate Excel: ' + (err?.message || 'Unknown error'));
        } finally {
            setSeatingDownloading(false);
        }
    };

    /* student search */
    useEffect(() => {
        if (!searchQ.trim() || searchQ.trim().length < 2) { setSearchResults([]); return; }
        if (!selectedDate) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                console.log('[Search] calling with:', { selectedDate, selectedSession, q: searchQ.trim() });
                const data = await SeatingService.searchStudent(selectedDate, selectedSession, searchQ.trim());
                console.log('[Search] response:', data);
                setSearchResults(data.results || []);
            } catch (err: any) {
                console.error('Search error:', err?.response?.data || err?.message || err);
                toast.error('Search: ' + (err?.response?.data?.message || err?.message || 'Unknown error'), { duration: 6000 });
                setSearchResults([]);
            }
            finally { setSearching(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQ, selectedDate, selectedSession]);

    /* ═══════════ RENDER ══════════════════════════════ */
    return (
        <div className="pb-12 bg-slate-50 min-h-[calc(100vh-3.5rem)] font-sans text-slate-700 antialiased selection:bg-indigo-100 selection:text-indigo-900 relative overflow-x-hidden">
            {/* Ambient Background Orbs */}
            <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-indigo-50 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-emerald-50 blur-[120px] pointer-events-none" />

            {/* Header */}
            <div className="pt-8 px-8 max-w-[1920px] mx-auto relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-slate-200">
                    <div>
                        <h1 className="text-[28px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight flex items-center gap-3">
                            <span className="w-2.5 h-8 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full shadow-sm"></span>
                            Seating Arrangement
                        </h1>
                        <p className="text-slate-500 text-[14px] font-medium mt-2 max-w-2xl leading-relaxed">
                            Select an exam slot and departments, then dynamically assign students across multiple halls.
                        </p>
                    </div>

                    {/* ── Student Search ── */}
                    <div className="relative w-full sm:w-[360px] shrink-0 group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500 group-focus-within:opacity-100" />
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-indigo-600 transition-colors">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </span>
                            <input
                                id="student-search"
                                name="student-search"
                                type="text"
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                                placeholder={selectedDate ? 'Search student by reg no. or name…' : 'Select a date to search students'}
                                disabled={!selectedDate}
                                className="w-full h-11 pl-11 pr-10 bg-white backdrop-blur-xl border-2 border-slate-200 rounded-2xl text-slate-800 text-[14px] font-semibold placeholder:text-slate-500 font-medium focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed transition-all shadow-sm"
                            />
                            {searching && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                </span>
                            )}
                            {!searching && searchQ && (
                                <button onClick={() => { setSearchQ(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 transition-colors">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>

                        {/* Search results dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl shadow-indigo-500/10 overflow-hidden max-h-72 overflow-y-auto">
                                {searchResults.map((r, i) => (
                                    <div key={r.studentId} className={`px-3 py-2.5 flex items-center justify-between gap-3 ${i > 0 ? 'border-t border-slate-100' : ''} hover:bg-slate-50 transition-colors`}>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 truncate">{r.registerNumber}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{r.name}</p>
                                        </div>
                                        {r.allocated ? (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold tracking-wide">{r.hallCode}</span>
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold">{r.seatLabel}</span>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${r.side === 'Left' ? 'bg-cyan-50 border-cyan-100 text-cyan-600' : 'bg-violet-50 border-violet-100 text-violet-600'}`}>{r.side}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-500 italic shrink-0">Not assigned</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchQ.trim().length >= 2 && !searching && searchResults.length === 0 && selectedDate && (
                            <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl shadow-indigo-500/10 px-4 py-3 text-center text-[11px] text-slate-500">
                                No students found for "{searchQ}"
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-8 py-6 max-w-[1920px] mx-auto">
                <div className="flex flex-col xl:flex-row gap-8 items-start">

                    {/* ═══════ LEFT PANEL ═══════ */}
                    <div className="w-full xl:w-[400px] shrink-0 xl:sticky xl:top-2 z-10 flex flex-col gap-4">

                        {/* ── Exam Slot Section ── */}
                        <Card className="border border-slate-200 shadow-xl bg-white/80 backdrop-blur-2xl rounded-[24px] overflow-hidden">
                            <CardHeader className="flex gap-4 bg-slate-50 border-b border-slate-100 px-5 py-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-500 rounded-xl relative z-10 shadow-sm">
                                    <ClipboardList size={18} strokeWidth={2} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-[14px] font-bold text-slate-800 tracking-wide">Exam Slot</h3>
                                    <p className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase mt-0.5">Series · Date · Session</p>
                                </div>
                            </CardHeader>
                            <CardBody className="px-5 py-4 flex flex-col gap-4">
                                {/* Series */}
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                        <Building2 size={13} className="text-slate-500" /> Series
                                        <span className="text-slate-500 normal-case font-medium">(opt)</span>
                                    </span>
                                    <Select aria-label="Exam Series" placeholder="— All Series —" variant="bordered"
                                        id="exam-series-select" name="examSeries"
                                        selectedKeys={selectedSeries ? [selectedSeries] : []}
                                        onSelectionChange={(k) => setSelectedSeries(Array.from(k)[0] as string || '')}
                                        classNames={{
                                            trigger: "relative pr-10 bg-white border-2 border-slate-200 shadow-sm rounded-xl data-[hover=true]:border-indigo-400 data-[hover=true]:bg-indigo-50 transition-all h-11 text-slate-800 text-[14px] font-semibold",
                                            value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-500", selectorIcon: "text-slate-500 absolute w-5 right-3", innerWrapper: "w-full text-slate-800",
                                            popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                        }}>
                                        {seriesList.map(s => <SelectItem key={String(s.ExamSeriesID)} textValue={s.SeriesName} className="data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700 font-semibold">{s.SeriesName}</SelectItem>)}
                                    </Select>
                                </div>

                                {/* Session */}
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={13} className="text-slate-500" /> Session
                                    </span>
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        {(['FN', 'AN'] as const).map(s => (
                                            <button key={s} onClick={() => { setSelectedSession(s); setSelectedDate(''); }}
                                                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-bold transition-all border-2 shadow-sm ${selectedSession === s
                                                    ? s === 'FN'
                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                                                        : 'bg-orange-50 text-orange-700 border-orange-300'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800'
                                                    }`}
                                            >
                                                {s === 'FN' ? <Sun size={16} className={selectedSession === s ? "text-indigo-600" : "text-slate-500"} /> : <Moon size={16} className={selectedSession === s ? "text-orange-600" : "text-slate-500"} />}
                                                {s === 'FN' ? 'Forenoon' : 'Afternoon'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Calendar size={13} className="text-slate-500" /> Date</span>
                                    </span>
                                    <div className="flex gap-2 mt-1">
                                        <div className="flex-1">
                                            <Select aria-label="Exam Date" placeholder={availableDates.length > 0 ? "— Select Date —" : "— No Dates Available —"} variant="bordered"
                                                id="exam-date-select" name="examDate"
                                                selectedKeys={selectedDate ? new Set([selectedDate]) : new Set([])}
                                                onSelectionChange={(k) => setSelectedDate(Array.from(k)[0] as string || '')}
                                                classNames={{
                                                    trigger: "relative pr-10 bg-white border-2 border-slate-200 shadow-sm rounded-xl data-[hover=true]:border-indigo-400 data-[hover=true]:bg-indigo-50 transition-all h-11 text-slate-800 text-[14px] font-semibold",
                                                    value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-500",
                                                    selectorIcon: "text-slate-500 absolute w-5 right-3",
                                                    popoverContent: "bg-white border text-slate-800 border-slate-200 shadow-xl font-medium"
                                                }}
                                                isDisabled={availableDates.length === 0}
                                            >
                                                {availableDates.map(d => (
                                                    <SelectItem key={String(d)} textValue={fmtDate(d)} className="data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700 font-semibold text-slate-800">
                                                        {fmtDate(d)}
                                                    </SelectItem>
                                                ))}
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {selectedDate && currentSlot && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 shadow-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.4)] animate-pulse" />
                                        <span className="text-[10px] font-medium text-slate-500 tracking-wide">
                                            {fmtDate(selectedDate)} · {selectedSession === 'FN' ? 'FN' : 'AN'} · <span className="text-slate-800 font-semibold">{currentSlot.examCount} exam{currentSlot.examCount !== 1 ? 's' : ''}</span>
                                        </span>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        {/* ── Assignment Setup Section ── */}
                        <Card className="border border-slate-200 shadow-xl bg-white/80 backdrop-blur-2xl rounded-[24px] overflow-hidden">
                            <CardHeader className="flex gap-4 bg-slate-50 border-b border-slate-100 px-5 py-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-50 rounded-full blur-[40px] -translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
                                <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-500 rounded-xl relative z-10 shadow-sm">
                                    <Users size={18} strokeWidth={2} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-[14px] font-bold text-slate-800 tracking-wide">Assignment Setup</h3>
                                    <p className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase mt-0.5">Departments · Halls · Auto-Assign</p>
                                </div>
                            </CardHeader>
                            <CardBody className="px-5 py-4 flex flex-col gap-4">
                                {/* Mode-based assignment controls */}
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                            <ChevronRight size={13} className="text-slate-500" /> Allocation Strategy
                                        </span>
                                        <Select
                                            aria-label="Allocation strategy"
                                            id="allocation-strategy-select" name="allocationStrategy"
                                            selectedKeys={[assignmentMode]}
                                            onSelectionChange={(k) => onAssignmentModeChange((Array.from(k)[0] as 'single' | 'two-alternate' | 'auto-balanced') || 'auto-balanced')}
                                            variant="bordered"
                                            classNames={{
                                                trigger: "relative pr-10 bg-white border-2 border-slate-200 shadow-sm rounded-xl data-[hover=true]:border-emerald-400 data-[hover=true]:bg-emerald-50 transition-all h-11 text-slate-800 text-[14px] font-semibold",
                                                value: "text-slate-800 font-semibold",
                                                selectorIcon: "text-slate-500 absolute w-5 right-3",
                                                popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                            }}
                                        >
                                            <SelectItem key="auto-balanced">Auto Balanced (Recommended)</SelectItem>
                                            <SelectItem key="single">Single Department</SelectItem>
                                            <SelectItem key="two-alternate">Two-Department Alternate</SelectItem>
                                        </Select>
                                    </div>
                                    {assignmentMode === 'single' && (
                                        <div className="space-y-1.5">
                                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                                <ChevronRight size={13} className="text-slate-500" /> Department
                                            </span>
                                            <Select aria-label="Primary Department" placeholder="— Select Department —" variant="bordered"
                                                id="primary-dept-select-single" name="primaryDeptSingle"
                                                selectedKeys={primaryDept ? [primaryDept] : []}
                                                onSelectionChange={(k) => setPrimaryDept(Array.from(k)[0] as string || '')}
                                                classNames={{
                                                    trigger: "relative pr-10 bg-white border-2 border-slate-200 shadow-sm rounded-xl data-[hover=true]:border-emerald-400 data-[hover=true]:bg-emerald-50 transition-all h-11 text-slate-800 text-[14px] font-semibold",
                                                    value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-500",
                                                    selectorIcon: "text-slate-500 absolute w-5 right-3",
                                                    popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                                }}>
                                                {departments.map(d => <SelectItem key={String(d.DepartmentID)} textValue={formatDeptLabel(d)} className="data-[hover=true]:bg-emerald-50 data-[hover=true]:text-emerald-700 font-semibold">{formatDeptLabel(d)} ({d.studentCount})</SelectItem>)}
                                            </Select>
                                        </div>
                                    )}
                                    {assignmentMode === 'two-alternate' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                                    <ChevronRight size={13} className="text-slate-500" /> Primary Dept
                                                </span>
                                                <Select aria-label="Primary Department" placeholder="— None —" variant="bordered"
                                                    id="primary-dept-select-dual" name="primaryDeptDual"
                                                    selectedKeys={primaryDept ? [primaryDept] : []}
                                                    onSelectionChange={(k) => setPrimaryDept(Array.from(k)[0] as string || '')}
                                                    classNames={{
                                                        trigger: "relative pr-10 bg-white border-2 border-slate-200 shadow-sm rounded-xl data-[hover=true]:border-emerald-400 data-[hover=true]:bg-emerald-50 transition-all h-11 text-slate-800 text-[14px] font-semibold",
                                                        value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-500", selectorIcon: "text-slate-500 absolute w-5 right-3", innerWrapper: "w-full text-slate-800",
                                                        popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                                    }}>
                                                    {departments.map(d => <SelectItem key={String(d.DepartmentID)} textValue={formatDeptLabel(d)} className="data-[hover=true]:bg-emerald-50 data-[hover=true]:text-emerald-700 font-semibold">{formatDeptLabel(d)} ({d.studentCount})</SelectItem>)}
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                                    <ChevronRight size={13} className="rotate-180 text-slate-500" /> Secondary Dept
                                                </span>
                                                <Select aria-label="Secondary Department" placeholder="— None —" variant="bordered"
                                                    id="secondary-dept-select-dual" name="secondaryDeptDual"
                                                    selectedKeys={secondaryDept ? [secondaryDept] : []}
                                                    onSelectionChange={(k) => setSecondaryDept(Array.from(k)[0] as string || '')}
                                                    classNames={{
                                                        trigger: "relative pr-10 bg-white border-2 border-slate-200 shadow-sm rounded-xl data-[hover=true]:border-emerald-400 data-[hover=true]:bg-emerald-50 transition-all h-11 text-slate-800 text-[14px] font-semibold",
                                                        value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-500", selectorIcon: "text-slate-500 absolute w-5 right-3", innerWrapper: "w-full text-slate-800",
                                                        popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                                    }}>
                                                    {departments.map(d => <SelectItem key={String(d.DepartmentID)} textValue={formatDeptLabel(d)} className="data-[hover=true]:bg-emerald-50 data-[hover=true]:text-emerald-700 font-semibold">{formatDeptLabel(d)} ({d.studentCount})</SelectItem>)}
                                                </Select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="text-[11px] text-slate-700 font-medium">Avoid same-department adjacency on a bench</div>
                                    <button
                                        type="button"
                                        onClick={() => setAvoidSameDeptBench(v => !v)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${avoidSameDeptBench ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                        aria-pressed={avoidSameDeptBench}
                                        title="Avoid same-department neighbors on each bench"
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${avoidSameDeptBench ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="text-[11px] text-slate-700 font-medium">Shuffle rooms randomly</div>
                                    <button
                                        type="button"
                                        onClick={() => setShuffleRooms(v => !v)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shuffleRooms ? 'bg-blue-500' : 'bg-slate-300'}`}
                                        aria-pressed={shuffleRooms}
                                        title="Randomize room assignment order to avoid continuous halls"
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shuffleRooms ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                {assignmentMode === 'two-alternate' && primaryDept && secondaryDept && primaryDept === secondaryDept && (
                                    <div className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-700 font-medium">
                                        Same primary/secondary department selected. Students will still be split alternately.
                                    </div>
                                )}

                                {/* Assignment preview */}
                                {selectedDate && (
                                    <div className={`px-3 py-2.5 rounded-xl border text-[11px] font-medium ${!hasPreviewInputs
                                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                                        : projectedUnassigned === 0
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : selectedSeatCount === 0
                                                ? 'bg-slate-50 border-slate-200 text-slate-600'
                                                : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                        <span className="font-bold">Assignment Preview:</span>{' '}
                                        Eligible students: <span className="font-bold">{eligibleStudentCount}</span> · Selected seats: <span className="font-bold">{selectedSeatCount}</span> ·
                                        Unassigned after run: <span className="font-bold">{projectedUnassigned}</span>
                                        {!hasPreviewInputs && (
                                            <span className="ml-1">· Select strategy/departments to preview a real assignment.</span>
                                        )}
                                    </div>
                                )}

                                {/* Hall selector — compact chip grid */}
                                {hallSummary.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <Armchair size={10} className="text-slate-500" /> Halls
                                                <span className="text-slate-500 normal-case font-normal tracking-normal">(empty = all)</span>
                                            </span>
                                            <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-md p-0.5">
                                                <button onClick={selectAllHalls} className="text-[9px] font-medium text-slate-600 hover:text-slate-800 px-2 py-0.5 rounded hover:bg-slate-200 transition-colors">All</button>
                                                <span className="text-slate-600">|</span>
                                                <button onClick={clearHallSelection} className="text-[9px] font-medium text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded hover:bg-slate-200 transition-colors">None</button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input name="custom-input" 
                                                value={hallSearch}
                                                onChange={(e) => setHallSearch(e.target.value)}
                                                placeholder="Search hall code..."
                                                size="sm"
                                                variant="bordered"
                                                className="flex-1"
                                                classNames={{
                                                    inputWrapper: "h-8 min-h-8 border border-slate-200 bg-white",
                                                    input: "text-[11px] text-slate-700",
                                                }}
                                            />
                                            <Select
                                                aria-label="Hall fill filter"
                                                id="hall-fill-filter-select" name="hallFilter"
                                                selectedKeys={[hallFilter]}
                                                onSelectionChange={(k) => setHallFilter((Array.from(k)[0] as 'all' | 'empty' | 'partial' | 'full') || 'all')}
                                                size="sm"
                                                variant="bordered"
                                                className="max-w-[128px]"
                                                classNames={{ trigger: "h-8 min-h-8 border border-slate-200 bg-white", value: "text-[10px] font-semibold" }}
                                            >
                                                <SelectItem key="all">All</SelectItem>
                                                <SelectItem key="empty">Empty</SelectItem>
                                                <SelectItem key="partial">Partial</SelectItem>
                                                <SelectItem key="full">Full</SelectItem>
                                            </Select>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto dark-scrollbar pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}>
                                            {visibleHalls.map(h => {
                                                const isSelected = selectedHallIds.has(h.hallId);
                                                const pct = h.totalSeats > 0 ? Math.round((h.filledSeats / h.totalSeats) * 100) : 0;
                                                return (
                                                    <button key={h.hallId} onClick={() => toggleHall(h.hallId)}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-200 border ${isSelected
                                                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)] scale-[1.02]'
                                                            : pct >= 100
                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100'
                                                                : pct > 0
                                                                    ? 'bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300 hover:bg-amber-100'
                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                                                            }`}
                                                    >
                                                        {h.hallCode}
                                                        {pct > 0 && !isSelected && (
                                                            <span className="text-[8px] font-mono opacity-80 bg-slate-100 px-1 py-0.5 rounded">{pct}%</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="text-[9px] text-indigo-600 font-semibold tracking-wide">
                                            {selectedHallIds.size > 0
                                                ? `${selectedHallIds.size} halls selected · ${selectedSeatCount} seats`
                                                : `All halls · ${selectedSeatCount} seats`}
                                        </div>
                                    </div>
                                )}

                                {/* Assign & Shuffle Buttons */}
                                <div className="flex flex-col gap-3 mt-3">
                                    <div className="flex gap-3">
                                        <Button onPress={handleBulkAssign} isLoading={assigning}
                                            isDisabled={!selectedDate || !canAssignByMode}
                                            className="flex-1 font-bold text-white shadow-md bg-indigo-600 shadow-md shadow-indigo-200 hover:bg-indigo-700 rounded-xl h-11 border border-indigo-700 transition-all data-[disabled=true]:opacity-50 text-[15px]"
                                            startContent={!assigning ? <Zap size={18} fill="currentColor" /> : undefined} size="lg"
                                        >
                                            {assigning ? 'Generating…' : `Generate Seating${selectedHallIds.size > 0 ? '' : ' (All Halls)'}`}
                                        </Button>

                                        <Button onPress={handleShuffleGlobal} isLoading={shuffling}
                                            isDisabled={!selectedDate || totalFilled === 0}
                                            className="font-bold text-white shadow-md bg-pink-600 shadow-md shadow-pink-200 hover:bg-pink-700 rounded-xl h-11 w-11 min-w-11 px-0 border border-pink-700 transition-all data-[disabled=true]:opacity-50 text-[15px]"
                                            title="Shuffle Existing"
                                        >
                                            {!shuffling && <Shuffle size={18} />}
                                        </Button>
                                    </div>
                                    {assignmentFeedback && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Last run</p>
                                            <p className="text-[11px] text-slate-600">
                                                Assigned <span className="font-bold text-emerald-700">{assignmentFeedback.assigned}</span> ·
                                                Unassigned <span className="font-bold text-amber-700">{assignmentFeedback.unassigned}</span> ·
                                                Halls used <span className="font-bold text-indigo-700">{assignmentFeedback.hallsUsed}</span>
                                            </p>
                                            {assignmentFeedback.hallIds.length > 0 && (
                                                <Button
                                                    size="sm"
                                                    onPress={handleViewAffectedHalls}
                                                    className="h-8 text-[11px] font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200"
                                                >
                                                    View affected halls
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardBody>
                        </Card>

                        {/* ── Stats Row (compact) ── */}
                        {selectedDate && hallSummary.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm backdrop-blur-xl">
                                <Progress aria-label="Overall seating capacity" value={totalCapacity > 0 ? (totalFilled / totalCapacity) * 100 : 0} size="sm" className="flex-1"
                                    classNames={{ indicator: `rounded-full transition-all duration-500 ${totalFilled >= totalCapacity ? 'bg-emerald-500' : 'bg-indigo-500'} shadow-sm`, track: "rounded-full bg-slate-100 border border-slate-200" }}
                                />
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex items-center gap-1">
                                        <LayoutGrid size={11} className="text-slate-500" />
                                        <span className="text-[10px] font-bold text-slate-700">{hallSummary.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <CheckCircle2 size={11} className="text-emerald-500" />
                                        <span className="text-[10px] font-bold text-emerald-600">{totalFilled}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <AlertCircle size={11} className="text-amber-500" />
                                        <span className="text-[10px] font-bold text-amber-600">{totalCapacity - totalFilled}</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-slate-600">{totalFilled}<span className="text-slate-500">/{totalCapacity}</span></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══════ RIGHT: HALL CARDS ═══════ */}
                    <div className="flex-1 min-w-0 z-10">
                        {selectedDate ? (
                            loadingSummary ? (
                                <Card className="border border-slate-200 shadow-xl bg-white/80 backdrop-blur-2xl rounded-[24px] min-h-[500px]">
                                    <CardBody className="py-20 text-center flex flex-col justify-center items-center">
                                        <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl mb-6 relative">
                                            <div className="absolute inset-0 bg-indigo-100 blur-2xl rounded-full" />
                                            <RefreshCw size={36} className="text-indigo-500 animate-[spin_2s_linear_infinite] drop-shadow-sm relative z-10" />
                                        </div>
                                        <p className="text-slate-800 font-extrabold text-[20px] tracking-wide mb-2 opacity-90">Loading hall status</p>
                                        <p className="text-slate-500 font-medium text-sm">Gathering layout data from the server…</p>
                                    </CardBody>
                                </Card>
                            ) : hallSummary.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-4 px-2">
                                        <div>
                                            <h2 className="text-[17px] font-semibold text-slate-800 tracking-wide flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-indigo-500">
                                                    <LayoutGrid size={16} />
                                                </span>
                                                {fmtDate(selectedDate)} · {selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}
                                            </h2>
                                            <p className="text-[12px] text-slate-500 font-medium mt-2 pl-[44px]">{hallSummary.length} halls · {totalFilled}/{totalCapacity} seats filled</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Per-hall seating download */}
                                            <Button size="sm" isDisabled={seatingDownloading || totalFilled === 0}
                                                onPress={downloadSeatingExcel}
                                                className="font-semibold text-[12px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-2 border-emerald-200 rounded-xl h-10 px-4 transition-all"
                                                startContent={seatingDownloading ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={15} />}>
                                                {seatingDownloading ? 'Generating…' : 'Download Seating'}
                                            </Button>

                                            {/* Global download dropdown */}
                                            <Dropdown placement="bottom-end" classNames={{ content: "bg-white border text-slate-800 border-slate-200 shadow-2xl rounded-xl p-1" }}>
                                                <DropdownTrigger>
                                                    <Button size="sm" isDisabled={globalDownloading || totalFilled === 0}
                                                        className="font-semibold text-[12px] bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border-2 border-indigo-200 rounded-xl h-10 px-4 transition-all"
                                                        startContent={globalDownloading ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={15} />}>
                                                        {globalDownloading ? 'Generating…' : 'Download Report'}
                                                    </Button>
                                                </DropdownTrigger>
                                                <DropdownMenu aria-label="Download format"
                                                    classNames={{ base: 'bg-white border border-slate-200 rounded-xl shadow-2xl min-w-[180px]', list: 'gap-1 p-1' }}
                                                    onAction={(key) => { if (key === 'pdf') downloadGlobalPDF(); else if (key === 'excel') downloadGlobalExcel(); }}>
                                                    <DropdownItem key="pdf"
                                                        startContent={<FileDown size={14} className="text-rose-500" />}
                                                        className="text-slate-700 data-[hover=true]:bg-slate-100 data-[hover=true]:text-slate-900 rounded-lg"
                                                        textValue="Download PDF">
                                                        <span className="text-[12px] font-semibold">Download PDF</span>
                                                        <p className="text-[10px] text-slate-500">Consolidated A4 document</p>
                                                    </DropdownItem>
                                                    <DropdownItem key="excel"
                                                        startContent={<FileSpreadsheet size={14} className="text-emerald-600" />}
                                                        className="text-slate-700 data-[hover=true]:bg-slate-100 data-[hover=true]:text-slate-900 rounded-lg"
                                                        textValue="Download Excel">
                                                        <span className="text-[12px] font-semibold">Download Excel</span>
                                                        <p className="text-[10px] text-slate-500">Spreadsheet format</p>
                                                    </DropdownItem>
                                                </DropdownMenu>
                                            </Dropdown>

                                            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
                                                <div className="text-right">
                                                    <span className={`text-[15px] font-bold block ${totalFilled >= totalCapacity && totalCapacity > 0 ? 'text-emerald-600' : totalFilled > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                        {totalCapacity > 0 ? Math.round((totalFilled / totalCapacity) * 100) : 0}%
                                                    </span>
                                                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">filled</span>
                                                </div>
                                                <Progress aria-label="Hall seating fill level" value={totalCapacity > 0 ? (totalFilled / totalCapacity) * 100 : 0} size="sm" className="w-20"
                                                    classNames={{ indicator: `rounded-full transition-all duration-500 ${totalFilled >= totalCapacity ? 'bg-emerald-500' : totalFilled > 0 ? 'bg-amber-400' : 'bg-slate-400'}`, track: "bg-slate-200" }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
                                        {[...hallSummary].sort((a, b) => b.filledSeats - a.filledSeats).map((h) => {
                                            const pct = h.totalSeats > 0 ? Math.round((h.filledSeats / h.totalSeats) * 100) : 0;
                                            const isFull = pct >= 100;
                                            const hasData = pct > 0;
                                            return (
                                                <div key={h.hallId}
                                                    className={`relative rounded-[20px] border p-6 group transition-all duration-300 hover:-translate-y-1 ${isFull ? 'bg-white/80 border-emerald-200 hover:border-emerald-300 shadow-sm hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]'
                                                        : hasData ? 'bg-white/80 border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]'
                                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 shadow-sm hover:shadow-lg hover:shadow-indigo-500/10'}`}
                                                >
                                                    {/* Glowing top lip */}
                                                    <div className={`absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[20px] ${isFull ? 'bg-emerald-400' : hasData ? 'bg-amber-400' : 'bg-indigo-400'}`}></div>

                                                    {/* Three-dot menu */}
                                                    <div className="absolute top-4 right-4 z-10">
                                                        <Dropdown placement="bottom-end" classNames={{ content: "bg-white border text-slate-800 border-slate-200 shadow-2xl rounded-xl p-1" }}>
                                                            <DropdownTrigger>
                                                                <button onClick={(e) => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all opacity-0 group-hover:opacity-100">
                                                                    <MoreVertical size={18} />
                                                                </button>
                                                            </DropdownTrigger>
                                                            <DropdownMenu aria-label="Hall actions"
                                                                classNames={{ base: 'bg-white border border-slate-200 rounded-xl shadow-2xl min-w-[180px]', list: 'gap-0' }}
                                                                onAction={(key) => {
                                                                    if (key === 'clear') { handleCardClearHall(h); }
                                                                    else if (key === 'disable') { handleDisableHall(h); }
                                                                }}>
                                                                <DropdownItem key="clear" startContent={<XCircle size={15} className="text-amber-500" />}
                                                                    className="text-slate-700 data-[hover=true]:bg-slate-100 data-[hover=true]:text-slate-900 rounded-lg" textValue="Clear Allocations"
                                                                    isDisabled={!hasData}>
                                                                    <span className="text-[13px] font-semibold">Clear Allocations</span>
                                                                </DropdownItem>
                                                                <DropdownItem key="disable" startContent={<Power size={15} className="text-rose-500" />}
                                                                    className="text-rose-600 data-[hover=true]:bg-rose-50 data-[hover=true]:text-rose-700 rounded-lg py-2 mt-1 border-t border-slate-100" textValue="Disable Hall">
                                                                    <span className="text-[13px] font-semibold">Disable Hall</span>
                                                                </DropdownItem>
                                                            </DropdownMenu>
                                                        </Dropdown>
                                                    </div>

                                                    <div className="flex items-center gap-4 mb-5 cursor-pointer" onClick={() => openHallDetail(h)}>
                                                        <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors border ${isFull ? 'bg-emerald-50 border-emerald-500/20 text-emerald-600' : hasData ? 'bg-amber-50 border-amber-500/20 text-amber-600' : 'bg-slate-100 border-transparent text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200'}`}>
                                                            <Armchair size={22} strokeWidth={2} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[17px] font-bold text-slate-800 tracking-wide">{h.hallCode}</h4>
                                                            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Capacity {h.capacity}</p>
                                                        </div>
                                                    </div>

                                                    <div className="cursor-pointer" onClick={() => openHallDetail(h)}>
                                                        <Progress aria-label="Room occupancy percentage" value={pct} size="sm"
                                                            color={isFull ? 'success' : hasData ? 'warning' : 'default'}
                                                            classNames={{ indicator: "rounded-full transition-all duration-500", track: "rounded-full bg-slate-200" }}
                                                            className="mb-4"
                                                        />

                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className={`text-[15px] font-bold ${isFull ? 'text-emerald-600' : hasData ? 'text-amber-600' : 'text-slate-600'}`}>{h.filledSeats}</span>
                                                                <span className="text-[11px] text-slate-500 font-medium"> / {h.totalSeats} seats</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-800 transition-colors flex items-center gap-1.5 uppercase tracking-widest bg-slate-100 group-hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-transparent group-hover:border-indigo-200">
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
                                <Card className="border border-slate-200 shadow-[0_24px_80px_rgba(0,0,0,0.05)] bg-white/50 backdrop-blur-2xl rounded-[24px] min-h-[500px] overflow-hidden relative group">
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdHRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNCkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-60" />
                                    <div className="absolute top-[20%] left-[20%] w-72 h-72 bg-amber-50 blur-[100px] rounded-full point-events-none group-hover:bg-amber-500/20 transition-colors duration-1000" />
                                    <div className="absolute bottom-[20%] right-[20%] w-72 h-72 bg-red-50 blur-[100px] rounded-full point-events-none group-hover:bg-red-500/20 transition-colors duration-1000" />

                                    <CardBody className="py-24 text-center flex flex-col items-center justify-center relative z-10">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                                            <div className="p-6 bg-white border border-slate-200 rounded-[28px] shadow-2xl backdrop-blur-xl relative z-10 transform group-hover:scale-105 transition-transform duration-500">
                                                <AlertCircle size={48} className="text-amber-600 drop-shadow-sm" strokeWidth={1.5} />
                                            </div>
                                        </div>
                                        <h3 className="text-slate-800 font-extrabold text-[24px] tracking-tight mb-3">No Halls Configured</h3>
                                        <p className="text-slate-500 text-[15px] font-medium max-w-[400px]">There are currently no active halls available for assignments. Add or enable halls in the system first.</p>
                                    </CardBody>
                                </Card>
                            )
                        ) : (
                            <Card className="border border-slate-200 shadow-[0_24px_80px_rgba(0,0,0,0.05)] bg-white/50 backdrop-blur-2xl rounded-[24px] min-h-[600px] overflow-hidden relative group">
                                {/* Decorative background grid */}
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdHRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNCkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-60" />
                                
                                {/* Ambient interactive glowing orbs */}
                                <div className="absolute top-[20%] left-[20%] w-72 h-72 bg-indigo-50 blur-[100px] rounded-full pointer-events-none group-hover:bg-indigo-100 transition-colors duration-1000" />
                                <div className="absolute bottom-[20%] right-[20%] w-72 h-72 bg-emerald-50 blur-[100px] rounded-full pointer-events-none group-hover:bg-emerald-100 transition-colors duration-1000" />

                                <CardBody className="py-24 text-center flex flex-col items-center justify-center relative z-10 w-full h-full">
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 bg-indigo-100 blur-2xl rounded-full" />
                                        <div className="p-7 bg-white border border-slate-200 rounded-[32px] shadow-sm backdrop-blur-xl relative z-10 transform group-hover:scale-105 transition-transform duration-500 hover:border-indigo-300">
                                            <Calendar size={64} className="text-indigo-600/90 hover:text-indigo-500 drop-shadow-sm transition-colors" strokeWidth={1.2} />
                                        </div>
                                    </div>
                                    <h2 className="text-[32px] font-extrabold text-slate-800 tracking-tight mb-5">
                                        Ready to Build Layouts?
                                    </h2>
                                    <p className="text-slate-600 text-[16px] max-w-[440px] mx-auto leading-relaxed font-medium mt-4">
                                        Select a specific <span className="text-indigo-600 font-semibold px-1">exam date</span> and <span className="text-indigo-600 font-semibold px-1">session</span> from the side panel to view available halls and begin student assignments.
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
                    base: "max-w-[96vw] max-h-[94vh] m-auto rounded-2xl bg-white border border-slate-200 shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col",
                    body: "p-0 overflow-y-auto flex-1"
                }}>
                <ModalContent>
                    {() => (<>
                        {/* ── Refined Header ── */}
                        <ModalHeader className="shrink-0 flex justify-between items-center px-8 py-4 border-b border-slate-200 sticky top-0 z-50" style={{ background: 'linear-gradient(180deg, #1d2335 0%, #171c28 100%)' }}>
                            <div className="flex items-center gap-5">
                                <div className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-900/25">
                                    <Armchair size={20} className="text-slate-800" />
                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[8px] font-extrabold text-amber-600 tracking-widest whitespace-nowrap">
                                        {detailHall?.hallCode}
                                    </div>
                                </div>
                                <div className="ml-1">
                                    <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">Seating Layout</h2>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] font-medium text-slate-500">{selectedDate && fmtDate(selectedDate)}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span className="text-[10px] font-medium text-slate-500">{selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span className="text-[10px] font-bold text-emerald-600">{detailFilled}<span className="text-slate-500 font-normal"> / {detailTotalSeats}</span></span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {detailFilled > 0 && (<>
                                    <Button size="sm" variant="flat" onPress={handleSaveHall}
                                        className="font-semibold text-[11px] text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 rounded-lg h-8 px-4 transition-all" startContent={<Save size={13} />}>Save</Button>
                                    <Button size="sm" variant="flat" onPress={() => setShowPrintModal(true)}
                                        className="font-semibold text-[11px] text-slate-600 bg-slate-500/10 hover:bg-slate-500/15 border border-slate-500/20 rounded-lg h-8 px-4 transition-all" startContent={<Printer size={13} />}>Print</Button>
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
                                    <RefreshCw size={28} className="text-amber-600 animate-spin mx-auto mb-4" />
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
                                                        <div key={d} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide bg-white border border-slate-200"
                                                            style={{ color: st.text }}>
                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.text, boxShadow: `0 0 8px ${st.text}50` }} />
                                                            {d}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}

                                    {/* ── Bench Grid — Structure-style column layout ── */}
                                    <div
                                        className="grid gap-5 items-start"
                                        style={{ gridTemplateColumns: `repeat(${Math.max(detailBenchRows.length, 1)}, minmax(220px, 1fr))` }}
                                    >
                                        {detailBenchRows.map((row) => (
                                            <div key={row.rowLabel} className="space-y-4">
                                                <div className="h-8 flex items-center justify-center">
                                                    <span className="w-9 h-9 rounded-full bg-[#22314a] border border-[#2f4364] text-[12px] font-extrabold text-slate-500 flex items-center justify-center">
                                                        {row.rowLabel}
                                                    </span>
                                                </div>
                                                {row.benches.map((bench) => {
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
                                                    <div className="bg-gradient-to-r from-[#2a3245] to-[#252d40] rounded-t-xl px-3 py-1.5 flex items-center justify-between border border-b-0 border-slate-200 group-hover:from-[#303a50] group-hover:to-[#2a3348] transition-all">
                                                        <span className="text-[9px] font-extrabold text-slate-500 group-hover:text-slate-700 tracking-[0.2em] uppercase transition-colors">
                                                            B{bench.benchNumber}
                                                        </span>
                                                        <span className="text-[8px] text-slate-500 font-mono">
                                                            BENCH {bench.benchNumber}
                                                        </span>
                                                    </div>

                                                    {/* ─── TWO SEATS (chairs at the desk) ─── */}
                                                    <div className="grid grid-cols-2 gap-[2px]">
                                                        {/* Left Seat */}
                                                        <Tooltip content={ld ? 'Disabled' : la ? `${la.registerNumber} — ${la.studentName}` : 'Empty'} delay={200} classNames={{ content: 'bg-white text-slate-800 text-[11px] font-medium rounded-lg border border-slate-200 shadow-2xl' }}>
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
                                                                                <span className="text-[9px] text-slate-500 font-medium w-full truncate leading-none">{la.studentName}</span>
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
                                                        <Tooltip content={rd ? 'Disabled' : ra ? `${ra.registerNumber} — ${ra.studentName}` : 'Empty'} delay={200} classNames={{ content: 'bg-white text-slate-800 text-[11px] font-medium rounded-lg border border-slate-200 shadow-2xl' }}>
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
                                                                                <span className="text-[9px] text-slate-500 font-medium w-full truncate leading-none">{ra.studentName}</span>
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
                                        ))}
                                    </div>
                                </div>
                            )}
                        </ModalBody>
                    </>)}
                </ModalContent>
            </Modal>
            {/* ═══ Print Modal (Professional Official Document Layout) ═══ */}
            <Modal isOpen={showPrintModal} onOpenChange={setShowPrintModal} backdrop="blur" size="4xl" scrollBehavior="outside"
                classNames={{ base: 'bg-white shadow-2xl rounded-2xl my-8', header: 'hidden', footer: 'border-t border-slate-200 bg-slate-50/80 px-6 py-4 sticky bottom-0 z-10' }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalBody className="p-0 overflow-visible">
                                {/* ── Printable Area ── */}
                                <div id="seat-sync-print-area" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", background: '#fff', color: '#111' }}>

                                    {/* Letterhead */}
                                    <div style={{ borderBottom: '3px double #e2e8f0', padding: '28px 40px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: 12, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                                            </svg>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', color: '#ffffff', lineHeight: 1.2 }}>SEAT-SYNC EXAMINATION CONTROL</div>
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Arial', sans-serif" }}>Official Seating Arrangement Document</div>
                                        </div>
                                        <div style={{ textAlign: 'right', fontFamily: "'Arial', sans-serif" }}>
                                            <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Document No.</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.06em' }}>{detailHall?.hallCode}-{selectedDate?.replace(/-/g, '')}-{selectedSession}</div>
                                        </div>
                                    </div>

                                    {/* Exam Detail Strip */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '14px 40px' }}>
                                        {[
                                            { label: 'EXAMINATION HALL', value: detailHall?.hallCode ?? '—' },
                                            { label: 'DATE', value: selectedDate ? fmtDate(selectedDate) : '—' },
                                            { label: 'SESSION', value: selectedSession === 'FN' ? 'Forenoon  (09:00 – 12:00)' : 'Afternoon  (14:00 – 17:00)' },
                                            { label: 'STUDENTS ASSIGNED', value: `${detailFilled} / ${detailTotalSeats}` },
                                        ].map(item => (
                                            <div key={item.label} style={{ padding: '0 12px', borderRight: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: 9, fontFamily: "'Arial', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', fontFamily: "'Arial', sans-serif" }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Table */}
                                    <div style={{ padding: '24px 40px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'Arial', sans-serif" }}>
                                            <thead>
                                                <tr style={{ background: '#ffffff' }}>
                                                    {[
                                                        { label: 'BENCH', w: '7%' },
                                                        { label: 'LEFT — REG. NO.', w: '14%' },
                                                        { label: 'LEFT — STUDENT NAME', w: '26%' },
                                                        { label: 'DEPT', w: '7%' },
                                                        { label: 'RIGHT — REG. NO.', w: '14%' },
                                                        { label: 'RIGHT — STUDENT NAME', w: '26%' },
                                                        { label: 'DEPT', w: '6%' },
                                                    ].map(col => (
                                                        <th key={col.label} style={{ width: col.w, padding: '10px 12px', textAlign: 'left', color: '#e2e8f0', fontWeight: 700, fontSize: 9, letterSpacing: '0.10em', borderRight: '1px solid #1e3a5f' }}>{col.label}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailBenches.map((b, idx) => {
                                                    const ls = b.seats.find(s => s.SeatNumber === 1);
                                                    const rs = b.seats.find(s => s.SeatNumber === 2);
                                                    const la = ls ? detailAssignments[ls.SeatID] : undefined;
                                                    const ra = rs ? detailAssignments[rs.SeatID] : undefined;
                                                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                                                    const cellStyle = { padding: '9px 12px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' as React.CSSProperties['verticalAlign'] };
                                                    return (
                                                        <tr key={`${b.rowLabel}${b.benchNumber}`} style={{ background: rowBg }}>
                                                            <td style={{ ...cellStyle, fontWeight: 700, color: '#475569', letterSpacing: '0.05em', textAlign: 'center', background: idx % 2 === 0 ? '#f1f5f9' : '#e9eef5' }}>
                                                                {b.rowLabel}{b.benchNumber}
                                                            </td>
                                                            <td style={{ ...cellStyle, fontFamily: "'Courier New', monospace", fontWeight: 600, color: la ? '#ffffff' : '#cbd5e1', fontSize: 11 }}>{la?.registerNumber ?? '—'}</td>
                                                            <td style={{ ...cellStyle, color: la ? '#e2e8f0' : '#cbd5e1' }}>{la?.studentName ?? '—'}</td>
                                                            <td style={{ ...cellStyle, textAlign: 'center' }}>
                                                                {la ? <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700 }}>{la.deptCode}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                                                            </td>
                                                            <td style={{ ...cellStyle, fontFamily: "'Courier New', monospace", fontWeight: 600, color: ra ? '#ffffff' : '#cbd5e1', fontSize: 11 }}>{ra?.registerNumber ?? '—'}</td>
                                                            <td style={{ ...cellStyle, color: ra ? '#e2e8f0' : '#cbd5e1' }}>{ra?.studentName ?? '—'}</td>
                                                            <td style={{ ...cellStyle, textAlign: 'center' }}>
                                                                {ra ? <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700 }}>{ra.deptCode}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Footer / Signatures */}
                                    <div style={{ padding: '0 40px 32px', borderTop: '1.5px solid #e2e8f0', marginTop: 4 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, paddingTop: 28 }}>
                                            {['Invigilator Signature', 'Chief Invigilator', 'Controller of Examinations'].map(role => (
                                                <div key={role} style={{ textAlign: 'center' }}>
                                                    <div style={{ borderBottom: '1.5px solid #475569', marginBottom: 8, paddingBottom: 36 }}></div>
                                                    <div style={{ fontSize: 10, fontFamily: "'Arial', sans-serif", fontWeight: 700, color: '#475569', letterSpacing: '0.10em', textTransform: 'uppercase' }}>{role}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 9, color: '#94a3b8', fontFamily: "'Arial', sans-serif", letterSpacing: '0.06em' }}>
                                            Generated by Seat-Sync · {new Date().toLocaleString('en-IN')} · CONFIDENTIAL — FOR OFFICIAL USE ONLY
                                        </div>
                                    </div>

                                </div>{/* /printable area */}
                            </ModalBody>
                            <ModalFooter className="flex justify-between items-center gap-3">
                                <Button variant="light" className="font-semibold text-slate-500" onPress={onClose}>Close</Button>
                                <div className="flex gap-3">
                                    <Button onPress={downloadExcel}
                                        className="font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-800 px-5 rounded-xl shadow-lg border border-emerald-500/40"
                                        startContent={<FileDown size={14} />}>
                                        Download Excel
                                    </Button>
                                    <Button onPress={downloadPDF}
                                        className="font-bold bg-white hover:bg-slate-200 text-slate-800 px-5 rounded-xl shadow-lg border border-slate-200"
                                        startContent={<Printer size={14} />}>
                                        Download PDF
                                    </Button>
                                </div>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* ═══ Global Shuffle Confirmation Modal ═══ */}
            <Modal isOpen={showShuffleConfirm} onOpenChange={setShowShuffleConfirm} placement="center" backdrop="blur" classNames={{ base: "bg-white border border-[#e2e8f0] shadow-2xl overflow-hidden", backdrop: "bg-slate-800/20 backdrop-blur-md" }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            <ModalHeader className="flex flex-col gap-1 border-b border-[#e2e8f0] px-6 py-5 relative z-10">
                                <div className="p-3 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl inline-flex w-fit mb-3">
                                    <Shuffle size={20} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                                    Global Reshuffle
                                </h3>
                            </ModalHeader>
                            <ModalBody className="px-6 py-6 pb-8">
                                <div className="space-y-4">
                                    <p className="text-[14px] text-slate-600 leading-relaxed font-medium">
                                        You are about to randomly scramble all currently assigned students across the entire campus for <br /><span className="text-slate-800 font-bold bg-slate-200 px-2 py-0.5 rounded shadow-inner inline-block mt-1">Date: {selectedDate ? fmtDate(selectedDate) : ''} · Session: {selectedSession}</span>
                                    </p>

                                    <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-3 shadow-inner">
                                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-[#e2e8f0] pb-2">What happens next:</h4>
                                        <ul className="text-[13px] text-slate-600 space-y-3 font-medium">
                                            <li className="flex items-start gap-2.5">
                                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5 " />
                                                Left-side students will be completely randomized across all available Left seats.
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5 " />
                                                Right-side students will be completely randomized across all available Right seats.
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5 " />
                                                <span className="text-amber-200/90">This action cannot be undone.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="border-t border-[#e2e8f0] px-6 py-4 bg-slate-50 relative z-10 flex justify-end gap-3">
                                <Button className="font-semibold text-slate-600 hover:text-slate-800" variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button className="font-bold text-slate-800 shadow-[0_0_20px_rgba(236,72,153,0.2)] bg-pink-600 hover:bg-pink-500 border border-pink-500/50" onPress={executeShuffleGlobal} startContent={<Shuffle size={16} />}>
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
