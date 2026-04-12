import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Users, CheckCircle2, UserX, AlertCircle,
    Search, Filter, Save, FileSignature,
    ChevronDown, Printer, FileText, Upload, LayoutGrid
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// --- MOCK DATA ---
const ROOM_INFO = {
    roomCode: "A-204",
    block: "Block 2",
    exam: "OS – MCA (FN Session)",
    time: "9:30 - 12:30",
    totalSeats: 32,
    supervisor: "Prof. John Mathew",
};

type AttendanceStatus = 'present' | 'absent' | 'unmarked';

interface StudentSeat {
    id: string; // e.g., "A1"
    col: string; // "A"
    row: number; // 1
    studentId: string; // e.g., "MCA204"
    name: string;
    photoUrl?: string;
    status: AttendanceStatus;
}

const generateMockSeats = (): StudentSeat[] => {
    const cols = ['A', 'B', 'C', 'D'];
    const rows = 8; // 32 total
    let seats: StudentSeat[] = [];
    let studentCounter = 100;

    cols.forEach(col => {
        for (let i = 1; i <= rows; i++) {
            seats.push({
                id: `${col}${i}`,
                col,
                row: i,
                studentId: `MCA2026${studentCounter++}`,
                name: `Student ${col}${i}`,
                status: 'unmarked'
            });
        }
    });
    return seats;
};

// --- ANIMATIONS ---
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.03 }
    }
};

const itemVariants: any = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }
};

export default function AttendanceConsole() {
    const navigate = useNavigate();
    const [seats, setSeats] = useState<StudentSeat[]>(generateMockSeats());
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'unmarked'>('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);

    // Derived Stats
    const stats = {
        total: seats.length,
        present: seats.filter(s => s.status === 'present').length,
        absent: seats.filter(s => s.status === 'absent').length,
        unmarked: seats.filter(s => s.status === 'unmarked').length,
    };

    const handleSeatClick = (seatId: string) => {
        setSeats(prev => prev.map(seat => {
            if (seat.id === seatId) {
                // Cycle: unmarked -> present -> absent -> unmarked
                let nextStatus: AttendanceStatus = 'present';
                if (seat.status === 'present') nextStatus = 'absent';
                if (seat.status === 'absent') nextStatus = 'unmarked'; // or present, if you don't allow returning to unmarked

                // Play sound or haptic optionally here
                return { ...seat, status: nextStatus };
            }
            return seat;
        }));
    };

    const handleMarkAllPresent = () => {
        setSeats(prev => prev.map(s => s.status === 'unmarked' ? { ...s, status: 'present' } : s));
        toast.success("Remaining unmarked students set to Present.");
    };

    const handleSubmit = () => {
        if (stats.unmarked > 0) {
            toast.error(`Cannot submit. ${stats.unmarked} students are still unmarked.`);
            return;
        }
        setShowSignatureModal(true);
    };

    const confirmSubmission = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setShowSignatureModal(false);
            toast.success("Attendance locked and submitted successfully.");
            navigate('/invigilator/dashboard');
        }, 1500);
    };

    // Filter Logic
    const filteredSeats = seats.filter(s => {
        if (filter !== 'all' && s.status !== filter) return false;
        if (searchQuery) {
            return s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.studentId.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
    });

    // Grouping by columns for layout
    const cols = ['A', 'B', 'C', 'D'];

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
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
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
                        {filteredSeats.map(seat => (
                            <div
                                key={seat.id}
                                onClick={() => handleSeatClick(seat.id)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none group ${seat.status === 'present' ? 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-200' :
                                    seat.status === 'absent' ? 'bg-red-50/50 border-red-100 hover:border-red-200' :
                                        'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${seat.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                                        seat.status === 'absent' ? 'bg-red-100 text-red-700' :
                                            'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700'
                                        }`}>
                                        {seat.id}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-bold text-sm ${seat.status === 'present' ? 'text-emerald-900' :
                                            seat.status === 'absent' ? 'text-red-900' :
                                                'text-slate-700'
                                            }`}>{seat.studentId}</span>
                                        <span className="text-[10px] font-semibold text-slate-400">{seat.name}</span>
                                    </div>
                                </div>
                                <div>
                                    {seat.status === 'present' && <CheckCircle2 size={18} className="text-emerald-500" strokeWidth={3} />}
                                    {seat.status === 'absent' && <UserX size={18} className="text-red-500" strokeWidth={3} />}
                                    {seat.status === 'unmarked' && <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-blue-400"></div>}
                                </div>
                            </div>
                        ))}
                        {filteredSeats.length === 0 && (
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
                            <div className="w-64 h-12 bg-[#0F172A] mx-auto rounded-t-xl rounded-b-sm border-b-4 border-slate-800 shadow-xl flex items-center justify-center mb-16 relative">
                                <span className="text-white font-bold text-sm tracking-widest uppercase opacity-80">Teacher's Desk</span>
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-slate-400">
                                    <ChevronDown size={20} className="animate-bounce" />
                                </div>
                            </div>

                            {/* Column Grid Layout */}
                            <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex justify-center gap-8 sm:gap-12 md:gap-16">
                                {cols.map(col => (
                                    <div key={col} className="flex flex-col gap-3">
                                        <div className="text-center font-black text-slate-300 text-2xl mb-2">{col}</div>
                                        {/* Sort seats for this column by row */}
                                        {seats.filter(s => s.col === col).sort((a, b) => a.row - b.row).map(seat => (
                                            <motion.button
                                                variants={itemVariants}
                                                key={seat.id}
                                                onClick={() => handleSeatClick(seat.id)}
                                                className={`
                                                    relative w-[70px] h-[75px] sm:w-[85px] sm:h-[90px] rounded-xl flex flex-col items-center justify-center p-2 shadow-sm transition-all active:scale-95 group focus:outline-none focus:ring-4 focus:ring-blue-500/30
                                                    ${seat.status === 'present' ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-500/20 shadow-lg border-b-4 border-emerald-600' :
                                                        seat.status === 'absent' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/20 shadow-lg border-b-4 border-red-700' :
                                                            'bg-white text-slate-700 hover:bg-slate-50 border-b-4 border-slate-200 hover:border-blue-200'}
                                                    ${(searchQuery && (seat.id.toLowerCase().includes(searchQuery.toLowerCase()) || seat.studentId.toLowerCase().includes(searchQuery.toLowerCase()))) ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
                                                    ${(filter !== 'all' && seat.status !== filter) ? 'opacity-20 grayscale' : 'opacity-100'}
                                                `}
                                            >
                                                {/* Seat Badge */}
                                                <div className={`absolute -top-2.5 -left-2.5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm ${seat.status === 'present' ? 'bg-emerald-700 text-emerald-100' :
                                                    seat.status === 'absent' ? 'bg-red-800 text-red-100' :
                                                        'bg-[#0F172A] text-white'
                                                    }`}>
                                                    {seat.id}
                                                </div>

                                                {/* Content */}
                                                {seat.status === 'unmarked' ? (
                                                    <span className="text-[10px] font-bold text-slate-400 mt-1">{seat.studentId}</span>
                                                ) : seat.status === 'present' ? (
                                                    <CheckCircle2 size={28} className="text-emerald-100 mt-1" strokeWidth={2.5} />
                                                ) : (
                                                    <UserX size={28} className="text-red-100 mt-1" strokeWidth={2.5} />
                                                )}

                                            </motion.button>
                                        ))}
                                    </div>
                                ))}
                            </motion.div>

                            {/* Room Info Footer in Map */}
                            <div className="mt-16 text-center text-slate-400 font-medium text-xs">
                                End of Zone
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
