import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Users, CheckCircle2, UserX, AlertCircle, AlertTriangle,
    Search, Filter, Save, FileSignature,
    ChevronDown, Printer, FileText, Upload, LayoutGrid, RefreshCcw, ClipboardList, Lock
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { invigilatorService } from '../../admin/services/invigilatorService';
import { SeatingService } from '../../admin/services/seatingService';

// --- TYPES ---
type AttendanceStatus = 'present' | 'absent' | 'unmarked';

interface SeatInfo {
    SeatID: number;
    RowLabel: string;
    BenchNumber: number;
    SeatNumber: number;
    IsActive: boolean;
}

interface Bench {
    rowLabel: string;
    benchNumber: number;
    seats: SeatInfo[];
}

interface Assignment {
    seatId: number;
    studentId: number;
    studentName: string;
    registerNumber: string;
    deptCode: string;
    side: 'left' | 'right';
    isEligible?: boolean;
    isBlocked?: boolean;
    subjectCode?: string;
    subjectName?: string;
    attendanceStatus?: AttendanceStatus;
}

export default function AttendanceConsole() {
    const { id: assignmentId } = useParams();
    const navigate = useNavigate();
    
    // States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [assignment, setAssignment] = useState<any>(null);
    const [benches, setBenches] = useState<Bench[]>([]);
    const [studentAllocations, setStudentAllocations] = useState<Record<number, Assignment>>({});
    const [localAttendance, setLocalAttendance] = useState<Record<number, AttendanceStatus>>({});
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'unmarked'>('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [revealCountdown, setRevealCountdown] = useState<string>("00:00:00");

    useEffect(() => {
        if (!assignment || assignment.isHallRevealed !== false) return;

        const session = assignment.Exam?.Session;
        const examDateStr = assignment.Exam?.ExamDate;
        const revealTime = examDateStr ? new Date(examDateStr) : new Date();
        if (session === 'FN') {
            revealTime.setHours(8, 30, 0, 0);
        } else {
            revealTime.setHours(12, 30, 0, 0);
        }

        const updateCountdown = () => {
            const now = new Date();
            const diff = revealTime.getTime() - now.getTime();
            
            if (diff <= 0) {
                setRevealCountdown("00:00:00");
                window.location.reload();
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            
            setRevealCountdown(
                `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
            );
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [assignment]);

    useEffect(() => {
        if (assignmentId) fetchData();
    }, [assignmentId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 1. Get assignment details
            const duty = await invigilatorService.getAssignmentDetails(assignmentId!);
            setAssignment(duty);

            if (duty.isHallRevealed === false) {
                setLoading(false);
                return;
            }

            const examDate = duty.Exam.ExamDate;
            const session = duty.Exam.Session;
            const roomId = duty.RoomID;

            // 2. Get hall layout
            const layout = await SeatingService.getHallLayout(roomId);
            setBenches(layout.benches || []);

            // 3. Get student allocations
            const alloc = await SeatingService.getAllocationForHall(examDate, session, roomId);
            const assignments = alloc.assignments || {};
            setStudentAllocations(assignments);

            // Initialize local attendance state
            const initialAttendance: Record<number, AttendanceStatus> = {};
            Object.values(assignments).forEach((a: any) => {
                initialAttendance[a.seatId] = a.attendanceStatus || 'unmarked';
            });
            setLocalAttendance(initialAttendance);

        } catch (err: any) {
            console.error("Failed to fetch attendance data:", err);
            setError(err.response?.data?.message || err.message || "Failed to load console");
        } finally {
            setLoading(false);
        }
    };

    // Derived Bench Rows for Layout
    const benchRows = useMemo(() => {
        const rows: Record<string, Bench[]> = {};
        for (const bench of benches) {
            if (!rows[bench.rowLabel]) rows[bench.rowLabel] = [];
            rows[bench.rowLabel].push(bench);
        }
        return Object.keys(rows)
            .sort()
            .map((rowLabel) => ({
                rowLabel,
                benches: (rows[rowLabel] || []).sort((a, b) => a.benchNumber - b.benchNumber),
            }));
    }, [benches]);

    // Derived Stats
    const stats = useMemo(() => {
        const allAllocatedSeatIds = Object.keys(studentAllocations).map(Number);
        const present = allAllocatedSeatIds.filter(sid => localAttendance[sid] === 'present').length;
        const absent = allAllocatedSeatIds.filter(sid => localAttendance[sid] === 'absent').length;
        const unmarked = allAllocatedSeatIds.filter(sid => !localAttendance[sid] || localAttendance[sid] === 'unmarked').length;
        
        return {
            total: allAllocatedSeatIds.length,
            present,
            absent,
            unmarked,
        };
    }, [studentAllocations, localAttendance]);

    const handleSeatClick = (seatId: number) => {
        if (!studentAllocations[seatId]) return; // No student assigned to this seat

        setLocalAttendance(prev => {
            const current = prev[seatId] || 'unmarked';
            let next: AttendanceStatus = 'present';
            if (current === 'present') next = 'absent';
            else if (current === 'absent') next = 'unmarked';
            
            return { ...prev, [seatId]: next };
        });
    };

    const handleMarkAllPresent = () => {
        const nextAttendance = { ...localAttendance };
        Object.keys(studentAllocations).forEach(seatIdStr => {
            const seatId = Number(seatIdStr);
            if (!nextAttendance[seatId] || nextAttendance[seatId] === 'unmarked') {
                nextAttendance[seatId] = 'present';
            }
        });
        setLocalAttendance(nextAttendance);
        toast.success("Remaining unmarked students set to Present.");
    };

    const handleSubmit = () => {
        if (stats.unmarked > 0) {
            toast.error(`Cannot submit. ${stats.unmarked} students are still unmarked.`);
            return;
        }
        setShowSignatureModal(true);
    };

    const confirmSubmission = async () => {
        setIsSubmitting(true);
        try {
            const students = Object.values(studentAllocations).map(a => ({
                StudentID: a.studentId,
                IsPresent: localAttendance[a.seatId] === 'present'
            }));

            await invigilatorService.saveAttendance(Number(assignmentId), students);
            
            toast.success("Attendance locked and submitted successfully.");
            navigate('/invigilator/dashboard');
        } catch (error: any) {
            console.error("Submission error:", error);
            toast.error(error.response?.data?.message || "Failed to submit attendance");
        } finally {
            setIsSubmitting(false);
            setShowSignatureModal(false);
        }
    };

    if (!assignmentId) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 shadow-sm border border-blue-200">
                    <ClipboardList size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Duty Not Selected</h2>
                <p className="text-slate-500 max-w-md mb-6">Please select an active duty from your dashboard to mark attendance for a specific room.</p>
                <button onClick={() => navigate('/invigilator/dashboard')} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                    Go to Dashboard
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 font-sans">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Initializing Console...</p>
            </div>
        );
    }

    if (error || !assignment) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-4 shadow-sm border border-red-200">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Console Error</h2>
                <p className="text-slate-500 max-w-md mb-6">{error || "Assignment details not found."}</p>
                <button onClick={fetchData} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <RefreshCcw size={18} /> Retry
                </button>
            </div>
        );
    }

    if (assignment && assignment.isHallRevealed === false) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 mb-6 shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/50 to-transparent"></div>
                    <Lock size={40} className="relative z-10" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-widest mb-3 text-slate-800">Hall Locked</h2>
                <p className="text-slate-500 max-w-md text-sm font-semibold leading-relaxed mb-6">
                    For security reasons, your assigned exam room and attendance list will be revealed exactly <span className="text-blue-600">1 hour</span> before the session starts.
                </p>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unlocking In</p>
                    <div className="text-3xl font-mono font-black text-slate-700 tracking-wider">
                        {revealCountdown}
                    </div>
                </div>
                <button onClick={() => navigate('/invigilator/dashboard')} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all">
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const ROOM_INFO = {
        roomCode: assignment.Room?.RoomCode || "Unknown",
        block: assignment.Room?.Block?.BlockName || "Main Block",
        exam: assignment.Exam?.ExamName || "Internal Exam",
        time: assignment.Exam?.Session === "FN" ? "9:30 - 12:30" : "13:30 - 16:30",
        totalSeats: stats.total,
        supervisor: "Faculty Invigilator",
    };

    // Filter Logic
    const filteredAllocations = Object.values(studentAllocations).filter(a => {
        const status = localAttendance[a.seatId] || 'unmarked';
        if (filter !== 'all' && status !== filter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return a.registerNumber.toLowerCase().includes(q) ||
                   a.studentName.toLowerCase().includes(q);
        }
        return true;
    }).sort((a, b) => {
        // Sort by seat label (Row + Bench + Side)
        const seatA = benches.flatMap(b => b.seats).find(s => s.SeatID === a.seatId);
        const seatB = benches.flatMap(b => b.seats).find(s => s.SeatID === b.seatId);
        if (!seatA || !seatB) return 0;
        if (seatA.RowLabel !== seatB.RowLabel) return seatA.RowLabel.localeCompare(seatB.RowLabel);
        return seatA.BenchNumber - seatB.BenchNumber;
    });

    // Grouping for layout is handled by benchRows state

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-200">

            {/* 1. TOP COMMAND BAR */}
            <header className="bg-[#0F172A] text-white sticky top-0 z-40 shadow-xl border-b border-white/10 shrink-0">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/invigilator/dashboard')}
                            className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition-colors text-slate-300 hover:text-white"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
                                Digital Attendance Console
                                <span className="bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest border border-blue-500/30">
                                    LIVE
                                </span>
                            </h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">
                                {ROOM_INFO.roomCode} • {ROOM_INFO.exam}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Stats mini display */}
                        <div className="hidden md:flex items-center bg-white/5 rounded-xl border border-white/10 p-1">
                            <div className="px-3 py-1 flex items-center gap-1.5 text-slate-300">
                                <Users size={14} className="text-slate-400" />
                                <span className="font-bold text-sm">{stats.total}</span>
                            </div>
                            <div className="w-px h-4 bg-white/10 mx-1"></div>
                            <div className="px-3 py-1 flex items-center gap-1.5 text-emerald-400">
                                <CheckCircle2 size={14} />
                                <span className="font-bold text-sm">{stats.present}</span>
                            </div>
                            <div className="w-px h-4 bg-white/10 mx-1"></div>
                            <div className="px-3 py-1 flex items-center gap-1.5 text-red-400">
                                <UserX size={14} />
                                <span className="font-bold text-sm">{stats.absent}</span>
                            </div>
                        </div>

                        {/* Emergency Alert Button */}
                        <button
                            onClick={() => {
                                toast.error("EMERGENCY ALERT SENT TO CONTROL ROOM", { duration: 5000, icon: '🚨' });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-500/20 border border-red-500 mr-2"
                        >
                            <AlertTriangle size={16} className="animate-pulse" />
                            <span className="hidden sm:inline">Emergency Alert</span>
                        </button>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={stats.unmarked > 0}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-lg ${stats.unmarked > 0
                                ? 'bg-slate-700 text-slate-400 border border-slate-600 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 shadow-blue-500/20'
                                }`}
                        >
                            <Save size={16} />
                            Lock Attendance
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* 2. LEFT PANEL: Controls & List View */}
                <aside className="w-[340px] xl:w-[400px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">

                    {/* Action Panel */}
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
                        <div className="flex gap-2">
                            <button
                                onClick={handleMarkAllPresent}
                                disabled={stats.unmarked === 0}
                                className="flex-1 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
                            >
                                Mark Remaining Present
                            </button>
                            <button className="px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors shadow-sm" title="Upload Scan">
                                <Upload size={16} />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => toast.success("Request for Additional Answer Sheets sent to Exam Cell.", { icon: '📄' })}
                                className="flex-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold py-2 rounded-xl text-[11px] transition-colors shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <FileText size={14} /> Req. Answer Sheets
                            </button>
                            <button
                                onClick={() => toast.success("Reliever requested. A staff member will arrive shortly.", { icon: '🧑‍🏫' })}
                                className="flex-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 font-bold py-2 rounded-xl text-[11px] transition-colors shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <Users size={14} /> Req. Reliever
                            </button>
                        </div>
                    </div>

                    {/* Progress Ring / Master Stat */}
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tabular-nums">
                                {stats.present + stats.absent} <span className="text-sm text-slate-400 font-medium">/ {stats.total}</span>
                            </h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Seats Marked</p>
                        </div>
                        {/* CSS Progress Ring */}
                        <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-slate-100">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className={`${stats.unmarked === 0 ? 'text-emerald-500' : 'text-blue-500'} transition-all duration-1000`} strokeDasharray={`${((stats.present + stats.absent) / stats.total) * 100}, 100`} strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="absolute text-xs font-bold text-slate-700">{Math.round(((stats.present + stats.absent) / stats.total) * 100)}%</span>
                        </div>
                    </div>

                    {/* Filters & Search */}
                    <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input id="input-2w75d9z" name="input-2w75d9z" type="text"
                                placeholder="Search seat or Reg No..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-100/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            />
                        </div>
                        <div className="flex gap-1 bg-slate-100/50 p-1 rounded-xl">
                            {['all', 'unmarked', 'present', 'absent'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as any)}
                                    className={`flex-1 flex justify-center py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filter === f ? 'bg-white text-slate-800 shadow shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Student List View */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 bg-slate-50/50">
                        {filteredAllocations.map(alloc => {
                            const status = localAttendance[alloc.seatId] || 'unmarked';
                            const seat = benches.flatMap(b => b.seats).find(s => s.SeatID === alloc.seatId);
                            const seatLabel = seat ? `${seat.RowLabel}${seat.BenchNumber}` : '--';
                            
                            return (
                                <div
                                    key={alloc.seatId}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none group ${
                                        status === 'present' ? 'bg-emerald-50/50 border-emerald-100' :
                                        status === 'absent' ? 'bg-red-50/50 border-red-100' :
                                        'bg-white border-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div 
                                            onClick={() => handleSeatClick(alloc.seatId)}
                                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                                                status === 'present' ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                status === 'absent' ? 'bg-red-500 border-red-500 text-white' :
                                                'bg-white border-slate-300 hover:border-blue-400'
                                            }`}
                                        >
                                            {status === 'present' && <CheckCircle2 size={14} strokeWidth={3} />}
                                            {status === 'absent' && <UserX size={14} strokeWidth={3} />}
                                        </div>
                                        
                                        <div 
                                            onClick={() => handleSeatClick(alloc.seatId)}
                                            className="flex flex-col cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{seatLabel}</span>
                                                <span className={`font-black text-sm ${
                                                    status === 'present' ? 'text-emerald-900' :
                                                    status === 'absent' ? 'text-red-900' :
                                                    'text-slate-700'
                                                }`}>{alloc.registerNumber}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate max-w-[150px]">{alloc.studentName}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => setLocalAttendance(prev => ({ ...prev, [alloc.seatId]: 'present' }))}
                                            className={`p-1.5 rounded-lg transition-all ${status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}`}
                                            title="Mark Present"
                                        >
                                            <CheckCircle2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => setLocalAttendance(prev => ({ ...prev, [alloc.seatId]: 'absent' }))}
                                            className={`p-1.5 rounded-lg transition-all ${status === 'absent' ? 'bg-red-100 text-red-600' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                                            title="Mark Absent"
                                        >
                                            <UserX size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredAllocations.length === 0 && (
                            <div className="py-10 text-center flex flex-col items-center opacity-50">
                                <Search className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-sm font-bold text-slate-500">No students match filter</span>
                            </div>
                        )}
                    </div>
                </aside>

                {/* 3. RIGHT PANEL: Visual Seating Grid Map */}
                <main className="flex-1 bg-slate-100 overflow-hidden flex flex-col relative inner-shadow-left">
                    {/* Visual Grid Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-200/80 bg-slate-50 shrink-0">
                        <div>
                            <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                                <LayoutGrid className="text-blue-500" size={18} /> Interactive Seat Map
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 mt-1">Tap a seat to cycle status: Unmarked → Present → Absent</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Legend */}
                            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs font-bold text-slate-600">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></span> Unmarked</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]"></span> Present</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-600 shadow-[0_0_8px_rgba(248,113,113,0.4)]"></span> Absent</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Grid Area */}
                    <div className="flex-1 overflow-auto bg-slate-100 p-8 custom-scrollbar">
                        <div className="max-w-5xl mx-auto">

                            {/* Teacher Desk indicator */}
                            <div className="w-48 h-8 bg-[#0F172A] mx-auto rounded-t-xl rounded-b-sm border-b-2 border-slate-800 shadow-xl flex items-center justify-center mb-10 relative">
                                <span className="text-white font-bold text-[8px] tracking-widest uppercase opacity-80">Teacher's Desk</span>
                            </div>

                            {/* Rotated Grid Layout - Unified Grid for Perfect Alignment */}
                            <div className="pb-32 flex justify-center">
                                {benchRows.length === 0 ? (
                                    <div className="py-20 text-center opacity-30 flex flex-col items-center justify-center min-w-[600px]">
                                        <DoorOpen size={40} className="mb-4 stroke-1" />
                                        <h3 className="text-base font-black uppercase tracking-widest text-slate-500">No Active Layout</h3>
                                    </div>
                                ) : (
                                    <div 
                                        className="grid gap-x-8 gap-y-6 items-center"
                                        style={{ 
                                            gridTemplateColumns: `min-content repeat(${benchRows.length}, min-content)`,
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {/* COLUMN HEADERS ROW */}
                                        <div /> {/* Row Number Spacer */}
                                        {benchRows.map(({ rowLabel }) => (
                                            <div key={rowLabel} className="flex justify-center pb-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 shadow-xl flex items-center justify-center text-lg font-black text-white border border-slate-800/50 transform -rotate-1">
                                                    {rowLabel}
                                                </div>
                                            </div>
                                        ))}

                                        {/* GRID BODY */}
                                        {Array.from({ length: Math.max(...benchRows.map(r => r.benches.length), 0) }).map((_, benchIdx) => (
                                            <React.Fragment key={benchIdx}>
                                                {/* Row Number Label */}
                                                <div className="flex flex-col items-center justify-center pr-4">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">ROW</span>
                                                    <div className="w-7 h-7 flex items-center justify-center text-[11px] font-black text-blue-600 bg-blue-50 border border-blue-100 rounded-lg shadow-sm">
                                                        {benchIdx + 1}
                                                    </div>
                                                </div>

                                                {/* Benches for this index across all columns */}
                                                {benchRows.map(({ rowLabel, benches: colBenches }) => {
                                                    const bench = colBenches[benchIdx];
                                                    if (!bench) return <div key={rowLabel} className="w-[168px]" />; // Matching width of bench + padding

                                                    return (
                                                        <div key={`${rowLabel}-${bench.benchNumber}`} className="flex gap-2.5 p-1.5 bg-white rounded-[2rem] border border-slate-200/80 shadow-sm relative group hover:border-blue-300 transition-all backdrop-blur-sm">
                                                            {bench.seats.map((seat: any) => {
                                                                const alloc = studentAllocations[seat.SeatID];
                                                                const status = localAttendance[seat.SeatID] || 'unmarked';
                                                                const isSearching = searchQuery && alloc && (
                                                                    alloc.registerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                    alloc.studentName.toLowerCase().includes(searchQuery.toLowerCase())
                                                                );
                                                                const isFiltered = filter !== 'all' && status !== filter;

                                                                return (
                                                                    <button
                                                                        key={seat.SeatID}
                                                                        onClick={() => handleSeatClick(seat.SeatID)}
                                                                        disabled={!alloc}
                                                                        className={`
                                                                            relative w-[75px] h-[100px] rounded-2xl flex flex-col items-center justify-between p-2.5 transition-all active:scale-95 group/seat focus:outline-none border-2
                                                                            ${!alloc ? 'bg-slate-50 border-2 border-dashed border-slate-100 cursor-not-allowed opacity-20' : 
                                                                              status === 'present' ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20 shadow-lg' :
                                                                              status === 'absent' ? 'bg-red-500 border-red-600 text-white shadow-red-500/20 shadow-lg' :
                                                                              'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:shadow-md'}
                                                                            ${isSearching ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                                                                            ${isFiltered ? 'opacity-20 grayscale' : 'opacity-100'}
                                                                        `}
                                                                    >
                                                                        {/* Side Indicator */}
                                                                        <div className={`absolute top-1.5 ${seat.SeatNumber === 1 ? 'left-2' : 'right-2'} text-[7px] font-black uppercase opacity-40`}>
                                                                            {seat.SeatNumber === 1 ? 'L' : 'R'}
                                                                        </div>

                                                                        {alloc ? (
                                                                            <div className="mt-2.5 flex flex-col items-center">
                                                                                <span className={`text-[9px] font-black tracking-tighter leading-none mb-1 ${status === 'unmarked' ? 'text-[#0F172A]' : 'text-white'}`}>
                                                                                    {alloc.registerNumber}
                                                                                </span>
                                                                                <span className={`text-[7px] font-bold uppercase tracking-tighter truncate w-full text-center ${status === 'unmarked' ? 'text-slate-400' : 'text-white/80'}`}>
                                                                                    {alloc.studentName.split(' ')[0]}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex-1 flex items-center justify-center">
                                                                                <span className="text-[7px] font-black text-slate-200 tracking-widest uppercase">Vacant</span>
                                                                            </div>
                                                                        )}

                                                                        {alloc && (
                                                                            <div className="mt-auto">
                                                                                {status === 'present' && <CheckCircle2 size={16} className="text-white" strokeWidth={3} />}
                                                                                {status === 'absent' && <UserX size={16} className="text-white" strokeWidth={3} />}
                                                                                {status === 'unmarked' && <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>}
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>


                            {/* End of Zone */}
                            <div className="mt-24 text-center">
                                <div className="inline-flex items-center gap-4 px-6 py-2 bg-slate-200/50 rounded-full text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-300/50">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></div>
                                    End of Hall Zone
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* --- SIGNATURE MODAL --- */}
            <AnimatePresence>
                {showSignatureModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setShowSignatureModal(false)} />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
                        >
                            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center rotate-3 shadow-inner">
                                    <FileSignature size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-800">Confirm Submission</h3>
                                    <p className="text-sm font-medium text-slate-500 mt-0.5">Finalize and lock attendance records.</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col">
                                        <span className="text-3xl font-black text-emerald-600">{stats.present}</span>
                                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest mt-1">Present</span>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col">
                                        <span className="text-3xl font-black text-red-600">{stats.absent}</span>
                                        <span className="text-[11px] font-bold text-red-800 uppercase tracking-widest mt-1">Absent</span>
                                    </div>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200/50 flex gap-3 text-amber-800">
                                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                    <div className="text-sm leading-relaxed">
                                        <span className="font-bold">Warning:</span> Once submitted, attendance cannot be modified without Chief Superintendent approval.
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                                <button
                                    onClick={() => setShowSignatureModal(false)}
                                    disabled={isSubmitting}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSubmission}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-[#0F172A] hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-white animate-spin"></div>
                                            Locking...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} /> Confirm & Sign
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
