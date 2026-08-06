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
    Zap,
    Rocket,
    Moon,
    Sun,
    ChevronRight,
    Settings2,
    Building2,
    Sparkles,
    BookOpen,
    Shield,
    Printer,
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { InternalSeatingService } from '../../services/internal/internalSeatingService';
import { SeatingService } from '../../services/seatingService';
import { InternalReportsService } from '../../services/internal/internalReportsService';

/* ── DEPT / BATCH COLOR PALETTE ── */
// Each entry has: fill (dark bg), border (accent border), text (label text), dot (solid dot color for legend)
const DEPT_PALETTE = [
    { fill: '#0f172a', border: '#6366f1', text: '#a5b4fc', dot: '#6366f1', label: 'Indigo'   }, // 0
    { fill: '#052e16', border: '#16a34a', text: '#4ade80', dot: '#22c55e', label: 'Green'    }, // 1
    { fill: '#2d1b69', border: '#7c3aed', text: '#c4b5fd', dot: '#8b5cf6', label: 'Violet'   }, // 2
    { fill: '#4a044e', border: '#d946ef', text: '#f5d0fe', dot: '#e879f9', label: 'Fuchsia'  }, // 3
    { fill: '#431407', border: '#ea580c', text: '#fdba74', dot: '#f97316', label: 'Orange'   }, // 4
    { fill: '#083344', border: '#0891b2', text: '#67e8f9', dot: '#06b6d4', label: 'Cyan'     }, // 5
    { fill: '#450a0a', border: '#dc2626', text: '#fca5a5', dot: '#ef4444', label: 'Red'      }, // 6
    { fill: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', dot: '#3b82f6', label: 'Blue'     }, // 7
    { fill: '#3b1f00', border: '#d97706', text: '#fcd34d', dot: '#f59e0b', label: 'Amber'    }, // 8
    { fill: '#1a1a2e', border: '#ec4899', text: '#f9a8d4', dot: '#ec4899', label: 'Pink'     }, // 9
    { fill: '#0d2d2a', border: '#14b8a6', text: '#5eead4', dot: '#14b8a6', label: 'Teal'     }, // 10
    { fill: '#2c1654', border: '#a855f7', text: '#e9d5ff', dot: '#a855f7', label: 'Purple'   }, // 11
];

// Stable color assignment keyed by dept code string
const getDeptStyle = (deptCode: string) => {
    if (!deptCode) return DEPT_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < deptCode.length; i++) hash = deptCode.charCodeAt(i) + ((hash << 5) - hash);
    return DEPT_PALETTE[Math.abs(hash) % DEPT_PALETTE.length];
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

            const roomsMap: Record<string, any[]> = {};
            data.forEach((alloc: any) => {
                const rCode = alloc.Seat?.Room?.RoomCode || 'Unknown';
                if (!roomsMap[rCode]) roomsMap[rCode] = [];
                roomsMap[rCode].push(alloc);
            });

            const wb = XLSXStyle.utils.book_new();
            const titleStyle = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } };
            const headerFill = { patternType: 'solid', fgColor: { rgb: '0F172A' } };
            const headerFont = { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 };
            const thinBorder = { style: 'thin', color: { rgb: 'B4C3D7' } };
            const allThin = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
            const bodyFont = { sz: 9, color: { rgb: '1E293B' } };
            const boldFont = { sz: 9, bold: true, color: { rgb: '1E293B' } };

            Object.entries(roomsMap).forEach(([roomCode, allocs]) => {
                const sheetData: any[][] = [];
                sheetData.push([{ v: `ROOM SEATING PLAN - ${roomCode}`, s: titleStyle }, '', '', '', '']);
                sheetData.push([{ v: `Date: ${fmtDate(selectedDate)} | Session: ${selectedSession}`, s: { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center' } } }, '', '', '', '']);
                sheetData.push(['', '', '', '', '']);

                sheetData.push(['Sl.No', 'Register Number', 'Student Name', 'Seat No', 'Branch'].map(v => ({
                    v, s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center' }, border: allThin }
                })));

                allocs.forEach((alloc: any, idx: number) => {
                    const seatNum = `${alloc.Seat?.RowLabel}${alloc.Seat?.BenchNumber}${alloc.Seat?.SeatNumber === 2 ? 'R' : alloc.Seat?.SeatNumber === 1 ? 'L' : ''}`;
                    sheetData.push([
                        { v: idx + 1, s: { font: bodyFont, border: allThin, alignment: { horizontal: 'center' } } },
                        { v: alloc.Student?.RegisterNumber || '', s: { font: boldFont, border: allThin, alignment: { horizontal: 'center' } } },
                        { v: alloc.Student?.FullName || '', s: { font: bodyFont, border: allThin } },
                        { v: seatNum, s: { font: boldFont, border: allThin, alignment: { horizontal: 'center' } } },
                        { v: alloc.Student?.Department?.DeptCode || '', s: { font: bodyFont, border: allThin, alignment: { horizontal: 'center' } } },
                    ]);
                });

                const ws = XLSXStyle.utils.aoa_to_sheet(sheetData);
                ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 15 }];
                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
                    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }
                ];
                XLSXStyle.utils.book_append_sheet(wb, ws, roomCode.substring(0, 31));
            });

            XLSXStyle.writeFile(wb, `RoomWise_Seating_${selectedDate}_${selectedSession}.xlsx`);
            toast.success('Room Wise Seating downloaded');
        } catch (e) {
            console.error(e);
            toast.error('Failed to export Room Wise Seating');
        } finally {
            setRoomDownloading(false);
        }
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

            const titleStyle = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } };
            const headerFill = { patternType: 'solid', fgColor: { rgb: '0F172A' } };
            const headerFont = { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 };
            const thinBorder = { style: 'thin', color: { rgb: 'B4C3D7' } };
            const allThin = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
            const bodyFont = { sz: 9, color: { rgb: '1E293B' } };
            const boldFont = { sz: 9, bold: true, color: { rgb: '1E293B' } };

            const sheetData: any[][] = [];
            sheetData.push([{ v: "CONSOLIDATED SEATING ARRANGEMENT", s: titleStyle }, '', '', '', '', '']);
            sheetData.push([{ v: `Date: ${fmtDate(selectedDate)} | Session: ${selectedSession}`, s: { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center' } } }, '', '', '', '', '']);
            sheetData.push(['', '', '', '', '', '']);

            sheetData.push(['Sl.No', 'Hall / Room No', 'Register Number', 'Student Name', 'Seat No', 'Branch'].map(v => ({
                v, s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center' }, border: allThin }
            })));

            data.forEach((alloc: any, idx: number) => {
                const seatNum = `${alloc.Seat?.RowLabel}${alloc.Seat?.BenchNumber}${alloc.Seat?.SeatNumber === 2 ? 'R' : alloc.Seat?.SeatNumber === 1 ? 'L' : ''}`;
                sheetData.push([
                    { v: idx + 1, s: { font: bodyFont, border: allThin, alignment: { horizontal: 'center' } } },
                    { v: alloc.Seat?.Room?.RoomCode || '', s: { font: boldFont, border: allThin, alignment: { horizontal: 'center' } } },
                    { v: alloc.Student?.RegisterNumber || '', s: { font: boldFont, border: allThin, alignment: { horizontal: 'center' } } },
                    { v: alloc.Student?.FullName || '', s: { font: bodyFont, border: allThin } },
                    { v: seatNum, s: { font: boldFont, border: allThin, alignment: { horizontal: 'center' } } },
                    { v: alloc.Student?.Department?.DeptCode || '', s: { font: bodyFont, border: allThin, alignment: { horizontal: 'center' } } },
                ]);
            });

            const ws = XLSXStyle.utils.aoa_to_sheet(sheetData);
            ws['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 15 }];
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
            ];

            const wb = XLSXStyle.utils.book_new();
            XLSXStyle.utils.book_append_sheet(wb, ws, 'Consolidated Seating');
            XLSXStyle.writeFile(wb, `Consolidated_Seating_${selectedDate}_${selectedSession}.xlsx`);
            toast.success('Consolidated Seating downloaded');
        } catch (e) {
            console.error(e);
            toast.error('Failed to export Consolidated Seating');
        } finally {
            setConsolidatedDownloading(false);
        }
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

            const subjectMap: Record<string, any[]> = {};
            data.forEach((alloc: any) => {
                const subName = alloc.Student?.Department?.DeptName || 'Other';
                if (!subjectMap[subName]) subjectMap[subName] = [];
                subjectMap[subName].push(alloc);
            });

            const wb = XLSXStyle.utils.book_new();
            const titleStyle = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } };
            const headerFill = { patternType: 'solid', fgColor: { rgb: '0F172A' } };
            const headerFont = { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 };
            const thinBorder = { style: 'thin', color: { rgb: 'B4C3D7' } };
            const allThin = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
            const bodyFont = { sz: 9, color: { rgb: '1E293B' } };
            const boldFont = { sz: 9, bold: true, color: { rgb: '1E293B' } };

            Object.entries(subjectMap).forEach(([subName, allocs]) => {
                const sheetData: any[][] = [];
                sheetData.push([{ v: `SUBJECT WISE SEATING PLAN - ${subName.toUpperCase()}`, s: titleStyle }, '', '', '', '']);
                sheetData.push([{ v: `Date: ${fmtDate(selectedDate)} | Session: ${selectedSession}`, s: { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center' } } }, '', '', '', '']);
                sheetData.push(['', '', '', '', '']);

                sheetData.push(['Sl.No', 'Register Number', 'Student Name', 'Hall / Room No', 'Seat No'].map(v => ({
                    v, s: { fill: headerFill, font: headerFont, alignment: { horizontal: 'center' }, border: allThin }
                })));

                allocs.forEach((alloc: any, idx: number) => {
                    const seatNum = `${alloc.Seat?.RowLabel}${alloc.Seat?.BenchNumber}${alloc.Seat?.SeatNumber === 2 ? 'R' : alloc.Seat?.SeatNumber === 1 ? 'L' : ''}`;
                    sheetData.push([
                        { v: idx + 1, s: { font: bodyFont, border: allThin, alignment: { horizontal: 'center' } } },
                        { v: alloc.Student?.RegisterNumber || '', s: { font: boldFont, border: allThin, alignment: { horizontal: 'center' } } },
                        { v: alloc.Student?.FullName || '', s: { font: bodyFont, border: allThin } },
                        { v: alloc.Seat?.Room?.RoomCode || '', s: { font: boldFont, border: allThin, alignment: { horizontal: 'center' } } },
                        { v: seatNum, s: { font: boldFont, border: allThin, alignment: { horizontal: 'center' } } },
                    ]);
                });

                const ws = XLSXStyle.utils.aoa_to_sheet(sheetData);
                ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 12 }];
                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
                    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }
                ];
                XLSXStyle.utils.book_append_sheet(wb, ws, subName.substring(0, 31));
            });

            XLSXStyle.writeFile(wb, `SubjectWise_Consolidated_${selectedDate}_${selectedSession}.xlsx`);
            toast.success('Batch Wise Seating downloaded');
        } catch (e) {
            console.error(e);
            toast.error('Failed to export Batch Wise Seating');
        } finally {
            setSubjectDownloading(false);
        }
    };

    const openHallDetail = async (hall: any) => {
        setDetailLoading(true);
        setDetailHall(hall);
        try {
            const detail = await InternalSeatingService.getHallLayout(hall.hallId, selectedDate, selectedSession, Number(selectedSeries));
            setDetailHall({ ...hall, layout: detail });
        } catch (e) {
            toast.error("Failed to load hall layout");
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
    const visibleHalls = hallSummary.filter(h => h.hallCode.toLowerCase().includes(hallSearch.toLowerCase()));

    const fmtDate = (d: string) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const selectedSeriesName = seriesList.find(s => String(s.ExamSeriesID) === selectedSeries)?.SeriesName || '';
    const hasAllocation = totalFilled > 0;
    const selectionComplete = !!selectedSeries && !!selectedSession && !!selectedDate;

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
                                    className="flex flex-wrap items-center gap-2.5 shrink-0"
                                >
                                    <button
                                        onClick={downloadRoomWiseExcel}
                                        disabled={roomDownloading}
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-bold hover:bg-emerald-100 transition-all shadow-sm disabled:opacity-60"
                                    >
                                        <FileDown size={14} />
                                        {roomDownloading ? 'Exporting...' : 'Room Wise'}
                                    </button>
                                    <button
                                        onClick={downloadConsolidatedExcel}
                                        disabled={consolidatedDownloading}
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[12px] font-bold hover:bg-indigo-100 transition-all shadow-sm disabled:opacity-60"
                                    >
                                        <FileDown size={14} />
                                        {consolidatedDownloading ? 'Exporting...' : 'Consolidated'}
                                    </button>
                                    <button
                                        onClick={downloadSubjectWiseExcel}
                                        disabled={subjectDownloading}
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 text-[12px] font-bold hover:bg-violet-100 transition-all shadow-sm disabled:opacity-60"
                                    >
                                        <FileDown size={14} />
                                        {subjectDownloading ? 'Exporting...' : 'Batch Wise'}
                                    </button>
                                    <div className="w-px h-6 bg-slate-200 mx-1" />
                                    <button
                                        onClick={handleClearClick}
                                        disabled={isClearing}
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-[12px] font-bold hover:bg-rose-100 transition-all shadow-sm disabled:opacity-60"
                                    >
                                        <Trash2 size={14} />
                                        {isClearing ? 'Clearing...' : 'Clear Allocation'}
                                    </button>
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
                                                        className={`flex items-center justify-center gap-2.5 py-3 rounded-xl text-[13px] font-bold transition-all border-2 ${
                                                            selectedSession === s
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
                                                <Input
                                                    placeholder="Search halls..."
                                                    size="sm"
                                                    value={hallSearch}
                                                    onChange={e => setHallSearch(e.target.value)}
                                                    classNames={{ inputWrapper: "h-9 border border-slate-200 bg-slate-50 rounded-lg shadow-none" }}
                                                />
                                                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-0.5 scrollbar-hide">
                                                    {halls.filter(h => h.RoomCode.toLowerCase().includes(hallSearch.toLowerCase())).map(h => (
                                                        <button
                                                            key={h.RoomID}
                                                            onClick={() => toggleHall(h.RoomID)}
                                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                                                selectedHallIds.has(h.RoomID)
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
                                {/* Summary bar */}
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h2 className="text-[15px] font-black text-slate-800">
                                            {hallSummary.length} Halls
                                            <span className="ml-2 text-[11px] font-bold text-slate-400 normal-case">for {fmtDate(selectedDate)} · {selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}</span>
                                        </h2>
                                    </div>
                                    <button
                                        onClick={loadSummary}
                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold text-slate-500 hover:text-indigo-600 border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                                    >
                                        <RefreshCw size={12} />
                                        Refresh
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[...hallSummary]
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
                                                    <div className={`relative rounded-[22px] border p-5 transition-all duration-300 group cursor-pointer overflow-hidden ${
                                                        isFull
                                                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-50/30 border-emerald-200 shadow-md shadow-emerald-50 hover:shadow-emerald-100'
                                                            : isPartial
                                                                ? 'bg-gradient-to-br from-indigo-50/60 to-white border-indigo-200 shadow-md shadow-indigo-50 hover:shadow-indigo-100'
                                                                : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                                                    }`}>
                                                        {/* Glow effect */}
                                                        {!isEmpty && (
                                                            <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-[40px] pointer-events-none ${
                                                                isFull ? 'bg-emerald-300/20' : 'bg-indigo-300/15'
                                                            }`} />
                                                        )}

                                                        <div className="relative z-10">
                                                            {/* Header */}
                                                            <div className="flex items-start justify-between mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-all ${
                                                                        isFull
                                                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                                                            : isPartial
                                                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                                                : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                                                                    }`}>
                                                                        <Armchair size={20} />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className={`text-[16px] font-black tracking-tight ${
                                                                            isFull ? 'text-emerald-900' : isPartial ? 'text-indigo-900' : 'text-slate-700'
                                                                        }`}>{h.hallCode}</h4>
                                                                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mt-0.5 ${
                                                                            isFull
                                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                                : isPartial
                                                                                    ? 'bg-indigo-100 text-indigo-700'
                                                                                    : 'bg-slate-100 text-slate-400'
                                                                        }`}>
                                                                            {isFull ? '✓ Fully Seated' : isPartial ? '⬤ Partial' : '○ Unassigned'}
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
                                                                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${
                                                                        isFull
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
                                                        const name  = s.Student?.FullName || s.FullName || '-';
                                                        const dept  = s.Student?.Department?.DeptCode || s.DeptCode || '-';
                                                        const subj  = s.Exam?.SubjectCode || s.SubjectCode || '-';
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
                    backdrop: "bg-black/70 backdrop-blur-xl",
                    base: "max-w-[96vw] max-h-[94vh] m-auto rounded-[28px] bg-[#0a0f1e] border border-slate-800/80 shadow-2xl overflow-hidden",
                }}
            >
                <ModalContent>
                    {() => (<>
                        <ModalHeader className="flex justify-between items-center px-8 py-5 border-b border-slate-800/80 bg-gradient-to-r from-[#0f172a] to-[#0a0f1e]">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setDetailHall(null)}
                                    className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                                <div>
                                    <h2 className="text-[18px] font-black text-white tracking-tight">{detailHall?.hallCode}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{fmtDate(selectedDate)}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{selectedSession === 'FN' ? 'Forenoon' : 'Afternoon'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-slate-900/80 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        <span className="text-[10px] font-bold text-slate-400">OCCUPIED</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                        <span className="text-[10px] font-bold text-slate-400">CONFLICT</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600" />
                                        <span className="text-[10px] font-bold text-slate-400">EMPTY</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailHall(null)}
                                    className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </ModalHeader>

                        <ModalBody
                            className="p-8 overflow-y-auto"
                            style={{
                                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)',
                                backgroundSize: '28px 28px',
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
                                <div className="flex gap-10 justify-center items-start min-w-max pb-12">
                                    {(!detailHall?.layout?.rows || detailHall?.layout?.rows.length === 0) ? (
                                        <div className="flex flex-col items-center justify-center py-20 w-full">
                                            <AlertCircle className="text-slate-600 mb-4" size={48} />
                                            <p className="text-slate-500 font-bold">No seating layout configured for this hall</p>
                                        </div>
                                    ) : detailHall?.layout?.rows?.map((row: any) => {
                                        const isSingleMode = detailHall?.layout?.seatMode === 'Single' || detailHall?.layout?.room?.SeatMode === 'Single';
                                        return (
                                            <div key={row.rowLabel} className="flex flex-col items-center gap-5 shrink-0">
                                                {/* Row Label */}
                                                <div className="px-5 py-2 bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600 rounded-xl shadow-lg">
                                                    <span className="text-[15px] font-black text-white tracking-widest">{row.rowLabel}</span>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    {row.benches.map((bench: any) => (
                                                        <div key={bench.benchNumber} className="flex gap-2.5 p-2 bg-slate-800/40 rounded-2xl border border-white/5 backdrop-blur-sm">
                                                            {(isSingleMode ? [bench.left] : [bench.left, bench.right]).map((seat: any, idx: number) => {
                                                                const isEmpty = !seat?.studentId;
                                                                const dStyle = getDeptStyle(seat?.deptCode);

                                                                return (
                                                                    <Tooltip
                                                                        key={idx}
                                                                        isDisabled={isEmpty}
                                                                        content={
                                                                            <div className="p-3 min-w-[160px]">
                                                                                <p className="font-black text-white text-[13px] mb-1 leading-tight">{seat?.name}</p>
                                                                                <div className="space-y-1 mt-2">
                                                                                    <p className="text-[10px] text-slate-300"><span className="text-slate-500 font-bold">Reg No :</span> {seat?.registerNumber}</p>
                                                                                    {(seat?.rollNumber !== null && seat?.rollNumber !== undefined) && (
                                                                                        <p className="text-[10px] text-slate-300"><span className="text-slate-500 font-bold">Roll No:</span> {seat?.rollNumber}</p>
                                                                                    )}
                                                                                    <p className="text-[10px] text-slate-300"><span className="text-slate-500 font-bold">Dept    :</span> {seat?.deptCode}{seat?.division ? ` (Div ${seat.division})` : ''}</p>
                                                                                    <p className="text-[10px] text-slate-300"><span className="text-slate-500 font-bold">Subject :</span> {seat?.subjectCode}</p>
                                                                                </div>
                                                                                <div className="mt-2 pt-2 border-t border-slate-700 flex items-center gap-1.5">
                                                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dStyle.dot }} />
                                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{seat?.deptCode}{seat?.division ? ` - ${seat.division}` : ''}</span>
                                                                                </div>
                                                                            </div>
                                                                        }
                                                                        classNames={{ content: "bg-[#0f172a] border border-slate-700 p-0 rounded-2xl shadow-2xl" }}
                                                                    >
                                                                        {/* Seat Card — colored by dept */}
                                                                        <div
                                                                            className={`w-[78px] h-[108px] rounded-2xl border-2 flex flex-col items-center justify-start pt-2 pb-1.5 px-1 transition-all select-none ${
                                                                                isEmpty
                                                                                    ? 'bg-slate-900/40 border-slate-800/60 cursor-default'
                                                                                    : 'cursor-pointer hover:scale-105 hover:z-10 active:scale-95 shadow-lg'
                                                                            }`}
                                                                            style={isEmpty ? {} : {
                                                                                background: `linear-gradient(160deg, ${dStyle.fill}ee 0%, ${dStyle.fill}99 100%)`,
                                                                                borderColor: dStyle.border,
                                                                                boxShadow: `0 0 18px ${dStyle.dot}30, inset 0 1px 0 rgba(255,255,255,0.06)`
                                                                            }}
                                                                        >
                                                                            {isEmpty ? (
                                                                                <div className="flex flex-col items-center justify-center h-full gap-1 opacity-25">
                                                                                    <div className="w-6 h-6 rounded-lg border-2 border-dashed border-slate-600" />
                                                                                    <span className="text-[8px] font-black text-slate-500">{isSingleMode ? 'EMPTY' : (idx === 0 ? 'L' : 'R')}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    {/* Dept badge */}
                                                                                    <span
                                                                                        className="w-full text-center text-[8px] font-black px-1 py-0.5 rounded-lg mb-1"
                                                                                        style={{ background: `${dStyle.dot}30`, color: dStyle.text }}
                                                                                    >
                                                                                        {seat.deptCode}
                                                                                    </span>
                                                                                    {/* Roll Number or Register Number */}
                                                                                    <span className="text-[11px] font-black text-white leading-tight text-center px-0.5 break-all">
                                                                                        {seat.rollNumber !== null && seat.rollNumber !== undefined && String(seat.rollNumber).trim() !== ''
                                                                                            ? seat.rollNumber
                                                                                            : seat.registerNumber}
                                                                                    </span>
                                                                                    {/* Student name */}
                                                                                    <span className="text-[7px] font-semibold mt-1 leading-[1.2] text-center px-0.5 line-clamp-2" style={{ color: dStyle.text }}>
                                                                                        {seat.name}
                                                                                    </span>
                                                                                    {/* Subject code chip */}
                                                                                    <span
                                                                                        className="mt-auto text-[7px] font-black px-1.5 py-0.5 rounded-md w-full text-center"
                                                                                        style={{ background: 'rgba(0,0,0,0.35)', color: 'rgba(255,255,255,0.6)' }}
                                                                                    >
                                                                                        {seat.subjectCode?.slice(0, 6)}
                                                                                    </span>
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

                        <ModalFooter className="border-t border-slate-800/80 bg-[#0a0f1e] px-6 py-4 flex flex-col gap-4">
                            {/* Dept/Batch Color Legend */}
                            {detailHall?.layout?.rows && detailHall.layout.rows.length > 0 && (() => {
                                const legend = buildDeptLegend(detailHall.layout.rows);
                                return legend.length > 0 ? (
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-3 border-b border-slate-800">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] shrink-0">Dept / Batch</span>
                                        {legend.map(({ deptCode, style }) => (
                                            <div key={deptCode} className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ background: style.dot, boxShadow: `0 0 6px ${style.dot}80` }} />
                                                <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: style.text }}>{deptCode}</span>
                                            </div>
                                        ))}
                                        {/* Empty seat legend */}
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-full border-2 border-dashed border-slate-700 shrink-0" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">Empty</span>
                                        </div>
                                    </div>
                                ) : null;
                            })()}

                            {/* Stats + Close */}
                            <div className="flex items-center justify-between">
                                <div className="flex gap-8">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Students Seated</span>
                                        <span className="text-2xl font-black text-white">{detailHall?.filledSeats || 0}</span>
                                    </div>
                                    <div className="w-px h-10 bg-slate-800" />
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Total Capacity</span>
                                        <span className="text-2xl font-black text-white">{detailHall?.totalSeats || 0}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailHall(null)}
                                    className="h-11 px-8 rounded-2xl bg-indigo-600 text-white font-black text-[13px] hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/30"
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
