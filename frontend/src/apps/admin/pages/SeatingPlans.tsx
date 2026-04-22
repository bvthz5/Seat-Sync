import React, { useEffect, useState, useCallback, useTransition, useMemo } from 'react';
import {
    Card, CardBody, CardHeader, Button, Select, SelectItem,
    Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Divider, Tooltip, Progress,
    Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input, Switch
} from '@heroui/react';
import {
    LayoutGrid, Zap, Save, Trash2, Printer,
    Building2, Users, CheckCircle2, AlertCircle, RefreshCw,
    Calendar, Sun, Moon, Armchair, ClipboardList, ChevronRight, Ban, Eye,
    MoreVertical, Power, XCircle, Shuffle, FileSpreadsheet, FileDown, Sheet,
    ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SeatingService } from '../services/seatingService';
import { ExamService } from '../services/examService';
import api from '../../../services/api';


/* ─── Types ───────────────────────────────────────── */
interface Hall { RoomID: number; RoomCode: string; Capacity: number; TotalRows: number; BenchesPerRow: number; SeatsPerBench: number; }
interface Dept { DepartmentID: number; DepartmentName: string; DepartmentCode: string; studentCount: number; }
interface SeatInfo { SeatID: number; RowLabel: string; BenchNumber: number; SeatNumber: number; IsActive: boolean; }
interface Bench { rowLabel: string; benchNumber: number; seats: SeatInfo[]; }
interface Assignment { seatId: number; studentId: number; studentName: string; registerNumber: string; deptCode: string; side: 'left' | 'right'; isEligible?: boolean; isBlocked?: boolean; subjectCode?: string; subjectName?: string; }
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

/* ─── Subject Color Palette (hue wheel, 12 distinct hues) ── */
const SUBJECT_HUE_PALETTE = [
    { h: 220, text: '#60a5fa', glow: 'rgba(96,165,250,0.35)' },   // blue
    { h: 280, text: '#c084fc', glow: 'rgba(192,132,252,0.35)' },  // violet
    { h: 160, text: '#34d399', glow: 'rgba(52,211,153,0.35)' },   // emerald
    { h: 30, text: '#fb923c', glow: 'rgba(251,146,60,0.35)' },   // orange
    { h: 340, text: '#f472b6', glow: 'rgba(244,114,182,0.35)' },  // pink
    { h: 200, text: '#22d3ee', glow: 'rgba(34,211,238,0.35)' },   // cyan
    { h: 50, text: '#fbbf24', glow: 'rgba(251,191,36,0.35)' },   // amber
    { h: 120, text: '#4ade80', glow: 'rgba(74,222,128,0.35)' },   // green
    { h: 260, text: '#818cf8', glow: 'rgba(129,140,248,0.35)' },  // indigo
    { h: 0, text: '#f87171', glow: 'rgba(248,113,113,0.35)' },  // red (non-error)
    { h: 310, text: '#e879f9', glow: 'rgba(232,121,249,0.35)' },  // fuchsia
    { h: 170, text: '#2dd4bf', glow: 'rgba(45,212,191,0.35)' },   // teal
];
const subjectColorCache = new Map<string, typeof SUBJECT_HUE_PALETTE[0]>();
const getSubjectStyle = (code: string): typeof SUBJECT_HUE_PALETTE[0] => {
    if (!code) return SUBJECT_HUE_PALETTE[0]!;
    if (subjectColorCache.has(code)) return subjectColorCache.get(code)!;
    const hash = [...code].reduce((a, c) => a * 31 + c.charCodeAt(0), 0);
    const style = SUBJECT_HUE_PALETTE[Math.abs(hash) % SUBJECT_HUE_PALETTE.length]!;
    subjectColorCache.set(code, style);
    return style;
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
    const [examDeptMap, setExamDeptMap] = useState<Record<string, Dept[]>>({});
    const [exams, setExams] = useState<any[]>([]);
    const [hallSummary, setHallSummary] = useState<HallSummary[]>([]);

    const [selectedSeries, setSelectedSeries] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedSession, setSelectedSession] = useState<'FN' | 'AN'>('FN');
    const [assignmentMode, setAssignmentMode] = useState<'single' | 'two-alternate' | 'auto-balanced'>('auto-balanced');
    const [primaryDept, setPrimaryDept] = useState<string>('');
    const [secondaryDept, setSecondaryDept] = useState<string>('');
    const [avoidSameDeptBench, setAvoidSameDeptBench] = useState(true);
    const [shuffleRooms, setShuffleRooms] = useState(false);
    const [roomCapacityLimit, setRoomCapacityLimit] = useState<number>(40);
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
    const [clearingAll, setClearingAll] = useState(false);
    const [assignmentFeedback, setAssignmentFeedback] = useState<AssignFeedback | null>(null);
    const [hideIneligible, setHideIneligible] = useState(false);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
    const [lastExamType, setLastExamType] = useState<'Internal' | 'EndSemester'>('Internal');
    const [lastSubjects, setLastSubjects] = useState<string[]>([]);

    /* derived */
    const availableDates = [...new Set(examDates.filter(d => d.session === selectedSession).map(d => d.examDate))].sort();
    // Calculate the number of unique exams for the selected date/session
    const filteredExams = exams.filter(e => String(e.ExamDate).split('T')[0] === selectedDate && String(e.Session).toUpperCase() === selectedSession);
    const uniqueExamNames = Array.from(new Set(filteredExams.map(e => e.ExamName)));
    const currentSlot = examDates.find(d => d.examDate === selectedDate && d.session === selectedSession);
    const currentExamCount = uniqueExamNames.length;
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
            setExams([]);
            return;
        }

        // Fetch exams for the selected date/session
        (async () => {
            try {
                const examList = await ExamService.getAll({ startDate: selectedDate, endDate: selectedDate, session: selectedSession });
                setExams(Array.isArray(examList) ? examList : []);
                // Fetch eligible students for each exam and aggregate by department
                const deptMap: Record<string, Dept> = {};
                await Promise.all(examList.map(async (exam: any) => {
                    const dept = exam?.Subject?.Department;
                    if (dept && dept.DepartmentID) {
                        let studentCount = 0;
                        try {
                            const students = await ExamService.getEligibleStudents(exam.ExamID);
                            studentCount = Array.isArray(students) ? students.length : 0;
                        } catch { studentCount = 0; }
                        if (!deptMap[dept.DepartmentID]) {
                            deptMap[dept.DepartmentID] = {
                                DepartmentID: dept.DepartmentID,
                                DepartmentName: dept.DepartmentName,
                                DepartmentCode: dept.DepartmentCode,
                                studentCount: 0
                            };
                        }
                        deptMap[dept.DepartmentID].studentCount += studentCount;
                    }
                }));
                setDepartments(Object.values(deptMap));
                
                // Set EndSem state correctly on load instead of waiting for generation
                const hasEndSem = Array.isArray(examList) && examList.some((e: any) => e.ExamSeries?.ExamType === 'EndSemester');
                setLastExamType(hasEndSem ? 'EndSemester' : 'Internal');
            } catch {
                toast.error('Failed to load exams/departments');
                setDepartments([]);
                setExams([]);
            }
        })();
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
                roomCapacityLimit,
            });
            // Support both Internal (totalLeft/RightAssigned) and EndSem (assignedCount) response shapes
            const examType: string = r.examType || 'Internal';
            setLastExamType(examType === 'EndSemester' ? 'EndSemester' : 'Internal');
            if (examType === 'EndSemester' && Array.isArray(r.subjects)) setLastSubjects(r.subjects);
            let assigned = 0, totalEligible = 0;
            if (examType === 'EndSemester') {
                assigned = Number(r.assignedCount || 0);
                totalEligible = Number(r.studentCount || 0);
            } else {
                assigned = Number(r.totalLeftAssigned || 0) + Number(r.totalRightAssigned || 0);
                totalEligible = Number(r.totalLeftAvailable || 0) + Number(r.totalRightAvailable || 0);
            }
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
            const typeLabel = examType === 'EndSemester' ? ' (End Sem)' : '';
            toast.success(`${typeLabel} Assigned ${assigned} student${assigned !== 1 ? 's' : ''}${unassigned > 0 ? ` · ${unassigned} unassigned` : ''}`);
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

    /* clear ALL allocations for the current date+session */
    const handleClearAllAllocations = async () => {
        if (!selectedDate) return;
        setShowClearAllConfirm(false);
        startTransition(() => setClearingAll(true));
        try {
            const r = await SeatingService.clearAllAllocations(selectedDate, selectedSession);
            toast.success(r.message || 'All allocations cleared');
            setAssignmentFeedback(null);
            startTransition(() => loadSummary());
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to clear all allocations');
        } finally {
            startTransition(() => setClearingAll(false));
        }
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

    const downloadSeatingPDF = async () => {
        if (!selectedDate) return;
        setSeatingDownloading(true);
        try {
            const allocatedHalls = [...hallSummary]
                .filter(h => h.filledSeats > 0)
                .sort((a, b) => a.hallCode.localeCompare(b.hallCode));

            if (allocatedHalls.length === 0) {
                toast.error('No halls have assigned seats');
                return;
            }

            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const sessionLabel = selectedSession === 'FN' ? 'Forenoon' : 'Afternoon';

            for (let i = 0; i < allocatedHalls.length; i++) {
                const hall = allocatedHalls[i];
                if (i > 0) doc.addPage();

                const [layout, alloc] = await Promise.all([
                    SeatingService.getHallLayout(hall.hallId),
                    SeatingService.getAllocationForHall(selectedDate, selectedSession, hall.hallId),
                ]);
                const benches: Bench[] = layout?.benches || [];
                const assignments: Record<number, Assignment> = alloc?.assignments || {};
                const rowLabels = [...new Set(benches.map(b => b.rowLabel))].sort();
                const benchesByRow = new Map<string, Bench[]>();
                rowLabels.forEach((rowLabel) => {
                    benchesByRow.set(
                        rowLabel,
                        benches
                            .filter(b => b.rowLabel === rowLabel)
                            .sort((a, b) => a.benchNumber - b.benchNumber)
                    );
                });

                const drawHeader = () => {
                    doc.setFillColor(255, 255, 255);
                    doc.rect(0, 0, pageW, pageH, 'F');
                    doc.setFillColor(248, 250, 252);
                    doc.rect(0, 0, pageW, 18, 'F');
                    doc.setDrawColor(226, 232, 240);
                    doc.line(0, 18, pageW, 18);

                    doc.setTextColor(71, 85, 105);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text('SEATING LAYOUT', 9, 6.5);
                    doc.setTextColor(15, 23, 42);
                    doc.setFontSize(11);
                    doc.text(`Hall ${hall.hallCode}`, 9, 11.5);
                    doc.setFontSize(7.5);
                    doc.setTextColor(100, 116, 139);
                    doc.text(`${fmtDate(selectedDate)}  ·  ${sessionLabel}  ·  ${hall.filledSeats}/${hall.totalSeats}`, 9, 16);
                };

                const marginX = 8;
                const gapX = 2.5;
                const gapY = 2.5;
                const startY = 21;
                const bottomMargin = 6;
                const availableW = pageW - marginX * 2;
                const availableH = pageH - startY - bottomMargin;
                const cols = Math.max(rowLabels.length, 1);
                const rowsNeeded = Math.max(
                    rowLabels.reduce((max, rowLabel) => Math.max(max, benchesByRow.get(rowLabel)?.length ?? 0), 0),
                    1
                );
                const cardW = (availableW - (cols - 1) * gapX) / cols;
                const cardH = (availableH - (rowsNeeded - 1) * gapY) / rowsNeeded;
                const labelFont = Math.max(5.2, Math.min(7, cardH * 0.28));
                const regFont = Math.max(5.8, Math.min(10, cardH * 0.45));

                drawHeader();

                rowLabels.forEach((rowLabel, colIdx) => {
                    const rowBenches = benchesByRow.get(rowLabel) ?? [];
                    rowBenches.forEach((bench, benchIdx) => {
                        const x = marginX + colIdx * (cardW + gapX);
                        const y = startY + benchIdx * (cardH + gapY);

                        const leftSeat = bench.seats.find(s => s.SeatNumber === 1);
                        const rightSeat = bench.seats.find(s => s.SeatNumber === 2);
                        const leftReg = leftSeat ? (assignments[leftSeat.SeatID]?.registerNumber ?? '—') : '—';
                        const rightReg = rightSeat ? (assignments[rightSeat.SeatID]?.registerNumber ?? '—') : '—';

                        doc.setFillColor(255, 255, 255);
                        doc.setDrawColor(203, 213, 225);
                        doc.setLineWidth(0.65);
                        doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'FD');
                        doc.setFillColor(241, 245, 249);
                        doc.rect(x, y, cardW, Math.min(4, cardH * 0.34), 'F');
                        doc.setDrawColor(148, 163, 184);
                        doc.setLineWidth(0.45);
                        doc.line(x + cardW / 2, y + Math.min(4, cardH * 0.34), x + cardW / 2, y + cardH);

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(labelFont);
                        doc.setTextColor(71, 85, 105);
                        doc.text(`${rowLabel}${bench.benchNumber}`, x + 1.8, y + Math.min(2.8, cardH * 0.25));

                        doc.setFont('courier', 'bold');
                        doc.setFontSize(regFont);
                        doc.setTextColor(15, 23, 42);
                        doc.text(leftReg, x + cardW * 0.25, y + cardH * 0.67, { align: 'center' });
                        doc.text(rightReg, x + cardW * 0.75, y + cardH * 0.67, { align: 'center' });
                    });
                });
            }

            doc.save(`Seating_${selectedDate}_${selectedSession}.pdf`);
            toast.success('Seating PDF downloaded');
        } catch (err: any) {
            console.error('downloadSeatingPDF error:', err);
            toast.error('Failed to generate PDF: ' + (err?.message || 'Unknown error'));
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

                    {/* ═══════ LEFT PANEL — 5-STEP WIZARD ═══════ */}
                    <div className="w-full xl:w-[400px] shrink-0 xl:sticky xl:top-2 z-10 flex flex-col gap-4">

                        <Card className="border border-slate-200 shadow-xl bg-white/95 backdrop-blur-2xl rounded-[24px] overflow-hidden">
                            <CardBody className="px-5 py-5 flex flex-col gap-5">

                                {/* ─── STEP 1: Exam Slot ─────────────────── */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">1</span>
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Select Exam</span>
                                    </div>

                                    {/* Series (optional) */}
                                    <Select aria-label="Exam Series" placeholder="All Series (optional)" variant="bordered"
                                        id="exam-series-select" name="examSeries"
                                        selectedKeys={selectedSeries ? [selectedSeries] : []}
                                        onSelectionChange={(k) => setSelectedSeries(Array.from(k)[0] as string || '')}
                                        classNames={{
                                            trigger: "relative pr-10 bg-white border border-slate-200 rounded-xl h-10 text-slate-800 text-[13px] font-semibold data-[hover=true]:border-indigo-400 transition-all",
                                            value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-400",
                                            selectorIcon: "text-slate-400 absolute w-4 right-3",
                                            popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                        }}>
                                        {seriesList.map(s => <SelectItem key={String(s.ExamSeriesID)} textValue={s.SeriesName} className="data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700 font-semibold">{s.SeriesName}</SelectItem>)}
                                    </Select>

                                    {/* Session toggle */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['FN', 'AN'] as const).map(s => (
                                            <button key={s} onClick={() => { setSelectedSession(s); setSelectedDate(''); }}
                                                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-bold transition-all border-2 ${selectedSession === s
                                                        ? s === 'FN' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-orange-50 text-orange-700 border-orange-300'
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                    }`}>
                                                {s === 'FN' ? <Sun size={14} className={selectedSession === s ? 'text-indigo-600' : 'text-slate-400'} /> : <Moon size={14} className={selectedSession === s ? 'text-orange-600' : 'text-slate-400'} />}
                                                {s === 'FN' ? 'Forenoon' : 'Afternoon'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Date */}
                                    <Select aria-label="Exam Date" placeholder={availableDates.length > 0 ? 'Select Date' : 'No dates for this session'} variant="bordered"
                                        id="exam-date-select" name="examDate"
                                        selectedKeys={selectedDate ? new Set([selectedDate]) : new Set([])}
                                        onSelectionChange={(k) => setSelectedDate(Array.from(k)[0] as string || '')}
                                        isDisabled={availableDates.length === 0}
                                        classNames={{
                                            trigger: "relative pr-10 bg-white border border-slate-200 rounded-xl h-10 text-slate-800 text-[13px] font-semibold data-[hover=true]:border-indigo-400 transition-all",
                                            value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-400",
                                            selectorIcon: "text-slate-400 absolute w-4 right-3",
                                            popoverContent: "bg-white border text-slate-800 border-slate-200 shadow-xl font-medium"
                                        }}>
                                        {availableDates.map(d => (
                                            <SelectItem key={String(d)} textValue={fmtDate(d)} className="data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700 font-semibold text-slate-800">{fmtDate(d)}</SelectItem>
                                        ))}
                                    </Select>

                                    {selectedDate && currentSlot && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                            <span className="text-[10px] font-medium text-indigo-700">
                                                {fmtDate(selectedDate)} · {selectedSession} · <strong>{currentExamCount} exam{currentExamCount !== 1 ? 's' : ''}</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-slate-100" />

                                {/* ─── STEP 2: Allocation Strategy ──────── */}
                                <div className={`space-y-3 transition-opacity ${!selectedDate ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">2</span>
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Choose Mode</span>
                                    </div>

                                    <Select
                                        aria-label="Allocation strategy"
                                        id="allocation-strategy-select" name="allocationStrategy"
                                        selectedKeys={[assignmentMode]}
                                        onSelectionChange={(k) => onAssignmentModeChange((Array.from(k)[0] as 'single' | 'two-alternate' | 'auto-balanced') || 'auto-balanced')}
                                        variant="bordered"
                                        classNames={{
                                            trigger: "relative pr-10 bg-white border border-slate-200 rounded-xl h-10 text-slate-800 text-[13px] font-semibold data-[hover=true]:border-emerald-400 transition-all",
                                            value: "text-slate-800 font-semibold",
                                            selectorIcon: "text-slate-400 absolute w-4 right-3",
                                            popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                        }}>
                                        <SelectItem key="auto-balanced">Auto Balanced (Recommended)</SelectItem>
                                        <SelectItem key="single">Single Department</SelectItem>
                                        <SelectItem key="two-alternate">Two-Department Alternate</SelectItem>
                                    </Select>

                                    {assignmentMode === 'single' && (
                                        <Select aria-label="Primary Department" placeholder="Select Department" variant="bordered"
                                            id="primary-dept-select-single" name="primaryDeptSingle"
                                            selectedKeys={primaryDept ? [primaryDept] : []}
                                            onSelectionChange={(k) => setPrimaryDept(Array.from(k)[0] as string || '')}
                                            classNames={{
                                                trigger: "relative pr-10 bg-white border border-slate-200 rounded-xl h-10 text-slate-800 text-[13px] font-semibold data-[hover=true]:border-emerald-400 transition-all",
                                                value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-400",
                                                selectorIcon: "text-slate-400 absolute w-4 right-3",
                                                popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                            }}>
                                            {departments.map(d => <SelectItem key={String(d.DepartmentID)} textValue={formatDeptLabel(d)} className="data-[hover=true]:bg-emerald-50 data-[hover=true]:text-emerald-700 font-semibold">{formatDeptLabel(d)} ({d.studentCount})</SelectItem>)}
                                        </Select>
                                    )}

                                    {assignmentMode === 'two-alternate' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Primary</span>
                                                <Select aria-label="Primary Department" placeholder="None" variant="bordered"
                                                    id="primary-dept-select-dual" name="primaryDeptDual"
                                                    selectedKeys={primaryDept ? [primaryDept] : []}
                                                    onSelectionChange={(k) => setPrimaryDept(Array.from(k)[0] as string || '')}
                                                    classNames={{
                                                        trigger: "relative pr-8 bg-white border border-slate-200 rounded-xl h-10 text-slate-800 text-[12px] font-semibold data-[hover=true]:border-emerald-400 transition-all",
                                                        value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-400",
                                                        selectorIcon: "text-slate-400 absolute w-4 right-2",
                                                        popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                                    }}>
                                                    {departments.map(d => <SelectItem key={String(d.DepartmentID)} textValue={formatDeptLabel(d)} className="data-[hover=true]:bg-emerald-50 data-[hover=true]:text-emerald-700 font-semibold">{formatDeptLabel(d)} ({d.studentCount})</SelectItem>)}
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Secondary</span>
                                                <Select aria-label="Secondary Department" placeholder="None" variant="bordered"
                                                    id="secondary-dept-select-dual" name="secondaryDeptDual"
                                                    selectedKeys={secondaryDept ? [secondaryDept] : []}
                                                    onSelectionChange={(k) => setSecondaryDept(Array.from(k)[0] as string || '')}
                                                    classNames={{
                                                        trigger: "relative pr-8 bg-white border border-slate-200 rounded-xl h-10 text-slate-800 text-[12px] font-semibold data-[hover=true]:border-emerald-400 transition-all",
                                                        value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-400",
                                                        selectorIcon: "text-slate-400 absolute w-4 right-2",
                                                        popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                                    }}>
                                                    {departments.map(d => <SelectItem key={String(d.DepartmentID)} textValue={formatDeptLabel(d)} className="data-[hover=true]:bg-emerald-50 data-[hover=true]:text-emerald-700 font-semibold">{formatDeptLabel(d)} ({d.studentCount})</SelectItem>)}
                                                </Select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Options row — compact toggles */}
                                    <div className="flex flex-col gap-2">
                                        {(([
                                            { id: 'avoidSameDept', label: 'Avoid same-dept on bench', value: avoidSameDeptBench, color: 'bg-emerald-500', onChange: () => setAvoidSameDeptBench(v => !v) },
                                            { id: 'shuffleRooms', label: 'Shuffle room order', value: shuffleRooms, color: 'bg-blue-500', onChange: () => setShuffleRooms(v => !v) },
                                        ]) as const).map(opt => (
                                            <div key={opt.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                                                <span className="text-[11px] text-slate-600 font-medium">{opt.label}</span>
                                                <button type="button" onClick={opt.onChange}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${opt.value ? opt.color : 'bg-slate-300'}`}
                                                    aria-pressed={opt.value}>
                                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${opt.value ? 'translate-x-4' : 'translate-x-[3px]'}`} />
                                                </button>
                                            </div>
                                        ))}
                                        {/* End Sem: per-room seat cap */}
                                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                                            <span className="text-[11px] text-slate-600 font-medium">Room cap <span className="text-slate-400 text-[9px]">(End Sem)</span></span>
                                            <input
                                                type="number" min={1} max={200}
                                                value={roomCapacityLimit}
                                                onChange={e => setRoomCapacityLimit(Math.max(1, Number(e.target.value) || 40))}
                                                className="w-14 h-6 text-center text-[11px] font-bold text-slate-700 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-indigo-400"
                                            />
                                        </div>
                                    </div>

                                </div>

                                <div className="h-px bg-slate-100" />

                                {/* ─── STEP 3: Select Halls ─────────────── */}
                                <div className={`space-y-2 transition-opacity ${!selectedDate ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">3</span>
                                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Select Halls</span>
                                            <span className="text-[10px] text-slate-400 normal-case">(empty = all)</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                                            <button onClick={selectAllHalls} className="text-[9px] font-bold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors">All</button>
                                            <span className="text-slate-300">|</span>
                                            <button onClick={clearHallSelection} className="text-[9px] font-medium text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors">None</button>
                                        </div>
                                    </div>

                                    {/* Search + filter */}
                                    <div className="flex items-center gap-2">
                                        <Input name="hall-search"
                                            value={hallSearch} onChange={(e) => setHallSearch(e.target.value)}
                                            placeholder="Search hall…" size="sm" variant="bordered" className="flex-1"
                                            classNames={{ inputWrapper: "h-8 min-h-8 border border-slate-200 bg-white rounded-lg", input: "text-[11px] text-slate-700" }} />
                                        <Select aria-label="Hall filter" id="hall-fill-filter-select" name="hallFilter"
                                            selectedKeys={[hallFilter]}
                                            onSelectionChange={(k) => setHallFilter((Array.from(k)[0] as 'all' | 'empty' | 'partial' | 'full') || 'all')}
                                            size="sm" variant="bordered" className="max-w-[110px]"
                                            classNames={{ trigger: "h-8 min-h-8 border border-slate-200 bg-white rounded-lg", value: "text-[10px] font-semibold" }}>
                                            <SelectItem key="all">All</SelectItem>
                                            <SelectItem key="empty">Empty</SelectItem>
                                            <SelectItem key="partial">Partial</SelectItem>
                                            <SelectItem key="full">Full</SelectItem>
                                        </Select>
                                    </div>

                                    {/* Hall chips */}
                                    {hallSummary.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                            {visibleHalls.map(h => {
                                                const isSelected = selectedHallIds.has(h.hallId);
                                                const pct = h.totalSeats > 0 ? Math.round((h.filledSeats / h.totalSeats) * 100) : 0;
                                                return (
                                                    <button key={h.hallId} onClick={() => toggleHall(h.hallId)}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all border ${isSelected ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                                                                : pct >= 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                                    : pct > 0 ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                            }`}>
                                                        {h.hallCode}
                                                        {pct > 0 && !isSelected && <span className="text-[8px] font-mono opacity-75 bg-white/40 px-1 rounded">{pct}%</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <p className="text-[9px] text-indigo-600 font-semibold">
                                        {selectedHallIds.size > 0 ? `${selectedHallIds.size} selected · ${selectedSeatCount} seats` : `All halls · ${selectedSeatCount} seats`}
                                    </p>
                                </div>

                                <div className="h-px bg-slate-100" />

                                {/* ─── STEP 4: Preview ──────────────────── */}
                                {selectedDate && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">4</span>
                                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Preview</span>
                                        </div>
                                        <div className={`px-3 py-2.5 rounded-xl border text-[11px] font-medium ${!hasPreviewInputs ? 'bg-slate-50 border-slate-200 text-slate-500'
                                                : projectedUnassigned === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                    : selectedSeatCount === 0 ? 'bg-slate-50 border-slate-200 text-slate-500'
                                                        : 'bg-amber-50 border-amber-200 text-amber-700'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <span>Students</span><strong>{eligibleStudentCount}</strong>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span>Seats</span><strong>{selectedSeatCount}</strong>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span>Unassigned after run</span>
                                                <strong className={projectedUnassigned > 0 ? 'text-amber-600' : 'text-emerald-600'}>{projectedUnassigned}</strong>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="h-px bg-slate-100" />

                                {/* ─── STEP 5: Generate / Shuffle ───────── */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">5</span>
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Generate / Shuffle</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button onPress={handleBulkAssign} isLoading={assigning}
                                            isDisabled={!selectedDate || !canAssignByMode}
                                            className="flex-1 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl h-11 border border-indigo-700 transition-all data-[disabled=true]:opacity-50 text-[14px] shadow-md shadow-indigo-200"
                                            startContent={!assigning ? <Zap size={16} fill="currentColor" /> : undefined} size="lg">
                                            {assigning ? 'Generating…' : 'Generate Seating'}
                                        </Button>
                                        <Button onPress={handleShuffleGlobal} isLoading={shuffling}
                                            isDisabled={!selectedDate || totalFilled === 0}
                                            className="font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl h-11 w-11 min-w-11 px-0 border border-pink-700 transition-all data-[disabled=true]:opacity-50 shadow-md shadow-pink-200"
                                            title="Re-shuffle existing (chunk-safe)">
                                            {!shuffling && <Shuffle size={16} />}
                                        </Button>
                                    </div>

                                    {/* Post-run feedback */}
                                    {assignmentFeedback && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Last run</p>
                                                <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${lastExamType === 'EndSemester'
                                                        ? 'bg-violet-50 text-violet-700 border-violet-200'
                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                    }`}>{lastExamType === 'EndSemester' ? 'End Semester' : 'Internal'}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-600">
                                                Assigned <span className="font-bold text-emerald-700">{assignmentFeedback.assigned}</span> · Unassigned <span className="font-bold text-amber-700">{assignmentFeedback.unassigned}</span> · Halls <span className="font-bold text-indigo-700">{assignmentFeedback.hallsUsed}</span>
                                            </p>
                                            {lastExamType === 'EndSemester' && lastSubjects.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-0.5">
                                                    {lastSubjects.map(s => {
                                                        const ss = getSubjectStyle(s);
                                                        return <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${ss.glow}`, color: ss.text, border: `1px solid ${ss.text}40` }}>{s}</span>;
                                                    })}
                                                </div>
                                            )}
                                            {assignmentFeedback.hallIds.length > 0 && (
                                                <Button size="sm" onPress={handleViewAffectedHalls}
                                                    className="h-7 text-[11px] font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg">
                                                    View affected halls
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </CardBody>
                        </Card>

                        {/* ── Compact stats bar ── */}
                        {selectedDate && hallSummary.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
                                <Progress aria-label="Overall seating capacity" value={totalCapacity > 0 ? (totalFilled / totalCapacity) * 100 : 0} size="sm" className="flex-1"
                                    classNames={{ indicator: `rounded-full transition-all duration-500 ${totalFilled >= totalCapacity ? 'bg-emerald-500' : 'bg-indigo-500'}`, track: "rounded-full bg-slate-100 border border-slate-200" }} />
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
                                    <span className="text-[10px] font-mono font-bold text-slate-600">{totalFilled}<span className="text-slate-400">/{totalCapacity}</span></span>
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
                                            <Dropdown placement="bottom-end" classNames={{ content: "bg-white border text-slate-800 border-slate-200 shadow-2xl rounded-xl p-1" }}>
                                                <DropdownTrigger>
                                                    <Button size="sm" isDisabled={seatingDownloading || totalFilled === 0}
                                                        className="font-semibold text-[12px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-2 border-emerald-200 rounded-xl h-10 px-4 transition-all"
                                                        startContent={seatingDownloading ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={15} />}>
                                                        {seatingDownloading ? 'Generating…' : 'Download Seating'}
                                                    </Button>
                                                </DropdownTrigger>
                                                <DropdownMenu aria-label="Seating download format"
                                                    classNames={{ base: 'bg-white border border-slate-200 rounded-xl shadow-2xl min-w-[180px]', list: 'gap-1 p-1' }}
                                                    onAction={(key) => { if (key === 'pdf') downloadSeatingPDF(); else if (key === 'excel') downloadSeatingExcel(); }}>
                                                    <DropdownItem key="pdf"
                                                        startContent={<FileDown size={14} className="text-rose-500" />}
                                                        className="text-slate-700 data-[hover=true]:bg-slate-100 data-[hover=true]:text-slate-900 rounded-lg"
                                                        textValue="Download PDF">
                                                        <span className="text-[12px] font-semibold">Download PDF</span>
                                                        <p className="text-[10px] text-slate-500">One hall per page</p>
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

                                            {/* ――― Clear All button ――― */}
                                            {totalFilled > 0 && (
                                                <Button size="sm"
                                                    id="clear-all-allocations-btn"
                                                    isLoading={clearingAll}
                                                    isDisabled={clearingAll}
                                                    onPress={() => setShowClearAllConfirm(true)}
                                                    className="font-semibold text-[12px] bg-rose-100 hover:bg-rose-200 text-rose-700 border-2 border-rose-200 rounded-xl h-10 px-4 transition-all"
                                                    startContent={!clearingAll ? <Trash2 size={14} /> : undefined}>
                                                    {clearingAll ? 'Clearing…' : 'Clear All'}
                                                </Button>
                                            )}

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
                                <Button size="sm" isIconOnly variant="light" className="text-slate-400 hover:text-white" onPress={() => setDetailHall(null)}>
                                    <ArrowLeft size={18} />
                                </Button>
                                <div className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-900/25">
                                    <Armchair size={20} className="text-slate-800" />
                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[8px] font-extrabold text-amber-600 tracking-widest whitespace-nowrap">
                                        {detailHall?.hallCode}
                                    </div>
                                </div>
                                <div className="ml-1">
                                    <h2 className="text-[17px] font-bold text-slate-100 tracking-tight">Seating Layout</h2>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] font-medium text-slate-500">{selectedDate && fmtDate(selectedDate)}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span className="text-[10px] font-medium text-slate-500">{selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span className="text-[10px] font-bold text-emerald-600">{detailFilled}<span className="text-slate-500 font-normal"> / {detailTotalSeats}</span></span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                {/* LEGEND & TOGGLE */}
                                <div className="flex items-center gap-4 text-[9px] font-semibold uppercase tracking-wider bg-[#101520]/60 px-4 py-2 rounded-xl border border-slate-700/50 hidden md:flex shadow-inner">
                                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#3b82f6] bg-blue-500"></span><span className="text-slate-300">Normal</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#eab308] bg-yellow-500"></span><span className="text-slate-300">Conflict</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#ef4444] bg-red-500"></span><span className="text-slate-300">Not Eligible</span></div>
                                </div>
                                <div className="flex items-center gap-2 bg-[#101520]/60 px-3 py-1.5 rounded-xl border border-slate-700/50 shadow-inner">
                                    <Switch size="sm" isSelected={hideIneligible} onValueChange={setHideIneligible} 
                                            classNames={{ wrapper: "group-data-[selected=true]:bg-indigo-500" }} />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Hide Ineligible</span>
                                </div>

                                {/* ACTIONS */}
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
                            {/* Animation keyframes */}
                            <style>{`
                                @keyframes seatFadeIn {
                                    from { opacity: 0; transform: translateY(8px) scale(0.96); }
                                    to   { opacity: 1; transform: translateY(0) scale(1); }
                                }
                                .seat-anim { animation: seatFadeIn 0.28s ease both; }
                                .bench-anim { animation: seatFadeIn 0.22s ease both; }
                            `}</style>
                            {detailLoading ? (
                                <div className="py-32 text-center">
                                    <RefreshCw size={28} className="text-amber-600 animate-spin mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium text-sm">Loading layout…</p>
                                </div>
                            ) : (
                                <div>
                                    {/* ── Legend + ExamType Badge + Subject Swatches ── */}
                                    {detailFilled > 0 && (
                                        <div className="flex flex-wrap items-center gap-2 mb-8">
                                            {/* ExamType badge */}
                                            <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border mr-1 ${lastExamType === 'EndSemester'
                                                    ? 'bg-violet-900/40 text-violet-300 border-violet-500/40'
                                                    : 'bg-indigo-900/40 text-indigo-300 border-indigo-500/40'
                                                }`}>
                                                {lastExamType === 'EndSemester' ? '📚 End Semester' : '📝 Internal'}
                                            </span>

                                            {/* Subject swatches — shown for EndSem */}
                                            {lastExamType === 'EndSemester' && (() => {
                                                const subjects = new Set<string>();
                                                Object.values(detailAssignments).forEach(a => { if (a.subjectCode) subjects.add(a.subjectCode); });
                                                const codes = [...subjects].sort();
                                                return codes.map(code => {
                                                    const ss = getSubjectStyle(code);
                                                    return (
                                                        <div key={code} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide"
                                                            style={{ background: `${ss.glow}`, color: ss.text, border: `1px solid ${ss.text}40` }}>
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ss.text, boxShadow: `0 0 6px ${ss.text}` }} />
                                                            {code}
                                                        </div>
                                                    );
                                                });
                                            })()}

                                            {/* Dept colour pills — always shown */}
                                            {lastExamType === 'Internal' && (() => {
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

                                    {/* ── Bench Grid ── */}
                                    <div
                                        className="grid gap-5 items-start"
                                        style={{ gridTemplateColumns: `repeat(${Math.max(detailBenchRows.length, 1)}, minmax(220px, 1fr))` }}
                                    >
                                        {detailBenchRows.map((row, rowIdx) => {
                                            const isEndSemGlobal = lastExamType === 'EndSemester';
                                            let displayLabel: string = row.rowLabel;
                                            let primarySubStyle: any = null;

                                            if (isEndSemGlobal) {
                                                const firstBenchWithLeftSeat = row.benches.find(b => {
                                                    const s = b.seats.find(st => st.SeatNumber === 1);
                                                    return s && detailAssignments[s.SeatID]?.subjectCode;
                                                });
                                                if (firstBenchWithLeftSeat) {
                                                    const s = firstBenchWithLeftSeat.seats.find(st => st.SeatNumber === 1);
                                                    const alloc = detailAssignments[s!.SeatID];
                                                    displayLabel = alloc.subjectName ? `${alloc.subjectName} (${alloc.subjectCode})` : (alloc.subjectCode || row.rowLabel);
                                                    primarySubStyle = getSubjectStyle(alloc.subjectCode || '');
                                                }
                                            }

                                            return (
                                            <div key={row.rowLabel} className="space-y-4" style={{ animationDelay: `${rowIdx * 40}ms` }}>
                                                <div className="h-8 flex flex-row items-center justify-center w-full min-w-max shrink-0">
                                                    {isEndSemGlobal && displayLabel !== row.rowLabel ? (
                                                        <span className="px-3 h-8 rounded-full border text-[11px] font-extrabold flex items-center gap-2"
                                                              style={{ background: primarySubStyle?.glow || '#22314a', color: primarySubStyle?.text || '#94a3b8', borderColor: `${primarySubStyle?.text || '#2f4364'}40` }}>
                                                            <span className="w-5 h-5 rounded-full bg-slate-900/40 flex items-center justify-center text-[10px] text-white/80 shrink-0">{row.rowLabel}</span>
                                                            <span className="truncate max-w-[200px]">{displayLabel}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="w-9 h-9 rounded-full bg-[#22314a] border border-[#2f4364] text-[12px] font-extrabold text-slate-500 flex items-center justify-center">
                                                            {row.rowLabel}
                                                        </span>
                                                    )}
                                                </div>
                                                {row.benches.map((bench, benchIdx) => {
                                                    const ls = bench.seats.find(s => s.SeatNumber === 1);
                                                    const rs = bench.seats.find(s => s.SeatNumber === 2);
                                                    const la = ls ? detailAssignments[ls.SeatID] : undefined;
                                                    const ra = rs ? detailAssignments[rs.SeatID] : undefined;

                                                    // apply 'hide ineligible' filter
                                                    const laVisible = la && !(hideIneligible && la.isBlocked) ? la : undefined;
                                                    const raVisible = ra && !(hideIneligible && ra.isBlocked) ? ra : undefined;

                                                    const lSt = laVisible ? getDeptStyle(laVisible.deptCode) : null;
                                                    const rSt = raVisible ? getDeptStyle(raVisible.deptCode) : null;
                                                    const lSub = laVisible?.subjectCode ? getSubjectStyle(laVisible.subjectCode!) : null;
                                                    const rSub = raVisible?.subjectCode ? getSubjectStyle(raVisible.subjectCode!) : null;
                                                    const isEndSem = lastExamType === 'EndSemester';

                                                    const ld = ls && !ls.IsActive;
                                                    const rd = rs && !rs.IsActive;

                                                    const INELIG_BG = 'linear-gradient(135deg, #2d1010 0%, #1f0c0c 100%)';
                                                    const INELIG_BORDER = '#ef4444';
                                                    const INELIG_BORDER_SOFT = '#ef444430';

                                                    const leftIsBlocked = !ld && !!laVisible?.isBlocked;
                                                    const rightIsBlocked = !rd && !!raVisible?.isBlocked;

                                                    // Bench conflict: both seats have same subject (EndSem only)
                                                    const hasBenchConflict = isEndSem
                                                        && !!laVisible?.subjectCode && !!raVisible?.subjectCode
                                                        && laVisible.subjectCode === raVisible.subjectCode;

                                                    // Seat accent: EndSem uses subject color; Internal uses dept color
                                                    const lAccent = isEndSem && lSub ? lSub.text : lSt ? lSt.text : null;
                                                    const rAccent = isEndSem && rSub ? rSub.text : rSt ? rSt.text : null;

                                                    // Tooltip content helpers
                                                    const leftTooltipContent = ld ? 'Disabled'
                                                        : leftIsBlocked ? `${laVisible!.registerNumber} | ${laVisible!.deptCode} | ⛔ Not Eligible`
                                                            : laVisible ? [
                                                                laVisible.registerNumber,
                                                                laVisible.subjectCode ? `📖 ${laVisible.subjectCode}` : '',
                                                                laVisible.deptCode,
                                                                '✅ Eligible',
                                                            ].filter(Boolean).join('  ·  ')
                                                                : 'Empty';
                                                    const rightTooltipContent = rd ? 'Disabled'
                                                        : rightIsBlocked ? `${raVisible!.registerNumber} | ${raVisible!.deptCode} | ⛔ Not Eligible`
                                                            : raVisible ? [
                                                                raVisible.registerNumber,
                                                                raVisible.subjectCode ? `📖 ${raVisible.subjectCode}` : '',
                                                                raVisible.deptCode,
                                                                '✅ Eligible',
                                                            ].filter(Boolean).join('  ·  ')
                                                                : 'Empty';

                                                    return (
                                                        <div key={`${bench.rowLabel}-${bench.benchNumber}`} className="group bench-anim"
                                                            style={{ animationDelay: `${(rowIdx * 8 + benchIdx) * 18}ms` }}>
                                                            {/* DESK TOP */}
                                                            <div className={`rounded-t-xl px-3 py-1.5 flex items-center justify-between border border-b-0 transition-all ${hasBenchConflict
                                                                    ? 'bg-gradient-to-r from-amber-900/60 to-amber-800/40 border-amber-500/40'
                                                                    : 'bg-gradient-to-r from-[#2a3245] to-[#252d40] border-slate-200 group-hover:from-[#303a50] group-hover:to-[#2a3348]'
                                                                }`}>
                                                                <span className="text-[9px] font-extrabold text-slate-500 group-hover:text-slate-700 tracking-[0.2em] uppercase transition-colors">
                                                                    B{bench.benchNumber}
                                                                </span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {hasBenchConflict && (
                                                                        <span title="Same subject on same bench!" className="text-amber-400 text-[11px] animate-pulse">⚠</span>
                                                                    )}
                                                                    <span className="text-[8px] text-slate-500 font-mono">BENCH {bench.benchNumber}</span>
                                                                </div>
                                                            </div>

                                                            {/* TWO SEATS */}
                                                            <div className="grid grid-cols-2 gap-[2px]">
                                                                {/* Left Seat */}
                                                                <Tooltip
                                                                    content={leftTooltipContent}
                                                                    delay={150}
                                                                    classNames={{
                                                                        content: `text-[11px] font-medium rounded-lg border shadow-2xl max-w-[240px] ${leftIsBlocked ? 'bg-red-50 text-red-700 border-red-200'
                                                                                : 'bg-slate-900 text-slate-100 border-slate-700'
                                                                            }`
                                                                    }}
                                                                >
                                                                    <div
                                                                        className={`relative rounded-bl-xl overflow-hidden cursor-default transition-all duration-200 seat-anim ${ld ? '' : leftIsBlocked ? 'opacity-90' : 'hover:brightness-110'}`}
                                                                        style={{
                                                                            animationDelay: `${(rowIdx * 8 + benchIdx) * 18 + 40}ms`,
                                                                            background: ld ? 'repeating-linear-gradient(45deg, #1a1f2e, #1a1f2e 3px, #1e2436 3px, #1e2436 6px)'
                                                                                : leftIsBlocked ? INELIG_BG
                                                                                    : laVisible ? 'linear-gradient(135deg, #10263b 0%, #151c2e 100%)' : '#131826',
                                                                            borderLeft: ld ? '3px solid transparent' : leftIsBlocked ? `3px solid ${INELIG_BORDER}` : lAccent ? `3px solid ${lAccent}` : '3px solid transparent',
                                                                            borderBottom: `1px solid ${ld ? '#253040' : leftIsBlocked ? INELIG_BORDER_SOFT : lAccent ? lAccent + '30' : '#253040'}`,
                                                                            borderRight: '1px solid #253040',
                                                                            boxShadow: leftIsBlocked ? 'inset 0 0 20px rgba(239,68,68,0.08)'
                                                                                : lAccent && laVisible ? `inset 0 0 12px ${lAccent}12` : 'none',
                                                                        }}
                                                                    >
                                                                        <div className="px-3 py-4 min-h-[80px] flex flex-col items-center justify-center text-center">
                                                                            {ld ? <Ban size={16} className="text-slate-600" />
                                                                                : leftIsBlocked ? (
                                                                                    <div className="flex flex-col items-center w-full gap-1">
                                                                                        <XCircle size={13} className="text-red-500 mb-0.5" />
                                                                                        <span className="text-[11px] font-bold font-mono tracking-wide w-full leading-none text-red-400 opacity-80">{laVisible!.registerNumber}</span>
                                                                                        <span className="text-[8px] text-red-500/60 font-medium w-full truncate leading-none">{laVisible!.studentName}</span>
                                                                                        <span className="mt-1 px-1.5 py-0.5 rounded text-[7px] font-bold tracking-widest uppercase bg-red-900/40 text-red-400 border border-red-700/40">Not Eligible</span>
                                                                                    </div>
                                                                                ) : laVisible ? (
                                                                                    <div className="flex flex-col items-center w-full gap-1">
                                                                                        <span className="text-[13px] font-bold font-mono tracking-wide w-full leading-none" style={{ color: lAccent || (lSt?.text ?? '#94a3b8') }}>{laVisible.registerNumber}</span>
                                                                                        <span className="text-[9px] text-slate-500 font-medium w-full truncate leading-none">{laVisible.studentName}</span>
                                                                                        {isEndSem && laVisible.subjectCode && (
                                                                                            <div className="flex flex-col items-center mt-1 w-full flex-1 justify-center">
                                                                                                <span className="px-1.5 py-0.5 rounded-[4px] text-[8px] font-extrabold tracking-widest uppercase truncate max-w-full"
                                                                                                    style={{ background: `${lSub?.glow ?? '#334155'}`, color: lSub?.text ?? '#94a3b8', border: `1px solid ${lSub?.text ?? '#334155'}40` }}>
                                                                                                    {laVisible.subjectCode}
                                                                                                </span>
                                                                                                {laVisible.subjectName && (
                                                                                                    <span className="text-[6.5px] leading-tight text-slate-400 mt-1 uppercase tracking-wider w-full text-center truncate opacity-80" title={laVisible.subjectName}>
                                                                                                        {laVisible.subjectName}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex flex-col items-center gap-1">
                                                                                        <Armchair size={14} className="text-slate-700" />
                                                                                        <span className="text-[8px] text-slate-600 font-medium">EMPTY</span>
                                                                                    </div>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                </Tooltip>

                                                                {/* Right Seat */}
                                                                <Tooltip
                                                                    content={rightTooltipContent}
                                                                    delay={150}
                                                                    classNames={{
                                                                        content: `text-[11px] font-medium rounded-lg border shadow-2xl max-w-[240px] ${rightIsBlocked ? 'bg-red-50 text-red-700 border-red-200'
                                                                                : 'bg-slate-900 text-slate-100 border-slate-700'
                                                                            }`
                                                                    }}
                                                                >
                                                                    <div
                                                                        className={`relative rounded-br-xl overflow-hidden cursor-default transition-all duration-200 seat-anim ${rd ? '' : rightIsBlocked ? 'opacity-90' : 'hover:brightness-110'}`}
                                                                        style={{
                                                                            animationDelay: `${(rowIdx * 8 + benchIdx) * 18 + 60}ms`,
                                                                            background: rd ? 'repeating-linear-gradient(45deg, #1a1f2e, #1a1f2e 3px, #1e2436 3px, #1e2436 6px)'
                                                                                : rightIsBlocked ? INELIG_BG
                                                                                    : raVisible ? 'linear-gradient(135deg, #1c1530 0%, #14111e 100%)' : '#13111a',
                                                                            borderRight: rd ? '3px solid transparent' : rightIsBlocked ? `3px solid ${INELIG_BORDER}` : rAccent ? `3px solid ${rAccent}` : '3px solid transparent',
                                                                            borderBottom: `1px solid ${rd ? '#253040' : rightIsBlocked ? INELIG_BORDER_SOFT : rAccent ? rAccent + '30' : '#253040'}`,
                                                                            borderLeft: '1px solid #253040',
                                                                            boxShadow: rightIsBlocked ? 'inset 0 0 20px rgba(239,68,68,0.08)'
                                                                                : rAccent && raVisible ? `inset 0 0 12px ${rAccent}12` : 'none',
                                                                        }}
                                                                    >
                                                                        <div className="px-3 py-4 min-h-[80px] flex flex-col items-center justify-center text-center">
                                                                            {rd ? <Ban size={16} className="text-slate-600" />
                                                                                : rightIsBlocked ? (
                                                                                    <div className="flex flex-col items-center w-full gap-1">
                                                                                        <XCircle size={13} className="text-red-500 mb-0.5" />
                                                                                        <span className="text-[11px] font-bold font-mono tracking-wide w-full leading-none text-red-400 opacity-80">{raVisible!.registerNumber}</span>
                                                                                        <span className="text-[8px] text-red-500/60 font-medium w-full truncate leading-none">{raVisible!.studentName}</span>
                                                                                        <span className="mt-1 px-1.5 py-0.5 rounded text-[7px] font-bold tracking-widest uppercase bg-red-900/40 text-red-400 border border-red-700/40">Not Eligible</span>
                                                                                    </div>
                                                                                ) : raVisible ? (
                                                                                    <div className="flex flex-col items-center w-full gap-1">
                                                                                        <span className="text-[13px] font-bold font-mono tracking-wide w-full leading-none" style={{ color: rAccent || (rSt?.text ?? '#94a3b8') }}>{raVisible.registerNumber}</span>
                                                                                        <span className="text-[9px] text-slate-500 font-medium w-full truncate leading-none">{raVisible.studentName}</span>
                                                                                        {isEndSem && raVisible.subjectCode && (
                                                                                            <div className="flex flex-col items-center mt-1 w-full flex-1 justify-center">
                                                                                                <span className="px-1.5 py-0.5 rounded-[4px] text-[8px] font-extrabold tracking-widest uppercase truncate max-w-full"
                                                                                                    style={{ background: `${rSub?.glow ?? '#334155'}`, color: rSub?.text ?? '#94a3b8', border: `1px solid ${rSub?.text ?? '#334155'}40` }}>
                                                                                                    {raVisible.subjectCode}
                                                                                                </span>
                                                                                                {raVisible.subjectName && (
                                                                                                    <span className="text-[6.5px] leading-tight text-slate-400 mt-1 uppercase tracking-wider w-full text-center truncate opacity-80" title={raVisible.subjectName}>
                                                                                                        {raVisible.subjectName}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
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
                                            );
                                        })}
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

            {/* ═══ Clear All Allocations Confirmation Modal ═══ */}
            <Modal
                isOpen={showClearAllConfirm}
                onOpenChange={setShowClearAllConfirm}
                placement="center"
                backdrop="blur"
                classNames={{
                    base: "bg-white border border-red-100 shadow-2xl overflow-hidden max-w-md",
                    backdrop: "bg-slate-900/40 backdrop-blur-md",
                }}
            >
                <ModalContent>
                    {(onClose) => (<>
                        {/* Decorative glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-[50px] pointer-events-none" />

                        <ModalHeader className="flex flex-col gap-1 border-b border-red-100 px-6 py-5 relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-rose-100 border border-rose-200 rounded-xl">
                                    <Trash2 size={20} className="text-rose-600" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-[18px] font-bold text-slate-800 tracking-tight">Clear All Allocations</h3>
                            </div>
                            {/* Target session badge */}
                            <div className="flex items-center gap-2 pl-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Target:</span>
                                <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700 border border-slate-200">
                                    {selectedDate ? fmtDate(selectedDate) : ''} · {selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}
                                </span>
                            </div>
                        </ModalHeader>

                        <ModalBody className="px-6 py-5 relative z-10">
                            <div className="space-y-4">
                                {/* Stats row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                                        <p className="text-[22px] font-extrabold text-rose-600">{hallSummary.filter(h => h.filledSeats > 0).length}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Halls</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                                        <p className="text-[22px] font-extrabold text-rose-600">{totalFilled}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Students</p>
                                    </div>
                                </div>

                                {/* Warning list */}
                                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 space-y-2.5">
                                    <h4 className="text-[10px] font-bold text-rose-700 uppercase tracking-widest border-b border-rose-100 pb-2">What will happen:</h4>
                                    <ul className="text-[12px] text-slate-600 space-y-2 font-medium">
                                        <li className="flex items-start gap-2.5">
                                            <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                            All seat assignments across <strong>every hall</strong> for this session will be erased.
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                            Student registrations and eligibility data are <strong>not affected</strong>.
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                            <span className="text-rose-700 font-semibold">This action cannot be undone.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </ModalBody>

                        <ModalFooter className="border-t border-red-100 px-6 py-4 bg-slate-50 relative z-10 flex justify-end gap-3">
                            <Button variant="light" className="font-semibold text-slate-600 hover:text-slate-800" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button
                                id="confirm-clear-all-btn"
                                className="font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 shadow-md shadow-rose-200 px-6 rounded-xl"
                                onPress={handleClearAllAllocations}
                                startContent={<Trash2 size={15} />}
                            >
                                Yes, Clear All
                            </Button>
                        </ModalFooter>
                    </>)}
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
