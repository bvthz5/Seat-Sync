import React, { useState, useEffect, useMemo } from 'react';
import {
    Button,
    Card,
    CardBody,
    Select,
    SelectItem,
    Spinner,
    Chip,
    Avatar,
    Divider,
} from '@heroui/react';
import {
    Calendar,
    Clock,
    Building2,
    ShieldCheck,
    X,
    MapPin,
    CheckCircle2,
    Sparkles,
    ArrowDown,
    Users2,
    Lock,
    Unlock,
    Target,
    Layers,
    BookOpen,
    GraduationCap,
    ClipboardCheck,
    AlertCircle,
    UserCheck,
    FileDown,
    FileText,
    Table as TableIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { SeatingService } from '../services/seatingService';
import { InternalSeatingService } from '../services/internal/internalSeatingService';
import { invigilatorService } from '../services/invigilatorService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Assignment {
    hallId: number;
    invigilatorId: number;
    hallName: string;
    invigilatorName: string;
    department?: string;
}

interface ExamSlot {
    examDate: string;
    session: string;
    examCount: number;
    examNames: string[];
}

const InvigilatorAssign: React.FC = () => {
    const [series, setSeries] = useState<any[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<string>('');
    const [slots, setSlots] = useState<ExamSlot[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedSession, setSelectedSession] = useState<string>('FN');
    const [halls, setHalls] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);
    const [isCommitted, setIsCommitted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                setIsLoading(true);
                const seriesData = await SeatingService.getSeries();
                setSeries(seriesData);
                if (seriesData.length > 0) {
                    setSelectedSeries(seriesData[0].ExamSeriesID.toString());
                }
            } catch (err) {
                toast.error('System initialization error');
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (selectedSeries) {
            const fetchSlots = async () => {
                try {
                    // Get the selected series to check exam type
                    const selectedSeriesObj = series.find(s => s.ExamSeriesID.toString() === selectedSeries);
                    const isInternal = selectedSeriesObj?.ExamType === 'Internal';
                    
                    console.log('Selected Series:', selectedSeriesObj);
                    console.log('Is Internal:', isInternal);
                    
                    // Call appropriate service based on exam type
                    let slotsData;
                    if (isInternal) {
                        console.log('Fetching internal exam dates for series:', selectedSeries);
                        slotsData = await InternalSeatingService.getExamDates(Number(selectedSeries));
                    } else {
                        console.log('Fetching regular exam dates for series:', selectedSeries);
                        slotsData = await SeatingService.getExamDates(Number(selectedSeries));
                    }
                    
                    console.log('Slots Data:', slotsData);
                    setSlots(slotsData || []);
                    if (slotsData && slotsData.length > 0) {
                        setSelectedDate(slotsData[0].examDate);
                        setSelectedSession(slotsData[0].session || 'FN');
                    } else {
                        setSelectedDate('');
                        setSelectedSession('FN');
                        setHalls([]);
                        setAssignments([]);
                    }
                } catch (err) {
                    console.error('Slot retrieval error:', err);
                    toast.error('Failed to load exam dates');
                }
            };
            fetchSlots();
        }
    }, [selectedSeries, series]);

    useEffect(() => {
        if (selectedDate && selectedSession) {
            fetchState();
        }
    }, [selectedDate, selectedSession]);

    const fetchState = async () => {
        try {
            // 1. Fetch halls required
            const summary = await SeatingService.getAllocationSummary(selectedDate, selectedSession);
            setHalls(summary || []);

            // 2. Fetch existing assignments if any
            const existing = await invigilatorService.getAssignments(selectedDate, selectedSession);
            if (existing && existing.length > 0) {
                setAssignments(existing);
                setIsCommitted(true);
            } else {
                setAssignments([]);
                setIsCommitted(false);
            }
        } catch (err) {
            console.error('State retrieval error:', err);
        }
    };

    const handleAutoAssign = async () => {
        try {
            setIsAutoAssigning(true);
            const res = await invigilatorService.autoAssign(selectedDate, selectedSession);
            const newAssignments: Assignment[] = res.assignments.map(a => {
                const hall = halls.find(h => (h.HallID || h.hallId) === a.hallId);
                return {
                    hallId: a.hallId,
                    invigilatorId: a.invigilatorId,
                    invigilatorName: a.invigilatorName,
                    hallName: hall ? (hall.hallCode || hall.HallCode || hall.HallName || `Hall ${a.hallId}`) : `Hall ${a.hallId}`,
                    department: a.department
                };
            });
            setAssignments(newAssignments);
            setIsCommitted(false);
            toast.success('Strategy applied');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Algorithm failed');
        } finally {
            setIsAutoAssigning(false);
        }
    };

    const handleCommit = async () => {
        try {
            setIsSaving(true);
            await invigilatorService.saveAssignments(selectedDate, selectedSession, assignments);
            setIsCommitted(true);
            toast.success('Deployment plan locked and saved');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save assignments');
        } finally {
            setIsSaving(false);
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const title = "Invigilator Duty Distribution Roster";
        const subtitle = `Date: ${new Date(selectedDate).toLocaleDateString()} | Session: ${selectedSession}`;
        const seriesName = series.find(s => s.ExamSeriesID.toString() === selectedSeries)?.SeriesName || '';

        // Header
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text("SJCET PALAI", 105, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.text(title, 105, 30, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`${seriesName} | ${subtitle}`, 105, 38, { align: 'center' });

        // Table
        const tableData = assignments.map((a, i) => [
            i + 1,
            a.hallName,
            a.invigilatorName,
            a.department || 'General Faculty'
        ]);

        autoTable(doc, {
            startY: 45,
            head: [['S.No', 'Exam Hall', 'Supervisor Name', 'Department']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(`Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
        }

        doc.save(`Invigilator_Duty_${selectedDate}_${selectedSession}.pdf`);
        toast.success('PDF Generated');
    };

    const exportToExcel = () => {
        const data = assignments.map((a, i) => ({
            'S.No': i + 1,
            'Exam Hall': a.hallName,
            'Supervisor Name': a.invigilatorName,
            'Department': a.department || 'General Faculty'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Duty Roster");
        XLSX.writeFile(wb, `Invigilator_Duty_${selectedDate}_${selectedSession}.xlsx`);
        toast.success('Excel Generated');
    };

    const uniqueDates = useMemo(() => {
        const dates = new Set<string>();
        slots.forEach(s => dates.add(s.examDate));
        return Array.from(dates).sort();
    }, [slots]);

    const availableSessions = ['FN', 'AN'];

    const currentSlotExams = useMemo(() => {
        const slot = slots.find(s => s.examDate === selectedDate && s.session === selectedSession);
        return slot?.examNames || [];
    }, [slots, selectedDate, selectedSession]);

    if (isLoading) return (
        <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-5">
                <Spinner size="lg" color="primary" />
                <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[11px] animate-pulse">Accessing Control Gateway...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden font-sans pb-20">
            {/* Dynamic Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-violet-200/40 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-emerald-100/40 rounded-full blur-[120px] mix-blend-multiply" />
            </div>

            {/* Header Section */}
            <div className="relative z-10 bg-white/70 backdrop-blur-3xl border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)] pt-8 pb-10 px-8">
                <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30 flex items-center justify-center text-white relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Users2 size={28} className="drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                                    Invigilator <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Distribution Console</span>
                                </h1>
                                <Chip size="sm" variant="flat" color="success" className="font-bold border-none bg-emerald-100 text-emerald-700 animate-pulse">System Live</Chip>
                            </div>
                            <p className="text-slate-500 text-sm font-semibold tracking-wide flex items-center gap-2">
                                <ShieldCheck size={14} className="text-indigo-400" />
                                Examination Wing Control • Academic Year 2023-24
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-2.5 rounded-[2rem] shadow-lg shadow-slate-200/50 border border-slate-100">
                        <div className="px-5 py-2 text-right border-r border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Active Series</p>
                            <p className="text-sm font-bold text-slate-800">
                                {series.find(s => s.ExamSeriesID.toString() === selectedSeries)?.SeriesName || 'None Selected'}
                            </p>
                        </div>
                        <Button 
                            color="primary" 
                            className={`h-12 px-8 font-black rounded-3xl transition-all duration-300 ${isCommitted ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/30'} shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]`}
                            onPress={handleAutoAssign}
                            isDisabled={isAutoAssigning || halls.length === 0 || isCommitted}
                            startContent={isAutoAssigning ? <Spinner size="sm" color="white" /> : (isCommitted ? <CheckCircle2 size={18} /> : <Sparkles size={18} />)}
                        >
                            {isCommitted ? "Locked & Synced" : "Execute Allocation"}
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 relative z-10">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Sidebar Configuration */}
                    <aside className="xl:col-span-3 space-y-6">
                        <Card className="border-0 shadow-2xl shadow-slate-200/40 rounded-[2.5rem] bg-white/80 backdrop-blur-xl overflow-visible">
                            <CardBody className="p-8 space-y-8">
                                <div className="space-y-5">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <Layers size={14} />
                                        </div>
                                        Context Filters
                                    </h3>
                                    <div className="space-y-5">
                                        <div className="space-y-2 flex flex-col text-left">
                                            <label htmlFor="exam-series-select" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Exam Series</label>
                                            <Select
                                                id="exam-series-select"
                                                name="examSeries"
                                                size="md"
                                                variant="bordered"
                                                selectedKeys={selectedSeries ? new Set([selectedSeries]) : new Set()}
                                                onSelectionChange={(keys) => setSelectedSeries(Array.from(keys)[0] as string)}
                                                classNames={{ 
                                                    trigger: "h-14 bg-white/50 border-slate-200/60 hover:border-indigo-300 rounded-2xl transition-colors shadow-sm", 
                                                    value: "text-sm font-bold text-slate-700 text-left",
                                                    innerWrapper: "flex w-full items-center justify-between",
                                                    popoverContent: "bg-white border border-slate-100 shadow-2xl shadow-slate-200/60 rounded-[1.5rem] p-2",
                                                    selectorIcon: "text-slate-400 absolute right-4"
                                                }}
                                                listboxProps={{
                                                    itemClasses: {
                                                        base: "text-slate-700 font-medium data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-600 rounded-xl"
                                                    }
                                                }}
                                            >
                                                {series.map(s => <SelectItem key={s.ExamSeriesID.toString()} value={s.ExamSeriesID.toString()}>{s.SeriesName}</SelectItem>)}
                                            </Select>
                                        </div>
                                        <div className="space-y-2 flex flex-col text-left">
                                            <label htmlFor="exam-date-select" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Date</label>
                                            <Select
                                                id="exam-date-select"
                                                name="examDate"
                                                size="md"
                                                variant="bordered"
                                                isDisabled={!selectedSeries}
                                                selectedKeys={selectedDate ? new Set([selectedDate]) : new Set()}
                                                onSelectionChange={(keys) => setSelectedDate(Array.from(keys)[0] as string)}
                                                classNames={{ 
                                                    trigger: "h-14 bg-white/50 border-slate-200/60 hover:border-indigo-300 rounded-2xl transition-colors shadow-sm", 
                                                    value: "text-sm font-bold text-slate-700 text-left",
                                                    innerWrapper: "flex w-full items-center justify-between",
                                                    popoverContent: "bg-white border border-slate-100 shadow-2xl shadow-slate-200/60 rounded-[1.5rem] p-2",
                                                    selectorIcon: "text-slate-400 absolute right-4"
                                                }}
                                                listboxProps={{
                                                    itemClasses: {
                                                        base: "text-slate-700 font-medium data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-600 rounded-xl"
                                                    }
                                                }}
                                            >
                                                {uniqueDates.map(date => <SelectItem key={date} value={date}>{new Date(date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</SelectItem>)}
                                            </Select>
                                        </div>
                                        <div className="space-y-2 flex flex-col text-left">
                                            <label htmlFor="exam-session-select" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Session</label>
                                            <Select
                                                id="exam-session-select"
                                                name="examSession"
                                                size="md"
                                                variant="bordered"
                                                isDisabled={!selectedDate}
                                                selectedKeys={selectedSession ? new Set([selectedSession]) : new Set()}
                                                onSelectionChange={(keys) => setSelectedSession(Array.from(keys)[0] as string)}
                                                classNames={{ 
                                                    trigger: "h-14 bg-white/50 border-slate-200/60 hover:border-indigo-300 rounded-2xl transition-colors shadow-sm", 
                                                    value: "text-sm font-bold text-slate-700 text-left",
                                                    innerWrapper: "flex w-full items-center justify-between",
                                                    popoverContent: "bg-white border border-slate-100 shadow-2xl shadow-slate-200/60 rounded-[1.5rem] p-2",
                                                    selectorIcon: "text-slate-400 absolute right-4"
                                                }}
                                                listboxProps={{
                                                    itemClasses: {
                                                        base: "text-slate-700 font-medium data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-600 rounded-xl"
                                                    }
                                                }}
                                            >
                                                {availableSessions.map(session => <SelectItem key={session} value={session}>{session === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)'}</SelectItem>)}
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <Divider className="opacity-60" />

                                <div className="space-y-5">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <ClipboardCheck size={14} />
                                        </div>
                                        Deployment Stats
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-5 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-110 transition-transform"><Building2 size={40} /></div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 relative z-10">Target Halls</p>
                                            <p className="text-3xl font-black text-slate-800 relative z-10">{halls.length}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-5 rounded-2xl border border-indigo-200/60 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform"><UserCheck size={40} className="text-indigo-600" /></div>
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 relative z-10">Filled</p>
                                            <p className="text-3xl font-black text-indigo-700 relative z-10">{assignments.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-6 rounded-[2rem] space-y-3 shadow-lg shadow-amber-500/5 relative overflow-hidden"
                        >
                            <div className="absolute -right-4 -top-4 text-amber-200/40"><AlertCircle size={100} /></div>
                            <div className="flex items-center gap-2 text-amber-700 relative z-10">
                                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center animate-pulse">
                                    <AlertCircle size={14} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Alert</span>
                            </div>
                            <p className="text-xs font-bold text-amber-900/80 leading-relaxed relative z-10">
                                Ensure all faculty profiles are validated before executing the allocation engine.
                            </p>
                        </motion.div>
                    </aside>

                    {/* Main Content Workspace */}
                    <div className="xl:col-span-9 space-y-8">
                        {/* Subjects Header Card */}
                        <AnimatePresence>
                            {currentSlotExams.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <Card className="border-0 shadow-2xl shadow-slate-200/40 rounded-[2.5rem] bg-white/80 backdrop-blur-xl overflow-hidden">
                                        <div className="bg-gradient-to-r from-slate-50 to-white px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-[11px] font-black text-slate-600 uppercase tracking-widest">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                    <BookOpen size={16} />
                                                </div>
                                                Scheduled Subjects for this Slot
                                            </div>
                                            <Chip size="md" variant="flat" color="primary" className="font-bold bg-indigo-50 text-indigo-700 border-none">{currentSlotExams.length} Exams</Chip>
                                        </div>
                                        <CardBody className="p-8">
                                            <div className="flex flex-wrap gap-3">
                                                {currentSlotExams.map((name, i) => (
                                                    <div key={i} className="flex items-center gap-3 bg-white border border-slate-200/60 shadow-sm px-5 py-3 rounded-2xl group hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                                                        <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                            <GraduationCap size={16} />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-700 tracking-tight">{name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardBody>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Results Matrix */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20 flex items-center justify-center">
                                        <UserCheck size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Assignment Matrix</h2>
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1">Verified Pairing Results</p>
                                    </div>
                                </div>
                                {assignments.length > 0 && !isCommitted && (
                                    <Button 
                                        color="danger" 
                                        variant="shadow" 
                                        className="h-12 px-8 font-black rounded-2xl text-xs uppercase tracking-[0.15em] bg-rose-500 shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all"
                                        onPress={handleCommit}
                                        isLoading={isSaving}
                                        startContent={<Lock className="w-4 h-4" />}
                                    >
                                        Lock & Commit Deployment
                                    </Button>
                                )}
                            </div>

                            {assignments.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-300 p-24 text-center space-y-6 flex flex-col items-center justify-center min-h-[400px]"
                                >
                                    <div className="w-24 h-24 bg-white shadow-xl shadow-slate-200/50 rounded-full flex items-center justify-center relative">
                                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full animate-ping opacity-20" />
                                        <Target size={48} className="text-slate-300" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">No Deployment Matrix Found</h3>
                                        <p className="text-slate-500 text-sm max-w-md mx-auto font-medium leading-relaxed">
                                            Select a valid exam slot from the context filters and execute the allocation engine to generate assignments automatically.
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                                    {assignments.map((assignment, idx) => (
                                        <motion.div
                                            key={assignment.hallId}
                                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02, type: 'spring', stiffness: 200, damping: 20 }}
                                        >
                                            <Card className={`border-0 shadow-lg transition-all duration-300 rounded-[2rem] overflow-hidden group hover:-translate-y-1 hover:shadow-2xl ${isCommitted ? 'bg-gradient-to-br from-slate-50 to-white shadow-slate-200/50' : 'bg-white shadow-slate-200/40 ring-1 ring-slate-100 hover:ring-indigo-200'}`}>
                                                <CardBody className="p-0">
                                                    <div className="p-5 flex items-center justify-between bg-gradient-to-r from-slate-50 to-transparent border-b border-slate-100/50">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all transform group-hover:rotate-6 ${isCommitted ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                                                <MapPin size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Room</p>
                                                                <h4 className="font-black text-slate-800 text-base">{assignment.hallName}</h4>
                                                            </div>
                                                        </div>
                                                        <Avatar name={assignment.invigilatorName} size="sm" className="w-9 h-9 font-black text-[10px] bg-slate-800 text-white shadow-md ring-2 ring-white" />
                                                    </div>
                                                    
                                                    <div className="p-5 space-y-3 relative">
                                                        <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <UserCheck size={10} />
                                                                Supervisor
                                                            </span>
                                                            <Chip size="sm" variant="flat" color={isCommitted ? "success" : "warning"} className="h-5 px-2 text-[8px] font-black border-none uppercase tracking-wider">
                                                                {isCommitted ? 'Locked' : 'Draft'}
                                                            </Chip>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-800 truncate mb-1">{assignment.invigilatorName}</p>
                                                            <p className="text-[10px] font-bold text-indigo-600/80 uppercase tracking-widest truncate">{assignment.department || 'General Faculty'}</p>
                                                        </div>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {isCommitted && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 100 }}
                                    className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[3rem] p-12 text-center space-y-8 shadow-2xl relative overflow-hidden border border-slate-800 mt-8"
                                >
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIyIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDMiLz4KPC9zdmc+')] opacity-50" />
                                    <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none transform rotate-12 scale-150">
                                        <ShieldCheck size={200} />
                                    </div>
                                    
                                    <div className="relative z-10 space-y-6">
                                        <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)] ring-8 ring-emerald-500/20">
                                            <CheckCircle2 size={40} />
                                        </div>
                                        <div className="space-y-3">
                                            <h3 className="text-3xl font-black text-white tracking-tight">Deployment Secured</h3>
                                            <p className="text-indigo-200/80 text-sm max-w-md mx-auto font-medium leading-relaxed">
                                                The allocation plan for this session is locked and synchronized with the official roster. All invigilators have been assigned successfully.
                                            </p>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6">
                                            <Button 
                                                variant="shadow" 
                                                color="primary"
                                                className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black rounded-2xl h-14 px-8 shadow-indigo-500/30 hover:scale-105 transition-transform" 
                                                onPress={exportToPDF}
                                                startContent={<FileText className="w-5 h-5" />}
                                            >
                                                Download PDF Report
                                            </Button>
                                            <Button 
                                                variant="shadow" 
                                                color="success"
                                                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black rounded-2xl h-14 px-8 shadow-emerald-500/30 hover:scale-105 transition-transform" 
                                                onPress={exportToExcel}
                                                startContent={<TableIcon className="w-5 h-5" />}
                                            >
                                                Export Excel Data
                                            </Button>
                                            <Button 
                                                variant="bordered" 
                                                className="border-2 border-white/20 text-white hover:bg-white/10 font-black rounded-2xl h-14 px-8 backdrop-blur-md transition-colors" 
                                                onPress={() => setIsCommitted(false)}
                                                startContent={<Unlock className="w-5 h-5" />}
                                            >
                                                Modify Matrix
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default InvigilatorAssign;
