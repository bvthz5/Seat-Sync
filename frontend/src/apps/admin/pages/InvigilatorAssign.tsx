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
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <Spinner size="lg" color="primary" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Accessing Control Gateway...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Academic Control Header */}
            <div className="bg-[#0f172a] text-white pt-10 pb-24 px-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none">
                    <GraduationCap size={300} />
                </div>
                <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">System Live</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">
                            Invigilator <span className="text-indigo-400">Distribution Console</span>
                        </h1>
                        <p className="text-slate-400 text-sm font-medium">Academic Year 2023-24 • Examination Wing Control</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl backdrop-blur-sm border border-white/10">
                        <div className="px-4 py-2 text-right border-r border-white/10">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Series</p>
                            <p className="text-sm font-bold text-white">
                                {series.find(s => s.ExamSeriesID.toString() === selectedSeries)?.SeriesName || 'None Selected'}
                            </p>
                        </div>
                        <Button 
                            color="primary" 
                            variant="shadow" 
                            className="h-12 px-8 font-black rounded-xl bg-indigo-600 shadow-indigo-500/20"
                            onPress={handleAutoAssign}
                            isDisabled={isAutoAssigning || halls.length === 0 || isCommitted}
                            startContent={isAutoAssigning ? <Spinner size="sm" color="white" /> : <Sparkles size={18} />}
                        >
                            {isCommitted ? "Locked & Synced" : "Execute Allocation"}
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1400px] mx-auto px-8 -mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar Configuration */}
                    <aside className="lg:col-span-3 space-y-6">
                        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl">
                            <CardBody className="p-6 space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <Layers size={14} className="text-indigo-600" />
                                        Context Filters
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Series</label>
                                            <Select
                                                size="sm"
                                                variant="flat"
                                                selectedKeys={selectedSeries ? new Set([selectedSeries]) : new Set()}
                                                onSelectionChange={(keys) => setSelectedSeries(Array.from(keys)[0] as string)}
                                                classNames={{ trigger: "h-11 bg-slate-100/50 rounded-xl", value: "text-xs font-bold" }}
                                            >
                                                {series.map(s => <SelectItem key={s.ExamSeriesID.toString()} value={s.ExamSeriesID.toString()}>{s.SeriesName}</SelectItem>)}
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                            <Select
                                                size="sm"
                                                variant="flat"
                                                isDisabled={!selectedSeries}
                                                selectedKeys={selectedDate ? new Set([selectedDate]) : new Set()}
                                                onSelectionChange={(keys) => setSelectedDate(Array.from(keys)[0] as string)}
                                                classNames={{ trigger: "h-11 bg-slate-100/50 rounded-xl", value: "text-xs font-bold" }}
                                            >
                                                {uniqueDates.map(date => <SelectItem key={date} value={date}>{new Date(date).toLocaleDateString()}</SelectItem>)}
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Session</label>
                                            <Select
                                                size="sm"
                                                variant="flat"
                                                isDisabled={!selectedDate}
                                                selectedKeys={selectedSession ? new Set([selectedSession]) : new Set()}
                                                onSelectionChange={(keys) => setSelectedSession(Array.from(keys)[0] as string)}
                                                classNames={{ trigger: "h-11 bg-slate-100/50 rounded-xl", value: "text-xs font-bold" }}
                                            >
                                                {availableSessions.map(session => <SelectItem key={session} value={session}>{session}</SelectItem>)}
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <Divider />

                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <ClipboardCheck size={14} className="text-emerald-600" />
                                        Deployment Stats
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Target Halls</p>
                                            <p className="text-xl font-black text-slate-800">{halls.length}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Filled</p>
                                            <p className="text-xl font-black text-indigo-600">{assignments.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                        
                        <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] space-y-3">
                            <div className="flex items-center gap-2 text-amber-700">
                                <AlertCircle size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Operational Alert</span>
                            </div>
                            <p className="text-xs font-medium text-amber-900 leading-relaxed">
                                Ensure all faculty profiles are validated before executing the allocation engine.
                            </p>
                        </div>
                    </aside>

                    {/* Main Content Workspace */}
                    <div className="lg:col-span-9 space-y-8">
                        {/* Subjects Header Card */}
                        <AnimatePresence>
                            {currentSlotExams.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl bg-white overflow-hidden">
                                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <BookOpen size={14} className="text-indigo-600" />
                                                Scheduled Subjects for this Slot
                                            </div>
                                            <Chip size="sm" variant="flat" color="primary" className="font-bold">{currentSlotExams.length} Exams</Chip>
                                        </div>
                                        <CardBody className="p-6">
                                            <div className="flex flex-wrap gap-3">
                                                {currentSlotExams.map((name, i) => (
                                                    <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl group transition-all hover:border-indigo-200">
                                                        <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                            <GraduationCap size={14} />
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
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-lg flex items-center justify-center">
                                        <UserCheck size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Assignment Matrix</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified Pairing Results</p>
                                    </div>
                                </div>
                                {assignments.length > 0 && !isCommitted && (
                                    <Button 
                                        color="danger" 
                                        variant="solid" 
                                        className="h-11 px-8 font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-rose-200 hover:scale-105 active:scale-95 transition-all"
                                        onPress={handleCommit}
                                        isLoading={isSaving}
                                        startContent={<Lock className="w-4 h-4" />}
                                    >
                                        Lock & Commit Deployment
                                    </Button>
                                )}
                            </div>

                            {assignments.length === 0 ? (
                                <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-24 text-center space-y-6">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                        <Target size={40} className="text-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight">No Deployment Matrix Found</h3>
                                        <p className="text-slate-400 text-sm max-w-xs mx-auto">Select a valid exam slot and execute the engine to generate assignments.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {assignments.map((assignment, idx) => (
                                        <motion.div
                                            key={assignment.hallId}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.03 }}
                                        >
                                            <Card className={`border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-3xl overflow-hidden group ${isCommitted ? 'bg-slate-50 ring-1 ring-slate-200' : 'bg-white'}`}>
                                                <CardBody className="p-5 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                                                                <MapPin size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Room</p>
                                                                <h4 className="font-black text-slate-800 text-sm">{assignment.hallName}</h4>
                                                            </div>
                                                        </div>
                                                        <Avatar name={assignment.invigilatorName} size="sm" className="w-8 h-8 font-black text-[9px] bg-[#0f172a] text-white shadow-lg" />
                                                    </div>
                                                    
                                                    <Divider className="opacity-50" />
                                                    
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supervisor</span>
                                                            <Chip size="sm" variant="dot" color="success" className="h-5 text-[8px] font-black border-none bg-emerald-50 text-emerald-700">SECURE</Chip>
                                                        </div>
                                                        <p className="text-xs font-black text-slate-700 truncate">{assignment.invigilatorName}</p>
                                                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{assignment.department || 'General Faculty'}</p>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {isCommitted && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }} 
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[#0f172a] rounded-[2.5rem] p-10 text-center space-y-6 shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none transform rotate-12">
                                        <ShieldCheck size={160} />
                                    </div>
                                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-white tracking-tight">Deployment Secured</h3>
                                        <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">The allocation plan for this session is locked and synchronized with the official roster.</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                        <Button 
                                            variant="solid" 
                                            className="bg-indigo-600 text-white font-black rounded-xl h-12 px-8 shadow-lg shadow-indigo-200" 
                                            onPress={exportToPDF}
                                            startContent={<FileText className="w-4 h-4" />}
                                        >
                                            Download PDF Report
                                        </Button>
                                        <Button 
                                            variant="solid" 
                                            className="bg-emerald-600 text-white font-black rounded-xl h-12 px-8 shadow-lg shadow-emerald-200" 
                                            onPress={exportToExcel}
                                            startContent={<TableIcon className="w-4 h-4" />}
                                        >
                                            Export Excel Data
                                        </Button>
                                        <Button 
                                            variant="flat" 
                                            className="bg-white/10 text-white border border-white/10 hover:bg-white/20 font-black rounded-xl h-12 px-8" 
                                            onPress={() => setIsCommitted(false)}
                                            startContent={<Unlock className="w-4 h-4" />}
                                        >
                                            Modify Matrix
                                        </Button>
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
