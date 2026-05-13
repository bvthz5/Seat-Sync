import React, { useState, useEffect } from 'react';
import { 
    Button, 
    Card, 
    Select, 
    SelectItem, 
    Switch, 
    Checkbox, 
    Divider, 
    Tooltip, 
    Chip, 
    Progress, 
    Modal, 
    ModalContent, 
    ModalHeader, 
    ModalBody, 
    ModalFooter,
    ScrollShadow
} from '@heroui/react';
import { 
    Calendar, 
    Clock, 
    Settings, 
    Users, 
    MapPin, 
    RefreshCcw, 
    Save, 
    Trash2, 
    CheckCircle2, 
    AlertCircle, 
    Info, 
    ChevronRight,
    Search,
    Monitor,
    Layers,
    Layout,
    ArrowRightLeft,
    Sparkles,
    BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { InternalSeatingService } from '../../services/internal/internalSeatingService';
import { SeatingService } from '../../services/seatingService';
import api from '../../../../services/api';

/* ── Bench Card for Room View ── */
const SUBJ_COLORS = ['#818cf8','#34d399','#f472b6','#fb923c','#67e8f9','#a3e635','#fbbf24','#e879f9'];
const globalSubjectColorMap = new Map<string, string>();
let globalColorIdx = 0;
const getGlobalSubjectColor = (code: string) => {
    if (!code) return '#475569';
    if (!globalSubjectColorMap.has(code)) {
        globalSubjectColorMap.set(code, SUBJ_COLORS[globalColorIdx++ % SUBJ_COLORS.length]!);
    }
    return globalSubjectColorMap.get(code)!;
};

const InternalBenchView: React.FC<{ bench: any; getSubjectColor: (c: string) => string }> = ({ bench, getSubjectColor }) => {
    const renderSeat = (seat: any | null | undefined, side: 'L' | 'R') => {
        const isEmpty = !seat || !seat.studentId;
        const color = isEmpty ? null : getSubjectColor(seat.subjectCode || '');
        return (
            <Tooltip
                isDisabled={isEmpty}
                content={seat && seat.studentId ? (
                    <div className="p-2 space-y-0.5 min-w-[140px]">
                        <p className="font-black text-indigo-300 text-[11px]">{seat.name}</p>
                        <p className="text-[10px] text-slate-300">Reg: <span className="font-bold text-white">{seat.registerNumber}</span></p>
                        <p className="text-[10px] text-slate-300">Dept: <span className="font-bold text-white">{seat.deptCode}</span></p>
                        <div className="flex items-center gap-1 mt-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color || '#475569' }} />
                            <span className="text-[10px] text-slate-400">{seat.subjectCode}</span>
                        </div>
                    </div>
                ) : null}
                classNames={{ content: "bg-slate-900 border border-slate-700 p-0 rounded-xl" }}
                placement="top"
            >
                <div
                    className={`w-[54px] rounded-xl flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer border-2 p-1.5 ${
                        isEmpty
                            ? 'bg-slate-800/40 border-slate-700 text-slate-600 hover:border-slate-600 min-h-[50px]'
                            : 'border-transparent shadow-2xl hover:scale-110 min-h-[64px] hover:z-20'
                    }`}
                    style={isEmpty ? {} : { backgroundColor: `${color}20`, borderColor: color || '#475569', boxShadow: `0 8px 24px -8px ${color}44` }}
                >
                    {isEmpty ? (
                        <span className="text-[9px] font-black opacity-30">{side}</span>
                    ) : (
                        <div className="flex flex-col items-center gap-0.5 w-full">
                            <span className="text-[8px] font-black leading-none px-1 py-0.5 rounded bg-slate-900/50" style={{ color: color || '#fff' }}>
                                {seat.subjectCode?.slice(0, 4)}
                            </span>
                            <span className="text-[9px] font-black text-white leading-none tracking-tighter">
                                {seat.registerNumber?.slice(-3)}
                            </span>
                            <span className="text-[6.5px] font-bold text-slate-300 leading-[1.1] text-center max-w-full break-words line-clamp-2 whitespace-pre-line px-0.5 mt-0.5">
                                {seat.name?.split(' ').slice(0, 1).join('\n')}
                            </span>
                        </div>
                    )}
                </div>
            </Tooltip>
        );
    };

    // If seatOnly is set, render just that single seat (for ABCDE layout)
    if (bench.seatOnly) {
        return renderSeat(bench.seatOnly, bench.seatOnly === bench.left ? 'L' : 'R');
    }

    // Otherwise render both seats with divider (legacy layout)
    return (
        <div className="flex items-center gap-1 group relative">
            <span className="absolute -left-6 text-[8px] font-black text-slate-600 opacity-50">B{bench.benchNumber}</span>
            {renderSeat(bench.left, 'L')}
            <div className="w-0.5 h-12 bg-slate-700 rounded" />
            {renderSeat(bench.right, 'R')}
        </div>
    );
};

const InternalSeatingPlans: React.FC = () => {
    // --- State (with localStorage persistence) ---
    const [seriesList, setSeriesList] = useState<any[]>([]);
    const [availableSessions, setAvailableSessions] = useState<string[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<string>(() => {
        try {
            return localStorage.getItem('seating_selectedSeries') || '';
        } catch {
            return '';
        }
    });
    const [examDates, setExamDates] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        try {
            const stored = localStorage.getItem('seating_selectedDate') || '';
            // Sanitize: ensure only YYYY-MM-DD is stored in state
            return stored.split('-').slice(0, 3).join('-');
        } catch {
            return '';
        }
    });
    const [selectedSession, setSelectedSession] = useState<string>(() => {
        try {
            return localStorage.getItem('seating_selectedSession') || '';
        } catch {
            return '';
        }
    });
    
    const [halls, setHalls] = useState<any[]>([]);
    const [hallSearch, setHallSearch] = useState<string>('');
    const [selectedHalls, setSelectedHalls] = useState<number[]>(() => {
        try {
            const stored = localStorage.getItem('seating_selectedHalls');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });
    const [departments, setDepartments] = useState<any[]>([]);
    
    // Settings
    const [allocationMode, setAllocationMode] = useState<string>('same-exam');
    const [shuffleRooms, setShuffleRooms] = useState(false);
    const [primaryDept, setPrimaryDept] = useState<string>('');
    const [secondaryDept, setSecondaryDept] = useState<string>('');
    
    // View State
    const [activeStep, setActiveStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAutoRegistering, setIsAutoRegistering] = useState(false);
    const [hallDetail, setHallDetail] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    
    // Layout & Stats
    const [hallSummary, setHallSummary] = useState<any[]>([]);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [stats, setStats] = useState<any>(null);

    // --- Persist state to localStorage ---
    useEffect(() => {
        try {
            localStorage.setItem('seating_selectedSeries', selectedSeries);
        } catch {
            console.warn('Failed to save selectedSeries to localStorage');
        }
    }, [selectedSeries]);

    useEffect(() => {
        try {
            localStorage.setItem('seating_selectedDate', selectedDate);
        } catch {
            console.warn('Failed to save selectedDate to localStorage');
        }
    }, [selectedDate]);

    useEffect(() => {
        try {
            localStorage.setItem('seating_selectedSession', selectedSession);
        } catch {
            console.warn('Failed to save selectedSession to localStorage');
        }
    }, [selectedSession]);

    useEffect(() => {
        try {
            localStorage.setItem('seating_selectedHalls', JSON.stringify(selectedHalls));
        } catch {
            console.warn('Failed to save selectedHalls to localStorage');
        }
    }, [selectedHalls]);

    // --- Loaders ---
    useEffect(() => {
        (async () => {
            try {
                // Fetch Internal Series
                const series = await SeatingService.getSeries('Internal');
                setSeriesList(series || []);
                
                // Fetch Active Halls (halls list for sidebar checkbox)
                const h = await InternalSeatingService.getHalls();
                setHalls(h || []);

                // Fetch Departments for Split Mode
                const depts = await SeatingService.getDepartments();
                setDepartments(depts || []);
                
                // Validate selectedHalls against fetched halls
                if (h && h.length > 0) {
                    const hallIdsInSystem = new Set(h.map((hall: any) => hall.RoomID));
                    setSelectedHalls(prev => {
                        const valid = prev.filter(id => hallIdsInSystem.has(id));
                        // Auto-select all halls if none are already selected or all previously selected were invalid
                        if (valid.length === 0) return h.map((hall: any) => hall.RoomID);
                        return valid;
                    });
                }
            } catch (e) {
                toast.error("Failed to initialize seating data");
            }
        })();
    }, []);

    // When series changes: reset everything, fetch available sessions for that series
    useEffect(() => {
        if (selectedSeries) {
            setSelectedDate('');
            setSelectedSession('');
            setExamDates([]);
            setAvailableSessions([]);
            (async () => {
                try {
                    const sessions = await InternalSeatingService.getSessions(Number(selectedSeries));
                    setAvailableSessions(Array.isArray(sessions) ? sessions : ['FN', 'AN']);
                } catch (err) {
                    console.error('Failed to fetch sessions:', err);
                    setAvailableSessions(['FN', 'AN']);
                }
            })();
        } else {
            setAvailableSessions([]);
            setSelectedSession('');
            setSelectedDate('');
            setExamDates([]);
        }
    }, [selectedSeries]);

    // When session changes: fetch dates that have exams in that session
    useEffect(() => {
        if (selectedSeries && selectedSession) {
            setSelectedDate('');
            (async () => {
                try {
                    const dates = await InternalSeatingService.getExamDates(Number(selectedSeries), selectedSession);
                    setExamDates(Array.isArray(dates) ? dates : []);
                } catch (err) {
                    console.error('Failed to fetch exam dates:', err);
                    setExamDates([]);
                }
            })();
        } else {
            setExamDates([]);
            setSelectedDate('');
        }
    }, [selectedSeries, selectedSession]);

    // Only load hall summary when all three selections (series, session, date) are made
    useEffect(() => {
        (async () => {
            // Only fetch summary if all required fields are selected
            if (!selectedSeries || !selectedSession || !selectedDate) {
                setHallSummary([]);
                setStats(null);
                return;
            }

            setLoadingSummary(true);
            try {
                const summary = await InternalSeatingService.getSummary(
                    selectedDate, selectedSession, Number(selectedSeries)
                );
                if (Array.isArray(summary)) {
                    setHallSummary(summary);
                    const totalAssigned = summary.reduce((s: number, h: any) => s + (h.filledSeats || 0), 0);
                    const totalSeats = summary.reduce((s: number, h: any) => s + (h.totalSeats || 0), 0);
                    
                    if (totalAssigned > 0 || totalSeats > 0) {
                        setStats({ 
                            assignedCount: totalAssigned, 
                            unassignedCount: 0, 
                            totalSeats, 
                            hallUsage: summary 
                        });
                    } else {
                        setStats(null);
                    }
                }
            } catch (e) {
                console.error('Failed to load hall summary', e);
                setHallSummary([]);
                setStats(null);
            } finally {
                setLoadingSummary(false);
            }
        })();
    }, [selectedSeries, selectedDate, selectedSession]);

    // --- Actions ---
    const handleGenerate = async () => {
        if (!selectedSeries || !selectedDate || !selectedSession || selectedHalls.length === 0) {
            toast.error("Select series, session, date and at least one hall");
            return;
        }

        setIsGenerating(true);
        try {
            const result = await InternalSeatingService.generate({
                examDate: selectedDate,
                session: selectedSession,
                hallIds: selectedHalls,
                mode: allocationMode,
                seriesId: Number(selectedSeries),
                primaryDeptId: primaryDept ? Number(primaryDept) : undefined,
                secondaryDeptId: secondaryDept ? Number(secondaryDept) : undefined,
                shuffleRooms
            });

            console.log('[Generate Result]', result);

            if (result?.assignedCount > 0) {
                toast.success(`✅ ${result.assignedCount} students seated across ${result.hallUsage?.length || selectedHalls.length} halls`);
            } else {
                toast.error(`⚠️ No students assigned. Verify that students are registered for exams on ${selectedDate} (${selectedSession}). Check the console logs for details.`);
            }

            // Reload the hall summary
            const refreshed = await InternalSeatingService.getSummary(selectedDate, selectedSession, Number(selectedSeries));
            console.log('[Hall Summary]', refreshed);
            if (Array.isArray(refreshed)) {
                setHallSummary(refreshed);
                const totalAssigned = refreshed.reduce((s: number, h: any) => s + h.filledSeats, 0);
                const totalSeats = refreshed.reduce((s: number, h: any) => s + h.totalSeats, 0);
                setStats({ assignedCount: totalAssigned, unassignedCount: result?.unassignedCount || 0, totalSeats, hallUsage: refreshed });
            }
        } catch (e: any) {
            console.error('[Generate Error]', e);
            const errorMsg = e.response?.data?.message || e.message || "Generation failed";
            toast.error(errorMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAutoRegister = async () => {
        if (!selectedSeries || !selectedDate || !selectedSession) {
            toast.error("Select series, session, and date first");
            return;
        }

        setIsAutoRegistering(true);
        try {
            const result = await InternalSeatingService.autoRegister(
                selectedDate,
                selectedSession,
                Number(selectedSeries)
            );
            
            console.log('[AutoRegister Result]', result);
            toast.success(
                `✅ Auto-registered successfully!\n${result.newRegistrations} new registrations created\nTotal: ${result.totalRegistrations} students registered`
            );

            // Reload the hall summary
            const refreshed = await InternalSeatingService.getSummary(selectedDate, selectedSession, Number(selectedSeries));
            if (Array.isArray(refreshed)) {
                setHallSummary(refreshed);
            }
        } catch (e: any) {
            console.error('[AutoRegister Error]', e);
            const errorMsg = e.response?.data?.message || e.message || "Auto-registration failed";
            toast.error(errorMsg);
        } finally {
            setIsAutoRegistering(false);
        }
    };

    const openHallDetail = async (hallId: number) => {
        // Require all three selections to view hall layout
        if (!selectedSeries || !selectedSession || !selectedDate) {
            toast.error("Please select exam series, session, and date first");
            return;
        }

        setLoadingDetail(true);
        setHallDetail(null);
        setIsDetailOpen(true);
        try {
            console.log(`[openHallDetail] Loading hall ${hallId} for ${selectedDate} ${selectedSession}`);
            const detail = await InternalSeatingService.getHallLayout(hallId, selectedDate, selectedSession, Number(selectedSeries));
            console.log(`[openHallDetail] Success:`, detail);
            setHallDetail(detail);
        } catch (error: any) {
            console.error(`[openHallDetail] Error:`, error);
            toast.error("Failed to load hall details");
            setIsDetailOpen(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    // --- Renderers ---
    return (
        <div className="flex h-[calc(100vh-8rem)] w-full gap-4 text-slate-900">
            {/* --- LEFT SIDEBAR (Wizard Control Panel) --- */}
            <Card className="w-[380px] shrink-0 h-full overflow-hidden flex flex-col border-none shadow-2xl bg-white/80 backdrop-blur-md rounded-[2.5rem]">
                    {/* Header */}
                    <div className="p-8 bg-gradient-to-br from-slate-900 to-indigo-950 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-inner">
                                <Sparkles className="text-indigo-400" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight leading-none">Seating Wizard</h2>
                                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mt-1.5 opacity-80">Internal Examinations</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
                        {/* Step 1: Selection Chain */}
                        <section className="animate-in fade-in slide-in-from-left duration-500">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-200">1</div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Identity & Schedule</h3>
                            </div>
                            
                            <div className="space-y-8 pl-1">
                                    {/* 1. Exam Series */}
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="examSeries" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Select Exam Series</label>
                                        <Select 
                                            id="examSeries"
                                            name="examSeries"
                                            placeholder="Choose internal series..."
                                            variant="bordered" 
                                            className="max-w-full"
                                            selectedKeys={selectedSeries && seriesList.some(s => String(s.ExamSeriesID) === selectedSeries) ? [selectedSeries] : []}
                                            onSelectionChange={(keys) => setSelectedSeries(Array.from(keys)[0] as string)}
                                            classNames={{
                                                trigger: "h-12 border-slate-200 hover:border-indigo-400 transition-colors bg-white shadow-sm",
                                                value: "text-slate-700 font-medium",
                                                selectorIcon: "right-3 text-slate-400"
                                            }}
                                            popoverProps={{
                                                classNames: {
                                                    content: "bg-white border border-slate-200 shadow-2xl p-2 rounded-2xl opacity-100",
                                                }
                                            }}
                                        >
                                            {seriesList.map(s => (
                                                <SelectItem key={String(s.ExamSeriesID)} textValue={s.SeriesName} className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">{s.SeriesName}</SelectItem>
                                            ))}
                                        </Select>
                                    </div>

                                    {/* 2. Session */}
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="examSession" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Select Session</label>
                                        <Select 
                                            id="examSession"
                                            name="examSession"
                                            placeholder={!selectedSeries ? "Select series first..." : "Select session"}
                                            variant="bordered"
                                            isDisabled={!selectedSeries || availableSessions.length === 0}
                                            selectedKeys={selectedSession && availableSessions.includes(selectedSession) ? [selectedSession] : []}
                                            onSelectionChange={(keys) => setSelectedSession(Array.from(keys)[0] as any)}
                                            classNames={{
                                                trigger: "h-12 border-slate-200 hover:border-indigo-400 transition-colors bg-white shadow-sm",
                                                value: "text-slate-700 font-medium",
                                                selectorIcon: "right-3 text-slate-400"
                                            }}
                                            popoverProps={{
                                                classNames: {
                                                    content: "bg-white border border-slate-200 shadow-2xl p-2 rounded-2xl opacity-100",
                                                }
                                            }}
                                        >
                                            {availableSessions.map((s) => (
                                                <SelectItem key={s} textValue={s === 'FN' ? 'Forenoon' : s === 'AN' ? 'Afternoon' : s} className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">
                                                    {s === 'FN' ? 'Forenoon (FN)' : s === 'AN' ? 'Afternoon (AN)' : s}
                                                </SelectItem>
                                            ))}
                                        </Select>
                                    </div>

                                    {/* 3. Exam Date */}
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="examDate" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Exam Date</label>
                                        <Select 
                                            id="examDate"
                                            name="examDate"
                                            placeholder={!selectedSession ? "Select session first..." : examDates.length === 0 ? "No dates found" : "Pick date"}
                                            variant="bordered"
                                            isDisabled={!selectedSession || examDates.length === 0}
                                            selectedKeys={(() => {
                                                if (!selectedDate || !selectedSession) return [];
                                                const cleanDate = selectedDate.split('-').slice(0, 3).join('-');
                                                const targetKey = `${cleanDate}-${selectedSession}`;
                                                // Only return key if it's present in current examDates to avoid warnings
                                                const exists = examDates.some(d => {
                                                    const dStr = typeof d === 'string' ? d : d.examDate;
                                                    const dKey = d.session ? `${dStr}-${d.session}` : dStr;
                                                    return dKey === targetKey;
                                                });
                                                return exists ? [targetKey] : [];
                                            })()}
                                            onSelectionChange={(keys) => {
                                                const key = Array.from(keys)[0] as string;
                                                if (key && typeof key === 'string' && key.includes('-')) {
                                                    const parts = key.split('-');
                                                    if (parts.length >= 3) {
                                                        setSelectedDate(`${parts[0]}-${parts[1]}-${parts[2]}`);
                                                    }
                                                }
                                            }}
                                            classNames={{
                                                trigger: "h-12 border-slate-200 hover:border-indigo-400 transition-colors bg-white shadow-sm",
                                                value: "text-slate-700 font-medium",
                                                selectorIcon: "right-3 text-slate-400"
                                            }}
                                            popoverProps={{
                                                classNames: {
                                                    content: "bg-white border border-slate-200 shadow-2xl p-2 rounded-2xl opacity-100",
                                                }
                                            }}
                                        >
                                            {examDates.map((d: any, idx: number) => {
                                                const dateStr = typeof d === 'string' ? d : d.examDate;
                                                const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                                const itemKey = d.session ? `${dateStr}-${d.session}` : `${dateStr}-${idx}`;
                                                return (
                                                    <SelectItem key={itemKey} textValue={label} className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">
                                                        {label} {d.session ? `(${d.session})` : ''}
                                                    </SelectItem>
                                                );
                                            })}
                                        </Select>
                                    </div>
                                </div>
                        </section>

                        {/* Step 2: Room Settings */}
                        <section className="animate-in fade-in slide-in-from-left duration-500 delay-150">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-200">2</div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Hall Infrastructure</h3>
                            </div>
                            
                            <div className="space-y-8">
                                <div 
                                    className={`
                                        flex items-center justify-between p-5 rounded-[2rem] border-2 cursor-pointer transition-all duration-500 group
                                        ${shuffleRooms 
                                            ? 'bg-indigo-50/50 border-indigo-200 shadow-xl shadow-indigo-100/20' 
                                            : 'bg-slate-50/50 border-slate-100 hover:border-indigo-100 hover:bg-white'}
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${shuffleRooms ? 'bg-indigo-600 text-white shadow-lg rotate-12' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                            <ArrowRightLeft size={18} className={shuffleRooms ? 'animate-pulse' : ''} />
                                        </div>
                                        <div className="flex flex-col">
                                            <label htmlFor="shuffleToggle" className={`text-xs font-black cursor-pointer transition-colors ${shuffleRooms ? 'text-indigo-900' : 'text-slate-800'}`}>Shuffle Rooms</label>
                                            <span className="text-[10px] text-slate-400 font-bold mt-0.5 italic">Randomize sequence</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <input 
                                            id="shuffleToggle"
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={shuffleRooms}
                                            onChange={() => setShuffleRooms(!shuffleRooms)}
                                        />
                                        <div 
                                            onClick={() => setShuffleRooms(!shuffleRooms)}
                                            className={`w-11 h-6 rounded-full p-1 transition-all duration-500 relative ${shuffleRooms ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-all duration-500 transform ${shuffleRooms ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between px-1 mb-1">
                                            <label htmlFor="hallSearch" className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-pointer">Hall Search & Bulk Actions</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setSelectedHalls(halls.filter(h => h.RoomCode.toLowerCase().includes(hallSearch.toLowerCase())).map(h => h.RoomID))}
                                                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-tight"
                                                >
                                                    Select All
                                                </button>
                                                <Divider orientation="vertical" className="h-2 bg-slate-200" />
                                                <button 
                                                    onClick={() => setSelectedHalls([])}
                                                    className="text-[9px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-tight"
                                                >
                                                    Undo All
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-indigo-400 transition-colors" size={14} />
                                            <input 
                                                id="hallSearch"
                                                name="hallSearch"
                                                type="text"
                                                placeholder="Search by hall name or code..."
                                                value={hallSearch}
                                                onChange={(e) => setHallSearch(e.target.value)}
                                                className="w-full h-10 pl-10 pr-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Available Halls</span>
                                            <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
                                                {loadingSummary ? 'Loading...' : `${hallSummary.filter(h => h.hallCode.toLowerCase().includes(hallSearch.toLowerCase())).length} Found`}
                                            </span>
                                        </div>
                                        <ScrollShadow className="h-60 p-4 border-2 border-slate-100 rounded-3xl bg-slate-50/30">
                                            <div className="grid grid-cols-1 gap-2">
                                                {(hallSummary.length > 0 ? hallSummary : halls.map(h => ({ hallId: h.RoomID, hallCode: h.RoomCode, totalSeats: h.TotalCapacity || 0, filledSeats: 0, capacity: h.TotalCapacity || 0 })))
                                                    .filter(hall => hall.hallCode.toLowerCase().includes(hallSearch.toLowerCase()))
                                                    .map(hall => (
                                                        <div 
                                                            key={hall.hallId}
                                                            onClick={() => {
                                                                if (selectedHalls.includes(hall.hallId)) {
                                                                    setSelectedHalls(selectedHalls.filter(id => id !== hall.hallId));
                                                                } else {
                                                                    setSelectedHalls([...selectedHalls, hall.hallId]);
                                                                }
                                                            }}
                                                            className={`
                                                                flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all duration-300
                                                                ${selectedHalls.includes(hall.hallId) 
                                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100' 
                                                                    : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full ${selectedHalls.includes(hall.hallId) ? 'bg-white' : hall.filledSeats > 0 ? 'bg-emerald-400' : 'bg-slate-300'} ${hall.filledSeats > 0 ? 'animate-pulse' : ''}`} />
                                                                <span className="text-xs font-black tracking-tight">{hall.hallCode}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className={`text-[10px] font-bold ${selectedHalls.includes(hall.hallId) ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                                    {hall.totalSeats} Seats
                                                                </span>
                                                                {hall.filledSeats > 0 && (
                                                                    <span className={`text-[9px] font-black ${selectedHalls.includes(hall.hallId) ? 'text-indigo-200' : 'text-emerald-600'}`}>
                                                                        {hall.filledSeats} filled
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </ScrollShadow>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Step 3: Distribution Logic */}
                        <section className="animate-in fade-in slide-in-from-left duration-500 delay-300">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-200">3</div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Allocation Engine</h3>
                            </div>

                            <div className="space-y-8">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="allocationMode" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Distribution Mode</label>
                                    <Select 
                                        id="allocationMode"
                                        name="allocationMode"
                                        placeholder="Choose logic..."
                                        variant="bordered"
                                        selectedKeys={[allocationMode]}
                                        onSelectionChange={(keys) => setAllocationMode(Array.from(keys)[0] as string)}
                                        classNames={{
                                            trigger: "h-12 border-slate-200 hover:border-indigo-400 transition-colors bg-white shadow-sm",
                                            value: "text-slate-700 font-medium",
                                            selectorIcon: "right-3 text-slate-400"
                                        }}
                                        popoverProps={{
                                            classNames: {
                                                content: "bg-white border border-slate-200 shadow-2xl p-2 rounded-2xl opacity-100",
                                            }
                                        }}
                                    >
                                        <SelectItem key="same-exam" textValue="Same Exam Both Sides" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Same Exam Both Sides</SelectItem>
                                        <SelectItem key="alternate" textValue="Alternate Subjects" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Alternate Subjects</SelectItem>
                                        <SelectItem key="left-only" textValue="Left Side Only" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Left Side Only</SelectItem>
                                        <SelectItem key="right-only" textValue="Right Side Only" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Right Side Only</SelectItem>
                                        <SelectItem key="split-dept" textValue="Split By Department" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Split By Department</SelectItem>
                                    </Select>
                                </div>

                                {allocationMode === 'split-dept' && (
                                    <div className="grid grid-cols-1 gap-4 animate-in zoom-in-95 duration-300">
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="primaryDept" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Primary Department</label>
                                            <Select 
                                                id="primaryDept"
                                                name="primaryDept"
                                                variant="bordered"
                                                size="sm"
                                                placeholder="Choose department..."
                                                selectedKeys={primaryDept ? [primaryDept] : []}
                                                onSelectionChange={(keys) => setPrimaryDept(Array.from(keys)[0] as string)}
                                                classNames={{
                                                    trigger: "h-10 border-slate-200 bg-white",
                                                    value: "text-slate-700 font-medium",
                                                    selectorIcon: "right-2 text-slate-400"
                                                }}
                                                popoverProps={{
                                                    classNames: {
                                                        content: "bg-white border border-slate-200 shadow-2xl p-1 rounded-xl opacity-100",
                                                    }
                                                }}
                                            >
                                                {departments.map(d => <SelectItem key={String(d.DepartmentID)} textValue={d.DepartmentCode} className="font-medium text-slate-700 hover:bg-indigo-50 rounded-lg transition-colors">{d.DepartmentCode}</SelectItem>)}
                                            </Select>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="secondaryDept" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Secondary Department</label>
                                            <Select 
                                                id="secondaryDept"
                                                name="secondaryDept"
                                                variant="bordered"
                                                size="sm"
                                                placeholder="Choose department..."
                                                selectedKeys={secondaryDept ? [secondaryDept] : []}
                                                onSelectionChange={(keys) => setSecondaryDept(Array.from(keys)[0] as string)}
                                                classNames={{
                                                    trigger: "h-10 border-slate-200 bg-white",
                                                    value: "text-slate-700 font-medium",
                                                    selectorIcon: "right-2 text-slate-400"
                                                }}
                                                popoverProps={{
                                                    classNames: {
                                                        content: "bg-white border border-slate-200 shadow-2xl p-1 rounded-xl opacity-100",
                                                    }
                                                }}
                                            >
                                                {departments.map(d => <SelectItem key={String(d.DepartmentID)} textValue={d.DepartmentCode} className="font-medium text-slate-700 hover:bg-indigo-50 rounded-lg transition-colors">{d.DepartmentCode}</SelectItem>)}
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="p-8 border-t border-slate-100 space-y-4">
                        <Button 
                            color="warning" 
                            fullWidth 
                            size="lg" 
                            variant="flat"
                            className="font-black h-12 rounded-2xl text-[11px] tracking-widest uppercase transition-all hover:bg-warning/20"
                            isLoading={isAutoRegistering}
                            onPress={handleAutoRegister}
                            startContent={!isAutoRegistering && <Users size={16} />}
                        >
                            Auto-Register Students
                        </Button>
                        <Button 
                            color="primary" 
                            fullWidth 
                            size="lg" 
                            className={`font-black h-16 rounded-2xl shadow-xl transition-all duration-500 text-sm tracking-widest uppercase group ${
                                selectedSeries && selectedDate && selectedSession && selectedHalls.length > 0
                                    ? 'bg-indigo-600 shadow-indigo-200 hover:scale-[1.02] hover:shadow-2xl'
                                    : 'bg-slate-300'
                            }`}
                            isLoading={isGenerating}
                            onPress={handleGenerate}
                            startContent={!isGenerating && <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-700" />}
                        >
                            Generate Arrangement
                        </Button>
                    </div>
                </Card>

            {/* --- CENTER: Hall Grid + Stats --- */}
            <main className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
            {/* --- TOP STATS BAR --- */}
            <header className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
                {/* Seated Stats */}
                <Card className="p-6 border-none shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                                <Users size={22} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Students Seated</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <h4 className="text-3xl font-black">{stats?.assignedCount || 0}</h4>
                                </div>
                            </div>
                        </div>
                        <CheckCircle2 size={32} className="opacity-20 rotate-12" />
                    </div>
                </Card>

                {/* Total Capacity */}
                <Card className="p-6 border-none shadow-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                                <Layout size={22} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Capacity</p>
                                <h4 className="text-3xl font-black mt-1">{stats?.totalSeats || 0}</h4>
                            </div>
                        </div>
                        <Layers size={32} className="opacity-20 rotate-12" />
                    </div>
                </Card>

                {/* Utilization */}
                <Card className="p-6 border-none shadow-xl bg-white relative overflow-hidden group border border-slate-100">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
                                <BarChart3 size={22} className="text-slate-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hall Utilization</p>
                                <h4 className="text-3xl font-black mt-1 text-slate-800">
                                    {stats && stats.totalSeats > 0 ? Math.round((stats.assignedCount / stats.totalSeats) * 100) : 0}%
                                </h4>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Target: 100%</span>
                            <Progress 
                                value={stats && stats.totalSeats > 0 ? (stats.assignedCount / stats.totalSeats) * 100 : 0} 
                                size="sm" 
                                color="secondary" 
                                className="w-24 h-2"
                            />
                        </div>
                    </div>
                </Card>
            </header>

                {/* Hall Cards Grid */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {selectedHalls.length === 0 ? (
                        <Card className="p-12 border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center h-64">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4 animate-pulse">
                                <Monitor size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-600">No Halls Selected</h3>
                            <p className="text-sm text-slate-400 max-w-xs mt-2">Select halls from the sidebar to begin.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {selectedHalls
                                .map((hallId: number) => {
                                    const summary = hallSummary.find((h: any) => h.hallId === hallId);
                                    const hallInfo = halls.find((h: any) => h.RoomID === hallId);
                                    const filled = summary?.filledSeats ?? 0;
                                    const total = summary?.totalSeats ?? hallInfo?.TotalSeats ?? 0;
                                    return { hallId, summary, hallInfo, filled, total };
                                })
                                .sort((a, b) => {
                                    // Allocated halls (filled > 0) first, then by fill percentage descending
                                    if ((a.filled > 0) !== (b.filled > 0)) {
                                        return a.filled > 0 ? -1 : 1;
                                    }
                                    // Both allocated or both empty - sort by fill percentage
                                    const pctA = a.total > 0 ? (a.filled / a.total) * 100 : 0;
                                    const pctB = b.total > 0 ? (b.filled / b.total) * 100 : 0;
                                    return pctB - pctA;
                                })
                                .map(({ hallId, summary, hallInfo, filled, total }) => {
                                    const code = summary?.hallCode || hallInfo?.RoomCode || `Hall #${hallId}`;
                                    const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
                                    const isViewing = isDetailOpen && hallDetail?.room?.RoomID === hallId;
                                    // Only show as allocated if date is selected AND has filledSeats > 0
                                    const isAllocated = selectedDate && filled > 0;
                                    const canViewLayout = selectedSeries && selectedSession && selectedDate;
                                    
                                    return (
                                        <Tooltip
                                            key={hallId}
                                            isDisabled={canViewLayout}
                                            content={!canViewLayout ? "Select exam details first" : "Click to view room layout"}
                                            color={!canViewLayout ? "primary" : "default"}
                                        >
                                            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
                                                <Card
                                                    className={`overflow-hidden ${canViewLayout ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} transition-all duration-300 shadow-md hover:shadow-xl border-2 ${
                                                        isViewing
                                                            ? 'border-indigo-400 ring-2 ring-indigo-200'
                                                            : isAllocated
                                                        ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400 hover:shadow-emerald-100'
                                                        : 'border-slate-200 hover:border-indigo-200'
                                                }`}
                                                onPress={() => canViewLayout && openHallDetail(hallId)}
                                                    isPressable={canViewLayout}
                                            >
                                                <div className={`p-4 flex items-center justify-between border-b ${
                                                    isAllocated
                                                        ? 'bg-gradient-to-r from-emerald-50 to-emerald-25 border-emerald-100'
                                                        : 'bg-gradient-to-r from-slate-50 to-white border-slate-100'
                                                }`}>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-inner transition-all duration-300 ${
                                                            isViewing
                                                                ? 'bg-indigo-600 text-white'
                                                                : isAllocated
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-indigo-100 text-indigo-600'
                                                        }`}>
                                                            <MapPin size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-sm text-slate-800">{code}</h4>
                                                            <p className={`text-[9px] font-bold uppercase tracking-wider ${
                                                                isAllocated ? 'text-emerald-600' : 'text-slate-400'
                                                            }`}>
                                                                {isAllocated ? `${pct}% Full • Allocated` : 'Not yet allocated'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isViewing && <Chip size="sm" color="secondary" variant="flat" className="text-[9px] font-black">Viewing</Chip>}
                                                    {isAllocated && !isViewing && (
                                                        <Chip 
                                                            size="sm" 
                                                            color="success" 
                                                            variant="flat" 
                                                            className="text-[9px] font-black"
                                                        >
                                                            ✓ Allocated
                                                        </Chip>
                                                    )}
                                                </div>
                                                <div className="px-4 py-3 space-y-2">
                                                    <Progress 
                                                        value={pct} 
                                                        color={pct >= 100 ? 'success' : isAllocated ? 'success' : 'default'} 
                                                        className="h-1.5" 
                                                    />
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-1.5">
                                                            <Chip 
                                                                size="sm" 
                                                                variant="flat" 
                                                                color={isAllocated ? 'success' : 'default'} 
                                                                className="text-[9px] font-black px-1"
                                                            >
                                                                {filled} Seated
                                                            </Chip>
                                                            <Chip 
                                                                size="sm" 
                                                                variant="flat" 
                                                                color="default" 
                                                                className="text-[9px] font-black px-1"
                                                            >
                                                                {total - filled} Free
                                                            </Chip>
                                                        </div>
                                                        <Button 
                                                            size="sm" 
                                                            variant="light" 
                                                            color="primary"
                                                            isIconOnly
                                                            className="rounded-full hover:bg-indigo-50"
                                                            onPress={() => openHallDetail(hallId)}
                                                            isDisabled={!canViewLayout}
                                                        >
                                                            <Monitor size={14} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                        </Tooltip>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </main>

            {/* --- ROOM LAYOUT MODAL --- */}
            <Modal 
                isOpen={isDetailOpen} 
                onOpenChange={(open) => {
                    setIsDetailOpen(open);
                    if (!open) setHallDetail(null);
                }}
                size="full"
                backdrop="blur"
                scrollBehavior="inside"
                classNames={{
                    backdrop: "bg-black/60",
                    base: "bg-white border-slate-200 h-[95vh]",
                    closeButton: "hover:bg-white/10 active:bg-white/20 text-white p-2 text-lg transition-colors z-50",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <div className="flex flex-col h-full">
                            {/* Modal Header */}
                            <ModalHeader className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-t-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Layout size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg leading-none">
                                            {hallDetail?.room?.RoomCode || 'Loading…'}
                                        </h3>
                                        <p className="text-[10px] font-bold opacity-70 mt-0.5 uppercase tracking-wider">
                                            {hallDetail ? `${hallDetail.filledSeats} / ${hallDetail.totalSeats} seats` : 'Room Blueprint'}
                                        </p>
                                    </div>
                                </div>
                            </ModalHeader>

                            {/* Modal Body */}
                            <ModalBody className="bg-[#0f172a] relative p-6">
                                {/* Grid dots */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none"
                                    style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 0)', backgroundSize: '20px 20px' }} />

                                {loadingDetail ? (
                                    <div className="flex items-center justify-center h-96">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <RefreshCcw size={32} className="animate-spin text-indigo-400" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Loading Blueprint…</span>
                                        </div>
                                    </div>
                                ) : hallDetail ? (
                                    <div className="relative">
                                        {/* Blackboard */}
                                        <div className="mx-auto w-2/3 h-3 bg-slate-700 rounded-b-lg mb-8 flex justify-center border-b-4 border-slate-600">
                                            <span className="absolute -mt-6 text-[9px] font-black text-slate-500 tracking-[0.4em] uppercase opacity-60">FRONT</span>
                                        </div>

                                        {/* Subject Legend */}
                                        {hallDetail.rows?.length > 0 && (() => {
                                            const subjects = new Map<string, string>();
                                            for (const row of hallDetail.rows) {
                                                for (const bench of row.benches) {
                                                    if (bench.left?.subjectCode) subjects.set(bench.left.subjectCode, bench.left.subjectName || bench.left.subjectCode);
                                                    if (bench.right?.subjectCode) subjects.set(bench.right.subjectCode, bench.right.subjectName || bench.right.subjectCode);
                                                }
                                            }
                                            const COLORS = ['#818cf8','#34d399','#f472b6','#fb923c','#67e8f9','#a3e635','#fbbf24','#e879f9'];
                                            const colorMap = new Map([...subjects.keys()].map((k, i) => [k, COLORS[i % COLORS.length]!]));
                                            return (
                                                <div className="mb-10 flex flex-wrap gap-3 justify-center">
                                                    {[...subjects.entries()].map(([code, name]) => (
                                                        <div key={code} className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-md border border-white/5 rounded-[1.2rem] px-3.5 py-2 group hover:bg-slate-700/60 transition-all duration-300">
                                                            <div className="w-3.5 h-3.5 rounded-full shadow-lg group-hover:scale-125 transition-transform" style={{ backgroundColor: colorMap.get(code) }} />
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-black text-white leading-tight">{code}</span>
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[100px] leading-tight mt-0.5">{name}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}

                                        {/* Column layout - ABCDE format like college structure */}
                                        <div className="flex gap-10 justify-center items-start overflow-x-auto pb-10 scrollbar-hide px-4">
                                            {hallDetail.rows?.map((row: any) => {
                                                const COLORS = ['#818cf8','#34d399','#f472b6','#fb923c','#67e8f9','#a3e635','#fbbf24','#e879f9'];
                                                const subjectColorMap = new Map<string, string>();
                                                let colorIdx = 0;
                                                const getColor = (code: string) => {
                                                    if (!code) return '#475569';
                                                    if (!subjectColorMap.has(code)) subjectColorMap.set(code, COLORS[colorIdx++ % COLORS.length]!);
                                                    return subjectColorMap.get(code)!;
                                                };
                                                // Build shared color map from all rows
                                                for (const r of hallDetail.rows) {
                                                    for (const b of r.benches) {
                                                        if (b.left?.subjectCode) getColor(b.left.subjectCode);
                                                        if (b.right?.subjectCode) getColor(b.right.subjectCode);
                                                    }
                                                }
                                                return (
                                                    <div key={row.rowLabel} className="flex flex-col items-center gap-6 shrink-0">
                                                        <div className="relative group">
                                                            <div className="absolute inset-0 bg-white/20 blur-xl group-hover:bg-indigo-500/30 transition-all rounded-full" />
                                                            <span className="relative text-xl font-black text-white px-5 py-2.5 rounded-2xl bg-slate-800/80 border border-white/10 shadow-2xl min-w-[70px] text-center block">
                                                                {row.rowLabel}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-3">
                                                            {row.benches.map((bench: any) => (
                                                                <div key={bench.benchNumber} className="flex gap-2">
                                                                    {/* Left Seat */}
                                                                    <InternalBenchView
                                                                        key={`${row.rowLabel}-${bench.benchNumber}-left`}
                                                                        bench={{ ...bench, seatOnly: bench.left }}
                                                                        getSubjectColor={getColor}
                                                                    />
                                                                    {/* Right Seat */}
                                                                    {bench.right && (
                                                                        <InternalBenchView
                                                                            key={`${row.rowLabel}-${bench.benchNumber}-right`}
                                                                            bench={{ ...bench, seatOnly: bench.right }}
                                                                            getSubjectColor={getColor}
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}
                            </ModalBody>
                            <ModalFooter className="bg-slate-50 border-t border-slate-100 flex justify-between items-center p-4">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-slate-700" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Empty Seat</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Occupied</span>
                                    </div>
                                </div>
                                <Button 
                                    color="danger" 
                                    variant="flat" 
                                    onPress={onClose}
                                    className="font-black text-xs uppercase tracking-widest px-8 h-12 rounded-2xl"
                                >
                                    Close Layout
                                </Button>
                            </ModalFooter>
                        </div>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};

// --- Legacy SeatIcon (kept for backward compat, not used in new panel) ---
const SeatIcon: React.FC<{ seat: any, allocation: any }> = ({ seat, allocation }) => {
    if (!seat) return <div className="w-14 h-14" />;
    const isOccupied = !!allocation;
    const isDisabled = !seat.IsActive;
    const content = (
        <motion.div
            whileHover={{ scale: 1.1 }}
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-xs transition-all duration-300 cursor-pointer border-2 ${
                isDisabled ? 'bg-red-900/20 border-red-800/30 text-red-700 opacity-50'
                : isOccupied ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
        >
            {isOccupied ? (
                <div className="flex flex-col items-center leading-none">
                    <span className="font-black text-[9px] truncate w-10 text-center">{allocation.Student?.RegisterNumber?.slice(-3)}</span>
                    <Users size={12} className="mt-1 opacity-50" />
                </div>
            ) : (
                <span className="font-black opacity-30 text-[10px]">{seat.SeatNumber === 1 ? 'L' : 'R'}</span>
            )}
        </motion.div>
    );
    if (isOccupied) {
        return (
            <Tooltip
                content={<div className="p-3 space-y-1">
                    <p className="font-black text-indigo-400 text-xs">{allocation.Student?.FullName}</p>
                    <p className="text-[10px] text-slate-300">Reg: {allocation.Student?.RegisterNumber}</p>
                </div>}
                classNames={{ content: "bg-slate-900 border border-slate-800 p-0" }}
            >{content}</Tooltip>
        );
    }
    return content;
};

export default InternalSeatingPlans;
