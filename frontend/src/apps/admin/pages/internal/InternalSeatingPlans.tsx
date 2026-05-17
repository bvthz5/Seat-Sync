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
    Zap,
    Rocket,
    Moon,
    Sun,
    MoreVertical,
    Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { InternalSeatingService } from '../../services/internal/internalSeatingService';
import { SeatingService } from '../../services/seatingService';

/* ── STYLING CONSTANTS ── */
const SUBJECT_HUE_PALETTE = [
    { fill: '#1e1b4b', border: '#4338ca', text: '#818cf8' }, // Indigo
    { fill: '#064e3b', border: '#059669', text: '#34d399' }, // Emerald
    { fill: '#4c1d95', border: '#7c3aed', text: '#a78bfa' }, // Violet
    { fill: '#701a75', border: '#d946ef', text: '#f0abfc' }, // Fuchsia
    { fill: '#451a03', border: '#d97706', text: '#fbbf24' }, // Amber
    { fill: '#164e63', border: '#0891b2', text: '#67e8f9' }, // Cyan
    { fill: '#500724', border: '#e11d48', text: '#fb7185' }, // Rose
    { fill: '#172554', border: '#2563eb', text: '#60a5fa' }, // Blue
];

const DARK_DEPT_COLORS: Record<string, string> = {
    'CS': '#818cf8', 'AD': '#c084fc', 'EC': '#f472b6', 'ME': '#fb923c', 'CE': '#fbbf24', 'EE': '#34d399', 'IT': '#2dd4bf'
};

const getSubjectStyle = (code: string) => {
    if (!code) return SUBJECT_HUE_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
    return SUBJECT_HUE_PALETTE[Math.abs(hash) % SUBJECT_HUE_PALETTE.length];
};

/* ── COMPONENT ── */
const InternalSeatingPlans: React.FC = () => {
    // --- State ---
    const [seriesList, setSeriesList] = useState<any[]>([]);
    const [availableSessions, setAvailableSessions] = useState<string[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<string>(() => {
        const val = localStorage.getItem('internal_seating_selectedSeries');
        return (val && val !== 'undefined') ? val : '';
    });
    const [examDates, setExamDates] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const val = localStorage.getItem('internal_seating_selectedDate');
        if (val && val !== 'undefined') {
            // Ensure we only keep the date part YYYY-MM-DD
            return val.split('-').slice(0, 3).join('-');
        }
        return '';
    });
    const [selectedSession, setSelectedSession] = useState<string>(() => {
        const val = localStorage.getItem('internal_seating_selectedSession');
        return (val && val !== 'undefined') ? val : '';
    });

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

    // Detail Modal State
    const [detailHall, setDetailHall] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [hideIneligible, setHideIneligible] = useState(false);
    const isInitialMount = useRef(true);

    // --- Persist Selections ---
    useEffect(() => { if (selectedSeries && selectedSeries !== 'undefined') localStorage.setItem('internal_seating_selectedSeries', selectedSeries); }, [selectedSeries]);
    useEffect(() => { if (selectedDate && selectedDate !== 'undefined') localStorage.setItem('internal_seating_selectedDate', selectedDate); }, [selectedDate]);
    useEffect(() => { if (selectedSession && selectedSession !== 'undefined') localStorage.setItem('internal_seating_selectedSession', selectedSession); }, [selectedSession]);

    // --- Initial Load ---
    useEffect(() => {
        (async () => {
            try {
                const [seriesRes, deptsRes] = await Promise.all([
                    SeatingService.getSeries('Internal'),
                    SeatingService.getDepartments()
                ]);
                
                // Handle different response formats (raw array or { success, data })
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

    // --- Render ---
    return (
        <div className="pb-12 bg-[#f6f8ff] min-h-[calc(100vh-3.5rem)] font-sans text-slate-700 antialiased selection:bg-indigo-100 selection:text-indigo-900 relative overflow-x-hidden">
            {/* Ambient background decoration - Mesh Gradient Effect */}
            <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-100/40 blur-[140px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-50/60 blur-[120px] pointer-events-none" />
            <div className="absolute top-[20%] left-[10%] w-[30vw] h-[30vw] rounded-full bg-purple-50/30 blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="pt-8 px-8 max-w-[1920px] mx-auto relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-slate-200">
                    <div>
                        <h1 className="text-[28px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight flex items-center gap-3">
                            <span className="w-2.5 h-8 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full shadow-sm"></span>
                            Internal Seating Management
                        </h1>
                        <p className="text-slate-500 text-[14px] font-medium mt-2 max-w-2xl leading-relaxed">
                            Configure series-specific seating layouts and automate student assignments with enterprise-grade logic.
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-8 py-6 max-w-[1920px] mx-auto">
                <div className="flex flex-col xl:flex-row gap-8 items-start">
                    
                    {/* ═══════ LEFT PANEL: WIZARD ═══════ */}
                    <div className="w-full xl:w-[400px] shrink-0 xl:sticky xl:top-2 z-10 flex flex-col gap-4">
                        <Card className="border border-slate-200 shadow-xl bg-white/95 backdrop-blur-2xl rounded-[24px] overflow-hidden">
                            <CardBody className="px-5 py-5 flex flex-col gap-5">
                                
                                {/* STEP 1: Slot Selection */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">1</span>
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Select Exam</span>
                                    </div>
                                    
                                    <Select aria-label="Exam Series" placeholder="Select Series" variant="bordered"
                                        selectedKeys={seriesList.some(s => String(s.ExamSeriesID) === selectedSeries) ? [selectedSeries] : []}
                                        onSelectionChange={(k) => setSelectedSeries(Array.from(k)[0] as string || '')}
                                        classNames={{ 
                                            trigger: "h-11 border-slate-200 bg-white rounded-xl text-[13px] font-semibold transition-all hover:border-indigo-400 overflow-hidden",
                                            value: "text-slate-700 pr-6",
                                            selectorIcon: "right-3 text-slate-400",
                                            popoverContent: "bg-white border border-slate-200 shadow-2xl rounded-2xl"
                                        }}
                                        popoverProps={{
                                            classNames: {
                                                content: "p-1 bg-white border-none shadow-none"
                                            }
                                        }}
                                    >
                                        {seriesList.map(s => <SelectItem key={String(s.ExamSeriesID)} className="text-[13px] font-medium rounded-lg hover:bg-white/20">{s.SeriesName}</SelectItem>)}
                                    </Select>

                                    <div className="grid grid-cols-2 gap-2">
                                        {(['FN', 'AN'] as const).map(s => (
                                            <button key={s} onClick={() => setSelectedSession(s)}
                                                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-bold transition-all border-2 ${selectedSession === s 
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300' 
                                                    : 'bg-white text-slate-500 border-slate-200'}`}>
                                                {s === 'FN' ? <Sun size={14} /> : <Moon size={14} />} {s}
                                            </button>
                                        ))}
                                    </div>

                                    <Select aria-label="Exam Date" placeholder="Select Date" variant="bordered"
                                        selectedKeys={examDates.some(d => (typeof d === 'string' ? d : d.examDate) === selectedDate) ? [selectedDate] : []}
                                        isDisabled={!selectedSeries || examDates.length === 0}
                                        onSelectionChange={(k) => {
                                            const val = Array.from(k)[0] as string;
                                            if (val) setSelectedDate(val.split('-').slice(0, 3).join('-'));
                                        }}
                                        classNames={{ 
                                            trigger: "h-11 border-slate-200 bg-white rounded-xl text-[13px] font-semibold transition-all hover:border-indigo-400 overflow-hidden",
                                            value: "text-slate-700 pr-6",
                                            selectorIcon: "right-3 text-slate-400",
                                            popoverContent: "bg-white border border-slate-200 shadow-2xl rounded-2xl"
                                        }}
                                        popoverProps={{
                                            classNames: {
                                                content: "p-1 bg-white border-none shadow-none"
                                            }
                                        }}
                                    >
                                        {examDates.map((d: any) => {
                                            const dStr = typeof d === 'string' ? d : d.examDate;
                                            return <SelectItem key={dStr} className="text-[13px] font-medium rounded-lg hover:bg-white/20">{fmtDate(dStr)}</SelectItem>;
                                        })}
                                    </Select>
                                </div>

                                <div className="h-px bg-slate-100" />

                                {/* STEP 2: Logic Selection */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">2</span>
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Allocation Engine</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Zap size={14} className="text-indigo-600" />
                                            <span className="text-[13px] font-bold text-indigo-900">Alternate Subject Logic</span>
                                        </div>
                                        <p className="text-[11px] text-indigo-700/70 font-medium leading-relaxed">
                                            Students from different subjects will be seated together on each bench to ensure maximum integrity.
                                        </p>
                                    </div>

                                    <div 
                                        className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:border-indigo-300 group cursor-pointer active:scale-[0.98]"
                                        onClick={() => setShuffleRooms(!shuffleRooms)}
                                    >
                                        <span className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Shuffle Room Order</span>
                                        <div className={`w-10 h-5.5 rounded-full p-1 transition-all duration-300 ease-in-out ${shuffleRooms ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                            <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transform transition-all duration-300 ease-in-out ${shuffleRooms ? 'translate-x-4.5' : 'translate-x-0'}`} />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100" />

                                {/* STEP 3: Hall Selection */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">3</span>
                                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Target Halls</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={selectAllHalls} className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-tight">Select All</button>
                                            <button onClick={clearAllHalls} className="text-[10px] font-extrabold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-tight">Undo All</button>
                                        </div>
                                    </div>
                                    <Input placeholder="Search halls..." size="sm" value={hallSearch} onChange={e => setHallSearch(e.target.value)}
                                        classNames={{ inputWrapper: "h-9 border border-slate-200 bg-white rounded-lg" }} />
                                    
                                    <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                                        {halls.filter(h => h.RoomCode.toLowerCase().includes(hallSearch.toLowerCase())).map(h => (
                                            <button key={h.RoomID} onClick={() => toggleHall(h.RoomID)}
                                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedHallIds.has(h.RoomID) 
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
                                                {h.RoomCode}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100" />

                                {/* STEP 4: Actions */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">4</span>
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Execute</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button onPress={handleGenerate} isLoading={isGenerating}
                                            className="w-full h-11 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100">
                                            Generate Seating
                                        </Button>
                                        <Button onPress={handleAutoRegister} isLoading={isAutoRegistering} variant="flat"
                                            className="w-full h-11 font-bold rounded-xl border border-warning/20">
                                            Auto-Register Students
                                        </Button>
                                    </div>
                                </div>

                            </CardBody>
                        </Card>

                        {/* Quick Stats Bar */}
                        {selectedDate && (
                            <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-center">
                                        <p className="text-[14px] font-black text-indigo-600 leading-none">{totalFilled}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Seated</p>
                                    </div>
                                    <div className="h-6 w-px bg-slate-100" />
                                    <div className="text-center">
                                        <p className="text-[14px] font-black text-slate-700 leading-none">{totalCapacity}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Capacity</p>
                                    </div>
                                </div>
                                <Progress value={totalCapacity > 0 ? (totalFilled/totalCapacity)*100 : 0} size="sm" className="w-24"
                                    classNames={{ indicator: "bg-indigo-500 rounded-full", track: "bg-slate-100" }} />
                            </div>
                        )}
                    </div>

                    {/* ═══════ RIGHT PANEL: HALL GRID ═══════ */}
                    <div className="flex-1 min-w-0 z-10">
                        {selectedDate ? (
                            loadingSummary ? (
                                <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[24px] border border-slate-200">
                                    <RefreshCw className="text-indigo-500 animate-spin mb-4" size={32} />
                                    <p className="font-bold text-slate-800">Synchronizing Hall Data...</p>
                                </div>
                            ) : hallSummary.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[...hallSummary]
                                        .sort((a, b) => {
                                            // Allocated rooms (filledSeats > 0) first
                                            if ((b.filledSeats > 0 ? 1 : 0) - (a.filledSeats > 0 ? 1 : 0) !== 0)
                                                return (b.filledSeats > 0 ? 1 : 0) - (a.filledSeats > 0 ? 1 : 0);
                                            // Secondary sort: by hallCode
                                            return a.hallCode.localeCompare(b.hallCode);
                                        })
                                        .map((h) => {
                                            const pct = h.totalSeats > 0 ? Math.round((h.filledSeats / h.totalSeats) * 100) : 0;
                                            return (
                                                <motion.div key={h.hallId} whileHover={{ y: -4 }}>
                                                    <Card className="p-6 border border-slate-200 bg-white/80 backdrop-blur-md rounded-[20px] shadow-sm hover:shadow-xl transition-all group">
                                                        <div className="flex items-center gap-4 mb-5">
                                                            <div className="w-12 h-12 rounded-[14px] bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                                                                <Armchair size={22} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-[17px] font-bold text-slate-800">{h.hallCode}</h4>
                                                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Internal Hall</p>
                                                            </div>
                                                        </div>
                                                        <Progress value={pct} size="sm" color={pct >= 100 ? 'success' : pct > 0 ? 'warning' : 'default'} className="mb-4" />
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className="text-[16px] font-black text-slate-800">{h.filledSeats}</span>
                                                                <span className="text-[11px] text-slate-400 font-bold"> / {h.totalSeats}</span>
                                                            </div>
                                                            <Button size="sm" onPress={() => openHallDetail(h)}
                                                                className="bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 font-bold text-[10px] uppercase tracking-widest px-3 rounded-lg h-8">
                                                                <Eye size={12} className="mr-1" /> View
                                                            </Button>
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[24px] border border-slate-200 border-dashed">
                                    <AlertCircle className="text-slate-300 mb-4" size={48} />
                                    <p className="font-bold text-slate-500">No Hall Assignments Yet</p>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[500px] bg-white/50 backdrop-blur-xl rounded-[32px] border border-slate-200 border-dashed relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent)] pointer-events-none" />
                                <div className="p-8 bg-white rounded-[32px] shadow-2xl border border-slate-100 mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <Calendar className="text-indigo-500" size={64} strokeWidth={1} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 mb-3">Initialize Seating View</h2>
                                <p className="text-slate-500 font-medium max-w-[320px] text-center leading-relaxed">
                                    Select an <span className="text-indigo-600 font-bold">Exam Series</span> and <span className="text-indigo-600 font-bold">Date</span> from the control panel to view seating distributions.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════ HALL DETAIL MODAL ═══════ */}
            <Modal isOpen={!!detailHall} onOpenChange={(open) => !open && setDetailHall(null)} size="full" backdrop="blur"
                classNames={{
                    backdrop: "bg-black/60 backdrop-blur-xl",
                    base: "max-w-[96vw] max-h-[94vh] m-auto rounded-[24px] bg-[#0f172a] border border-slate-800 shadow-2xl overflow-hidden"
                }}>
                <ModalContent>
                    {() => (<>
                        <ModalHeader className="flex justify-between items-center px-8 py-4 border-b border-slate-800 bg-[#1e293b]/50">
                            <div className="flex items-center gap-5">
                                <Button isIconOnly variant="light" className="text-slate-400 hover:text-white" onPress={() => setDetailHall(null)}>
                                    <ArrowLeft size={18} />
                                </Button>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">{detailHall?.hallCode}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{fmtDate(selectedDate)}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{selectedSession}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-slate-900/80 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> <span className="text-[10px] font-bold text-slate-400">NORMAL</span></div>
                                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> <span className="text-[10px] font-bold text-slate-400">CONFLICT</span></div>
                                </div>
                                <Button onPress={() => setDetailHall(null)} className="bg-rose-500/10 text-rose-500 font-black text-[11px] rounded-lg">CLOSE</Button>
                            </div>
                        </ModalHeader>

                        <ModalBody className="p-8 overflow-y-auto scrollbar-hide" style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
                            backgroundSize: '32px 32px'
                        }}>
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center py-32">
                                    <RefreshCw className="animate-spin text-indigo-500 mb-4" size={48} />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest">Rendering Blueprint...</p>
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
                                            <div key={row.rowLabel} className="flex flex-col items-center gap-6 shrink-0">
                                                <div className="px-6 py-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl">
                                                    <span className="text-lg font-black text-white">{row.rowLabel}</span>
                                                </div>
                                                <div className="flex flex-col gap-4">
                                                    {row.benches.map((bench: any) => (
                                                        <div key={bench.benchNumber} className="flex gap-3 p-2 bg-slate-800/30 rounded-2xl border border-white/5 backdrop-blur-sm">
                                                            {(isSingleMode ? [bench.left] : [bench.left, bench.right]).map((seat, idx) => {
                                                                const isEmpty = !seat?.studentId;
                                                                const sStyle = getSubjectStyle(seat?.subjectCode);
                                                                
                                                                return (
                                                                    <Tooltip key={idx} isDisabled={isEmpty} content={
                                                                        <div className="p-3">
                                                                            <p className="font-black text-indigo-400 text-xs">{seat?.name}</p>
                                                                            <p className="text-[10px] text-white opacity-80 mt-1">Reg: {seat?.registerNumber}</p>
                                                                            <p className="text-[10px] text-white opacity-80">Dept: {seat?.deptCode}</p>
                                                                        </div>
                                                                    } classNames={{ content: "bg-slate-900 border border-slate-800 p-0 rounded-xl shadow-2xl" }}>
                                                                        <div className={`w-20 h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${isEmpty 
                                                                            ? 'bg-slate-900/50 border-slate-800 text-slate-700' 
                                                                            : 'shadow-lg hover:scale-110 active:scale-95'}`}
                                                                            style={isEmpty ? {} : { 
                                                                                backgroundColor: `${sStyle.fill}40`, 
                                                                                borderColor: sStyle.border,
                                                                                boxShadow: `0 0 20px ${sStyle.fill}20`
                                                                            }}>
                                                                            {isEmpty ? (
                                                                                <span className="text-[10px] font-black opacity-20">{isSingleMode ? '' : (idx === 0 ? 'L' : 'R')}</span>
                                                                            ) : (
                                                                                    <>
                                                                                        <span className="text-[8px] font-black mb-1 px-1.5 py-0.5 rounded bg-black/40" style={{ color: sStyle.text }}>{seat.subjectCode?.slice(0, 4)}</span>
                                                                                        <span className="text-[10px] font-black text-white px-1 leading-tight text-center">{seat.registerNumber}</span>
                                                                                        <div className="mt-1 w-full px-1 flex flex-col items-center">
                                                                                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter text-center leading-[1.1] line-clamp-2">
                                                                                                {seat.name}
                                                                                            </span>
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
                        <ModalFooter className="border-t border-slate-800 bg-[#0f172a] p-6 flex justify-between items-center">
                            <div className="flex gap-8">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Students</span>
                                    <span className="text-xl font-black text-white">{detailHall?.filledSeats || 0}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Capacity</span>
                                    <span className="text-xl font-black text-white">{detailHall?.totalSeats || 0}</span>
                                </div>
                            </div>
                            <Button size="lg" onPress={() => setDetailHall(null)} className="bg-indigo-600 text-white font-black px-12 rounded-2xl shadow-xl shadow-indigo-900/20">EXIT BLUEPRINT</Button>
                        </ModalFooter>
                    </>)}
                </ModalContent>
            </Modal>
        </div>
    );
};

export default InternalSeatingPlans;
