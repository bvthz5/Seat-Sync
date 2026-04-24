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
    ArrowLeft, Rocket, Play, Check
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
interface SeriesTask {
    date: string;
    session: 'FN' | 'AN';
    status: 'pending' | 'running' | 'success' | 'failed';
    error?: string;
    assigned?: number;
}
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

/* ─── Subject Color Palette — 16 visually distinct colors ──────────────
   Colors are hand-picked across the full hue wheel, spaced ~22° apart,
   all light/bright enough to read on the dark blueprint background.
   Sequential assignment (first-seen order) guarantees:
     • Same code → always same color (cache is stable per session)
     • Different codes → always different color (no hash collisions)
   Supports up to 16 simultaneous subject codes with zero collisions.      */
const SUBJECT_HUE_PALETTE = [
    { h: 200, text: '#67e8f9', glow: 'rgba(103,232,249,0.28)' },  //  0  cyan
    { h: 262, text: '#c4b5fd', glow: 'rgba(196,181,253,0.28)' },  //  1  violet
    { h: 142, text: '#6ee7b7', glow: 'rgba(110,231,183,0.28)' },  //  2  emerald
    { h: 24, text: '#fdba74', glow: 'rgba(253,186,116,0.28)' },  //  3  orange
    { h: 340, text: '#f9a8d4', glow: 'rgba(249,168,212,0.28)' },  //  4  pink
    { h: 213, text: '#93c5fd', glow: 'rgba(147,197,253,0.28)' },  //  5  sky-blue
    { h: 50, text: '#fde68a', glow: 'rgba(253,230,138,0.28)' },  //  6  amber
    { h: 168, text: '#5eead4', glow: 'rgba(94,234,212,0.28)' },   //  7  teal
    { h: 280, text: '#e879f9', glow: 'rgba(232,121,249,0.28)' },  //  8  fuchsia
    { h: 104, text: '#a3e635', glow: 'rgba(163,230,53,0.28)' },  //  9  lime
    { h: 4, text: '#fca5a5', glow: 'rgba(252,165,165,0.28)' },  // 10  rose
    { h: 246, text: '#a5b4fc', glow: 'rgba(165,180,252,0.28)' },  // 11  indigo
    { h: 183, text: '#67e8f9', glow: 'rgba(103,232,249,0.22)' },  // 12  light-cyan
    { h: 76, text: '#d9f99d', glow: 'rgba(217,249,157,0.28)' },  // 13  yellow-green
    { h: 316, text: '#f0abfc', glow: 'rgba(240,171,252,0.28)' },  // 14  orchid
    { h: 228, text: '#bfdbfe', glow: 'rgba(191,219,254,0.28)' },  // 15  pale-blue
];
const subjectColorCache = new Map<string, typeof SUBJECT_HUE_PALETTE[0]>();
/* Sequential assignment: first new code gets slot 0, second gets slot 1, etc.
   Wraps around after 16 subjects (extremely rare in practice).             */
const getSubjectStyle = (code: string): typeof SUBJECT_HUE_PALETTE[0] => {
    if (!code) return SUBJECT_HUE_PALETTE[0]!;
    if (subjectColorCache.has(code)) return subjectColorCache.get(code)!;
    const nextIdx = subjectColorCache.size % SUBJECT_HUE_PALETTE.length;
    const style = SUBJECT_HUE_PALETTE[nextIdx]!;
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
    const [totalEligibleStudents, setTotalEligibleStudents] = useState<number>(0);
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
    const [roomCapacityLimit, setRoomCapacityLimit] = useState<string>('');
    const [selectedHallIds, setSelectedHallIds] = useState<Set<number>>(new Set());
    const [hallSearch, setHallSearch] = useState('');
    const [hallFilter, setHallFilter] = useState<'all' | 'empty' | 'partial' | 'full'>('all');
    const [batchYears, setBatchYears] = useState<number[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<string>('');

    const [assigning, setAssigning] = useState(false);
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
    const [globalDownloading, setGlobalDownloading] = useState(false);
    const [seatingDownloading, setSeatingDownloading] = useState(false);
    const [clearingAll, setClearingAll] = useState(false);
    const [assignmentFeedback, setAssignmentFeedback] = useState<AssignFeedback | null>(null);
    const [hideIneligible, setHideIneligible] = useState(false);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
    // Derive exam type from loaded exams (prevents reset-on-reload bug)
    // fallback to Internal if no exams loaded yet
    const [_lastExamTypeOverride, setLastExamTypeOverride] = useState<'Internal' | 'EndSemester' | null>(null);
    const [_lastSubjectsFromBulk, setLastSubjectsFromBulk] = useState<string[]>([]);

    /* auto assign series */
    const [showSeriesModal, setShowSeriesModal] = useState(false);
    const [seriesTasks, setSeriesTasks] = useState<SeriesTask[]>([]);
    const [seriesRunning, setSeriesRunning] = useState(false);

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

    // We strictly use the independently counted total across all queries
    const eligibleStudentCount = totalEligibleStudents;

    // Derive lastExamType: auto-detect from loaded exams; override kicks in after bulkAssign or openHallDetail
    const lastExamType: 'Internal' | 'EndSemester' = useMemo(() => {
        if (_lastExamTypeOverride) return _lastExamTypeOverride;
        const fromExams = exams.some((e: any) => e.ExamSeries?.ExamType === 'EndSemester');
        if (fromExams) return 'EndSemester';
        // also check detailAssignments – if any seat has a subjectCode it's EndSem
        const hasSubject = Object.values(detailAssignments).some((a: any) => !!a.subjectCode);
        return hasSubject ? 'EndSemester' : 'Internal';
    }, [_lastExamTypeOverride, exams, detailAssignments]);

    // Derive subjects shown after bulkAssign or reopening the detail modal
    const lastSubjects: string[] = useMemo(() => {
        if (_lastSubjectsFromBulk.length > 0) return _lastSubjectsFromBulk;
        return [...new Set(Object.values(detailAssignments).map((a: any) => a.subjectCode).filter(Boolean))] as string[];
    }, [_lastSubjectsFromBulk, detailAssignments]);

    // alias setters so existing call-sites keep working unchanged
    const setLastExamType = setLastExamTypeOverride;
    const setLastSubjects = setLastSubjectsFromBulk;

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
            try { setHalls(await SeatingService.getHalls().then(r => Array.isArray(r) ? r : [])); } catch { toast.error('Failed to load halls'); }
            try { setDepartments(await SeatingService.getDepartments().then(r => Array.isArray(r) ? r : [])); } catch { toast.error('Failed to load departments'); }
            try {
                const filters = await api.get('/students/meta/filters').catch(() => ({ data: { batchYears: [] } }));
                if (filters.data?.batchYears) setBatchYears(filters.data.batchYears);
            } catch { }
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
                const examList = await ExamService.getAll({ startDate: selectedDate, endDate: selectedDate, session: selectedSession, seriesId: selectedSeries ? Number(selectedSeries) : undefined });
                setExams(Array.isArray(examList) ? examList : []);
                const deptMap: Record<number, Dept> = {};
                let totalExamStudents = 0;
                await Promise.all(examList.map(async (exam: any) => {
                    let studentCount = 0;
                    try {
                        const res = await ExamService.getEligibleStudents(exam.ExamID);
                        studentCount = res?.students && Array.isArray(res.students) ? res.students.length : (Array.isArray(res) ? res.length : 0);
                    } catch { studentCount = 0; }

                    totalExamStudents += studentCount;

                    const dept = exam?.Subject?.Department;
                    if (dept && dept.DepartmentID) {
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
                setTotalEligibleStudents(totalExamStudents);
                // Reset any manual override so the auto-derived value from exams takes over
                setLastExamType(null);
            } catch {
                toast.error('Failed to load exams/departments');
                setDepartments([]);
                setTotalEligibleStudents(0);
                setExams([]);
            }
        })();
    }, [selectedDate, selectedSession, selectedSeries]);

    useEffect(() => {
        if (!selectedSeries) {
            setExamDates([]);
            setSelectedDate('');
            return;
        }
        SeatingService.getExamDates(Number(selectedSeries))
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

    // Auto-refresh data when returning to the tab or on layout update
    useEffect(() => {
        const handleSync = async (e?: Event | MessageEvent) => {
            try {
                const updatedHalls = await SeatingService.getHalls();
                setHalls(Array.isArray(updatedHalls) ? updatedHalls : []);
            } catch { }
            if (selectedDate) loadSummary();

            // Refresh the live detail modal if it's currently open
            let targetRoomId: number | null = null;
            if (e && 'data' in e && (e as MessageEvent).data?.roomId) {
                targetRoomId = Number((e as MessageEvent).data.roomId);
            }

            if (detailHall && (!targetRoomId || detailHall.hallId === targetRoomId)) {
                try {
                    const layout = await SeatingService.getHallLayout(detailHall.hallId);
                    startTransition(() => {
                        setDetailBenches(layout.benches || []);
                        setDetailTotalSeats(layout.totalSeats || 0);
                    });
                } catch { }
            }
        };

        window.addEventListener('focus', handleSync);
        window.addEventListener('ROOM_LAYOUT_UPDATED', handleSync);

        let channel: BroadcastChannel | null = null;
        try {
            channel = new BroadcastChannel('seating_sync');
            channel.onmessage = (e) => {
                if (e.data?.type === 'ROOM_LAYOUT_UPDATED') handleSync(e);
            };
        } catch (e) { }

        return () => {
            window.removeEventListener('focus', handleSync);
            window.removeEventListener('ROOM_LAYOUT_UPDATED', handleSync);
            if (channel) channel.close();
        };
    }, [loadSummary, selectedDate, detailHall]);

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
    const handleBulkAssign = async (useBatch = false) => {
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

        // Only show shortage warning if NOT using batch-wise seating (as batch-wise is expected to be partial)
        if (!useBatch && eligibleStudentCount > 0 && seatCount < eligibleStudentCount) {
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
            console.log("Batch filter:", useBatch ? selectedBatch : 'None');

            const r = await SeatingService.bulkAssign({
                examDate: selectedDate, session: selectedSession, hallIds: ids,
                mode: assignmentMode,
                primaryDeptId: primaryDept ? Number(primaryDept) : null,
                secondaryDeptId: secondaryDept ? Number(secondaryDept) : null,
                avoidSameDeptBench,
                shuffleRooms,
                roomCapacityLimit: roomCapacityLimit !== '' ? Number(roomCapacityLimit) : undefined,
                seriesId: selectedSeries ? Number(selectedSeries) : undefined,
                batchYear: useBatch ? Number(selectedBatch) : undefined,
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

    /* auto assign series */
    const openSeriesModal = () => {
        if (!selectedSeries) return;

        if (examDates.length === 0) {
            toast.error("No valid exams found in this series.");
            return;
        }

        const tasks: SeriesTask[] = examDates.map(d => ({
            date: String(d.examDate).split('T')[0],
            session: d.session as 'FN' | 'AN',
            status: 'pending'
        }));

        setSeriesTasks(tasks);
        setShowSeriesModal(true);
    };

    const runSeriesAllocation = async () => {
        setSeriesRunning(true);
        let ids = selectedHallIds.size > 0 ? [...selectedHallIds] : halls.map(h => h.RoomID);

        const tasks = [...seriesTasks];
        let hasError = false;

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (task.status === 'success') continue;

            task.status = 'running';
            setSeriesTasks([...tasks]);

            try {
                const r = await SeatingService.bulkAssign({
                    examDate: task.date,
                    session: task.session,
                    hallIds: ids,
                    mode: assignmentMode,
                    primaryDeptId: primaryDept ? Number(primaryDept) : null,
                    secondaryDeptId: secondaryDept ? Number(secondaryDept) : null,
                    avoidSameDeptBench,
                    shuffleRooms,
                    roomCapacityLimit: roomCapacityLimit !== '' ? Number(roomCapacityLimit) : undefined,
                    seriesId: selectedSeries ? Number(selectedSeries) : undefined,
                });

                let assigned = 0;
                const examType: string = r.examType || 'Internal';
                if (examType === 'EndSemester') {
                    assigned = Number(r.assignedCount || 0);
                } else {
                    assigned = Number(r.totalLeftAssigned || 0) + Number(r.totalRightAssigned || 0);
                }

                task.status = 'success';
                task.assigned = assigned;
            } catch (err: any) {
                task.status = 'failed';
                task.error = err?.response?.data?.message || 'Failed';
                hasError = true;
            }
            setSeriesTasks([...tasks]);
        }
        setSeriesRunning(false);
        if (hasError) toast.error("Completed with some errors");
        else toast.success("Successfully assigned entire series");

        if (selectedDate && selectedSession) {
            loadSummary();
        }
    };

    /* detail modal */
    const openHallDetail = async (hs: HallSummary) => {
        setDetailHall(hs); setDetailLoading(true); setDetailBenches([]); setDetailAssignments({});
        // Reset bulk overrides so auto-derivation from the fetched assignments takes over
        setLastExamType(null);
        setLastSubjects([]);
        try {
            const layout = await SeatingService.getHallLayout(hs.hallId);
            startTransition(() => {
                setDetailBenches(layout.benches || []);
                setDetailTotalSeats(layout.totalSeats || 0);
            });
            if (selectedDate) {
                try {
                    const alloc = await SeatingService.getAllocationForHall(selectedDate, selectedSession, hs.hallId);
                    if (alloc?.assignments) {
                        startTransition(() => setDetailAssignments(alloc.assignments));
                    }
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
        const globalSubjects = new Set<string>();

        await Promise.all(active.map(async (hall) => {
            if (!selectedDate) return;
            let assignments: Record<number, Assignment> = {};
            try { const alloc = await SeatingService.getAllocationForHall(selectedDate, selectedSession, hall.hallId); assignments = alloc?.assignments ?? {}; } catch { }

            const subjMap: Record<string, { code: string, name: string, regs: string[] }> = {};
            Object.values(assignments).forEach(a => {
                if (a.subjectName) globalSubjects.add(a.subjectName);

                const subCode = a.subjectCode || "Unknown";
                if (!subjMap[subCode]) subjMap[subCode] = { code: subCode, name: a.subjectName || "", regs: [] };
                subjMap[subCode].regs.push(a.registerNumber);
            });
            (hall as any).__subjMap = subjMap;
            (hall as any).__total = Object.keys(assignments).length;
        }));

        const allocatedOnly = active.filter(hall => (((hall as any).__total ?? 0) > 0));
        let slNo = 1;

        allocatedOnly.forEach(hall => {
            const subjMap: Record<string, { code: string, name: string, regs: string[] }> = (hall as any).__subjMap ?? {};
            const total: number = (hall as any).__total ?? 0;
            const subjs = Object.values(subjMap).sort((a, b) => a.code.localeCompare(b.code));

            subjs.forEach((sub, idx) => {
                const ranges = buildRegRanges(sub.regs);
                rows.push({
                    slNo,
                    hallCode: hall.hallCode,
                    regRanges: ranges.join(', '),
                    count: sub.regs.length,
                    total: total,
                    isFirstRow: idx === 0,
                    rowSpan: subjs.length
                });
            });
            slNo++;
        });

        const examNameString = Array.from(globalSubjects).join(' / ') || 'Examinations';
        return { rows, examNameString };
    };

    const downloadGlobalExcel = async () => {
        if (!selectedDate) return;
        setGlobalDownloading(true);
        try {
            const XLSXStyle = (await import('xlsx-js-style')).default;
            const { rows, examNameString } = await buildGlobalRows();
            const sessionLabel = selectedSession === 'FN' ? 'Forenoon' : 'Afternoon';

            // ── Define reusable styles ──
            const headerFill = { patternType: 'solid', fgColor: { rgb: '0F172A' } };
            const headerFont = { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 };
            const whiteFill = { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } };
            const blueFill = { patternType: 'solid', fgColor: { rgb: 'ECF6FF' } };
            const bodyFont = { sz: 9, color: { rgb: '1E293B' } };
            const boldFont = { sz: 9, bold: true, color: { rgb: '1E293B' } };
            const thinBorder = { style: 'thin', color: { rgb: 'B4C3D7' } };
            const thickBorder = { style: 'medium', color: { rgb: '0F172A' } };
            const allThin = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
            const mkBorder = (isFirst: boolean, isLast: boolean) => ({
                top: isFirst ? thickBorder : thinBorder,
                bottom: isLast ? thickBorder : thinBorder,
                left: thinBorder,
                right: thinBorder,
            });

            // ── Build first/last row index sets and group map ──
            const firstRowSet = new Set<number>();
            const lastRowSet = new Set<number>();
            const groupMap = new Map<number, number>();
            let rIdx = 0; let grp = -1;
            rows.forEach(r => {
                if (r.isFirstRow) { firstRowSet.add(rIdx); if (rIdx > 0) lastRowSet.add(rIdx - 1); grp++; }
                groupMap.set(rIdx, grp);
                rIdx++;
            });
            if (rIdx > 0) lastRowSet.add(rIdx - 1);

            // ── Build sheet data (row arrays of styled cell objects) ──
            const DATA: any[][] = [];

            // Title rows (plain)
            const titleStyle = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } };
            const subStyle = { font: { sz: 9 }, alignment: { horizontal: 'center' } };
            DATA.push([{ v: "ST. JOSEPH'S COLLEGE OF ENGINEERING & TECHNOLOGY, PALAI", s: titleStyle }, '', '', '', '']);
            DATA.push([{ v: 'CONSOLIDATED SEATING ARRANGEMENT', s: { font: { bold: true, sz: 11 }, alignment: { horizontal: 'center' } } }, '', '', '', '']);
            let truncExam = examNameString; if (truncExam.length > 80) truncExam = truncExam.substring(0, 77) + '...';
            DATA.push([{ v: truncExam, s: subStyle }, '', '', '', '']);
            DATA.push([{ v: `${fmtDate(selectedDate)}   ·   ${sessionLabel}`, s: subStyle }, '', '', '', '']);
            DATA.push(['', '', '', '', '']); // blank spacer

            // Header row
            const hCols = ['Sl. No.', 'Hall / Room No.', 'Register Numbers', 'Count', 'Total'];
            DATA.push(hCols.map(v => ({ v, s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: allThin } })));

            // Body rows
            rows.forEach((r, i) => {
                const fill = (groupMap.get(i) ?? 0) % 2 === 0 ? whiteFill : blueFill;
                const isFirst = firstRowSet.has(i);
                const isLast = lastRowSet.has(i);
                const border = mkBorder(isFirst, isLast);
                const base = { fill, border };
                DATA.push([
                    { v: r.isFirstRow ? r.slNo : '', s: { ...base, font: boldFont, alignment: { horizontal: 'center', vertical: 'center' } } },
                    { v: r.isFirstRow ? r.hallCode : '', s: { ...base, font: boldFont, alignment: { horizontal: 'center', vertical: 'center' } } },
                    { v: r.regRanges, s: { ...base, font: bodyFont, alignment: { horizontal: 'left', vertical: 'center', wrapText: true } } },
                    { v: r.count, s: { ...base, font: bodyFont, alignment: { horizontal: 'center', vertical: 'center' } } },
                    { v: r.isFirstRow ? r.total : '', s: { ...base, font: boldFont, alignment: { horizontal: 'center', vertical: 'center' } } },
                ]);
            });

            const ws = XLSXStyle.utils.aoa_to_sheet(DATA);
            ws['!cols'] = [{ wch: 8 }, { wch: 16 }, { wch: 52 }, { wch: 9 }, { wch: 9 }];
            // Merge title rows across all 5 cols
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
                { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
                { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
            ];
            const wb = XLSXStyle.utils.book_new();
            XLSXStyle.utils.book_append_sheet(wb, ws, 'Consolidated');
            XLSXStyle.writeFile(wb, `Consolidated_Seating_${selectedDate}_${selectedSession}.xlsx`);
            toast.success('Excel downloaded');
        } catch (e) { console.error(e); toast.error('Failed to generate Excel'); }
        finally { setGlobalDownloading(false); }
    };

    const downloadGlobalPDF = async () => {
        if (!selectedDate) return;
        setGlobalDownloading(true);
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const { rows, examNameString } = await buildGlobalRows();
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const sessionLabel = selectedSession === 'FN' ? 'Forenoon' : 'Afternoon';

            // ── Header block ──
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageW, 42, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text("St. Joseph's College of Engineering And Technology, Palai", pageW / 2, 10, { align: 'center' });
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(203, 213, 225);
            doc.text('Examination Control Division', pageW / 2, 16, { align: 'center' });
            doc.setFillColor(99, 102, 241);
            doc.rect(14, 20, pageW - 28, 0.4, 'F');

            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.text('CONSOLIDATED SEATING ARRANGEMENT', pageW / 2, 26, { align: 'center' });

            let truncatedExamName = examNameString;
            if (truncatedExamName.length > 90) truncatedExamName = truncatedExamName.substring(0, 87) + '...';
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 200);
            doc.text(truncatedExamName, pageW / 2, 32, { align: 'center' });

            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
            doc.text(`${fmtDate(selectedDate)}  \u00b7  ${sessionLabel}`, pageW / 2, 38, { align: 'center' });

            // ── Table ──
            const bodyRows: any[] = [];
            rows.forEach(r => {
                if (r.isFirstRow) {
                    bodyRows.push([
                        { content: String(r.slNo), rowSpan: r.rowSpan },
                        { content: r.hallCode, rowSpan: r.rowSpan },
                        r.regRanges,
                        String(r.count),
                        { content: String(r.total), rowSpan: r.rowSpan },
                    ]);
                } else {
                    bodyRows.push([
                        r.regRanges,
                        String(r.count),
                    ]);
                }
            });

            // Build room-group lookup maps
            const firstRowIndices = new Set<number>();
            const lastRowIndices = new Set<number>();
            const rowGroupMap = new Map<number, number>(); // bodyRowIndex → groupIndex
            let bIdx = 0;
            let gIdx = -1;
            rows.forEach(r => {
                if (r.isFirstRow) {
                    firstRowIndices.add(bIdx);
                    if (bIdx > 0) lastRowIndices.add(bIdx - 1);
                    gIdx++;
                }
                rowGroupMap.set(bIdx, gIdx);
                bIdx++;
            });
            if (bIdx > 0) lastRowIndices.add(bIdx - 1);

            autoTable(doc, {
                startY: 46,
                head: [['Sl.\nNo.', 'HALL /\nROOM No.', 'REGISTER NUMBERS', 'COUNT', 'TOTAL']],
                body: bodyRows,
                theme: 'grid',
                styles: { fontSize: 8.5, cellPadding: 3, font: 'helvetica', textColor: [30, 41, 59], lineColor: [180, 195, 215], lineWidth: 0.2, valign: 'middle' },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, halign: 'center', valign: 'middle', lineColor: [255, 255, 255], lineWidth: 0.3 },
                columnStyles: {
                    0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
                    2: { cellWidth: 105, halign: 'left' },
                    3: { cellWidth: 18, halign: 'center' },
                    4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
                },
                didParseCell: (data: any) => {
                    if (data.section !== 'body') return;
                    const groupIndex = rowGroupMap.get(data.row.index) ?? 0;
                    // Alternate room group background: white vs soft ice-blue
                    data.cell.styles.fillColor = groupIndex % 2 === 0
                        ? [255, 255, 255]
                        : [236, 246, 255];
                },
                willDrawCell: (data: any) => {
                    if (data.section !== 'body') return;
                    const rowIdx: number = data.row.index;
                    const cell = data.cell;
                    const isFirst = firstRowIndices.has(rowIdx);
                    const isLast = lastRowIndices.has(rowIdx);
                    if (isFirst || isLast) {
                        doc.setDrawColor(15, 23, 42);
                        doc.setLineWidth(0.75);
                        if (isFirst) doc.line(cell.x, cell.y, cell.x + cell.width, cell.y);
                        if (isLast) doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
                        doc.setDrawColor(180, 195, 215);
                        doc.setLineWidth(0.2);
                    }
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

            const JSZip = (await import('jszip')).default;
            const { default: jsPDF } = await import('jspdf');
            const zip = new JSZip();

            // Exam Title:
            const filteredExams = exams.filter((e: any) => String(e.ExamDate).split('T')[0] === selectedDate && String(e.Session).toUpperCase() === selectedSession);
            const uniqueExamNames = Array.from(new Set(filteredExams.map((e: any) => e.ExamName)));
            const examTitle = uniqueExamNames.join(' / ') || 'Exam';

            for (let i = 0; i < allocatedHalls.length; i++) {
                const hall = allocatedHalls[i];
                const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                const pageW = doc.internal.pageSize.getWidth(); // 297
                const pageH = doc.internal.pageSize.getHeight(); // 210

                const [layout, alloc] = await Promise.all([
                    SeatingService.getHallLayout(hall.hallId),
                    SeatingService.getAllocationForHall(selectedDate, selectedSession, hall.hallId),
                ]);
                const benches: Bench[] = layout?.benches || [];
                const assignments: Record<number, Assignment> = alloc?.assignments || {};

                // Find active columns and active row numbers (bench numbers)
                const activeCols = new Set<string>();
                const activeRows = new Set<number>();

                benches.forEach(b => {
                    const lSeat = b.seats.find(s => s.SeatNumber === 1);
                    const rSeat = b.seats.find(s => s.SeatNumber === 2);
                    const hasLeft = lSeat && assignments[lSeat.SeatID];
                    const hasRight = rSeat && assignments[rSeat.SeatID];

                    if (hasLeft || hasRight) {
                        activeCols.add(b.rowLabel);
                        activeRows.add(b.benchNumber);
                    }
                });

                // Filtered column labels (e.g. A, B, C)
                const rowLabels = Array.from(activeCols).sort();

                // Filtered bench numbers (e.g. 1, 3, 5)
                const benchNumbers = Array.from(activeRows).sort((a, b) => a - b);

                const benchesByRow = new Map<string, Bench[]>();
                rowLabels.forEach((rowLabel) => {
                    benchesByRow.set(
                        rowLabel,
                        benches.filter(b => b.rowLabel === rowLabel && activeRows.has(b.benchNumber))
                    );
                });

                doc.setFillColor(255, 255, 255);
                doc.rect(0, 0, pageW, pageH, 'F');

                // Collect statistics
                const subjectCounts = new Map<string, number>();
                const deptCounts = new Map<string, number>();
                const roomSubjectNames = new Set<string>();

                Object.values(assignments).forEach(ass => {
                    if (ass.subjectCode) subjectCounts.set(ass.subjectCode, (subjectCounts.get(ass.subjectCode) || 0) + 1);
                    if (ass.subjectName) roomSubjectNames.add(ass.subjectName);

                    // If DB deptCode is empty, try to extract from Register Number (e.g., SJC24EE001 -> EE)
                    let dept = ass.deptCode;
                    if (!dept && ass.registerNumber) {
                        const match = ass.registerNumber.match(/[A-Z]{3}\d{2}([A-Z]+)\d+/);
                        if (match && match[1]) dept = match[1];
                        else dept = "Unknown";
                    } else if (!dept) {
                        dept = "Unknown";
                    }
                    deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
                });

                // Extract only subjects relevant to THIS ROOM
                let roomSubjectTitle = Array.from(roomSubjectNames).join(' / ') || 'Exam';
                if (roomSubjectTitle.length > 100) {
                    roomSubjectTitle = roomSubjectTitle.substring(0, 97) + '...';
                }

                // Draw headers as requested
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.setTextColor(0, 0, 0);
                doc.text("ST. JOSEPH'S COLLEGE OF ENGINEERING & TECHNOLOGY, PALAI (Autonomous)", pageW / 2, 12, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text(roomSubjectTitle, pageW / 2, 17, { align: 'center' });

                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`SEATING ARRANGEMENT - ${selectedDate} (${selectedSession})`, pageW / 2, 22, { align: 'center' });

                doc.setFontSize(12);
                doc.text(`Room: ${hall.hallCode}`, pageW / 2, 28, { align: 'center' });

                // --- SECTION 1: AUTO-SCALING ENGINE ---
                const cols = Math.max(rowLabels.length, 1);
                const rowsNeeded = Math.max(benchNumbers.length, 1);

                // Base values (SMALL HALL: Rows <= 6)
                let gapX = 3;
                let gapY = 3.0;
                let maxCardH = 18;
                let regFont = 9.5;
                let nameFont = 7.5;
                let benchLabelFont = 7.5; // VERY SMALL
                let emptyFont = 7.5;

                let tableScaleW = 1.0;
                let tableFontSize = 8.5;
                let tablePadding = 1.5;

                // Scaling Levels
                if (rowsNeeded > 10) {
                    // LARGE HALL: Reduce bench height (-20%), font (-2px), padding (-30%)
                    maxCardH = 14.4;
                    regFont = 7.5;
                    nameFont = 5.5;
                    benchLabelFont = 6;
                    emptyFont = 6;
                    gapY = 1.5;
                    tableScaleW = 0.75;
                    tableFontSize = 7.0;
                    tablePadding = 1.0;
                } else if (rowsNeeded >= 7) {
                    // MEDIUM HALL: Reduce bench height (-10%), font (-1px)
                    maxCardH = 16.2;
                    regFont = 8.5;
                    nameFont = 6.5;
                    benchLabelFont = 7;
                    emptyFont = 6.5;
                    gapY = 2.0;
                    tableScaleW = 0.85;
                    tableFontSize = 7.5;
                    tablePadding = 1.2;
                }

                // Grid position
                const startY = 44; // Increased to ensure safe clearance below the room header
                const bottomMargin = 8;

                // Dynamic height calculations to fit on one page
                const summaryRows = Math.max(deptCounts.size, subjectCounts.size, 1);
                const summaryRowHeight = tablePadding * 2 + tableFontSize * 0.35;
                const summaryHeight = 10 + (summaryRows * summaryRowHeight) + 10;

                const gridTableGap = 12; // 12mm clear gap below grid
                const availableH = pageH - startY - summaryHeight - bottomMargin - gridTableGap;

                // SECTION 6: GRID HEIGHT CONTROL (max 65% of page)
                const maxGridH = pageH * 0.65;
                const allowedH = Math.min(availableH, maxGridH);

                // SECTION 7: COLUMN WIDTH BALANCING
                const maxCardW = 48;
                let cardW = (pageW - 16 - (cols - 1) * gapX) / cols;
                if (cardW > maxCardW) cardW = maxCardW;

                const gridTotalW = (cols * cardW) + ((cols - 1) * gapX);
                const marginX = (pageW - gridTotalW) / 2; // Center horizontally

                const rawCardH = (allowedH - (rowsNeeded - 1) * gapY) / rowsNeeded;
                const cardH = Math.min(rawCardH, maxCardH);

                // Draw Column Headers
                rowLabels.forEach((rowLabel, colIdx) => {
                    const x = marginX + colIdx * (cardW + gapX);

                    // Column Header (e.g. A)
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    doc.text(`${rowLabel}`, x + cardW / 2, startY - 7, { align: 'center' });

                    // Subject Subheader (grey box) -> showing Subject Code only
                    const rowSubjects = new Set<string>();
                    benches.filter(b => b.rowLabel === rowLabel).forEach(b => {
                        const lSeat = b.seats.find(s => s.SeatNumber === 1);
                        const rSeat = b.seats.find(s => s.SeatNumber === 2);
                        const lCode = lSeat ? assignments[lSeat.SeatID]?.subjectCode : null;
                        const rCode = rSeat ? assignments[rSeat.SeatID]?.subjectCode : null;
                        if (lCode) rowSubjects.add(lCode as string);
                        if (rCode) rowSubjects.add(rCode as string);
                    });
                    const subjectStr = Array.from(rowSubjects).join('/') || '-';

                    doc.setFillColor(235, 235, 235);
                    doc.rect(x, startY - 5.5, cardW, 4.5, 'F');
                    doc.setFontSize(8);
                    doc.setTextColor(30, 30, 30);
                    // Ellipsis if too long
                    const truncSubj = doc.getTextWidth(subjectStr) > cardW - 2 ? subjectStr.substring(0, 20) + "..." : subjectStr;
                    doc.text(truncSubj, x + cardW / 2, startY - 2.5, { align: 'center' });
                });

                // Draw Bench Grid
                rowLabels.forEach((rowLabel, colIdx) => {
                    benchNumbers.forEach((bNumber, benchIdx) => {
                        // Find the bench for this exact cell
                        const bench = benches.find(b => b.rowLabel === rowLabel && b.benchNumber === bNumber);

                        const leftSeat = bench ? bench.seats.find(s => s.SeatNumber === 1) : null;
                        const rightSeat = bench ? bench.seats.find(s => s.SeatNumber === 2) : null;
                        const leftAss = leftSeat ? assignments[leftSeat.SeatID] : null;
                        const rightAss = rightSeat ? assignments[rightSeat.SeatID] : null;

                        // DO NOT RENDER if bench is completely empty or doesn't exist
                        if (!bench || (!leftAss && !rightAss)) {
                            return;
                        }

                        const x = marginX + colIdx * (cardW + gapX);
                        const y = startY + benchIdx * (cardH + gapY);

                        // Card Background
                        doc.setFillColor(255, 255, 255);
                        doc.setDrawColor(200, 200, 200);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(x, y, cardW, cardH, 1, 1, 'FD');

                        // SECTION 1: BENCH LABEL (VERY SMALL, TOP-LEFT, NO BACKGROUND)
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(benchLabelFont);
                        doc.setTextColor(150, 150, 150);
                        doc.text(`${rowLabel}${bench.benchNumber}`, x + 1.5, y + 2.5);

                        // Center separator
                        doc.setDrawColor(220, 220, 220);
                        doc.line(x + cardW / 2, y + 2, x + cardW / 2, y + cardH - 2);

                        const printSeat = (ass: Assignment | null, offsetX: number) => {
                            const cx = x + offsetX;
                            const halfW = cardW / 2;

                            if (!ass) {
                                // EMPTY SEAT (small placeholder)
                                doc.setFillColor(245, 245, 245);
                                doc.rect(cx - halfW / 2 + 0.5, y + 4, halfW - 1, cardH - 4.5, 'F');
                                doc.setFont('helvetica', 'bold');
                                doc.setFontSize(emptyFont);
                                doc.setTextColor(170, 170, 170);
                                doc.text("EMPTY", cx, y + (cardH / 2) + 1.5, { align: 'center' });
                                return;
                            }

                            if (!ass.isEligible || ass.isBlocked) {
                                // NOT ELIGIBLE
                                doc.setFillColor(255, 235, 235);
                                doc.rect(cx - halfW / 2 + 0.5, y + 4, halfW - 1, cardH - 4.5, 'F');

                                doc.setFont('helvetica', 'bold');
                                doc.setFontSize(emptyFont - 0.5);
                                doc.setTextColor(200, 50, 50);
                                doc.text("NOT ELIGIBLE", cx, y + (cardH / 2) - 0.5, { align: 'center' });

                                doc.setFontSize(regFont - 1.5);
                                doc.setTextColor(0, 0, 0);
                                doc.text(ass.registerNumber || '', cx, y + (cardH / 2) + 3.5, { align: 'center' });
                                return;
                            }

                            // SECTION 2: BENCH CARD TEXT FIX (strict layout & spacing)
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(regFont);
                            doc.setTextColor(0, 0, 0);

                            // Center horizontally, move slightly up from exact center
                            const textY = y + (cardH / 2) - 0.2;
                            doc.text(ass.registerNumber || '', cx, textY, { align: 'center' });

                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(nameFont);
                            doc.setTextColor(60, 60, 60);

                            // Add gap below the register number
                            const nameOffset = rowsNeeded > 10 ? 2.5 : (rowsNeeded >= 7 ? 2.8 : 3.2);
                            const nameY = textY + nameOffset;

                            let truncName = ass.studentName || '';
                            if (doc.getTextWidth(truncName) > halfW - 2) {
                                truncName = truncName.substring(0, 14) + "...";
                            }
                            doc.text(truncName, cx, nameY, { align: 'center' });
                        };

                        printSeat(leftAss, cardW * 0.25);
                        printSeat(rightAss, cardW * 0.75);
                    });
                });

                // SECTION 7: GRID vs TABLE SEPARATION
                let currentY = startY + rowsNeeded * (cardH + gapY) + gridTableGap;

                // SECTION 3/4/8: SUMMARY TABLE SIZE REDUCTION & POSITIONING
                // Reduced table width to ~60-70% of previous default
                const baseTableW = 75;
                const tableW = baseTableW * tableScaleW;
                const tableGap = 15; // 15mm gap between tables
                const totalTablesW = (tableW * 2) + tableGap;
                const tableStartX = (pageW - totalTablesW) / 2;

                const autoTable = (await import('jspdf-autotable')).default;

                // Left Table (Departments)
                const deptData = Array.from(deptCounts.entries());
                autoTable(doc, {
                    startY: currentY,
                    head: [['Departments', 'Count']],
                    body: deptData,
                    theme: 'grid',
                    styles: { fontSize: tableFontSize, cellPadding: tablePadding, textColor: [30, 30, 30], font: 'helvetica' },
                    headStyles: { fillColor: [240, 245, 250], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, lineWidth: 0.1, lineColor: [200, 200, 200] },
                    bodyStyles: { lineWidth: 0.1, lineColor: [220, 220, 220] },
                    margin: { left: tableStartX },
                    tableWidth: tableW
                });
                const leftTableY = (doc as any).lastAutoTable?.finalY || currentY;

                // Right Table (Subjects)
                const subjData = Array.from(subjectCounts.entries());
                autoTable(doc, {
                    startY: currentY,
                    head: [['Subjects', 'Count']],
                    body: subjData,
                    theme: 'grid',
                    styles: { fontSize: tableFontSize, cellPadding: tablePadding, textColor: [30, 30, 30], font: 'helvetica' },
                    headStyles: { fillColor: [240, 245, 250], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, lineWidth: 0.1, lineColor: [200, 200, 200] },
                    bodyStyles: { lineWidth: 0.1, lineColor: [220, 220, 220] },
                    margin: { left: tableStartX + tableW + tableGap },
                    tableWidth: tableW
                });
                const rightTableY = (doc as any).lastAutoTable?.finalY || currentY;

                // Total Students
                const maxTableY = Math.max(leftTableY, rightTableY);
                const finalY = Math.max(maxTableY, currentY + 5);
                doc.setFontSize(10.5);
                doc.setFont('helvetica', 'bold');
                doc.text(`Total Students Assigned: ${[...deptCounts.values()].reduce((a, b) => a + b, 0)}`, pageW / 2, finalY + 8, { align: 'center' });

                const pdfBlob = doc.output('blob');
                zip.file(`${hall.hallCode}_Seating.pdf`, pdfBlob);
            }

            const zipContent = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(zipContent);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Room_Wise_Seating_PDFs_${selectedDate}_${selectedSession}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Room Wise Seating downloaded as ZIP');
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

                                    {/* Series */}
                                    <Select aria-label="Exam Series" placeholder="Select Exam Series" variant="bordered"
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
                                    <Select aria-label="Exam Date" placeholder={!selectedSeries ? 'Select Series first' : availableDates.length > 0 ? 'Select Date' : 'No dates for this session'} variant="bordered"
                                        id="exam-date-select" name="examDate"
                                        selectedKeys={selectedDate ? new Set([selectedDate]) : new Set([])}
                                        onSelectionChange={(k) => setSelectedDate(Array.from(k)[0] as string || '')}
                                        isDisabled={!selectedSeries || availableDates.length === 0}
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
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Assignment Strategy</span>
                                    </div>
                                    <div className="flex flex-col gap-1 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                        <span className="text-[12px] font-bold text-slate-800">
                                            {lastExamType === 'EndSemester' ? 'Subject-Based Auto Alignment' : 'Auto Balanced Allocation'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                            {lastExamType === 'EndSemester'
                                                ? 'Strict contiguous subject assignments natively applied to avoid bench conflicts.'
                                                : 'Intelligent multi-department distribution matching capacity perfectly.'}
                                        </span>
                                    </div>

                                    {/* Batch Selection */}
                                    <Select aria-label="Target Batch" placeholder="Filter by Batch (Optional)" variant="bordered"
                                        id="batch-year-select" name="batchYear"
                                        selectedKeys={selectedBatch ? [selectedBatch] : []}
                                        onSelectionChange={(k) => setSelectedBatch(Array.from(k)[0] as string || '')}
                                        classNames={{
                                            trigger: "relative pr-10 bg-white border border-slate-200 rounded-xl h-10 text-slate-800 text-[13px] font-semibold data-[hover=true]:border-indigo-400 transition-all",
                                            value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-400",
                                            selectorIcon: "text-slate-400 absolute w-4 right-3",
                                            popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                        }}>
                                        {batchYears.map(year => (
                                            <SelectItem key={String(year)} textValue={String(year)} className="data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700 font-semibold">
                                                Batch {year}
                                            </SelectItem>
                                        ))}
                                    </Select>

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
                                            <div className="flex flex-col">
                                                <span className="text-[11px] text-slate-600 font-medium leading-tight">Room cap</span>
                                                <span className="text-[9px] text-slate-400 leading-tight">seats per hall (End Sem)</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setRoomCapacityLimit(v => String(Math.max(1, (Number(v) || 0) - 1)))}
                                                    className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 flex items-center justify-center text-sm font-bold transition-colors"
                                                    aria-label="Decrease room cap"
                                                >−</button>
                                                <input
                                                    id="room-capacity-limit-wizard"
                                                    name="roomCapacityLimitWizard"
                                                    type="number" min={1} max={200}
                                                    value={roomCapacityLimit}
                                                    placeholder="40"
                                                    onChange={e => setRoomCapacityLimit(e.target.value)}
                                                    className="w-12 h-6 text-center text-[12px] font-bold text-indigo-700 border border-indigo-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-500 placeholder:text-slate-400 placeholder:font-normal [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setRoomCapacityLimit(v => String(Math.min(200, (Number(v) || 0) + 1)))}
                                                    className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 flex items-center justify-center text-sm font-bold transition-colors"
                                                    aria-label="Increase room cap"
                                                >+</button>
                                            </div>
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

                                {/* ─── STEP 5: Generate ───────── */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">5</span>
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Generate Seating</span>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button onPress={handleBulkAssign} isLoading={assigning}
                                            isDisabled={!selectedDate || !canAssignByMode}
                                            className="w-full font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl h-11 border border-indigo-700 transition-all data-[disabled=true]:opacity-50 text-[14px] shadow-md shadow-indigo-200"
                                            startContent={!assigning ? <Zap size={16} fill="currentColor" /> : undefined} size="lg">
                                            {assigning ? 'Generating…' : 'Generate Seating'}
                                        </Button>

                                        <Button onPress={() => handleBulkAssign(true)} isLoading={assigning}
                                            isDisabled={!selectedDate || !canAssignByMode || !selectedBatch}
                                            className={`w-full font-bold text-white rounded-xl h-11 border transition-all ${!selectedBatch ? 'bg-slate-300 border-slate-300 opacity-60' : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 shadow-md shadow-emerald-200'}`}
                                            startContent={!assigning ? <Users size={16} fill="currentColor" /> : undefined} size="lg">
                                            {assigning ? 'Generating Batch…' : 'Batch-wise Seating'}
                                        </Button>

                                        <Tooltip content={!selectedSeries ? "Select an Exam Series in Step 1 first" : "Assign seating for all valid sessions in the selected series"} placement="bottom" showArrow classNames={{ content: "font-semibold text-[11px]" }}>
                                            <div className="w-full">
                                                <Button onPress={openSeriesModal}
                                                    isDisabled={!selectedSeries}
                                                    className={`w-full font-bold text-white rounded-xl h-11 border transition-all ${!selectedSeries
                                                        ? 'bg-slate-300 border-slate-300 opacity-60 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.2)]'
                                                        }`}
                                                    startContent={<Rocket size={16} fill="currentColor" />}>
                                                    Auto-Assign Full Series
                                                </Button>
                                            </div>
                                        </Tooltip>
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
                                                        return (
                                                            <span
                                                                key={s}
                                                                className="inline-flex items-center gap-1.5 text-[9px] font-extrabold px-2 py-1 rounded-lg"
                                                                style={{
                                                                    background: `linear-gradient(135deg, ${ss.text}20 0%, ${ss.text}0a 100%)`,
                                                                    color: ss.text,
                                                                    border: `1.5px solid ${ss.text}60`,
                                                                    boxShadow: `0 0 6px ${ss.text}20`,
                                                                }}
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ss.text, boxShadow: `0 0 4px ${ss.text}` }} />
                                                                {s}
                                                            </span>
                                                        );
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
                                                        {seatingDownloading ? 'Generating…' : 'Room Wise Seating'}
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
                                                        {globalDownloading ? 'Generating…' : 'CONSOLIDATED SEATING'}
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
                                                {lastExamType === 'EndSemester' ? 'End Semester' : 'Internal'}
                                            </span>

                                            {/* Subject swatches — shown for EndSem */}
                                            {lastExamType === 'EndSemester' && (() => {
                                                const subjectCounts = new Map<string, number>();
                                                Object.values(detailAssignments).forEach(a => {
                                                    if (a.subjectCode) {
                                                        subjectCounts.set(a.subjectCode, (subjectCounts.get(a.subjectCode) || 0) + 1);
                                                    }
                                                });
                                                const codes = [...subjectCounts.keys()].sort();
                                                return codes.map((code, idx) => {
                                                    const ss = getSubjectStyle(code);
                                                    const count = subjectCounts.get(code) ?? 0;
                                                    return (
                                                        <div
                                                            key={code}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-extrabold tracking-wide transition-transform hover:scale-105"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${ss.text}22 0%, ${ss.text}0e 100%)`,
                                                                color: ss.text,
                                                                border: `1.5px solid ${ss.text}70`,
                                                                boxShadow: `0 0 10px ${ss.text}25, inset 0 0 8px ${ss.text}10`,
                                                            }}
                                                        >
                                                            {/* Glowing dot */}
                                                            <span
                                                                className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                                                                style={{ backgroundColor: ss.text, boxShadow: `0 0 8px ${ss.text}, 0 0 4px ${ss.text}` }}
                                                            />
                                                            {/* Code */}
                                                            <span className="font-mono" style={{ textShadow: `0 0 8px ${ss.text}80` }}>{code}</span>
                                                            {/* Count badge */}
                                                            <span
                                                                className="text-[9px] font-black px-1.5 py-0.5 rounded-full ml-0.5"
                                                                style={{
                                                                    background: `${ss.text}30`,
                                                                    color: ss.text,
                                                                    border: `1px solid ${ss.text}50`,
                                                                }}
                                                            >{count}</span>
                                                        </div>
                                                    );
                                                });
                                            })()}

                                            {/* Dept colour pills — always shown */}
                                            {lastExamType === 'Internal' && (() => {
                                                const deptCounts = new Map<string, number>();
                                                Object.values(detailAssignments).forEach(a => {
                                                    if (a.deptCode) {
                                                        deptCounts.set(a.deptCode, (deptCounts.get(a.deptCode) || 0) + 1);
                                                    }
                                                });
                                                const depts = [...deptCounts.keys()].sort();
                                                return depts.map(d => {
                                                    const st = getDeptStyle(d);
                                                    return (
                                                        <div key={d} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide bg-white border border-slate-200"
                                                            style={{ color: st.text }}>
                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.text, boxShadow: `0 0 8px ${st.text}50` }} />
                                                            {d} <span className="opacity-80 ml-0.5">({deptCounts.get(d)})</span>
                                                        </div>
                                                    );
                                                });
                                            })()}


                                        </div>
                                    )}

                                    {/* ── Pill-Column Layout (mirrors College Structure 3D Visual Map) ── */}

                                    {/* Front Blackboard */}
                                    <div className="flex flex-col items-center mb-8">
                                        <div className="w-full max-w-5xl h-14 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden">
                                            <div className="absolute top-0 inset-x-0 h-[1px] bg-indigo-500/50" />
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Front Blackboard</span>
                                        </div>
                                    </div>

                                    {/* Columns flex */}
                                    <div className="flex gap-6 justify-center items-start flex-wrap pb-8">
                                        {detailBenchRows.map((row, rowIdx) => {
                                            const isEndSem = lastExamType === 'EndSemester';
                                            return (
                                                <div key={row.rowLabel} className="flex flex-col items-center gap-3" style={{ animationDelay: `${rowIdx * 40}ms` }}>
                                                    {/* Column header */}
                                                    <div className="text-white font-black text-xl tracking-[0.25em] drop-shadow-lg">{row.rowLabel.toUpperCase()}</div>

                                                    {/* Pill container */}
                                                    <div
                                                        className="relative bg-slate-800/30 border-2 border-white/10 rounded-[2.5rem] px-4 py-5 flex flex-col gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.35)] group transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_20px_60px_rgba(99,102,241,0.12)]"
                                                        style={{ minWidth: '120px' }}
                                                    >
                                                        {/* Gradient overlay on hover */}
                                                        <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-indigo-500/5 via-transparent to-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                                        {row.benches.map((bench, benchIdx) => {
                                                            // Primary seat: SeatNumber=1 (single-bench model); fallback to seat 2 if multi-seat
                                                            const primarySeat = bench.seats.find(s => s.SeatNumber === 1) ?? bench.seats[0];
                                                            const secondarySeat = bench.seats.find(s => s.SeatNumber === 2);
                                                            const pa = primarySeat ? detailAssignments[primarySeat.SeatID] : undefined;
                                                            const sa = secondarySeat ? detailAssignments[secondarySeat.SeatID] : undefined;

                                                            const paVisible = pa && !(hideIneligible && pa.isBlocked) ? pa : undefined;
                                                            const saVisible = sa && !(hideIneligible && sa.isBlocked) ? sa : undefined;

                                                            const isDisabled = primarySeat && !primarySeat.IsActive;
                                                            const isBlocked = !isDisabled && !!paVisible?.isBlocked;

                                                            const pSt = paVisible ? getDeptStyle(paVisible.deptCode) : null;
                                                            const pSub = paVisible?.subjectCode ? getSubjectStyle(paVisible.subjectCode) : null;
                                                            const accent = isEndSem && pSub ? pSub.text : pSt ? pSt.text : null;

                                                            // For dual-seat benches, check subject conflict
                                                            const hasDualConflict = isEndSem && !!paVisible?.subjectCode && !!saVisible?.subjectCode && paVisible.subjectCode === saVisible.subjectCode;

                                                            const tooltipContent = isDisabled ? 'Disabled'
                                                                : isBlocked ? `${paVisible!.registerNumber} | ${paVisible!.deptCode} | Not Eligible`
                                                                    : paVisible ? [paVisible.registerNumber, paVisible.subjectCode, paVisible.deptCode, 'Eligible'].filter(Boolean).join(' · ')
                                                                        : 'Empty';

                                                            // Seat cell styling
                                                            let cellBg = '#131826';
                                                            let borderAccent = 'transparent';
                                                            if (isDisabled) {
                                                                cellBg = 'repeating-linear-gradient(45deg,#1a1f2e,#1a1f2e 3px,#1e2436 3px,#1e2436 6px)';
                                                            } else if (isBlocked) {
                                                                cellBg = 'linear-gradient(135deg,#2d1010 0%,#1f0c0c 100%)';
                                                                borderAccent = '#ef4444';
                                                            } else if (paVisible) {
                                                                cellBg = 'linear-gradient(135deg,#10263b 0%,#151c2e 100%)';
                                                                borderAccent = accent || 'transparent';
                                                            }

                                                            return (
                                                                <Tooltip
                                                                    key={`${bench.rowLabel}-${bench.benchNumber}`}
                                                                    content={tooltipContent}
                                                                    delay={150}
                                                                    classNames={{ content: `text-[11px] font-medium rounded-lg border shadow-2xl max-w-[220px] ${isBlocked ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-900 text-slate-100 border-slate-700'}` }}
                                                                >
                                                                    <div
                                                                        className="relative w-24 rounded-2xl border-2 overflow-hidden cursor-default transition-all duration-200 seat-anim hover:brightness-110"
                                                                        style={{
                                                                            animationDelay: `${(rowIdx * 8 + benchIdx) * 15}ms`,
                                                                            background: cellBg,
                                                                            borderColor: hasDualConflict ? '#f59e0b' : borderAccent,
                                                                            boxShadow: isBlocked ? 'inset 0 0 16px rgba(239,68,68,0.1)'
                                                                                : accent && paVisible ? `inset 0 0 10px ${accent}15` : 'none',
                                                                        }}
                                                                    >
                                                                        {/* Bench label top-bar */}
                                                                        <div className="px-2 py-0.5 bg-slate-900/50 flex items-center justify-between border-b border-white/5">
                                                                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                                                                                {row.rowLabel.toLowerCase()}{bench.benchNumber}
                                                                            </span>
                                                                            <span className="flex items-center gap-1">
                                                                                {hasDualConflict && <span className="text-amber-400 text-[10px] animate-pulse">!</span>}
                                                                                {/* MIXED ROW indicator: backfill switched subject mid-row */}
                                                                                {isEndSem && paVisible?.subjectCode && saVisible?.subjectCode && paVisible.subjectCode !== saVisible.subjectCode && (
                                                                                    <Tooltip content={`Mixed: ${paVisible.subjectCode} + ${saVisible.subjectCode} (backfilled)`} delay={100}
                                                                                        classNames={{ content: 'text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-700/50 rounded-lg px-2 py-1' }}>
                                                                                        <span className="text-[7px] font-black text-amber-400 bg-amber-900/40 border border-amber-600/40 rounded px-0.5 leading-none cursor-help" style={{ boxShadow: '0 0 4px rgba(251,191,36,0.3)' }}>MIX</span>
                                                                                    </Tooltip>
                                                                                )}
                                                                            </span>
                                                                        </div>

                                                                        {/* Seat content */}
                                                                        <div className="px-2 py-3 min-h-[72px] flex flex-col items-center justify-center text-center gap-1">
                                                                            {isDisabled ? (
                                                                                <Ban size={14} className="text-slate-600" />
                                                                            ) : isBlocked ? (
                                                                                <>
                                                                                    <XCircle size={12} className="text-red-500" />
                                                                                    <span className="text-[10px] font-bold font-mono text-red-400 leading-none w-full truncate">{paVisible!.registerNumber}</span>
                                                                                    <span className="text-[7px] text-red-400/60 leading-none w-full truncate">{paVisible!.studentName}</span>
                                                                                    <span className="px-1 py-0.5 rounded text-[6px] font-bold uppercase bg-red-900/40 text-red-400 border border-red-700/40 mt-0.5">Not Eligible</span>
                                                                                </>
                                                                            ) : paVisible ? (
                                                                                <>
                                                                                    <span className="text-[11px] font-bold font-mono leading-none w-full truncate" style={{ color: accent || '#94a3b8' }}>
                                                                                        {paVisible.registerNumber}
                                                                                    </span>
                                                                                    <span className="text-[8px] text-slate-500 leading-none w-full truncate">{paVisible.studentName}</span>
                                                                                    {isEndSem && paVisible.subjectCode ? (
                                                                                        <span className="px-1 py-0.5 rounded text-[7px] font-extrabold uppercase truncate max-w-full mt-0.5"
                                                                                            style={{ background: pSub?.glow ?? '#334155', color: pSub?.text ?? '#94a3b8', border: `1px solid ${pSub?.text ?? '#334155'}40` }}>
                                                                                            {paVisible.subjectCode}
                                                                                        </span>
                                                                                    ) : !isEndSem && paVisible.deptCode ? (
                                                                                        <span className="text-[7px] font-bold mt-0.5" style={{ color: accent || '#94a3b8' }}>{paVisible.deptCode}</span>
                                                                                    ) : null}
                                                                                    {/* Second seat student (dual-bench) */}
                                                                                    {saVisible && (
                                                                                        <div className="w-full border-t border-white/10 mt-1 pt-1 flex flex-col items-center gap-0.5">
                                                                                            <span className="text-[10px] font-bold font-mono leading-none w-full truncate" style={{ color: isEndSem && saVisible.subjectCode ? getSubjectStyle(saVisible.subjectCode).text : getDeptStyle(saVisible.deptCode).text }}>
                                                                                                {saVisible.registerNumber}
                                                                                            </span>
                                                                                            <span className="text-[7px] text-slate-500 leading-none w-full truncate">{saVisible.studentName}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Armchair size={13} className="text-slate-700" />
                                                                                    <span className="text-[7px] text-slate-600">EMPTY</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </Tooltip>
                                                            );
                                                        })}
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

            {/* ═══ Auto-Assign Full Series Modal ═══ */}
            <Modal isOpen={showSeriesModal} onOpenChange={setShowSeriesModal} isDismissable={!seriesRunning} backdrop="blur" classNames={{ base: "bg-slate-50 border border-slate-200 shadow-2xl overflow-hidden max-w-[500px]", backdrop: "bg-slate-800/40 backdrop-blur-md" }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex items-center gap-3 border-b border-slate-200 px-6 py-5 bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-[40px] pointer-events-none"></div>
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20 text-white relative z-10 shrink-0">
                                    <Rocket size={20} strokeWidth={2.5} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-[18px] font-bold text-slate-800 tracking-tight">Auto-Assign Full Series</h3>
                                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">{seriesTasks.length} sessions queued</p>
                                </div>
                            </ModalHeader>
                            <ModalBody className="p-0">
                                {!seriesRunning && seriesTasks.some(t => t.status === 'pending' || t.status === 'failed') && (
                                    <div className="px-6 py-3.5 bg-white border-b border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative z-10">
                                        <div className="flex flex-col mb-2.5">
                                            <span className="text-[12px] font-bold text-slate-700">Configuration</span>
                                            <span className="text-[10px] text-slate-400 font-medium">Applied to all sessions in this series</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Shuffle room order toggle */}
                                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex-1">
                                                <span className="text-[11px] text-slate-600 font-medium whitespace-nowrap">Shuffle room order</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setShuffleRooms(v => !v)}
                                                    disabled={seriesRunning}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ml-auto ${shuffleRooms ? 'bg-blue-500' : 'bg-slate-300'}`}
                                                    aria-pressed={shuffleRooms}
                                                >
                                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${shuffleRooms ? 'translate-x-4' : 'translate-x-[3px]'}`} />
                                                </button>
                                            </div>
                                            {/* Room cap */}
                                            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] text-slate-600 font-medium leading-tight">Room cap</span>
                                                    <span className="text-[9px] text-slate-400 leading-tight">seats per hall (End Sem)</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRoomCapacityLimit(v => String(Math.max(1, (Number(v) || 0) - 1)))}
                                                        disabled={seriesRunning}
                                                        className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                        aria-label="Decrease room cap"
                                                    >−</button>
                                                    <input
                                                        id="room-capacity-limit-series"
                                                        name="roomCapacityLimitSeries"
                                                        type="number" min={1} max={200}
                                                        value={roomCapacityLimit}
                                                        placeholder="40"
                                                        onChange={e => setRoomCapacityLimit(e.target.value)}
                                                        disabled={seriesRunning}
                                                        className="w-12 h-6 text-center text-[12px] font-bold text-indigo-700 border border-indigo-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-500 placeholder:text-slate-400 placeholder:font-normal [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setRoomCapacityLimit(v => String(Math.min(200, (Number(v) || 0) + 1)))}
                                                        disabled={seriesRunning}
                                                        className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                        aria-label="Increase room cap"
                                                    >+</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-3 bg-slate-50/50" style={{ scrollbarWidth: 'thin' }}>
                                    {seriesTasks.map((t, i) => (
                                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm transition-all ${t.status === 'running' ? 'border-indigo-400 ring-2 ring-indigo-500/20'
                                            : t.status === 'success' ? 'border-emerald-200 bg-emerald-50/30'
                                                : t.status === 'failed' ? 'border-rose-200 bg-rose-50/30'
                                                    : 'border-slate-200'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-slate-700">{t.date}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 w-fit uppercase tracking-widest ${t.session === 'FN' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
                                                        }`}>{t.session === 'FN' ? 'Forenoon' : 'Afternoon'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-right">
                                                {t.status === 'pending' && <span className="text-[11px] font-bold text-slate-400">WAITING</span>}
                                                {t.status === 'running' && <><RefreshCw size={14} className="text-indigo-500 animate-spin" /><span className="text-[11px] font-bold text-indigo-600">RUNNING...</span></>}
                                                {t.status === 'success' && <div className="flex flex-col items-end"><div className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" strokeWidth={3} /><span className="text-[11px] font-bold text-emerald-600">SUCCESS</span></div><span className="text-[10px] text-slate-500 font-medium">Assigned {t.assigned}</span></div>}
                                                {t.status === 'failed' && <div className="flex flex-col items-end"><div className="flex items-center gap-1.5"><AlertCircle size={14} className="text-rose-500" strokeWidth={3} /><span className="text-[11px] font-bold text-rose-600">FAILED</span></div><Tooltip content={t.error}><span className="text-[10px] text-rose-500 font-semibold cursor-help underline decoration-dotted">View error</span></Tooltip></div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ModalBody>
                            <ModalFooter className="border-t border-slate-200 px-6 py-4 bg-white relative z-10 flex justify-end gap-3 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                                <Button className="font-semibold text-slate-600 hover:text-slate-800" variant="light" onPress={onClose} isDisabled={seriesRunning}>
                                    Close
                                </Button>
                                {seriesTasks.some(t => t.status === 'pending' || t.status === 'failed') && (
                                    <Button className="font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200" onPress={runSeriesAllocation} isLoading={seriesRunning} startContent={!seriesRunning && <Play size={14} fill="currentColor" />}>
                                        {seriesTasks.some(t => t.status === 'failed' || t.status === 'success') ? "Resume Pending" : "Start Auto-Assign"}
                                    </Button>
                                )}
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};

export default SeatingPlans;
