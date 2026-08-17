import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Button,
    Card,
    CardBody,
    Select,
    SelectItem,
    Switch,
    Progress,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Input,
    Tooltip,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from '@heroui/react';
import {
    Calendar,
    LayoutGrid,
    Users,
    RefreshCw,
    Save,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Info,
    Eye,
    Armchair,
    ArrowLeft,
    Power,
    XCircle,
    FileDown,
    FileSpreadsheet,
    FileText,
    Zap,
    Rocket,
    Moon,
    Sun,
    ChevronRight,
    ChevronDown,
    Settings2,
    Building2,
    Sparkles,
    BookOpen,
    Shield,
    Printer,
    X,
    Search,
    DoorOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { InternalSeatingService } from '../../services/internal/internalSeatingService';
import { SeatingService } from '../../services/seatingService';
import { InternalReportsService } from '../../services/internal/internalReportsService';

/* ── DEPT / BATCH COLOR PALETTE ── */
// Each entry has: fill (dark bg), border (accent border), text (label text), dot (solid dot color for legend)
const DEPT_PALETTE = [
    { fill: '#0f172a', border: '#6366f1', text: '#a5b4fc', dot: '#6366f1', label: 'Indigo' }, // 0
    { fill: '#052e16', border: '#16a34a', text: '#4ade80', dot: '#22c55e', label: 'Green' }, // 1
    { fill: '#2d1b69', border: '#7c3aed', text: '#c4b5fd', dot: '#8b5cf6', label: 'Violet' }, // 2
    { fill: '#4a044e', border: '#d946ef', text: '#f5d0fe', dot: '#e879f9', label: 'Fuchsia' }, // 3
    { fill: '#431407', border: '#ea580c', text: '#fdba74', dot: '#f97316', label: 'Orange' }, // 4
    { fill: '#083344', border: '#0891b2', text: '#67e8f9', dot: '#06b6d4', label: 'Cyan' }, // 5
    { fill: '#450a0a', border: '#dc2626', text: '#fca5a5', dot: '#ef4444', label: 'Red' }, // 6
    { fill: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', dot: '#3b82f6', label: 'Blue' }, // 7
    { fill: '#3b1f00', border: '#d97706', text: '#fcd34d', dot: '#f59e0b', label: 'Amber' }, // 8
    { fill: '#1a1a2e', border: '#ec4899', text: '#f9a8d4', dot: '#ec4899', label: 'Pink' }, // 9
    { fill: '#0d2d2a', border: '#14b8a6', text: '#5eead4', dot: '#14b8a6', label: 'Teal' }, // 10
    { fill: '#2c1654', border: '#a855f7', text: '#e9d5ff', dot: '#a855f7', label: 'Purple' }, // 11
];

// Stable color assignment keyed by dept code string
const getDeptStyle = (deptCode: string) => {
    if (!deptCode) return DEPT_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < deptCode.length; i++) hash = deptCode.charCodeAt(i) + ((hash << 5) - hash);
    return DEPT_PALETTE[Math.abs(hash) % DEPT_PALETTE.length] || DEPT_PALETTE[0];
};

const downloadExcelFile = (XLSXStyle: any, wb: any, fileName: string) => {
    const excelBuffer = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Build a de-duplicated legend array from seat data
const buildDeptLegend = (rows: any[]): { deptCode: string; style: ReturnType<typeof getDeptStyle> }[] => {
    const seen = new Set<string>();
    const legend: { deptCode: string; style: ReturnType<typeof getDeptStyle> }[] = [];
    for (const row of rows) {
        for (const bench of (row.benches || [])) {
            for (const seat of [bench.left, bench.right].filter(Boolean)) {
                if (seat?.deptCode && !seen.has(seat.deptCode)) {
                    seen.add(seat.deptCode);
                    legend.push({ deptCode: seat.deptCode, style: getDeptStyle(seat.deptCode) });
                }
            }
        }
    }
    return legend.sort((a, b) => a.deptCode.localeCompare(b.deptCode));
};

/* ── SUBJECT ACCENT PALETTE (VIBRANT BORDERS & ACCENTS) ── */
const SUBJECT_PALETTE = [
    { border: '#38bdf8', glow: 'rgba(56,189,248,0.4)', badgeBg: 'rgba(56,189,248,0.18)', badgeText: '#7dd3fc', dot: '#38bdf8', label: 'Sky Blue' },
    { border: '#4ade80', glow: 'rgba(74,222,128,0.4)', badgeBg: 'rgba(74,222,128,0.18)', badgeText: '#86efac', dot: '#4ade80', label: 'Neon Emerald' },
    { border: '#f43f5e', glow: 'rgba(244,63,94,0.4)', badgeBg: 'rgba(244,63,94,0.18)', badgeText: '#fda4af', dot: '#f43f5e', label: 'Vivid Rose' },
    { border: '#fbbf24', glow: 'rgba(251,191,36,0.4)', badgeBg: 'rgba(251,191,36,0.18)', badgeText: '#fde68a', dot: '#fbbf24', label: 'Warm Amber' },
    { border: '#a855f7', glow: 'rgba(168,85,247,0.4)', badgeBg: 'rgba(168,85,247,0.18)', badgeText: '#d8b4fe', dot: '#a855f7', label: 'Electric Violet' },
    { border: '#06b6d4', glow: 'rgba(6,182,212,0.4)', badgeBg: 'rgba(6,182,212,0.18)', badgeText: '#67e8f9', dot: '#06b6d4', label: 'Cyber Cyan' },
    { border: '#f97316', glow: 'rgba(249,115,22,0.4)', badgeBg: 'rgba(249,115,22,0.18)', badgeText: '#fdba74', dot: '#f97316', label: 'Bright Orange' },
    { border: '#ec4899', glow: 'rgba(236,72,153,0.4)', badgeBg: 'rgba(236,72,153,0.18)', badgeText: '#f9a8d4', dot: '#ec4899', label: 'Radiant Pink' },
    { border: '#818cf8', glow: 'rgba(129,140,248,0.4)', badgeBg: 'rgba(129,140,248,0.18)', badgeText: '#c7d2fe', dot: '#818cf8', label: 'Indigo Accent' },
    { border: '#84cc16', glow: 'rgba(132,204,22,0.4)', badgeBg: 'rgba(132,204,22,0.18)', badgeText: '#bef264', dot: '#84cc16', label: 'Lime Green' },
    { border: '#14b8a6', glow: 'rgba(20,184,166,0.4)', badgeBg: 'rgba(20,184,166,0.18)', badgeText: '#5eead4', dot: '#14b8a6', label: 'Teal Flare' },
    { border: '#e879f9', glow: 'rgba(232,121,249,0.4)', badgeBg: 'rgba(232,121,249,0.18)', badgeText: '#f5d0fe', dot: '#e879f9', label: 'Fuchsia Glow' },
];

const getSubjectStyle = (subjectCode?: string) => {
    if (!subjectCode) return SUBJECT_PALETTE[0];
    let hash = 0;
    const cleanCode = String(subjectCode).trim().toUpperCase();
    for (let i = 0; i < cleanCode.length; i++) hash = cleanCode.charCodeAt(i) + ((hash << 5) - hash);
    return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length] || SUBJECT_PALETTE[0];
};

const buildSubjectLegend = (rows: any[]): { subjectCode: string; subjectName?: string; style: ReturnType<typeof getSubjectStyle> }[] => {
    const seen = new Set<string>();
    const legend: { subjectCode: string; subjectName?: string; style: ReturnType<typeof getSubjectStyle> }[] = [];
    for (const row of rows) {
        for (const bench of (row.benches || [])) {
            for (const seat of [bench.left, bench.right].filter(Boolean)) {
                if (seat?.subjectCode && !seen.has(seat.subjectCode)) {
                    seen.add(seat.subjectCode);
                    legend.push({
                        subjectCode: seat.subjectCode,
                        subjectName: seat.subjectName,
                        style: getSubjectStyle(seat.subjectCode)
                    });
                }
            }
        }
    }
    return legend.sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));
};

/* ── STEP INDICATOR COMPONENT ── */
const StepBadge = ({ num, color, label }: { num: number; color: string; label: string }) => (
    <div className="flex items-center gap-2.5">
        <span className={`w-6 h-6 rounded-full ${color} text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-md`}>{num}</span>
        <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.12em]">{label}</span>
    </div>
);

/* ── COMPONENT ── */
const InternalSeatingPlans: React.FC = () => {
    // --- State ---
    const [seriesList, setSeriesList] = useState<any[]>([]);
    const [availableSessions, setAvailableSessions] = useState<string[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<string>('');
    const [examDates, setExamDates] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedSession, setSelectedSession] = useState<string>('');

    const [halls, setHalls] = useState<any[]>([]);
    const [hallSearch, setHallSearch] = useState<string>('');
    const [selectedHallIds, setSelectedHallIds] = useState<Set<number>>(new Set());
    const [departments, setDepartments] = useState<any[]>([]);

    // Allocation Logic
    const [shuffleRooms, setShuffleRooms] = useState(false);

    // Dashboard State
    const [hallSummary, setHallSummary] = useState<any[]>([]);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [roomFilter, setRoomFilter] = useState<'all' | 'allotted' | 'full' | 'partial' | 'unassigned'>('all');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAutoRegistering, setIsAutoRegistering] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    // Detail Modal State
    const [detailHall, setDetailHall] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [hideIneligible, setHideIneligible] = useState(false);
    const isInitialMount = useRef(true);

    // Report Download States
    const [roomDownloading, setRoomDownloading] = useState(false);
    const [consolidatedDownloading, setConsolidatedDownloading] = useState(false);
    const [subjectDownloading, setSubjectDownloading] = useState(false);

    // Student list state
    const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [showStudentList, setShowStudentList] = useState(false);

    // --- Initial Load ---
    useEffect(() => {
        (async () => {
            try {
                const [seriesRes, deptsRes] = await Promise.all([
                    SeatingService.getSeries('Internal'),
                    SeatingService.getDepartments()
                ]);
                const series = Array.isArray(seriesRes) ? seriesRes : (seriesRes as any)?.data || [];
                const depts = Array.isArray(deptsRes) ? deptsRes : (deptsRes as any)?.data || [];
                setSeriesList(series);
                setDepartments(depts);
                const allHalls = await InternalSeatingService.getHalls();
                setHalls(allHalls || []);
            } catch (e) {
                toast.error("Failed to initialize seating data");
            }
        })();
    }, []);

    // Selection Chain Logic
    useEffect(() => {
        if (selectedSeries) {
            (async () => {
                try {
                    const sessions = await InternalSeatingService.getSessions(Number(selectedSeries));
                    setAvailableSessions(Array.isArray(sessions) ? sessions : ['FN', 'AN']);
                } catch (err) {
                    setAvailableSessions(['FN', 'AN']);
                }
            })();
        } else if (!isInitialMount.current) {
            setAvailableSessions([]);
            setSelectedSession('');
            setSelectedDate('');
        }
    }, [selectedSeries]);

    useEffect(() => {
        if (selectedSeries) {
            (async () => {
                try {
                    const dates = await InternalSeatingService.getExamDates(Number(selectedSeries), selectedSession);
                    setExamDates(Array.isArray(dates) ? dates : []);
                } catch (err) {
                    setExamDates([]);
                }
            })();
        } else if (!isInitialMount.current) {
            setExamDates([]);
        }
    }, [selectedSeries, selectedSession]);

    useEffect(() => {
        const timer = setTimeout(() => {
            isInitialMount.current = false;
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Load Hall Summary
    const loadSummary = async () => {
        if (!selectedSeries || selectedSeries === 'undefined' ||
            !selectedSession || selectedSession === 'undefined' ||
            !selectedDate || selectedDate === 'undefined') {
            setHallSummary([]);
            return;
        }
        setLoadingSummary(true);
        try {
            const summary = await InternalSeatingService.getSummary(selectedDate, selectedSession, Number(selectedSeries));
            setHallSummary(summary || []);
        } catch (e) {
            setHallSummary([]);
        } finally {
            setLoadingSummary(false);
        }
        // Also fetch registered students
        try {
            const students = await InternalSeatingService.getRegisteredStudents(
                selectedDate, selectedSession, Number(selectedSeries)
            );
            setRegisteredStudents(Array.isArray(students) ? students : []);
        } catch {
            setRegisteredStudents([]);
        }
    };

    useEffect(() => { loadSummary(); }, [selectedSeries, selectedDate, selectedSession]);

    // --- Actions ---
    const handleGenerate = async () => {
        if (!selectedSeries || !selectedDate || !selectedSession) {
            toast.error("Complete Step 1 (Series, Session, Date)");
            return;
        }
        setIsGenerating(true);
        try {
            const result = await InternalSeatingService.generate({
                examDate: selectedDate,
                session: selectedSession,
                hallIds: selectedHallIds.size > 0 ? Array.from(selectedHallIds) : halls.map(h => h.RoomID),
                seriesId: Number(selectedSeries),
                shuffleRooms
            });

            if (result?.assignedCount > 0) {
                toast.success(`Seated ${result.assignedCount} students!`);
                loadSummary();
            } else {
                toast.error("No students found for this slot");
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAutoRegister = async () => {
        if (!selectedSeries || !selectedDate || !selectedSession) {
            toast.error("Select slot details first");
            return;
        }
        setIsAutoRegistering(true);
        try {
            const result = await InternalSeatingService.autoRegister(selectedDate, selectedSession, Number(selectedSeries));
            toast.success(`Registered ${result.newRegistrations} students`);
            loadSummary();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Auto-registration failed");
        } finally {
            setIsAutoRegistering(false);
        }
    };

    const handleClearClick = () => {
        if (!selectedDate || !selectedSession) {
            toast.error("Select slot details first (Date & Session)");
            return;
        }
        setIsClearConfirmOpen(true);
    };

    const handleConfirmClear = async () => {
        setIsClearConfirmOpen(false);
        setIsClearing(true);
        try {
            const res = await InternalSeatingService.clearAllAllocations(selectedDate, selectedSession);
            toast.success(res?.message || "All seating allocations cleared successfully!");
            loadSummary();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to clear seating allocations");
        } finally {
            setIsClearing(false);
        }
    };

    // --- Academic Normalization & Batch Formatting for Seating Reports ---
    const SEATING_DEPT_NAMES: Record<string, string> = {
        'AD': 'Artificial Intelligence & Data Science',
        'AIDS': 'Artificial Intelligence & Data Science',
        'CA': 'Computer Applications',
        'CC': 'Computer Science (Cyber Security)',
        'CE': 'Civil Engineering',
        'CIVIL': 'Civil Engineering',
        'CSE': 'Computer Science & Engineering',
        'CS': 'Computer Science & Engineering',
        'ECE': 'Electronics & Communication Engineering',
        'EC': 'Electronics & Communication Engineering',
        'EEE': 'Electrical & Electronics Engineering',
        'EE': 'Electrical & Electronics Engineering',
        'ER': 'Electronics & Robotics',
        'RA': 'Robotics & Automation',
        'ME': 'Mechanical Engineering',
        'MECH': 'Mechanical Engineering',
        'MCA': 'Computer Applications',
        'INT_MCA': 'Integrated Computer Applications',
        'INT MCA': 'Integrated Computer Applications',
        'INMCA': 'Integrated Computer Applications',
        'MBA': 'Management Studies',
        'BHM': 'Hotel Management',
        'MTECH': 'Master of Technology'
    };

    const getMultiDivisionBranches = (data: any[]): Set<string> => {
        const branchDivMap = new Map<string, Set<string>>();

        data.forEach((alloc: any) => {
            const student = alloc.Student;
            let sem = String(student?.Semester || 'S3').toUpperCase().trim();
            if (!sem.startsWith('S') && /^\d+$/.test(sem)) sem = `S${sem}`;
            if (!sem.startsWith('S')) sem = `S${sem}`;

            let rawCode = String(student?.Department?.DeptCode || student?.Department?.DepartmentCode || student?.Branch || 'GEN').toUpperCase().trim();
            if (rawCode === 'CS') rawCode = 'CSE';
            if (rawCode === 'EC') rawCode = 'ECE';
            if (rawCode === 'EE') rawCode = 'EEE';

            const key = `${sem}_${rawCode}`;
            if (!branchDivMap.has(key)) branchDivMap.set(key, new Set<string>());

            const divRaw = String(student?.Division || '').toUpperCase().trim();
            if (divRaw && !['ALL', 'NONE', 'NULL', 'UNDEFINED', ''].includes(divRaw)) {
                branchDivMap.get(key)!.add(divRaw);
            }
        });

        const multiDivSet = new Set<string>();
        branchDivMap.forEach((divs, key) => {
            if (divs.size > 1 || divs.has('B') || divs.has('C') || divs.has('D')) {
                multiDivSet.add(key);
            }
        });
        return multiDivSet;
    };

    const formatSeatingBatchLabel = (student: any, multiDivBranches: Set<string>): string => {
        let sem = String(student?.Semester || 'S3').toUpperCase().trim();
        if (!sem.startsWith('S') && /^\d+$/.test(sem)) sem = `S${sem}`;
        if (!sem.startsWith('S')) sem = `S${sem}`;

        const rawDeptCode = String(student?.Department?.DeptCode || student?.Department?.DepartmentCode || student?.Branch || '').toUpperCase().trim();

        let normDeptCode = rawDeptCode;
        if (rawDeptCode === 'CS') normDeptCode = 'CSE';
        else if (rawDeptCode === 'EC') normDeptCode = 'ECE';
        else if (rawDeptCode === 'EE') normDeptCode = 'EEE';
        else if (rawDeptCode === 'INT_MCA' || rawDeptCode === 'INMCA' || rawDeptCode === 'IMCA') normDeptCode = 'INT MCA';

        const progCode = String(student?.Program?.ProgramCode || '').toUpperCase();
        const progName = String(student?.Program?.ProgramName || '').toUpperCase();

        const isIntMca = normDeptCode === 'INT MCA' || progCode === 'INT_MCA' || progName.includes('INTEGRATED');
        const isMca = !isIntMca && (normDeptCode === 'MCA' || progCode === 'MCA' || progName.includes('MCA'));

        let deptFullName = student?.Department?.DepartmentName || student?.Department?.DeptName;
        if (!deptFullName || deptFullName.toUpperCase() === normDeptCode || deptFullName.includes('Department')) {
            deptFullName = SEATING_DEPT_NAMES[normDeptCode] || SEATING_DEPT_NAMES[rawDeptCode] || normDeptCode;
        }
        deptFullName = deptFullName.replace(/\s+Department$/i, '').trim();

        let topLine = '';
        if (isIntMca) {
            topLine = `${sem} INT MCA (Integrated Computer Applications)`;
        } else if (isMca) {
            topLine = `${sem} MCA (Computer Applications)`;
        } else {
            topLine = `${sem} ${normDeptCode} (${deptFullName})`.trim();
        }

        const key = `${sem}_${normDeptCode}`;
        const isMultiDiv = multiDivBranches.has(key) || multiDivBranches.has(`${sem}_${rawDeptCode}`);

        const divRaw = String(student?.Division || '').toUpperCase().trim();
        let batchDetail = '';
        if (isMultiDiv && divRaw && !['ALL', 'NONE', 'NULL', 'UNDEFINED', ''].includes(divRaw)) {
            batchDetail = `Batch ${divRaw}`;
        }

        return batchDetail ? `${topLine}\n${batchDetail}` : topLine;
    };

    const sortBatchLabels = (a: string, b: string): number => {
        const semA = a.match(/^S(\d+)/i)?.[1] || '0';
        const semB = b.match(/^S(\d+)/i)?.[1] || '0';
        if (Number(semA) !== Number(semB)) return Number(semA) - Number(semB);
        return a.localeCompare(b, undefined, { numeric: true });
    };

    /** Build Subject Wise Groups from raw seating allocations */
    const buildSubjectWiseData = (data: any[]) => {
        const multiDivBranches = getMultiDivisionBranches(data);
        const subjectMap: Record<string, {
            subjectCode: string;
            subjectName: string;
            batchMap: Record<string, Record<string, any[]>>;
        }> = {};

        data.forEach((alloc: any) => {
            const subjectCode = alloc.Exam?.SubjectCode || alloc.SubjectCode || 'N/A';
            const subjectName = alloc.Exam?.SubjectName || alloc.SubjectName || subjectCode;
            const batchLabel = formatSeatingBatchLabel(alloc.Student, multiDivBranches);

            const subjKey = `${subjectCode}_${subjectName}`;
            if (!subjectMap[subjKey]) {
                subjectMap[subjKey] = { subjectCode, subjectName, batchMap: {} };
            }

            if (!subjectMap[subjKey].batchMap[batchLabel]) {
                subjectMap[subjKey].batchMap[batchLabel] = {};
            }

            const roomCode = alloc.Seat?.Room?.RoomCode || 'Unassigned';
            if (!subjectMap[subjKey].batchMap[batchLabel][roomCode]) {
                subjectMap[subjKey].batchMap[batchLabel][roomCode] = [];
            }
            subjectMap[subjKey].batchMap[batchLabel][roomCode].push(alloc);
        });

        const subjects = Object.values(subjectMap).map(subj => {
            const rows: {
                batchLabel: string;
                isFirstInBatch: boolean;
                batchRowsCount: number;
                hallCode: string;
                rollRanges: string;
                count: number;
            }[] = [];

            const sortedBatches = Object.keys(subj.batchMap).sort(sortBatchLabels);

            sortedBatches.forEach(batchLabel => {
                const roomMap = subj.batchMap[batchLabel];
                const sortedRooms = Object.keys(roomMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                const totalRoomsInBatch = sortedRooms.length;

                sortedRooms.forEach((roomCode, rIdx) => {
                    const allocs = roomMap[roomCode];
                    allocs.sort((a: any, b: any) => {
                        const rollA = getStudentRollNumber(a.Student);
                        const rollB = getStudentRollNumber(b.Student);
                        if (rollA !== null && rollB !== null) return rollA - rollB;
                        return (a.Student?.RegisterNumber || '').localeCompare(b.Student?.RegisterNumber || '');
                    });

                    const rollRanges = buildBatchStudentRanges(allocs.map((a: any) => a.Student));
                    rows.push({
                        batchLabel,
                        isFirstInBatch: rIdx === 0,
                        batchRowsCount: totalRoomsInBatch,
                        hallCode: roomCode,
                        rollRanges,
                        count: allocs.length
                    });
                });
            });

            return {
                subjectCode: subj.subjectCode,
                subjectName: subj.subjectName,
                rows,
                totalStudents: rows.reduce((acc, r) => acc + r.count, 0)
            };
        });

        subjects.sort((a, b) => a.subjectCode.localeCompare(b.subjectCode, undefined, { numeric: true }));
        return subjects;
    };

    const downloadConsolidatedExcel = async () => {
        if (!selectedDate || !selectedSession || !selectedSeries) return;
        setConsolidatedDownloading(true);
        try {
            const XLSXStyle = (await import('xlsx-js-style')).default;
            const data = await InternalReportsService.getConsolidated(selectedDate, selectedSession, Number(selectedSeries));

            if (!data || data.length === 0) {
                toast.error('No seating allocations found');
                return;
            }

            const subjects = buildSubjectWiseData(data);
            const selectedSeriesName = seriesList.find(s => String(s.ExamSeriesID) === selectedSeries)?.SeriesName || 'Internal Exam';
            const examTitle = selectedSeriesName.toLowerCase().includes('internal') ? selectedSeriesName : `${selectedSeriesName} (Internal Exam)`;
            
            const d = new Date(selectedDate);
            const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' });
            const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const sessionName = selectedSession === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)';
            const fullDateStr = `${dateFormatted} – ${dayName} – ${sessionName}`;

            const titleStyle = { font: { bold: true, sz: 13, color: { rgb: '0F172A' } }, alignment: { horizontal: 'center', vertical: 'center' } };
            const subTitleStyle = { font: { bold: true, sz: 11, color: { rgb: '4338CA' } }, alignment: { horizontal: 'center', vertical: 'center' } };
            const subStyle = { font: { sz: 10, bold: true, color: { rgb: '334155' } }, alignment: { horizontal: 'center', vertical: 'center' } };
            const headerFill = { patternType: 'solid', fgColor: { rgb: '0F172A' } };
            const headerFont = { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 };
            const thinBorder = { style: 'thin', color: { rgb: 'CBD5E1' } };
            const allThin = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
            const bodyFont = { sz: 9.5, color: { rgb: '1E293B' } };
            const boldFont = { sz: 9.5, bold: true, color: { rgb: '1E293B' } };
            const regFont = { sz: 9.5, bold: true, color: { rgb: '0F172A' } };

            const DATA: any[][] = [];
            DATA.push([{ v: "ST. JOSEPH'S COLLEGE OF ENGINEERING & TECHNOLOGY, PALAI", s: titleStyle }, '', '', '', '', '', '']);
            DATA.push([{ v: 'SUBJECT WISE CONSOLIDATED SEATING ARRANGEMENT', s: subTitleStyle }, '', '', '', '', '', '']);
            DATA.push([{ v: `Exam: ${examTitle}`, s: subStyle }, '', '', '', '', '', '']);
            DATA.push([{ v: `Date: ${fullDateStr}`, s: subStyle }, '', '', '', '', '', '']);
            DATA.push(['', '', '', '', '', '', '']);

            DATA.push([
                { v: 'Batch', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: allThin } },
                { v: 'Subject Code', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin } },
                { v: 'Subject Name', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin } },
                { v: 'Roll Numbers', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin } },
                { v: 'Hall / Room No', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin } },
                { v: 'Count', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin } },
                { v: 'Total', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin } }
            ]);

            const merges: any[] = [];
            for (let i = 0; i < 4; i++) merges.push({ s: { r: i, c: 0 }, e: { r: i, c: 6 } });

            subjects.forEach((subj, sIdx) => {
                const subjectStartRow = DATA.length;
                const fill = sIdx % 2 === 0 
                    ? { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } } 
                    : { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } };

                let currentBatchStartRow = -1;

                subj.rows.forEach((row) => {
                    const currentRow = DATA.length;
                    
                    if (row.isFirstInBatch) {
                        if (currentBatchStartRow !== -1 && currentRow - 1 >= currentBatchStartRow) {
                            merges.push({ s: { r: currentBatchStartRow, c: 0 }, e: { r: currentRow - 1, c: 0 } });
                        }
                        currentBatchStartRow = currentRow;
                    }

                    DATA.push([
                        { v: row.batchLabel, s: { fill, border: allThin, font: boldFont, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } } },
                        { v: subj.subjectCode, s: { fill, border: allThin, font: boldFont, alignment: { horizontal: 'center', vertical: 'center' } } },
                        { v: subj.subjectName, s: { fill, border: allThin, font: bodyFont, alignment: { horizontal: 'left', vertical: 'center', wrapText: true } } },
                        { v: row.rollRanges, s: { fill, border: allThin, font: regFont, alignment: { horizontal: 'left', vertical: 'center', wrapText: true } } },
                        { v: row.hallCode, s: { fill, border: allThin, font: boldFont, alignment: { horizontal: 'center', vertical: 'center' } } },
                        { v: row.count, s: { fill, border: allThin, font: bodyFont, alignment: { horizontal: 'center', vertical: 'center' } } },
                        { v: subj.totalStudents, s: { fill, border: allThin, font: boldFont, alignment: { horizontal: 'center', vertical: 'center' } } }
                    ]);
                });

                const subjectEndRow = DATA.length - 1;
                if (currentBatchStartRow !== -1 && subjectEndRow >= currentBatchStartRow) {
                    merges.push({ s: { r: currentBatchStartRow, c: 0 }, e: { r: subjectEndRow, c: 0 } });
                }

                if (subjectEndRow >= subjectStartRow) {
                    merges.push({ s: { r: subjectStartRow, c: 1 }, e: { r: subjectEndRow, c: 1 } });
                    merges.push({ s: { r: subjectStartRow, c: 2 }, e: { r: subjectEndRow, c: 2 } });
                    merges.push({ s: { r: subjectStartRow, c: 6 }, e: { r: subjectEndRow, c: 6 } });
                    
                    const firstRow = DATA[subjectStartRow];
                    firstRow.forEach((cell: any) => {
                        cell.s.border = { ...allThin, top: { style: 'medium', color: { rgb: '334155' } } };
                    });
                }
            });

            const ws = XLSXStyle.utils.aoa_to_sheet(DATA);
            ws['!cols'] = [
                { wch: 42 },
                { wch: 20 },
                { wch: 38 },
                { wch: 55 },
                { wch: 22 },
                { wch: 12 },
                { wch: 12 }
            ];

            const rowHeights: any[] = [];
            for (let i = 0; i < DATA.length; i++) {
                if (i === 0) rowHeights.push({ hpt: 26 });
                else if (i === 1) rowHeights.push({ hpt: 20 });
                else if (i === 2 || i === 3) rowHeights.push({ hpt: 18 });
                else if (i === 4) rowHeights.push({ hpt: 10 });
                else if (i === 5) rowHeights.push({ hpt: 28 });
                else rowHeights.push({ hpt: 22 });
            }
            ws['!rows'] = rowHeights;
            ws['!merges'] = merges;

            const wb = XLSXStyle.utils.book_new();
            XLSXStyle.utils.book_append_sheet(wb, ws, 'Subject Seating');
            downloadExcelFile(XLSXStyle, wb, `SubjectWise_Seating_${selectedDate}_${selectedSession}.xlsx`);
            toast.success('Subject Wise Seating downloaded');
        } catch (e) {
            console.error(e);
            toast.error('Failed to export Subject Wise Seating');
        } finally {
            setConsolidatedDownloading(false);
        }
    };

    /** Export Consolidated / Subject Wise PDF Report */
    const downloadConsolidatedPDF = async () => {
        if (!selectedDate || !selectedSession || !selectedSeries) return;
        setConsolidatedDownloading(true);
        const tid = toast.loading('Generating Subject Wise PDF report...');
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const data = await InternalReportsService.getConsolidated(selectedDate, selectedSession, Number(selectedSeries));
            if (!data || data.length === 0) {
                toast.error('No seating allocations found', { id: tid });
                return;
            }

            const subjects = buildSubjectWiseData(data);
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();

            const selectedSeriesName = seriesList.find(s => String(s.ExamSeriesID) === selectedSeries)?.SeriesName || 'Internal Exam';
            const examTitle = selectedSeriesName.toLowerCase().includes('internal') ? selectedSeriesName : `${selectedSeriesName} (Internal Exam)`;
            
            const d = new Date(selectedDate);
            const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' });
            const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const sessionName = selectedSession === 'FN' ? 'Forenoon (09:30 AM)' : 'Afternoon (01:30 PM)';
            const fullDateStr = `${dateFormatted} – ${dayName} – ${sessionName}`;

            // ── Header Band ──
            doc.setFillColor(15, 23, 42); // Dark Navy
            doc.rect(0, 0, pageW, 36, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(13); doc.setFont('helvetica', 'bold');
            doc.text("ST. JOSEPH'S COLLEGE OF ENGINEERING & TECHNOLOGY, PALAI", pageW / 2, 9, { align: 'center' });

            doc.setFontSize(11); doc.setTextColor(165, 180, 252);
            doc.text("SUBJECT WISE CONSOLIDATED SEATING ARRANGEMENT", pageW / 2, 16, { align: 'center' });

            doc.setFillColor(99, 102, 241); // Indigo accent line
            doc.rect(14, 20, pageW - 28, 0.4, 'F');

            doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(226, 232, 240);
            doc.text(`Exam: ${examTitle}  ·  Date: ${fullDateStr}`, pageW / 2, 26, { align: 'center' });

            const bodyRows: any[] = [];
            subjects.forEach((subj, sIdx) => {
                const fill = sIdx % 2 === 0 ? [255, 255, 255] : [240, 244, 255];
                const totalSubjRows = subj.rows.length;

                subj.rows.forEach((row, rIdx) => {
                    const isFirstInSubject = (rIdx === 0);
                    bodyRows.push([
                        row.isFirstInBatch ? { content: row.batchLabel, rowSpan: row.batchRowsCount, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: fill } } : null,
                        isFirstInSubject ? { content: subj.subjectCode, rowSpan: totalSubjRows, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: fill } } : null,
                        isFirstInSubject ? { content: subj.subjectName, rowSpan: totalSubjRows, styles: { halign: 'left', valign: 'middle', fontStyle: 'bold', fillColor: fill } } : null,
                        { content: row.rollRanges, styles: { halign: 'left', valign: 'middle', fontStyle: 'bold', fontSize: 8, fillColor: fill } },
                        { content: row.hallCode, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: fill } },
                        { content: String(row.count), styles: { halign: 'center', valign: 'middle', fillColor: fill } },
                        isFirstInSubject ? { content: String(subj.totalStudents), rowSpan: totalSubjRows, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: fill } } : null
                    ].filter(cell => cell !== null));
                });
            });

            autoTable(doc, {
                startY: 40,
                head: [['Batch', 'Subject Code', 'Subject Name', 'Roll Numbers', 'Hall / Room No', 'Count', 'Total']],
                body: bodyRows,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2.5, lineColor: [203, 213, 225], lineWidth: 0.2, valign: 'middle' },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                columnStyles: {
                    0: { cellWidth: 46, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
                    2: { cellWidth: 48, halign: 'left' },
                    3: { cellWidth: 80, halign: 'left' },
                    4: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
                    5: { cellWidth: 13, halign: 'center' },
                    6: { cellWidth: 13, halign: 'center', fontStyle: 'bold' }
                },
                didDrawPage: (dataInfo: any) => {
                    doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
                    doc.text(
                        `Page ${dataInfo.pageNumber}  ·  CONFIDENTIAL  ·  SeatSync Internal Exam System`,
                        pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' }
                    );
                }
            });

            doc.save(`SubjectWise_Seating_${selectedDate}_${selectedSession}.pdf`);
            toast.success('Subject Wise Seating PDF downloaded', { id: tid });
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || 'Failed to export Subject Wise PDF', { id: tid });
        } finally {
            setConsolidatedDownloading(false);
        }
    };

    /* ── Helper: build compact register-number ranges ──
       e.g. ["SJC24CE001","SJC24CE002","SJC24CE003","SJC24CE005"] → ["SJC24CE001-03", "SJC24CE005"] */
    const buildRegRanges = (regs: string[]): string[] => {
        if (!regs.length) return [];
        const sorted = [...regs].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        const ranges: string[] = [];
        let start = sorted[0], prev = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            const curr = sorted[i];
            const pm = prev.match(/^(.*?)(\d+)$/);
            const cm = curr.match(/^(.*?)(\d+)$/);

            if (pm && cm && pm[1] === cm[1] && parseInt(cm[2], 10) === parseInt(pm[2], 10) + 1) {
                prev = curr;
            } else {
                if (start === prev) {
                    ranges.push(start);
                } else {
                    let commonPrefixLen = 0;
                    while (commonPrefixLen < start.length && commonPrefixLen < prev.length && start[commonPrefixLen] === prev[commonPrefixLen]) {
                        commonPrefixLen++;
                    }
                    const suffix = prev.substring(commonPrefixLen);
                    ranges.push(`${start}-${suffix || prev.match(/\d+$/)?.[0]}`);
                }
                start = curr;
                prev = curr;
            }
        }

        if (start === prev) {
            ranges.push(start);
        } else {
            let commonPrefixLen = 0;
            while (commonPrefixLen < start.length && commonPrefixLen < prev.length && start[commonPrefixLen] === prev[commonPrefixLen]) {
                commonPrefixLen++;
            }
            const suffix = prev.substring(commonPrefixLen);
            ranges.push(`${start}-${suffix || prev.match(/\d+$/)?.[0]}`);
        }

        return ranges;
    };

    const getStudentRollNumber = (student: any): number | null => {
        if (student?.RollNumber != null && !isNaN(Number(student.RollNumber))) {
            return Number(student.RollNumber);
        }
        if (student?.RegisterNumber) {
            const match = String(student.RegisterNumber).trim().match(/(\d+)$/);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
        return null;
    };

    const buildRollRanges = (rolls: number[]): string[] => {
        if (!rolls.length) return [];
        const sorted = Array.from(new Set(rolls)).sort((a, b) => a - b);
        const ranges: string[] = [];
        let start = sorted[0], prev = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            const curr = sorted[i];
            if (curr === prev + 1) {
                prev = curr;
            } else {
                ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
                start = curr;
                prev = curr;
            }
        }
        ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
        return ranges;
    };

    const buildBatchStudentRanges = (students: any[]): string => {
        const rollNumbers: number[] = [];
        const unparsedRegs: string[] = [];

        students.forEach(s => {
            const roll = getStudentRollNumber(s);
            if (roll !== null && !isNaN(roll)) {
                rollNumbers.push(roll);
            } else if (s?.RegisterNumber) {
                unparsedRegs.push(s.RegisterNumber);
            }
        });

        const parts: string[] = [];
        if (rollNumbers.length > 0) {
            parts.push(buildRollRanges(rollNumbers).join(', '));
        }
        if (unparsedRegs.length > 0) {
            parts.push(buildRegRanges(unparsedRegs).join(', '));
        }

        return parts.join(', ');
    };

    /** Build Batch Wise Groups from raw seating allocations */
    const buildBatchWiseData = (data: any[]) => {
        const multiDivBranches = getMultiDivisionBranches(data);
        const classMap: Record<string, { classLabel: string; roomAllocations: Record<string, any[]> }> = {};

        data.forEach((alloc: any) => {
            const classLabel = formatSeatingBatchLabel(alloc.Student, multiDivBranches);

            if (!classMap[classLabel]) {
                classMap[classLabel] = { classLabel, roomAllocations: {} };
            }

            const roomCode = alloc.Seat?.Room?.RoomCode || 'Unassigned';
            if (!classMap[classLabel].roomAllocations[roomCode]) {
                classMap[classLabel].roomAllocations[roomCode] = [];
            }
            classMap[classLabel].roomAllocations[roomCode].push(alloc);
        });

        const classes = Object.values(classMap).map(cls => {
            const blocks: { hallCode: string; regRanges: string; count: number }[] = [];
            const sortedRooms = Object.keys(cls.roomAllocations).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

            sortedRooms.forEach(roomCode => {
                const roomAllocs = cls.roomAllocations[roomCode];
                roomAllocs.sort((a: any, b: any) => {
                    const rollA = getStudentRollNumber(a.Student);
                    const rollB = getStudentRollNumber(b.Student);
                    if (rollA !== null && rollB !== null) {
                        return rollA - rollB;
                    }
                    return (a.Student?.RegisterNumber || '').localeCompare(b.Student?.RegisterNumber || '');
                });

                const regRanges = buildBatchStudentRanges(roomAllocs.map((a: any) => a.Student));
                blocks.push({
                    hallCode: roomCode,
                    regRanges,
                    count: roomAllocs.length
                });
            });

            return {
                classLabel: cls.classLabel,
                blocks,
                totalStudents: blocks.reduce((acc, b) => acc + b.count, 0)
            };
        });

        classes.sort((a, b) => sortBatchLabels(a.classLabel, b.classLabel));
        return classes;
    };

    const downloadSubjectWiseExcel = async () => {
        if (!selectedDate || !selectedSession || !selectedSeries) return;
        setSubjectDownloading(true);
        try {
            const XLSXStyle = (await import('xlsx-js-style')).default;
            const data = await InternalReportsService.getConsolidated(selectedDate, selectedSession, Number(selectedSeries));

            if (!data || data.length === 0) {
                toast.error('No seating allocations found');
                return;
            }

            const classes = buildBatchWiseData(data);
            const selectedSeriesName = seriesList.find(s => String(s.ExamSeriesID) === selectedSeries)?.SeriesName || 'Internal Exam';
            const examTitle = selectedSeriesName.toLowerCase().includes('internal') ? selectedSeriesName : `${selectedSeriesName} (Internal Exam)`;

            const d = new Date(selectedDate);
            const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' });
            const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const sessionName = selectedSession === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)';
            const fullDateStr = `${dateFormatted} – ${dayName} – ${sessionName}`;

            const subjectCodes = Array.from(new Set(data.map((a: any) => a.Exam?.SubjectCode).filter(Boolean))).sort().join(', ');

            const titleStyle = { font: { bold: true, sz: 13, color: { rgb: '0F172A' } }, alignment: { horizontal: 'center', vertical: 'center' } };
            const subTitleStyle = { font: { bold: true, sz: 11, color: { rgb: '4338CA' } }, alignment: { horizontal: 'center', vertical: 'center' } };
            const subStyle = { font: { sz: 10, bold: true, color: { rgb: '334155' } }, alignment: { horizontal: 'center', vertical: 'center' } };
            const courseStyle = { font: { sz: 9, bold: true, color: { rgb: '475569' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
            const headerFill = { patternType: 'solid', fgColor: { rgb: '0F172A' } };
            const headerFont = { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 };
            const thinBorder = { style: 'thin', color: { rgb: 'CBD5E1' } };
            const allThin = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
            const bodyFont = { sz: 9.5, color: { rgb: '1E293B' } };
            const boldFont = { sz: 9.5, bold: true, color: { rgb: '1E293B' } };
            const regFont = { sz: 9.5, bold: true, color: { rgb: '0F172A' } };

            const DATA: any[][] = [];
            DATA.push([{ v: "ST. JOSEPH'S COLLEGE OF ENGINEERING & TECHNOLOGY, PALAI", s: titleStyle }, '', '', '', '']);
            DATA.push([{ v: 'CONSOLIDATED SEATING ARRANGEMENT', s: subTitleStyle }, '', '', '', '']);
            DATA.push([{ v: `Exam: ${examTitle}`, s: subStyle }, '', '', '', '']);
            DATA.push([{ v: `Date: ${fullDateStr}`, s: subStyle }, '', '', '', '']);
            DATA.push([{ v: `Courses: ${subjectCodes || 'N/A'}`, s: courseStyle }, '', '', '', '']);
            DATA.push(['', '', '', '', '']);

            DATA.push([
                { v: 'Batch', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: allThin } },
                { v: 'Roll Numbers', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin } },
                { v: 'Hall / Room No', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin } },
                { v: 'Count', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin } },
                { v: 'Total', s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin } }
            ]);

            const merges: any[] = [];
            for (let i = 0; i < 5; i++) merges.push({ s: { r: i, c: 0 }, e: { r: i, c: 4 } });

            classes.forEach((cls, cIdx) => {
                const classStartRow = DATA.length;
                const fill = cIdx % 2 === 0
                    ? { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }
                    : { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } };

                cls.blocks.forEach((block) => {
                    DATA.push([
                        { v: cls.classLabel, s: { fill, border: allThin, font: boldFont, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } } },
                        { v: block.regRanges, s: { fill, border: allThin, font: regFont, alignment: { horizontal: 'left', vertical: 'center', wrapText: true } } },
                        { v: block.hallCode, s: { fill, border: allThin, font: boldFont, alignment: { horizontal: 'center', vertical: 'center' } } },
                        { v: block.count, s: { fill, border: allThin, font: bodyFont, alignment: { horizontal: 'center', vertical: 'center' } } },
                        { v: cls.totalStudents, s: { fill, border: allThin, font: boldFont, alignment: { horizontal: 'center', vertical: 'center' } } }
                    ]);
                });

                const classEndRow = DATA.length - 1;
                if (classEndRow >= classStartRow) {
                    merges.push({ s: { r: classStartRow, c: 0 }, e: { r: classEndRow, c: 0 } });
                    merges.push({ s: { r: classStartRow, c: 4 }, e: { r: classEndRow, c: 4 } });

                    const firstRow = DATA[classStartRow];
                    firstRow.forEach((cell: any) => {
                        cell.s.border = { ...allThin, top: { style: 'medium', color: { rgb: '334155' } } };
                    });
                }
            });

            const ws = XLSXStyle.utils.aoa_to_sheet(DATA);
            ws['!cols'] = [
                { wch: 46 },
                { wch: 58 },
                { wch: 22 },
                { wch: 12 },
                { wch: 12 }
            ];

            const rowHeights: any[] = [];
            for (let i = 0; i < DATA.length; i++) {
                if (i === 0) rowHeights.push({ hpt: 26 });
                else if (i === 1) rowHeights.push({ hpt: 20 });
                else if (i === 2 || i === 3) rowHeights.push({ hpt: 18 });
                else if (i === 4) rowHeights.push({ hpt: Math.max(22, Math.ceil((subjectCodes?.length || 0) / 75) * 15) });
                else if (i === 5) rowHeights.push({ hpt: 10 });
                else if (i === 6) rowHeights.push({ hpt: 28 });
                else rowHeights.push({ hpt: 22 });
            }
            ws['!rows'] = rowHeights;
            ws['!merges'] = merges;

            const wb = XLSXStyle.utils.book_new();
            XLSXStyle.utils.book_append_sheet(wb, ws, 'Batch Seating');
            downloadExcelFile(XLSXStyle, wb, `BatchWise_Seating_${selectedDate}_${selectedSession}.xlsx`);
            toast.success('Batch Wise Seating downloaded');
        } catch (e) {
            console.error(e);
            toast.error('Failed to export Batch Wise Seating');
        } finally {
            setSubjectDownloading(false);
        }
    };

    /** Export Batch / Branch Wise PDF Report */
    const downloadSubjectWisePDF = async () => {
        if (!selectedDate || !selectedSession || !selectedSeries) return;
        setSubjectDownloading(true);
        const tid = toast.loading('Generating Batch Wise PDF report...');
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const data = await InternalReportsService.getConsolidated(selectedDate, selectedSession, Number(selectedSeries));
            if (!data || data.length === 0) {
                toast.error('No seating allocations found', { id: tid });
                return;
            }

            const classes = buildBatchWiseData(data);
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();

            const selectedSeriesName = seriesList.find(s => String(s.ExamSeriesID) === selectedSeries)?.SeriesName || 'Internal Exam';
            const examTitle = selectedSeriesName.toLowerCase().includes('internal') ? selectedSeriesName : `${selectedSeriesName} (Internal Exam)`;

            const d = new Date(selectedDate);
            const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' });
            const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const sessionName = selectedSession === 'FN' ? 'Forenoon (09:30 AM)' : 'Afternoon (01:30 PM)';
            const fullDateStr = `${dateFormatted} – ${dayName} – ${sessionName}`;
            const subjectCodes = Array.from(new Set(data.map((a: any) => a.Exam?.SubjectCode).filter(Boolean))).sort().join(', ');

            // ── Header Band ──
            doc.setFillColor(15, 23, 42); // Dark Navy
            doc.rect(0, 0, pageW, 38, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(13); doc.setFont('helvetica', 'bold');
            doc.text("ST. JOSEPH'S COLLEGE OF ENGINEERING & TECHNOLOGY, PALAI", pageW / 2, 9, { align: 'center' });

            doc.setFontSize(11); doc.setTextColor(165, 180, 252);
            doc.text("CONSOLIDATED SEATING ARRANGEMENT", pageW / 2, 16, { align: 'center' });

            doc.setFillColor(99, 102, 241); // Indigo accent line
            doc.rect(14, 20, pageW - 28, 0.4, 'F');

            doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(226, 232, 240);
            doc.text(`Exam: ${examTitle}  ·  Date: ${fullDateStr}`, pageW / 2, 26, { align: 'center' });

            doc.setFontSize(8); doc.setTextColor(203, 213, 225);
            doc.text(`Courses: ${subjectCodes || 'N/A'}`, pageW / 2, 32, { align: 'center', maxWidth: pageW - 28 });

            const bodyRows: any[] = [];
            classes.forEach((cls, cIdx) => {
                const fill = cIdx % 2 === 0 ? [255, 255, 255] : [240, 244, 255];
                const totalClassRows = cls.blocks.length;

                cls.blocks.forEach((block, bi) => {
                    const isFirstInClass = (bi === 0);
                    bodyRows.push([
                        isFirstInClass ? { content: cls.classLabel, rowSpan: totalClassRows, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: fill } } : null,
                        { content: block.regRanges, styles: { halign: 'left', valign: 'middle', fontStyle: 'bold', fontSize: 8.5, fillColor: fill } },
                        { content: block.hallCode, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: fill } },
                        { content: String(block.count), styles: { halign: 'center', valign: 'middle', fillColor: fill } },
                        isFirstInClass ? { content: String(cls.totalStudents), rowSpan: totalClassRows, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: fill } } : null
                    ].filter(cell => cell !== null));
                });
            });

            autoTable(doc, {
                startY: 42,
                head: [['Batch', 'Roll Numbers', 'Hall / Room No', 'Count', 'Total']],
                body: bodyRows,
                theme: 'grid',
                styles: { fontSize: 8.5, cellPadding: 2.8, lineColor: [203, 213, 225], lineWidth: 0.2, valign: 'middle' },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                columnStyles: {
                    0: { cellWidth: 68, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 116, halign: 'left' },
                    2: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
                    3: { cellWidth: 16, halign: 'center' },
                    4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }
                },
                didDrawPage: (dataInfo: any) => {
                    doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
                    doc.text(
                        `Page ${dataInfo.pageNumber}  ·  CONFIDENTIAL  ·  SeatSync Internal Exam System`,
                        pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' }
                    );
                }
            });

            doc.save(`BatchWise_Seating_${selectedDate}_${selectedSession}.pdf`);
            toast.success('Batch Wise Seating PDF downloaded', { id: tid });
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || 'Failed to export Batch Wise PDF', { id: tid });
        } finally {
            setSubjectDownloading(false);
        }
    };

    /* ── PDF EXPORT FUNCTIONS FOR INTERNAL SEATING ── */

    const downloadRoomWiseExcel = async () => {
        if (!selectedDate || !selectedSession || !selectedSeries) return;
        setRoomDownloading(true);
        try {
            const XLSXStyle = (await import('xlsx-js-style')).default;
            const data = await InternalReportsService.getRoomWise(selectedDate, selectedSession, Number(selectedSeries));

            if (!data || data.length === 0) {
                toast.error('No seating allocations found');
                return;
            }

            const roomIdsMap = new Map<string, number>();
            data.forEach((alloc: any) => {
                const rCode = alloc.Seat?.Room?.RoomCode || 'Unknown';
                const rId = alloc.Seat?.Room?.RoomID || alloc.Seat?.RoomID;
                if (rId && !roomIdsMap.has(rCode)) roomIdsMap.set(rCode, rId);
            });

            const wb = XLSXStyle.utils.book_new();
            const selectedSeriesName = seriesList.find(s => String(s.ExamSeriesID) === selectedSeries)?.SeriesName || 'Internal Exam';
            const examTitle = selectedSeriesName.toLowerCase().includes('internal') ? selectedSeriesName : `${selectedSeriesName} (Internal Exam)`;
            
            const d = new Date(selectedDate);
            const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' });
            const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' (' + dayName + ')';
            const sessionStr = selectedSession === 'FN' ? 'Forenoon' : 'Afternoon';

            const headStyle = { font: { bold: true, sz: 14, color: { rgb: '000000' } }, alignment: { horizontal: 'center' } };
            const subTitleStyle = { font: { sz: 10, color: { rgb: '3C3C3C' } }, alignment: { horizontal: 'center' } };
            const subTitleBold = { font: { bold: true, sz: 10, color: { rgb: '282828' } }, alignment: { horizontal: 'center' } };
            const colHeaderStyle = { font: { bold: true, sz: 13, color: { rgb: '000000' } }, alignment: { horizontal: 'center' } };
            const seatBoxStyle = {
                font: { sz: 9, color: { rgb: '000000' } },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                border: {
                    top: { style: 'thin', color: { rgb: 'DCDCDC' } },
                    bottom: { style: 'thin', color: { rgb: 'DCDCDC' } },
                    left: { style: 'thin', color: { rgb: 'DCDCDC' } },
                    right: { style: 'thin', color: { rgb: 'DCDCDC' } }
                }
            };
            const summaryHeadStyle = { fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 9 }, alignment: { horizontal: 'center' }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };
            const summaryBodyStyle = { font: { sz: 8.5, color: { rgb: '282828' } }, alignment: { horizontal: 'center' }, border: { top: { style: 'thin', color: { rgb: 'C8C8C8' } }, bottom: { style: 'thin', color: { rgb: 'C8C8C8' } }, left: { style: 'thin', color: { rgb: 'C8C8C8' } }, right: { style: 'thin', color: { rgb: 'C8C8C8' } } } };

            const subjectColorPalette = [
                { fill: 'DBEAFE', text: '1E3A8A' },
                { fill: 'EDE9FE', text: '4C1D95' },
                { fill: 'DCFCE7', text: '14532D' },
                { fill: 'FEF3C7', text: '78350F' },
                { fill: 'FFE4E6', text: '9F1239' },
                { fill: 'E0F2FE', text: '0C4A6E' }
            ];

            const usedSheetNames = new Set<string>();

            for (const [hallCode, hallId] of roomIdsMap.entries()) {
                let layoutDetail: any = null;
                try {
                    layoutDetail = await InternalSeatingService.getHallLayout(hallId, selectedDate, selectedSession, Number(selectedSeries));
                } catch (e) {
                    console.error(`Failed to load layout for hall ${hallCode}`, e);
                }

                const rowsData: any[] = layoutDetail?.rows || [];
                const rowLabels: string[] = rowsData.map(r => r.rowLabel);
                const maxBenches = rowsData.length > 0 ? Math.max(...rowsData.map(r => r.benches.length)) : 0;
                
                const subjectCounts = new Map<string, number>();
                const roomSubjectCodes = new Set<string>();
                const subjectNamesMap = new Map<string, string>();

                data.forEach((alloc: any) => {
                    const sCode = alloc.Exam?.SubjectCode || alloc.SubjectCode;
                    const sName = alloc.Exam?.SubjectName || alloc.SubjectName;
                    if (sCode && sName && !subjectNamesMap.has(sCode)) {
                        subjectNamesMap.set(sCode, sName);
                    }
                });

                rowsData.forEach(row => {
                    row.benches.forEach((bench: any) => {
                        [bench.left, bench.right].forEach(seat => {
                            if (seat?.subjectCode) {
                                subjectCounts.set(seat.subjectCode, (subjectCounts.get(seat.subjectCode) || 0) + 1);
                                roomSubjectCodes.add(seat.subjectCode);
                                if (seat.subjectName && !subjectNamesMap.has(seat.subjectCode)) {
                                    subjectNamesMap.set(seat.subjectCode, seat.subjectName);
                                }
                            }
                        });
                    });
                });

                const subjectCodesString = Array.from(roomSubjectCodes).sort().join(', ');
                const subjectColors = new Map<string, any>();
                Array.from(roomSubjectCodes).sort().forEach((code, idx) => {
                    subjectColors.set(code, subjectColorPalette[idx % subjectColorPalette.length]);
                });

                const DATA: any[][] = Array.from({ length: 11 + maxBenches * 2 + 10 }, () => Array(11).fill({ v: '', s: {} }));
                const merges: any[] = [];

                DATA[0][0] = { v: "ST. JOSEPH'S COLLEGE OF ENGINEERING & TECHNOLOGY, PALAI", s: headStyle };
                DATA[1][0] = { v: "SEATING ARRANGEMENT", s: headStyle };
                DATA[2][0] = { v: `Exam: ${examTitle}`, s: subTitleStyle };
                DATA[3][0] = { v: `Date: ${dateFormatted} - ${sessionStr}`, s: subTitleStyle };
                DATA[4][0] = { v: `Subjects: ${subjectCodesString}`, s: subTitleBold };
                DATA[5][0] = { v: `Hall / Room: ${hallCode}`, s: subTitleBold };

                for (let i = 0; i < 6; i++) merges.push({ s: { r: i, c: 0 }, e: { r: i, c: 10 } });

                rowLabels.forEach((label, colIdx) => {
                    const cBase = 1 + colIdx * 2;
                    if (cBase > 10) return;

                    DATA[7][cBase] = { v: label, s: colHeaderStyle };
                    merges.push({ s: { r: 7, c: cBase }, e: { r: 7, c: cBase + 1 } });

                    const rowObj = rowsData.find(r => r.rowLabel === label);
                    const isSingle = layoutDetail?.seatMode === 'Single';

                    let leftSubjCode: string | null = null;
                    let rightSubjCode: string | null = null;
                    if (rowObj) {
                        for (const b of rowObj.benches) {
                            if (!leftSubjCode && b.left?.subjectCode) leftSubjCode = b.left.subjectCode;
                            if (!rightSubjCode && b.right?.subjectCode) rightSubjCode = b.right.subjectCode;
                            if (leftSubjCode && rightSubjCode) break;
                        }
                    }

                    if (!isSingle && leftSubjCode && rightSubjCode && leftSubjCode !== rightSubjCode) {
                        const colorL = subjectColors.get(leftSubjCode) || subjectColorPalette[0];
                        DATA[8][cBase] = {
                            v: leftSubjCode,
                            s: {
                                ...subTitleStyle,
                                font: { bold: true, sz: 8, color: { rgb: colorL.text } },
                                fill: { patternType: 'solid', fgColor: { rgb: colorL.fill } },
                                border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
                            }
                        };
                        const colorR = subjectColors.get(rightSubjCode) || subjectColorPalette[1];
                        DATA[8][cBase + 1] = {
                            v: rightSubjCode,
                            s: {
                                ...subTitleStyle,
                                font: { bold: true, sz: 8, color: { rgb: colorR.text } },
                                fill: { patternType: 'solid', fgColor: { rgb: colorR.fill } },
                                border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
                            }
                        };
                    } else {
                        const sCode = leftSubjCode || rightSubjCode;
                        if (sCode) {
                            const color = subjectColors.get(sCode) || subjectColorPalette[0];
                            DATA[8][cBase] = {
                                v: sCode,
                                s: {
                                    ...subTitleStyle,
                                    font: { bold: true, sz: 8, color: { rgb: color.text } },
                                    fill: { patternType: 'solid', fgColor: { rgb: color.fill } },
                                    border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
                                }
                            };
                            merges.push({ s: { r: 8, c: cBase }, e: { r: 8, c: cBase + 1 } });
                        }
                    }
                });

                const gridStartRow = 10;
                rowLabels.forEach((label, colIdx) => {
                    const cBase = 1 + colIdx * 2;
                    if (cBase > 10) return;

                    const rowObj = rowsData.find(r => r.rowLabel === label);
                    const colBenches = rowObj ? rowObj.benches : [];
                    const isSingle = layoutDetail?.seatMode === 'Single';

                    for (let bIdx = 0; bIdx < maxBenches; bIdx++) {
                        const rBase = gridStartRow + bIdx * 2;
                        const bench = colBenches.find((b: any) => b.benchNumber === bIdx + 1);

                        const leftAss = bench?.left;
                        const rightAss = bench?.right;

                        const printSeatBox = (ass: any, col: number, w: number, benchLabel: string) => {
                            let cellVal = benchLabel;
                            let style: any = { ...seatBoxStyle };

                            if (!ass || !ass.studentId) {
                                cellVal += "\n\nEMPTY";
                                style.font = { ...style.font, color: { rgb: "999999" } };
                            } else {
                                const regOrRoll = (ass.rollNumber !== null && ass.rollNumber !== undefined && String(ass.rollNumber).trim() !== '')
                                    ? ass.rollNumber
                                    : ass.registerNumber;
                                cellVal += `\n\n${regOrRoll}\n${ass.name || ''}`;
                                style.font = { ...style.font, bold: true, sz: 10 };
                            }

                            DATA[rBase][col] = { v: cellVal, s: style };
                            merges.push({ s: { r: rBase, c: col }, e: { r: rBase + 1, c: col + w - 1 } });
                        };

                        if (isSingle) {
                            printSeatBox(leftAss, cBase, 2, `${label}${bIdx + 1}`);
                        } else {
                            printSeatBox(leftAss, cBase, 1, `${label}${bIdx + 1}`);
                            printSeatBox(rightAss, cBase + 1, 1, ``);
                        }
                    }
                });

                let currentY = gridStartRow + maxBenches * 2 + 2;
                DATA[currentY][3] = { v: "Subjects", s: summaryHeadStyle };
                DATA[currentY][5] = { v: "Count", s: summaryHeadStyle };
                merges.push({ s: { r: currentY, c: 3 }, e: { r: currentY, c: 4 } });

                const subjEntries = Array.from(subjectCounts.entries());
                subjEntries.forEach(([code, count], idx) => {
                    const row = currentY + 1 + idx;
                    const name = subjectNamesMap.get(code) || '';
                    const displayLabel = name ? `${code} - ${name}` : code;
                    DATA[row][3] = { v: displayLabel, s: { ...summaryBodyStyle, alignment: { horizontal: 'left', vertical: 'center', wrapText: true } } };
                    DATA[row][5] = { v: count, s: summaryBodyStyle };
                    merges.push({ s: { r: row, c: 3 }, e: { r: row, c: 4 } });
                });

                const totalRow = currentY + 1 + subjEntries.length;
                const totalCount = Array.from(subjectCounts.values()).reduce((a, b) => a + b, 0);
                DATA[totalRow][3] = { v: "Total", s: { ...summaryBodyStyle, font: { bold: true }, alignment: { horizontal: 'right', vertical: 'center' } } };
                DATA[totalRow][5] = { v: totalCount, s: { ...summaryBodyStyle, font: { bold: true } } };
                merges.push({ s: { r: totalRow, c: 3 }, e: { r: totalRow, c: 4 } });

                const ws = XLSXStyle.utils.aoa_to_sheet(DATA);
                ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

                const rowHeights: any[] = [];
                for (let i = 0; i < DATA.length; i++) {
                    if (i < 6) rowHeights.push({ hpt: 25 });
                    else if (i < 10) rowHeights.push({ hpt: 22 });
                    else rowHeights.push({ hpt: 52 });
                }
                ws['!rows'] = rowHeights;
                ws['!merges'] = merges;

                let sheetName = hallCode.replace(/[:\\/?*[\]]/g, "").slice(0, 31);
                if (usedSheetNames.has(sheetName)) {
                    let j = 2;
                    while (usedSheetNames.has(`${sheetName.slice(0, 28)}_${j}`)) j++;
                    sheetName = `${sheetName.slice(0, 28)}_${j}`;
                }
                usedSheetNames.add(sheetName);
                XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
            }

            downloadExcelFile(XLSXStyle, wb, `RoomWise_Seating_${selectedDate}_${selectedSession}.xlsx`);
            toast.success('Room Wise Seating downloaded');
        } catch (e) {
            console.error(e);
            toast.error('Failed to export Room Wise Seating');
        } finally {
            setRoomDownloading(false);
        }
    };

    /** Bulk Export All Room PDFs as a single ZIP file with visual seating layout */
    const downloadRoomWisePDFZip = async () => {
        if (!selectedDate || !selectedSession || !selectedSeries) return;
        setRoomDownloading(true);
        const tid = toast.loading('Generating Room Wise PDF ZIP package...');
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const { default: JSZip } = await import('jszip');

            const data = await InternalReportsService.getRoomWise(selectedDate, selectedSession, Number(selectedSeries));
            if (!data || data.length === 0) {
                toast.error('No seating allocations found', { id: tid });
                return;
            }

            const roomIdsMap = new Map<string, number>();
            data.forEach((alloc: any) => {
                const rCode = alloc.Seat?.Room?.RoomCode || 'Unknown';
                const rId = alloc.Seat?.Room?.RoomID || alloc.Seat?.RoomID;
                if (rId && !roomIdsMap.has(rCode)) roomIdsMap.set(rCode, rId);
            });

            const zip = new JSZip();
            const selectedSeriesName = seriesList.find(s => String(s.ExamSeriesID) === selectedSeries)?.SeriesName || 'Internal Exam';
            const examTitle = selectedSeriesName.toLowerCase().includes('internal') ? selectedSeriesName : `${selectedSeriesName} (Internal Exam)`;
            
            const d = new Date(selectedDate);
            const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' });
            const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' (' + dayName + ')';

            const subjectColorPalette = [
                { fill: [219, 234, 254], text: [30, 58, 138] },  // Blue
                { fill: [237, 233, 254], text: [76, 29, 149] },  // Purple
                { fill: [220, 252, 231], text: [20, 83, 45] },   // Green
                { fill: [254, 243, 199], text: [120, 53, 15] },  // Amber
                { fill: [255, 228, 230], text: [159, 18, 57] },  // Rose
                { fill: [224, 242, 254], text: [12, 74, 110] }   // Sky
            ];

            for (const [hallCode, hallId] of roomIdsMap.entries()) {
                let layoutDetail: any = null;
                try {
                    layoutDetail = await InternalSeatingService.getHallLayout(hallId, selectedDate, selectedSession, Number(selectedSeries));
                } catch (e) {
                    console.error(`Failed to load layout for hall ${hallCode}`, e);
                }

                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pageW = doc.internal.pageSize.getWidth();
                const pageH = doc.internal.pageSize.getHeight();

                const rowsData: any[] = layoutDetail?.rows || [];
                const rowLabels: string[] = rowsData.map(r => r.rowLabel);
                const maxBenches = rowsData.length > 0 ? Math.max(...rowsData.map(r => r.benches.length)) : 0;
                const benchNumbers: number[] = Array.from({ length: maxBenches }, (_, i) => i + 1);

                doc.setFillColor(255, 255, 255);
                doc.rect(0, 0, pageW, pageH, 'F');

                const subjectCounts = new Map<string, number>();
                const roomSubjectCodes = new Set<string>();
                const subjectNamesMap = new Map<string, string>();

                data.forEach((alloc: any) => {
                    const sCode = alloc.Exam?.SubjectCode || alloc.SubjectCode;
                    const sName = alloc.Exam?.SubjectName || alloc.SubjectName;
                    if (sCode && sName && !subjectNamesMap.has(sCode)) {
                        subjectNamesMap.set(sCode, sName);
                    }
                });

                rowsData.forEach(row => {
                    row.benches.forEach((bench: any) => {
                        [bench.left, bench.right].forEach(seat => {
                            if (seat?.subjectCode) {
                                subjectCounts.set(seat.subjectCode, (subjectCounts.get(seat.subjectCode) || 0) + 1);
                                roomSubjectCodes.add(seat.subjectCode);
                                if (seat.subjectName && !subjectNamesMap.has(seat.subjectCode)) {
                                    subjectNamesMap.set(seat.subjectCode, seat.subjectName);
                                }
                            }
                        });
                    });
                });

                const subjectCodesString = Array.from(roomSubjectCodes).sort().join(', ');
                const subjectColors = new Map<string, any>();
                Array.from(roomSubjectCodes).sort().forEach((code, idx) => {
                    subjectColors.set(code, subjectColorPalette[idx % subjectColorPalette.length]);
                });

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.text("ST. JOSEPH'S COLLEGE OF ENGINEERING & TECHNOLOGY, PALAI", pageW / 2, 14, { align: 'center' });

                doc.setFontSize(12);
                doc.text("SEATING ARRANGEMENT", pageW / 2, 20, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.5);
                doc.setTextColor(60, 60, 60);
                doc.text(`Exam: ${examTitle}`, pageW / 2, 26.5, { align: 'center' });
                doc.text(`Date: ${dateFormatted} - ${selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}`, pageW / 2, 31.5, { align: 'center' });

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.setTextColor(40, 40, 40);
                doc.text(`Subjects: ${subjectCodesString}`, pageW / 2, 37, { align: 'center' });

                doc.setFontSize(11);
                doc.text(`Hall / Room: ${hallCode}`, pageW / 2, 43, { align: 'center' });

                const cols = Math.max(rowLabels.length, 1);
                const rowsNeeded = Math.max(benchNumbers.length, 1);

                let gapX = 2;
                let gapY = 2;
                let maxCardH = 16;
                let regFont = 9;
                let nameFont = 7;
                let benchLabelFont = 6.5;
                let emptyFont = 7;

                let tableFontSize = 8.5;
                let tablePadding = 1.5;

                if (rowsNeeded > 12) {
                    maxCardH = 12;
                    regFont = 7.5;
                    nameFont = 5.5;
                    gapY = 1.2;
                } else if (rowsNeeded >= 8) {
                    maxCardH = 14;
                    regFont = 8.5;
                    nameFont = 6.5;
                    gapY = 1.5;
                }

                const startY = 58;
                const bottomMargin = 10;

                const summaryRows = subjectCounts.size + 1;
                const summaryRowHeight = tablePadding * 2 + tableFontSize * 0.35;
                const summaryHeight = 10 + (summaryRows * summaryRowHeight) + 10;

                const gridTableGap = 10;
                const availableH = pageH - startY - summaryHeight - bottomMargin - gridTableGap;
                const maxGridH = pageH * 0.70;
                const allowedH = Math.min(availableH, maxGridH);

                let cardW = (pageW - 20 - (cols - 1) * gapX) / cols;
                const maxCardW = 40;
                if (cardW > maxCardW) cardW = maxCardW;

                const gridTotalW = (cols * cardW) + ((cols - 1) * gapX);
                const marginX = (pageW - gridTotalW) / 2;

                const rawCardH = (allowedH - (rowsNeeded - 1) * gapY) / rowsNeeded;
                const cardH = Math.min(rawCardH, maxCardH);

                rowLabels.forEach((rowLabel, colIdx) => {
                    const x = marginX + colIdx * (cardW + gapX);
                    const rowObj = rowsData.find(r => r.rowLabel === rowLabel);
                    const isSingle = layoutDetail?.seatMode === 'Single';

                    doc.setFontSize(13);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    doc.text(`${rowLabel}`, x + cardW / 2, startY - 8.5, { align: 'center' });

                    let leftSubjCode: string | null = null;
                    let rightSubjCode: string | null = null;
                    if (rowObj) {
                        for (const b of rowObj.benches) {
                            if (!leftSubjCode && b.left?.subjectCode) leftSubjCode = b.left.subjectCode;
                            if (!rightSubjCode && b.right?.subjectCode) rightSubjCode = b.right.subjectCode;
                            if (leftSubjCode && rightSubjCode) break;
                        }
                    }

                    const badgeY = startY - 5.5;
                    const badgeH = 3.6;

                    if (!isSingle && leftSubjCode && rightSubjCode && leftSubjCode !== rightSubjCode) {
                        const colorL = subjectColors.get(leftSubjCode) || subjectColorPalette[0];
                        const bxL = x + 0.5;
                        const bwL = (cardW / 2) - 1;
                        doc.setFillColor(colorL.fill[0], colorL.fill[1], colorL.fill[2]);
                        doc.roundedRect(bxL, badgeY, bwL, badgeH, 0.8, 0.8, 'F');
                        doc.setFontSize(6.5);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(colorL.text[0], colorL.text[1], colorL.text[2]);
                        doc.text(leftSubjCode, bxL + bwL / 2, badgeY + 2.6, { align: 'center' });

                        const colorR = subjectColors.get(rightSubjCode) || subjectColorPalette[1];
                        const bxR = x + (cardW / 2) + 0.5;
                        const bwR = (cardW / 2) - 1;
                        doc.setFillColor(colorR.fill[0], colorR.fill[1], colorR.fill[2]);
                        doc.roundedRect(bxR, badgeY, bwR, badgeH, 0.8, 0.8, 'F');
                        doc.setFontSize(6.5);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(colorR.text[0], colorR.text[1], colorR.text[2]);
                        doc.text(rightSubjCode, bxR + bwR / 2, badgeY + 2.6, { align: 'center' });
                    } else {
                        const sCode = leftSubjCode || rightSubjCode;
                        if (sCode) {
                            const color = subjectColors.get(sCode) || subjectColorPalette[0];
                            const bw = Math.min(cardW * 0.85, 34);
                            const bx = x + (cardW - bw) / 2;
                            doc.setFillColor(color.fill[0], color.fill[1], color.fill[2]);
                            doc.roundedRect(bx, badgeY, bw, badgeH, 0.8, 0.8, 'F');
                            doc.setFontSize(7);
                            doc.setFont('helvetica', 'bold');
                            doc.setTextColor(color.text[0], color.text[1], color.text[2]);
                            doc.text(sCode, bx + bw / 2, badgeY + 2.6, { align: 'center' });
                        }
                    }
                });

                rowLabels.forEach((rowLabel, colIdx) => {
                    const rowObj = rowsData.find(r => r.rowLabel === rowLabel);
                    const colBenches = rowObj ? rowObj.benches : [];
                    const isSingle = layoutDetail?.seatMode === 'Single';

                    benchNumbers.forEach((bNumber, benchIdx) => {
                        const bench = colBenches.find((b: any) => b.benchNumber === bNumber);
                        const leftAss = bench?.left;
                        const rightAss = bench?.right;

                        const x = marginX + colIdx * (cardW + gapX);
                        const y = startY + benchIdx * (cardH + gapY);

                        doc.setFillColor(255, 255, 255);
                        doc.setDrawColor(220, 220, 220);
                        doc.setLineWidth(0.15);
                        doc.roundedRect(x, y, cardW, cardH, 0.8, 0.8, 'FD');

                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(benchLabelFont);
                        doc.setTextColor(160, 160, 160);
                        doc.text(`${rowLabel}${bench?.benchNumber ?? bNumber}`, x + 1, y + 2);

                        if (!isSingle) {
                            doc.setDrawColor(235, 235, 235);
                            doc.line(x + cardW / 2, y + 1.5, x + cardW / 2, y + cardH - 1.5);
                        }

                        const printSeat = (ass: any, offsetX: number) => {
                            const cx = x + offsetX;
                            const halfW = cardW / 2;

                            if (!ass || !ass.studentId) {
                                doc.setFillColor(250, 250, 250);
                                doc.rect(cx - halfW / 2 + 0.3, y + 3, halfW - 0.6, cardH - 3.5, 'F');
                                doc.setFont('helvetica', 'bold');
                                doc.setFontSize(emptyFont - 1);
                                doc.setTextColor(200, 200, 200);
                                doc.text("EMPTY", cx, y + (cardH / 2) + 1.5, { align: 'center' });
                                return;
                            }

                            const regOrRoll = (ass.rollNumber !== null && ass.rollNumber !== undefined && String(ass.rollNumber).trim() !== '')
                                ? ass.rollNumber
                                : ass.registerNumber;

                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(regFont);
                            doc.setTextColor(0, 0, 0);
                            const textY = y + (cardH / 2) + 0.5;
                            doc.text(String(regOrRoll || ''), cx, textY, { align: 'center' });

                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(nameFont);
                            doc.setTextColor(80, 80, 80);
                            const nameOffset = rowsNeeded > 10 ? 2.2 : 2.8;

                            const wrappedName = doc.splitTextToSize(ass.name || '', halfW - 1.5);
                            doc.text(wrappedName, cx, textY + nameOffset, { align: 'center' });
                        };

                        if (isSingle) {
                            printSeat(leftAss, cardW * 0.5);
                        } else {
                            printSeat(leftAss, cardW * 0.25);
                            printSeat(rightAss, cardW * 0.75);
                        }
                    });
                });

                let currentY = startY + rowsNeeded * (cardH + gapY) + gridTableGap;
                const subjData: any[][] = Array.from(subjectCounts.entries()).map(([code, count]) => {
                    const name = subjectNamesMap.get(code) || '';
                    const displayLabel = name ? `${code} - ${name}` : code;
                    return [displayLabel, count];
                });
                const totalStudents = Array.from(subjectCounts.values()).reduce((a, b) => a + b, 0);
                subjData.push([
                    { content: 'Total', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'right' } },
                    { content: totalStudents, styles: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'center' } }
                ]);

                const tableW = Math.min(pageW - 40, 130);
                autoTable(doc, {
                    startY: currentY,
                    head: [['Subjects', 'Count']],
                    body: subjData,
                    theme: 'grid',
                    styles: { fontSize: tableFontSize, cellPadding: tablePadding + 0.5, textColor: [30, 41, 59], font: 'helvetica', valign: 'middle' },
                    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center' },
                    bodyStyles: { lineWidth: 0.15, lineColor: [203, 213, 225] },
                    columnStyles: {
                        0: { cellWidth: tableW - 25, halign: 'left' },
                        1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
                    },
                    margin: { left: (pageW - tableW) / 2 },
                    tableWidth: tableW
                });

                const pdfBuffer = doc.output('arraybuffer');
                zip.file(`Room_${hallCode}_Seating_${selectedDate}.pdf`, pdfBuffer);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RoomWise_PDFs_${selectedDate}_${selectedSession}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            toast.success(`Exported Room PDFs in ZIP!`, { id: tid });
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || 'Failed to export Room Wise PDF ZIP', { id: tid });
        } finally {
            setRoomDownloading(false);
        }
    };



    const openHallDetail = async (hall: any) => {
        setDetailLoading(true);
        setDetailHall(hall);
        try {
            const detail = await InternalSeatingService.getHallLayout(hall.hallId, selectedDate, selectedSession, Number(selectedSeries));
            setDetailHall({ ...hall, layout: detail });
        } catch (e: any) {
            if (e?.response?.status === 401) {
                toast.error("Session expired. Please log in again.");
            } else {
                toast.error(e?.response?.data?.message || "Failed to load hall layout");
            }
        } finally {
            setDetailLoading(false);
        }
    };

    const toggleHall = (id: number) => {
        const next = new Set(selectedHallIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedHallIds(next);
    };

    const selectAllHalls = () => setSelectedHallIds(new Set(halls.map(h => h.RoomID)));
    const clearAllHalls = () => setSelectedHallIds(new Set());

    // Stats
    const totalFilled = hallSummary.reduce((acc, h) => acc + (h.filledSeats || 0), 0);
    const totalCapacity = hallSummary.reduce((acc, h) => acc + (h.totalSeats || 0), 0);

    // Room-level allocation metrics
    const allottedRooms = useMemo(() => hallSummary.filter(h => (h.filledSeats || 0) > 0), [hallSummary]);
    const allottedRoomsCount = allottedRooms.length;
    const fullySeatedRoomsCount = useMemo(() => hallSummary.filter(h => (h.filledSeats || 0) >= (h.totalSeats || 0) && (h.filledSeats || 0) > 0).length, [hallSummary]);
    const partialRoomsCount = useMemo(() => hallSummary.filter(h => (h.filledSeats || 0) > 0 && (h.filledSeats || 0) < (h.totalSeats || 0)).length, [hallSummary]);
    const unallottedRoomsCount = useMemo(() => hallSummary.filter(h => (h.filledSeats || 0) === 0).length, [hallSummary]);
    const totalAllottedCapacity = useMemo(() => allottedRooms.reduce((acc, h) => acc + (h.totalSeats || 0), 0), [allottedRooms]);

    const visibleHalls = useMemo(() => {
        return hallSummary.filter(h => {
            const matchesSearch = (h.hallCode || '').toLowerCase().includes(hallSearch.toLowerCase());
            if (!matchesSearch) return false;
            if (roomFilter === 'allotted') return (h.filledSeats || 0) > 0;
            if (roomFilter === 'full') return (h.filledSeats || 0) >= (h.totalSeats || 0) && (h.filledSeats || 0) > 0;
            if (roomFilter === 'partial') return (h.filledSeats || 0) > 0 && (h.filledSeats || 0) < (h.totalSeats || 0);
            if (roomFilter === 'unassigned') return (h.filledSeats || 0) === 0;
            return true;
        });
    }, [hallSummary, hallSearch, roomFilter]);

    const fmtDate = (d: string) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const selectedSeriesName = seriesList.find(s => String(s.ExamSeriesID) === selectedSeries)?.SeriesName || '';
    const hasAllocation = totalFilled > 0;
    const selectionComplete = !!selectedSeries && !!selectedSession && !!selectedDate;

    // Department breakdown of unassigned students
    const unassignedByDept = useMemo(() => {
        if (!hasAllocation || registeredStudents.length === 0) return [];
        const deptMap = new Map<string, { code: string; name: string; count: number }>();
        for (const reg of registeredStudents) {
            if (reg.isSeated) continue;
            const deptCode = reg.Student?.Department?.DepartmentCode || reg.Student?.departmentCode || 'UNKNOWN';
            const deptName = reg.Student?.Department?.DepartmentName || reg.Student?.departmentName || deptCode;
            const existing = deptMap.get(deptCode);
            if (existing) {
                existing.count++;
            } else {
                deptMap.set(deptCode, { code: deptCode, name: deptName, count: 1 });
            }
        }
        return Array.from(deptMap.values()).sort((a, b) => b.count - a.count);
    }, [registeredStudents, hasAllocation, totalFilled]);

    // --- Render ---
    return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-[#f5f7ff] font-sans text-slate-700 antialiased relative overflow-x-hidden">
            {/* Ambient background blobs */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-100/50 blur-[120px]" />
                <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-blue-50/60 blur-[100px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-purple-50/30 blur-[80px]" />
            </div>

            <div className="relative z-10 px-6 md:px-8 py-8 max-w-[1800px] mx-auto">

                {/* ── PAGE HEADER ── */}
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                                <LayoutGrid size={22} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight">
                                    Internal Seating Management
                                </h1>
                                <p className="text-slate-500 text-[13px] font-medium mt-1 leading-relaxed max-w-xl">
                                    Configure exam series, select sessions and dates, then generate seating assignments automatically.
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons — only shown when allocation exists */}
                        <AnimatePresence>
                            {hasAllocation && (
                                <motion.div
                                    initial={{ opacity: 0, y: -12, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -12, scale: 0.97 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    className="flex flex-wrap items-center gap-2.5 shrink-0 select-none"
                                >
                                    <div className="flex items-center p-1.5 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm gap-2 select-none">
                                        {/* Room Wise Dropdown */}
                                        <Dropdown
                                            placement="bottom-start"
                                            classNames={{
                                                content: "!bg-white !bg-opacity-100 bg-white border border-slate-200/90 shadow-2xl shadow-slate-300/40 rounded-2xl p-1 z-50 overflow-hidden"
                                            }}
                                        >
                                            <DropdownTrigger>
                                                <button
                                                    disabled={roomDownloading}
                                                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-700 text-[12px] font-extrabold hover:bg-emerald-100/80 hover:border-emerald-300 transition-all shadow-2xs disabled:opacity-60 active:scale-[0.98] select-none cursor-pointer"
                                                >
                                                    <FileDown size={14} className="text-emerald-600 shrink-0" />
                                                    <span className="select-none leading-none">{roomDownloading ? 'Exporting...' : 'Room Wise'}</span>
                                                    <ChevronDown size={13} className="text-emerald-500 shrink-0" />
                                                </button>
                                            </DropdownTrigger>
                                            <DropdownMenu
                                                aria-label="Room Wise Export Options"
                                                className="p-1 min-w-[240px] bg-white rounded-xl"
                                                itemClasses={{
                                                    base: "data-[hover=true]:bg-slate-100/80 rounded-xl p-2.5 transition-all text-slate-800",
                                                    title: "text-[13px] font-bold text-slate-800",
                                                    description: "text-[11px] text-slate-500 font-medium"
                                                }}
                                                onAction={(key) => {
                                                    if (key === 'excel') downloadRoomWiseExcel();
                                                    if (key === 'pdf') downloadRoomWisePDFZip();
                                                }}
                                            >
                                                <DropdownItem
                                                    key="excel"
                                                    startContent={<FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600 shrink-0" />}
                                                    description="Download all rooms as multi-sheet Excel file"
                                                >
                                                    Excel Spreadsheet (.xlsx)
                                                </DropdownItem>
                                                <DropdownItem
                                                    key="pdf"
                                                    startContent={<FileDown className="w-4.5 h-4.5 text-rose-600 shrink-0" />}
                                                    description="Bulk export all room PDFs as a ZIP file"
                                                >
                                                    Bulk PDF Package (.zip)
                                                </DropdownItem>
                                            </DropdownMenu>
                                        </Dropdown>

                                        {/* Subject Wise Dropdown */}
                                        <Dropdown
                                            placement="bottom-start"
                                            classNames={{
                                                content: "!bg-white !bg-opacity-100 bg-white border border-slate-200/90 shadow-2xl shadow-slate-300/40 rounded-2xl p-1 z-50 overflow-hidden"
                                            }}
                                        >
                                            <DropdownTrigger>
                                                <button
                                                    disabled={consolidatedDownloading}
                                                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-indigo-700 text-[12px] font-extrabold hover:bg-indigo-100/80 hover:border-indigo-300 transition-all shadow-2xs disabled:opacity-60 active:scale-[0.98] select-none cursor-pointer"
                                                >
                                                    <FileDown size={14} className="text-indigo-600 shrink-0" />
                                                    <span className="select-none leading-none">{consolidatedDownloading ? 'Exporting...' : 'Subject Wise'}</span>
                                                    <ChevronDown size={13} className="text-indigo-500 shrink-0" />
                                                </button>
                                            </DropdownTrigger>
                                            <DropdownMenu
                                                aria-label="Subject Wise Export Options"
                                                className="p-1 min-w-[240px] bg-white rounded-xl"
                                                itemClasses={{
                                                    base: "data-[hover=true]:bg-slate-100/80 rounded-xl p-2.5 transition-all text-slate-800",
                                                    title: "text-[13px] font-bold text-slate-800",
                                                    description: "text-[11px] text-slate-500 font-medium"
                                                }}
                                                onAction={(key) => {
                                                    if (key === 'excel') downloadConsolidatedExcel();
                                                    if (key === 'pdf') downloadConsolidatedPDF();
                                                }}
                                            >
                                                <DropdownItem
                                                    key="excel"
                                                    startContent={<FileSpreadsheet className="w-4.5 h-4.5 text-indigo-600 shrink-0" />}
                                                    description="Download full seating table as Excel sheet"
                                                >
                                                    Excel Spreadsheet (.xlsx)
                                                </DropdownItem>
                                                <DropdownItem
                                                    key="pdf"
                                                    startContent={<FileDown className="w-4.5 h-4.5 text-rose-600 shrink-0" />}
                                                    description="Download official consolidated PDF report"
                                                >
                                                    PDF Document (.pdf)
                                                </DropdownItem>
                                            </DropdownMenu>
                                        </Dropdown>

                                        {/* Batch Wise Dropdown */}
                                        <Dropdown
                                            placement="bottom-start"
                                            classNames={{
                                                content: "!bg-white !bg-opacity-100 bg-white border border-slate-200/90 shadow-2xl shadow-slate-300/40 rounded-2xl p-1 z-50 overflow-hidden"
                                            }}
                                        >
                                            <DropdownTrigger>
                                                <button
                                                    disabled={subjectDownloading}
                                                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-purple-50/80 border border-purple-200/80 text-purple-700 text-[12px] font-extrabold hover:bg-purple-100/80 hover:border-purple-300 transition-all shadow-2xs disabled:opacity-60 active:scale-[0.98] select-none cursor-pointer"
                                                >
                                                    <FileDown size={14} className="text-purple-600 shrink-0" />
                                                    <span className="select-none leading-none">{subjectDownloading ? 'Exporting...' : 'Batch Wise'}</span>
                                                    <ChevronDown size={13} className="text-purple-500 shrink-0" />
                                                </button>
                                            </DropdownTrigger>
                                            <DropdownMenu
                                                aria-label="Batch Wise Export Options"
                                                className="p-1 min-w-[240px] bg-white rounded-xl"
                                                itemClasses={{
                                                    base: "data-[hover=true]:bg-slate-100/80 rounded-xl p-2.5 transition-all text-slate-800",
                                                    title: "text-[13px] font-bold text-slate-800",
                                                    description: "text-[11px] text-slate-500 font-medium"
                                                }}
                                                onAction={(key) => {
                                                    if (key === 'excel') downloadSubjectWiseExcel();
                                                    if (key === 'pdf') downloadSubjectWisePDF();
                                                }}
                                            >
                                                <DropdownItem
                                                    key="excel"
                                                    startContent={<FileSpreadsheet className="w-4.5 h-4.5 text-purple-600 shrink-0" />}
                                                    description="Download batch/branch seating as Excel sheet"
                                                >
                                                    Excel Spreadsheet (.xlsx)
                                                </DropdownItem>
                                                <DropdownItem
                                                    key="pdf"
                                                    startContent={<FileDown className="w-4.5 h-4.5 text-rose-600 shrink-0" />}
                                                    description="Download official batch wise PDF report"
                                                >
                                                    PDF Document (.pdf)
                                                </DropdownItem>
                                            </DropdownMenu>
                                        </Dropdown>
                                        <div className="w-px h-5 bg-slate-200/80 mx-0.5 shrink-0" />
                                        <button
                                            onClick={handleClearClick}
                                            disabled={isClearing}
                                            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-rose-50/80 border border-rose-200/80 text-rose-600 text-[12px] font-extrabold hover:bg-rose-100/80 hover:border-rose-300 transition-all shadow-2xs disabled:opacity-60 active:scale-[0.98] select-none cursor-pointer"
                                        >
                                            <Trash2 size={14} className="text-rose-500 shrink-0" />
                                            <span className="select-none leading-none">{isClearing ? 'Clearing...' : 'Clear Allocation'}</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Selection breadcrumb */}
                    {(selectedSeries || selectedSession || selectedDate) && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-5 flex items-center gap-2 flex-wrap"
                        >
                            {selectedSeriesName && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-bold shadow-sm shadow-indigo-200">
                                    <BookOpen size={11} />
                                    {selectedSeriesName}
                                </span>
                            )}
                            {selectedSession && (
                                <>
                                    <ChevronRight size={14} className="text-slate-300" />
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold shadow-sm">
                                        {selectedSession === 'FN' ? <Sun size={11} className="text-amber-500" /> : <Moon size={11} className="text-indigo-500" />}
                                        {selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}
                                    </span>
                                </>
                            )}
                            {selectedDate && (
                                <>
                                    <ChevronRight size={14} className="text-slate-300" />
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold shadow-sm">
                                        <Calendar size={11} className="text-indigo-500" />
                                        {fmtDate(selectedDate)}
                                    </span>
                                </>
                            )}
                            {hasAllocation && (
                                <>
                                    <ChevronRight size={14} className="text-slate-300" />
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-black shadow-xs">
                                        <DoorOpen size={12} className="text-emerald-600" />
                                        {allottedRoomsCount} {allottedRoomsCount === 1 ? 'Class Allotted' : 'Classes Allotted'}
                                    </span>
                                </>
                            )}
                        </motion.div>
                    )}
                </div>

                {/* ── MAIN LAYOUT ── */}
                <div className="flex flex-col xl:flex-row gap-7 items-start">

                    {/* ═══════ LEFT SIDEBAR ═══════ */}
                    <div className="w-full xl:w-[360px] shrink-0 xl:sticky xl:top-6 z-10 flex flex-col gap-5">

                        {/* CONFIGURATION CARD */}
                        <div className="bg-white rounded-[22px] border border-slate-200/80 shadow-lg shadow-slate-100/50 overflow-hidden">
                            {/* Card Header */}
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                    <Settings2 size={15} className="text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-black text-slate-800">Exam Configuration</p>
                                    <p className="text-[10px] font-medium text-slate-400">Set series, session & date</p>
                                </div>
                            </div>

                            <div className="px-5 py-5 space-y-6">

                                {/* STEP 1: Series */}
                                <div className="space-y-3">
                                    <StepBadge num={1} color="bg-indigo-600" label="Select Series" />
                                    <Select
                                        aria-label="Exam Series"
                                        placeholder="Choose exam series..."
                                        variant="bordered"
                                        selectedKeys={seriesList.some(s => String(s.ExamSeriesID) === selectedSeries) ? [selectedSeries] : []}
                                        onSelectionChange={(k) => {
                                            const val = Array.from(k)[0] as string || '';
                                            setSelectedSeries(val);
                                            setSelectedSession('');
                                            setSelectedDate('');
                                        }}
                                        classNames={{
                                            trigger: "h-11 w-full flex justify-between items-center border-slate-200 bg-slate-50 rounded-xl text-[13px] font-semibold hover:border-indigo-400 transition-all relative overflow-hidden",
                                            value: "text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis flex-1 pr-6",
                                            innerWrapper: "w-full flex items-center justify-between",
                                            selectorIcon: "text-slate-400 absolute right-3 pointer-events-none",
                                            popoverContent: "bg-white border border-slate-200 shadow-xl rounded-xl p-1",
                                        }}
                                        listboxProps={{
                                            itemClasses: {
                                                base: "data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700 rounded-lg text-slate-700 font-medium"
                                            }
                                        }}
                                    >
                                        {seriesList.map(s => (
                                            <SelectItem key={String(s.ExamSeriesID)} className="text-[13px] font-medium">
                                                {s.SeriesName}
                                            </SelectItem>
                                        ))}
                                    </Select>
                                </div>

                                {/* STEP 2: Session — appears after series */}
                                <AnimatePresence>
                                    {selectedSeries && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, y: -8 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -8 }}
                                            transition={{ duration: 0.22 }}
                                            className="space-y-3 overflow-hidden"
                                        >
                                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                                            <StepBadge num={2} color="bg-emerald-600" label="Select Session" />
                                            <div className="grid grid-cols-2 gap-2.5">
                                                {(['FN', 'AN'] as const).map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => {
                                                            setSelectedSession(s);
                                                            setSelectedDate('');
                                                        }}
                                                        className={`flex items-center justify-center gap-2.5 py-3 rounded-xl text-[13px] font-bold transition-all border-2 ${selectedSession === s
                                                                ? s === 'FN'
                                                                    ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-sm'
                                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-white'
                                                            }`}
                                                    >
                                                        {s === 'FN'
                                                            ? <Sun size={15} className={selectedSession === s ? 'text-amber-500' : 'text-slate-400'} />
                                                            : <Moon size={15} className={selectedSession === s ? 'text-indigo-500' : 'text-slate-400'} />
                                                        }
                                                        <span>{s === 'FN' ? 'Forenoon' : 'Afternoon'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* STEP 3: Date — appears after session */}
                                <AnimatePresence>
                                    {selectedSeries && selectedSession && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, y: -8 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -8 }}
                                            transition={{ duration: 0.22 }}
                                            className="space-y-3 overflow-hidden"
                                        >
                                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                                            <StepBadge num={3} color="bg-violet-600" label="Select Date" />
                                            <Select
                                                aria-label="Exam Date"
                                                placeholder={examDates.length === 0 ? "No dates available..." : "Choose exam date..."}
                                                variant="bordered"
                                                selectedKeys={examDates.some(d => (typeof d === 'string' ? d : d.examDate) === selectedDate) ? [selectedDate] : []}
                                                isDisabled={examDates.length === 0}
                                                onSelectionChange={(k) => {
                                                    const val = Array.from(k)[0] as string;
                                                    if (val) setSelectedDate(val.split('-').slice(0, 3).join('-'));
                                                }}
                                                classNames={{
                                                    trigger: "h-11 w-full flex justify-between items-center border-slate-200 bg-slate-50 rounded-xl text-[13px] font-semibold hover:border-violet-400 transition-all relative overflow-hidden",
                                                    value: "text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis flex-1 pr-6",
                                                    innerWrapper: "w-full flex items-center justify-between",
                                                    selectorIcon: "text-slate-400 absolute right-3 pointer-events-none",
                                                    popoverContent: "bg-white border border-slate-200 shadow-xl rounded-xl p-1",
                                                }}
                                                listboxProps={{
                                                    itemClasses: {
                                                        base: "data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700 rounded-lg text-slate-700 font-medium"
                                                    }
                                                }}
                                            >
                                                {examDates.map((d: any) => {
                                                    const dStr = typeof d === 'string' ? d : d.examDate;
                                                    return (
                                                        <SelectItem key={dStr} className="text-[13px] font-medium">
                                                            {fmtDate(dStr)}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </Select>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* STEP 4: Engine & Halls — appears after date */}
                                <AnimatePresence>
                                    {selectionComplete && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, y: -8 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -8 }}
                                            transition={{ duration: 0.22 }}
                                            className="space-y-5 overflow-hidden"
                                        >
                                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                                            {/* Allocation Logic */}
                                            <div className="space-y-3">
                                                <StepBadge num={4} color="bg-amber-500" label="Allocation Engine" />
                                                <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-3.5">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Zap size={13} className="text-indigo-600" />
                                                        <span className="text-[12px] font-black text-indigo-900">Alternate Subject Logic</span>
                                                    </div>
                                                    <p className="text-[11px] text-indigo-700/70 font-medium leading-relaxed">
                                                        Different subjects are alternated on each bench for maximum exam integrity.
                                                    </p>
                                                </div>

                                                <div
                                                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group active:scale-[0.99]"
                                                    onClick={() => setShuffleRooms(!shuffleRooms)}
                                                >
                                                    <div>
                                                        <span className="text-[12px] font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Shuffle Room Order</span>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Randomize hall assignment sequence</p>
                                                    </div>
                                                    <div className={`w-9 h-5 rounded-full p-[3px] transition-all duration-300 ${shuffleRooms ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                                        <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-all duration-300 ${shuffleRooms ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                                            {/* Hall Selector */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <StepBadge num={5} color="bg-rose-500" label="Target Halls" />
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={selectAllHalls} className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-tight">All</button>
                                                        <span className="text-slate-200">|</span>
                                                        <button onClick={clearAllHalls} className="text-[10px] font-extrabold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-tight">Clear</button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center w-full h-9 rounded-xl border border-slate-200/90 bg-slate-50 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden px-3 gap-2">
                                                    <Search size={14} className="text-slate-400 shrink-0" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search halls..."
                                                        value={hallSearch}
                                                        onChange={e => setHallSearch(e.target.value)}
                                                        className="w-full h-full text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-0.5 scrollbar-hide">
                                                    {halls.filter(h => h.RoomCode.toLowerCase().includes(hallSearch.toLowerCase())).map(h => (
                                                        <button
                                                            key={h.RoomID}
                                                            onClick={() => toggleHall(h.RoomID)}
                                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${selectedHallIds.has(h.RoomID)
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                                                }`}
                                                        >
                                                            {h.RoomCode}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                                            {/* Execute */}
                                            <div className="space-y-2.5">
                                                <button
                                                    onClick={handleAutoRegister}
                                                    disabled={isAutoRegistering}
                                                    className="w-full h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px] font-bold hover:bg-amber-100 transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                                                >
                                                    <Users size={15} />
                                                    {isAutoRegistering ? 'Registering...' : 'Auto-Register Students'}
                                                </button>
                                                <button
                                                    onClick={handleGenerate}
                                                    disabled={isGenerating}
                                                    className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-[13px] font-black shadow-lg shadow-indigo-200 hover:from-indigo-500 hover:to-indigo-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                                >
                                                    <Rocket size={15} />
                                                    {isGenerating ? 'Generating...' : 'Generate Seating'}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* STATS CARD — visible when date is selected */}
                        <AnimatePresence>
                            {selectionComplete && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="bg-white rounded-[22px] border border-slate-200/80 shadow-lg shadow-slate-100/50 overflow-hidden"
                                >
                                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                            <Users size={15} className="text-emerald-600" />
                                        </div>
                                        <p className="text-[13px] font-black text-slate-800">Allocation Stats</p>
                                    </div>
                                    <div className="px-5 py-4 space-y-4">
                                        {/* Stats Row */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Classes Allotted */}
                                            {hasAllocation && (
                                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-3 text-center col-span-2 shadow-xs">
                                                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                                        <DoorOpen size={16} className="text-emerald-600" />
                                                        <p className="text-[24px] font-black text-emerald-600 leading-none">{allottedRoomsCount}</p>
                                                    </div>
                                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">
                                                        {allottedRoomsCount === 1 ? 'Class Allotted' : 'Classes Allotted'} ({allottedRoomsCount} of {hallSummary.length} Halls)
                                                    </p>
                                                </div>
                                            )}

                                            {/* Total Registered */}
                                            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-3 py-3 text-center col-span-2">
                                                <p className="text-[24px] font-black text-amber-600 leading-none">{registeredStudents.length}</p>
                                                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mt-1">Total Students</p>
                                            </div>

                                            <AnimatePresence>
                                                {hasAllocation && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                                        className="col-span-2 grid grid-cols-2 gap-3"
                                                    >
                                                        {/* Seated */}
                                                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-3 py-3 text-center">
                                                            <p className="text-[22px] font-black text-indigo-600 leading-none">{totalFilled}</p>
                                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Seated</p>
                                                        </div>
                                                        {/* Unassigned */}
                                                        <div className="bg-rose-50 border border-rose-100 rounded-2xl px-3 py-3 text-center">
                                                            <p className="text-[22px] font-black text-rose-500 leading-none">{Math.max(0, registeredStudents.length - totalFilled)}</p>
                                                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mt-1">Unassigned</p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Unassigned Department Breakdown */}
                                            <AnimatePresence>
                                                {hasAllocation && unassignedByDept.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="col-span-2 overflow-hidden"
                                                    >
                                                        <div className="bg-rose-50/60 border border-rose-100 rounded-2xl px-3 py-2.5">
                                                            <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-1.5">
                                                                Unassigned Departments
                                                            </p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {unassignedByDept.map(dept => (
                                                                    <span
                                                                        key={dept.code}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-rose-200/80 text-[10px] font-bold"
                                                                        title={dept.name}
                                                                    >
                                                                        <span className="text-rose-600">{dept.code}</span>
                                                                        {unassignedByDept.length > 1 && (
                                                                            <span className="text-rose-400 font-extrabold">{dept.count}</span>
                                                                        )}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Capacity */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-center col-span-2">
                                                <p className="text-[22px] font-black text-slate-600 leading-none">{totalCapacity}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Hall Capacity</p>
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                        <AnimatePresence>
                                            {hasAllocation && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[10px] font-bold text-slate-400">Fill Rate</span>
                                                        <span className="text-[11px] font-black text-indigo-600">
                                                            {totalCapacity > 0 ? Math.round((totalFilled / totalCapacity) * 100) : 0}%
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-700"
                                                            style={{ width: `${totalCapacity > 0 ? (totalFilled / totalCapacity) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        {/* View List Button */}
                                        {registeredStudents.length > 0 && (
                                            <button
                                                onClick={() => setShowStudentList(v => !v)}
                                                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] font-black hover:bg-indigo-100 transition-all"
                                            >
                                                <Users size={13} />
                                                {showStudentList ? 'Hide Student List' : 'View Student List'}
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ═══════ RIGHT MAIN PANEL ═══════ */}
                    <div className="flex-1 min-w-0 z-10">
                        {!selectionComplete ? (
                            /* EMPTY STATE */
                            <div className="flex flex-col items-center justify-center min-h-[520px] bg-white/70 backdrop-blur-xl rounded-[28px] border border-slate-200/80 border-dashed relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.04),transparent_70%)]" />
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    className="relative z-10 mb-8"
                                >
                                    <div className="w-24 h-24 bg-white rounded-[28px] shadow-xl border border-slate-100 flex items-center justify-center">
                                        <Calendar size={44} className="text-indigo-400" strokeWidth={1.2} />
                                    </div>
                                </motion.div>
                                <div className="relative z-10 text-center px-6">
                                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Configure to Get Started</h2>
                                    <p className="text-slate-400 font-medium max-w-[300px] mx-auto text-[13px] leading-relaxed">
                                        Select an <span className="text-indigo-600 font-bold">Exam Series</span>, then a <span className="text-indigo-600 font-bold">Session</span>, and finally an <span className="text-indigo-600 font-bold">Exam Date</span> to view hall allocations.
                                    </p>
                                    <div className="mt-6 flex items-center justify-center gap-3">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                                            <div className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center">1</div>
                                            <span className="text-[11px] font-bold text-indigo-700">Series</span>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-300" />
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                                            <div className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">2</div>
                                            <span className="text-[11px] font-bold text-emerald-700">Session</span>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-300" />
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-lg">
                                            <div className="w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center">3</div>
                                            <span className="text-[11px] font-bold text-violet-700">Date</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : loadingSummary ? (
                            /* LOADING STATE */
                            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[24px] border border-slate-200">
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                        <RefreshCw className="text-indigo-500 animate-spin" size={28} />
                                    </div>
                                </div>
                                <p className="font-black text-slate-700 text-[15px]">Synchronizing Hall Data</p>
                                <p className="text-slate-400 text-[12px] font-medium mt-1.5">Fetching seating distributions...</p>
                            </div>
                        ) : hallSummary.length > 0 ? (
                            /* HALL GRID */
                            <div>
                                {/* Hero Allocation Summary Hub */}
                                <div className="bg-white/90 backdrop-blur-md rounded-[24px] border border-slate-200/90 shadow-lg shadow-slate-100/60 p-5 sm:p-6 mb-6 transition-all">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                                        <div className="flex items-start sm:items-center gap-4">
                                            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                                                allottedRoomsCount > 0
                                                    ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-emerald-500/25'
                                                    : 'bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-indigo-100'
                                            }`}>
                                                <DoorOpen size={24} />
                                            </div>
                                            <div>
                                                {allottedRoomsCount > 0 ? (
                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                        <h2 className="text-[22px] font-black text-slate-900 tracking-tight leading-tight">
                                                            <span className="text-emerald-600 font-black">{allottedRoomsCount}</span> {allottedRoomsCount === 1 ? 'Class Allotted' : 'Classes Allotted'}
                                                        </h2>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                                                            {hallSummary.length > 0 ? `${Math.round((allottedRoomsCount / hallSummary.length) * 100)}% of Total Halls in Use` : '0%'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <h2 className="text-[20px] font-black text-slate-900 tracking-tight leading-tight">
                                                        {hallSummary.length} Halls Configured
                                                    </h2>
                                                )}
                                                <p className="text-[12px] font-medium text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                                    <span>for <strong className="text-slate-700 font-bold">{fmtDate(selectedDate)}</strong> · <strong className="text-slate-700 font-bold">{selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}</strong></span>
                                                    {allottedRoomsCount > 0 && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-indigo-600 font-bold">
                                                                {totalFilled} / {totalCapacity} Seats Seated ({totalCapacity > 0 ? Math.round((totalFilled / totalCapacity) * 100) : 0}% Occupancy)
                                                            </span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 self-start sm:self-end lg:self-center shrink-0 w-full sm:w-auto">
                                            <div className="flex items-center h-10 rounded-xl border border-slate-200 bg-slate-50/80 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3 gap-2 flex-1 sm:w-56">
                                                <Search size={14} className="text-slate-400 shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder="Search hall..."
                                                    value={hallSearch}
                                                    onChange={e => setHallSearch(e.target.value)}
                                                    className="w-full text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                                />
                                                {hallSearch && (
                                                    <button onClick={() => setHallSearch('')} className="text-slate-400 hover:text-slate-600">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={loadSummary}
                                                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[12px] font-extrabold text-slate-600 hover:text-indigo-600 border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
                                                title="Refresh Live Data"
                                            >
                                                <RefreshCw size={13} className={loadingSummary ? 'animate-spin text-indigo-600' : ''} />
                                                Refresh
                                            </button>
                                        </div>
                                    </div>

                                    {/* Status Filter Pills */}
                                    <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100/90 flex-wrap">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
                                        <button
                                            onClick={() => setRoomFilter('all')}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border cursor-pointer active:scale-95 ${
                                                roomFilter === 'all'
                                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            All ({hallSummary.length})
                                        </button>
                                        <button
                                            onClick={() => setRoomFilter('allotted')}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border cursor-pointer active:scale-95 ${
                                                roomFilter === 'allotted'
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                            }`}
                                        >
                                            🟢 Allotted ({allottedRoomsCount})
                                        </button>
                                        <button
                                            onClick={() => setRoomFilter('full')}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border cursor-pointer active:scale-95 ${
                                                roomFilter === 'full'
                                                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm shadow-emerald-200'
                                                    : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                            }`}
                                        >
                                            Fully Seated ({fullySeatedRoomsCount})
                                        </button>
                                        <button
                                            onClick={() => setRoomFilter('partial')}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border cursor-pointer active:scale-95 ${
                                                roomFilter === 'partial'
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                            }`}
                                        >
                                            Partial ({partialRoomsCount})
                                        </button>
                                        <button
                                            onClick={() => setRoomFilter('unassigned')}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border cursor-pointer active:scale-95 ${
                                                        roomFilter === 'unassigned'
                                                    ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                                                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                            }`}
                                        >
                                            Standby / Empty ({unallottedRoomsCount})
                                        </button>
                                    </div>
                                </div>

                                {visibleHalls.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center min-h-[280px] bg-white rounded-[22px] border border-slate-200 border-dashed p-8 text-center">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                                            <Search size={20} />
                                        </div>
                                        <h4 className="text-[14px] font-bold text-slate-700 mb-1">No matching halls found</h4>
                                        <p className="text-[12px] text-slate-400 max-w-[260px] mb-4">
                                            No halls matched the filter <span className="font-bold text-slate-600">"{roomFilter}"</span>
                                            {hallSearch ? ` or search "${hallSearch}"` : ''}.
                                        </p>
                                        <button
                                            onClick={() => { setRoomFilter('all'); setHallSearch(''); }}
                                            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100 transition-all"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {[...visibleHalls]
                                            .sort((a, b) => {
                                                const getRank = (h: any) => {
                                                    if (h.filledSeats >= h.totalSeats && h.filledSeats > 0) return 0; // Fully Seated
                                                    if (h.filledSeats > 0 && h.filledSeats < h.totalSeats) return 1;   // Partial
                                                    return 2;                                                         // Unassigned
                                                };
                                                const rankA = getRank(a);
                                                const rankB = getRank(b);
                                                if (rankA !== rankB) return rankA - rankB;
                                                return (a.hallCode || '').localeCompare(b.hallCode || '', undefined, { numeric: true, sensitivity: 'base' });
                                            })
                                            .map((h) => {
                                                const pct = h.totalSeats > 0 ? Math.round((h.filledSeats / h.totalSeats) * 100) : 0;
                                                const isFull = h.filledSeats >= h.totalSeats && h.filledSeats > 0;
                                                const isPartial = h.filledSeats > 0 && h.filledSeats < h.totalSeats;
                                                const isEmpty = h.filledSeats === 0;

                                                return (
                                                    <motion.div
                                                        key={h.hallId}
                                                        initial={{ opacity: 0, y: 12 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        <div className={`relative rounded-[22px] border p-5 transition-all duration-300 group cursor-pointer overflow-hidden ${isFull
                                                                ? 'bg-gradient-to-br from-emerald-50 to-emerald-50/30 border-emerald-200 shadow-md shadow-emerald-50 hover:shadow-emerald-100'
                                                                : isPartial
                                                                    ? 'bg-gradient-to-br from-indigo-50/60 to-white border-indigo-200 shadow-md shadow-indigo-50 hover:shadow-indigo-100'
                                                                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                                                            }`}>
                                                            {/* Glow effect */}
                                                            {!isEmpty && (
                                                                <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-[40px] pointer-events-none ${isFull ? 'bg-emerald-300/20' : 'bg-indigo-300/15'
                                                                    }`} />
                                                            )}

                                                            <div className="relative z-10">
                                                                {/* Header */}
                                                                <div className="flex items-start justify-between mb-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-all ${isFull
                                                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                                                                : isPartial
                                                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                                                    : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                                                                            }`}>
                                                                            <Armchair size={20} />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className={`text-[16px] font-black tracking-tight ${isFull ? 'text-emerald-900' : isPartial ? 'text-indigo-900' : 'text-slate-700'
                                                                                }`}>{h.hallCode}</h4>
                                                                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mt-0.5 ${isFull
                                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                                    : isPartial
                                                                                        ? 'bg-indigo-100 text-indigo-700'
                                                                                        : 'bg-slate-100 text-slate-400'
                                                                                }`}>
                                                                                {isFull ? 'Fully Seated' : isPartial ? 'Partial' : 'Unassigned'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Progress */}
                                                                <div className="mb-4">
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <span className="text-[11px] font-bold text-slate-500">Occupancy</span>
                                                                        <span className={`text-[11px] font-black ${isFull ? 'text-emerald-600' : isPartial ? 'text-indigo-600' : 'text-slate-400'}`}>{pct}%</span>
                                                                    </div>
                                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-emerald-500' : isPartial ? 'bg-indigo-500' : 'bg-slate-200'}`}
                                                                            style={{ width: `${pct}%` }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Footer */}
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <span className={`text-[20px] font-black ${isFull ? 'text-emerald-700' : isPartial ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                                            {h.filledSeats}
                                                                        </span>
                                                                        <span className="text-[12px] text-slate-400 font-bold"> / {h.totalSeats}</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => openHallDetail(h)}
                                                                        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer ${isFull
                                                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
                                                                                : isPartial
                                                                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
                                                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                                                            }`}
                                                                    >
                                                                        <Eye size={11} />
                                                                        View
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* NO ALLOCATIONS YET */
                            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[24px] border border-slate-200 border-dashed relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.03),transparent_70%)]" />
                                <div className="relative z-10 text-center px-6">
                                    <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                        <AlertCircle className="text-slate-300" size={32} />
                                    </div>
                                    <h3 className="font-black text-slate-700 text-[16px] mb-2">No Allocations Yet</h3>
                                    <p className="text-slate-400 text-[12px] font-medium max-w-[260px] mx-auto leading-relaxed">
                                        No hall assignments found for this session. Use the "Generate Seating" button to create allocations.
                                    </p>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-indigo-600 text-white text-[12px] font-black shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-60"
                                    >
                                        <Rocket size={14} />
                                        {isGenerating ? 'Generating...' : 'Generate Seating Now'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ═══ STUDENT LIST PANEL ═══ */}
                        <AnimatePresence>
                            {showStudentList && selectionComplete && registeredStudents.length > 0 && (() => {
                                const seatedIds = new Set(
                                    hallSummary.flatMap((h: any) => h.seatedStudentIds || [])
                                );
                                const filtered = registeredStudents.filter((s: any) => {
                                    const q = studentSearch.toLowerCase();
                                    return !q ||
                                        (s.Student?.FullName || s.FullName || '').toLowerCase().includes(q) ||
                                        (s.Student?.RegisterNumber || s.RegisterNumber || '').toLowerCase().includes(q) ||
                                        (s.Student?.Department?.DeptCode || s.DeptCode || '').toLowerCase().includes(q);
                                });
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 16 }}
                                        transition={{ duration: 0.25 }}
                                        className="mt-7 bg-white rounded-[24px] border border-slate-200 shadow-lg overflow-hidden"
                                    >
                                        {/* Header */}
                                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                                                    <Users size={15} className="text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-black text-slate-800">Registered Students</p>
                                                    <p className="text-[11px] text-slate-400 font-medium">
                                                        {filtered.length} of {registeredStudents.length} shown
                                                        {studentSearch && ` · filter: "${studentSearch}"`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    placeholder="Search name, reg no, dept..."
                                                    size="sm"
                                                    value={studentSearch}
                                                    onChange={e => setStudentSearch(e.target.value)}
                                                    classNames={{ inputWrapper: "h-9 border border-slate-200 bg-slate-50 rounded-xl shadow-none w-52" }}
                                                />
                                                <button
                                                    onClick={() => setShowStudentList(false)}
                                                    className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Stat pills */}
                                        <div className="px-6 py-3 flex items-center gap-3 border-b border-slate-50">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-100 text-[11px] font-black text-amber-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                Total: {registeredStudents.length}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-black text-indigo-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                Seated: {totalFilled}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 border border-rose-100 text-[11px] font-black text-rose-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                Unassigned: {Math.max(0, registeredStudents.length - totalFilled)}
                                            </span>
                                        </div>

                                        {/* Table */}
                                        <div className="overflow-auto max-h-[480px]">
                                            <table className="w-full">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-slate-50 border-b border-slate-100">
                                                        <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                                                        <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Register No</th>
                                                        <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                                        <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Dept / Batch</th>
                                                        <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
                                                        <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filtered.map((s: any, idx: number) => {
                                                        const regNo = s.Student?.RegisterNumber || s.RegisterNumber || '-';
                                                        const name = s.Student?.FullName || s.FullName || '-';
                                                        const dept = s.Student?.Department?.DeptCode || s.DeptCode || '-';
                                                        const subj = s.Exam?.SubjectCode || s.SubjectCode || '-';
                                                        const dStyle = getDeptStyle(dept);
                                                        const isSeated = s.isSeated ?? s.Student?.isSeated ?? false;
                                                        return (
                                                            <tr
                                                                key={idx}
                                                                className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
                                                            >
                                                                <td className="px-5 py-3 text-[11px] font-bold text-slate-300">{idx + 1}</td>
                                                                <td className="px-5 py-3">
                                                                    <span className="text-[12px] font-black text-slate-700">{regNo}</span>
                                                                </td>
                                                                <td className="px-5 py-3">
                                                                    <span className="text-[12px] font-semibold text-slate-600">{name}</span>
                                                                </td>
                                                                <td className="px-5 py-3">
                                                                    <span
                                                                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black border"
                                                                        style={{
                                                                            background: `${dStyle.dot}18`,
                                                                            borderColor: `${dStyle.dot}40`,
                                                                            color: dStyle.dot
                                                                        }}
                                                                    >
                                                                        {dept}
                                                                    </span>
                                                                </td>
                                                                <td className="px-5 py-3">
                                                                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{subj}</span>
                                                                </td>
                                                                <td className="px-5 py-3 text-center">
                                                                    {isSeated ? (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-600">
                                                                            <CheckCircle2 size={10} />
                                                                            Seated
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 text-[10px] font-black text-rose-500">
                                                                            <XCircle size={10} />
                                                                            Pending
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            {filtered.length === 0 && (
                                                <div className="py-12 text-center">
                                                    <p className="text-slate-400 font-bold text-[13px]">No students match your search</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })()}
                        </AnimatePresence>

                    </div>
                </div>
            </div>

            {/* ═══════ HALL DETAIL MODAL ═══════ */}
            <Modal
                isOpen={!!detailHall}
                onOpenChange={(open) => !open && setDetailHall(null)}
                size="full"
                backdrop="blur"
                classNames={{
                    backdrop: "bg-slate-950/85 backdrop-blur-2xl",
                    base: "max-w-[96vw] max-h-[94vh] m-auto rounded-[28px] bg-[#0b101d] border border-slate-800 shadow-2xl overflow-hidden flex flex-col",
                }}
            >
                <ModalContent className="bg-[#0b101d] text-white flex flex-col h-full overflow-hidden">
                    {() => (<>
                        <ModalHeader className="flex justify-between items-center px-8 py-5 border-b border-slate-800/80 bg-[#0f172a]/90 backdrop-blur-md text-white">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setDetailHall(null)}
                                    className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-sm"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-black text-white tracking-tight leading-none">{detailHall?.hallCode}</h2>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                            Blueprint View
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{fmtDate(selectedDate)}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">{selectedSession === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-900/90 rounded-2xl border border-slate-800">
                                    <span className="text-[11px] font-bold text-slate-400">Total Seated:</span>
                                    <span className="text-sm font-black text-emerald-400">{detailHall?.filledSeats || 0} / {detailHall?.totalSeats || 0}</span>
                                </div>
                                <button
                                    onClick={() => setDetailHall(null)}
                                    className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </ModalHeader>

                        <ModalBody
                            className="p-8 overflow-y-auto flex-1"
                            style={{
                                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.04) 1px, transparent 0)',
                                backgroundSize: '32px 32px',
                            }}
                        >
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center py-32">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                                        <RefreshCw className="animate-spin text-indigo-400" size={28} />
                                    </div>
                                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px]">Rendering Blueprint...</p>
                                </div>
                            ) : (
                                <div className="flex gap-10 justify-center items-start min-w-max pb-8">
                                    {(!detailHall?.layout?.rows || detailHall?.layout?.rows.length === 0) ? (
                                        <div className="flex flex-col items-center justify-center py-20 w-full">
                                            <AlertCircle className="text-slate-600 mb-4" size={48} />
                                            <p className="text-slate-500 font-bold">No seating layout configured for this hall</p>
                                        </div>
                                    ) : detailHall?.layout?.rows?.map((row: any) => {
                                        const isSingleMode = detailHall?.layout?.seatMode === 'Single' || detailHall?.layout?.room?.SeatMode === 'Single';
                                        return (
                                            <div key={row.rowLabel} className="flex flex-col items-center gap-5 shrink-0">
                                                {/* Column / Row Header */}
                                                <div className="w-12 h-12 bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600 rounded-2xl flex items-center justify-center shadow-lg shadow-black/40">
                                                    <span className="text-[17px] font-black text-white tracking-widest">{row.rowLabel}</span>
                                                </div>
                                                <div className="flex flex-col gap-3.5">
                                                    {row.benches.map((bench: any) => (
                                                        <div key={bench.benchNumber} className="flex gap-2.5 p-2 bg-slate-900/60 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner">
                                                            {(isSingleMode ? [bench.left] : [bench.left, bench.right]).map((seat: any, idx: number) => {
                                                                const isEmpty = !seat?.studentId;
                                                                const dStyle = getDeptStyle(seat?.deptCode);
                                                                const sStyle = getSubjectStyle(seat?.subjectCode);

                                                                return (
                                                                    <Tooltip
                                                                        key={idx}
                                                                        isDisabled={isEmpty}
                                                                        content={
                                                                            <div className="p-3.5 min-w-[220px] space-y-2">
                                                                                <div className="flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2">
                                                                                    <div>
                                                                                        <p className="font-black text-white text-[13px] leading-tight">{seat?.name}</p>
                                                                                        <p className="text-[10px] font-extrabold mt-0.5" style={{ color: dStyle.text }}>
                                                                                            {seat?.deptCode}{seat?.division ? ` (Div ${seat.division})` : ''}
                                                                                        </p>
                                                                                    </div>
                                                                                    <span
                                                                                        className="px-2 py-0.5 rounded text-[9.5px] font-mono font-black border uppercase shrink-0"
                                                                                        style={{ background: `${sStyle.dot}20`, borderColor: sStyle.border, color: sStyle.badgeText }}
                                                                                    >
                                                                                        {seat?.subjectCode}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="space-y-1 text-[11px] text-slate-300">
                                                                                    <p><span className="text-slate-400 font-bold">Subject:</span> <span className="font-semibold text-white">{seat?.subjectName || seat?.subjectCode}</span></p>
                                                                                    <p><span className="text-slate-400 font-bold">Reg No:</span> <span className="font-mono font-bold text-white">{seat?.registerNumber}</span></p>
                                                                                    {(seat?.rollNumber !== null && seat?.rollNumber !== undefined) && (
                                                                                        <p><span className="text-slate-400 font-bold">Roll No:</span> <span className="font-bold text-white">{seat?.rollNumber}</span></p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        }
                                                                        classNames={{ content: "bg-[#0a0f1d] border border-slate-700 p-0 rounded-2xl shadow-2xl" }}
                                                                    >
                                                                        {/* Seat Card — colored by dept fill & subject border */}
                                                                        <div
                                                                            className={`w-[114px] min-h-[160px] rounded-2xl border-2 flex flex-col items-center justify-between p-2 transition-all select-none ${isEmpty
                                                                                    ? 'bg-slate-900/30 border-slate-800/50 cursor-default'
                                                                                    : 'cursor-pointer hover:scale-105 hover:z-20 active:scale-95 shadow-md'
                                                                                }`}
                                                                            style={isEmpty ? {} : {
                                                                                background: `linear-gradient(160deg, ${dStyle.fill}f5 0%, #090e1a 100%)`,
                                                                                borderColor: sStyle.border,
                                                                                boxShadow: `0 0 18px ${sStyle.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`
                                                                            }}
                                                                        >
                                                                            {isEmpty ? (
                                                                                <div className="flex flex-col items-center justify-center h-full gap-1.5 opacity-30 py-6">
                                                                                    <div className="w-7 h-7 rounded-lg border-2 border-dashed border-slate-600" />
                                                                                    <span className="text-[10px] font-black text-slate-500">{isSingleMode ? 'EMPTY' : (idx === 0 ? 'LEFT' : 'RIGHT')}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    {/* 1. Top: Subject Name (small size with readable, visible format & matching color tone) */}
                                                                                    <div className="w-full text-center px-0.5 pt-0.5">
                                                                                        <span
                                                                                            className="text-[8.5px] font-black uppercase tracking-tight block truncate leading-tight"
                                                                                            style={{ color: sStyle.badgeText }}
                                                                                            title={seat.subjectName || seat.subjectCode}
                                                                                        >
                                                                                            {seat.subjectName || 'Exam Paper'}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* 2. Dept / Division Badge */}
                                                                                    <div className="w-full flex items-center justify-center my-0.5">
                                                                                        <span
                                                                                            className="w-full text-center text-[9px] font-black px-1.5 py-0.5 rounded-md truncate tracking-wider"
                                                                                            style={{ background: `${dStyle.dot}28`, color: dStyle.text, border: `1px solid ${dStyle.dot}40` }}
                                                                                            title={`${seat.deptCode}${seat.division ? ` (Div ${seat.division})` : ''}`}
                                                                                        >
                                                                                            {seat.deptCode}{seat.division ? ` · ${seat.division}` : ''}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* 3. Roll Number or Register Number (Large & prominent) */}
                                                                                    <div className="my-auto flex flex-col items-center justify-center py-1 w-full">
                                                                                        <span className="text-[17px] font-black text-white leading-none text-center tracking-tight drop-shadow-sm">
                                                                                            {seat.rollNumber !== null && seat.rollNumber !== undefined && String(seat.rollNumber).trim() !== ''
                                                                                                ? seat.rollNumber
                                                                                                : seat.registerNumber}
                                                                                        </span>
                                                                                        {seat.rollNumber !== null && seat.rollNumber !== undefined && String(seat.rollNumber).trim() !== '' && seat.registerNumber && (
                                                                                            <span className="text-[8.5px] font-mono font-bold text-slate-300 mt-1 tracking-tighter truncate max-w-[102px] opacity-85">
                                                                                                {seat.registerNumber}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* 4. Student Name */}
                                                                                    <span
                                                                                        className="text-[9.5px] font-extrabold leading-[1.2] text-center px-1 line-clamp-1 w-full truncate text-slate-100 mb-1"
                                                                                        title={seat.name}
                                                                                    >
                                                                                        {seat.name}
                                                                                    </span>

                                                                                    {/* 5. Bottom: Full Subject Code (never sliced, with subject border accent) */}
                                                                                    <div
                                                                                        className="w-full text-center px-1 py-1 rounded-md border text-[9.5px] font-black font-mono tracking-wide uppercase shadow-xs truncate"
                                                                                        style={{
                                                                                            background: 'rgba(15, 23, 42, 0.92)',
                                                                                            borderColor: `${sStyle.border}90`,
                                                                                            color: sStyle.badgeText,
                                                                                            boxShadow: `0 0 8px ${sStyle.glow}`
                                                                                        }}
                                                                                        title={`Subject Code: ${seat.subjectCode}`}
                                                                                    >
                                                                                        {seat.subjectCode || 'N/A'}
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </Tooltip>
                                                                );
                                                            })}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ModalBody>

                        <ModalFooter className="border-t border-slate-800/80 bg-[#0b101d] px-8 py-5 flex flex-col gap-4">
                            {/* Color Legends: Subject (Borders) & Department (Fill) */}
                            {detailHall?.layout?.rows && detailHall.layout.rows.length > 0 && (() => {
                                const deptLegend = buildDeptLegend(detailHall.layout.rows);
                                const subjLegend = buildSubjectLegend(detailHall.layout.rows);

                                return (
                                    <div className="space-y-2.5 pb-2 border-b border-slate-800/80">
                                        {/* Subject Border Legend */}
                                        {subjLegend.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] shrink-0">Subject Borders</span>
                                                {subjLegend.map(({ subjectCode, subjectName, style }) => (
                                                    <div
                                                        key={subjectCode}
                                                        className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-xl border"
                                                        style={{ borderColor: `${style.border}70` }}
                                                        title={subjectName ? `${subjectCode} — ${subjectName}` : subjectCode}
                                                    >
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: style.dot, boxShadow: `0 0 8px ${style.dot}` }} />
                                                        <span className="text-[11px] font-mono font-black uppercase tracking-wide" style={{ color: style.badgeText }}>{subjectCode}</span>
                                                        {subjectName && (
                                                            <span className="text-[10px] font-bold text-slate-400 max-w-[140px] truncate hidden md:inline">· {subjectName}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Dept Palette Legend & Empty Seat */}
                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] shrink-0">Dept Class Fill</span>
                                            {deptLegend.map(({ deptCode, style }) => (
                                                <div key={deptCode} className="flex items-center gap-2 bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-800">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: style.dot, boxShadow: `0 0 6px ${style.dot}80` }} />
                                                    <span className="text-[11px] font-black uppercase tracking-wide" style={{ color: style.text }}>{deptCode}</span>
                                                </div>
                                            ))}
                                            <div className="flex items-center gap-2 bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-800">
                                                <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-slate-600 shrink-0" />
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wide">Empty Seat</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Stats + Close */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Students Seated</span>
                                        <span className="text-2xl font-black text-white">{detailHall?.filledSeats || 0}</span>
                                    </div>
                                    <div className="w-px h-10 bg-slate-800" />
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Capacity</span>
                                        <span className="text-2xl font-black text-white">{detailHall?.totalSeats || 0}</span>
                                    </div>
                                    <div className="w-px h-10 bg-slate-800" />
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Fill Rate</span>
                                        <span className="text-2xl font-black text-emerald-400">
                                            {detailHall?.totalSeats > 0 ? Math.round(((detailHall?.filledSeats || 0) / detailHall.totalSeats) * 100) : 0}%
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailHall(null)}
                                    className="h-11 px-8 rounded-2xl bg-indigo-600 text-white font-black text-[13px] hover:bg-indigo-500 active:scale-98 transition-all shadow-lg shadow-indigo-900/40 select-none cursor-pointer"
                                >
                                    Close Blueprint
                                </button>
                            </div>
                        </ModalFooter>
                    </>)}
                </ModalContent>
            </Modal>

            {/* ═══════ CLEAR ALLOCATION CONFIRMATION MODAL ═══════ */}
            <Modal
                isOpen={isClearConfirmOpen}
                onOpenChange={setIsClearConfirmOpen}
                size="md"
                backdrop="blur"
                classNames={{
                    backdrop: "bg-black/50 backdrop-blur-md",
                    base: "rounded-[24px] bg-white border border-slate-200 shadow-2xl p-2 m-4",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex items-center gap-3 text-slate-900 font-extrabold text-[16px]">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                                    <Trash2 size={16} className="text-rose-500" />
                                </div>
                                Clear Seating Allocations
                            </ModalHeader>
                            <ModalBody className="py-4">
                                <div className="flex items-start gap-4 p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                                    <AlertCircle className="text-rose-500 mt-0.5 shrink-0" size={18} />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-800">Are you absolutely sure?</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            This will permanently clear all generated seat allocations for <span className="font-bold text-slate-700">{fmtDate(selectedDate)} — {selectedSession}</span>. This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="flex gap-3 justify-end">
                                <Button
                                    variant="flat"
                                    onPress={onClose}
                                    className="font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    color="danger"
                                    onPress={handleConfirmClear}
                                    className="bg-rose-600 text-white font-bold rounded-xl shadow-md shadow-rose-100 hover:bg-rose-700"
                                >
                                    Clear Allocation
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};

export default InternalSeatingPlans;
