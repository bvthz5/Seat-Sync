import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarDays,
    BookOpen,
    CheckCircle2,
    CalendarClock,
    ArrowRight,
    MapPin,
    Clock3,
    AlertCircle,
    ChevronRight,
    Loader2,
    Bell,
    Info,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { studentPortalApi, StudentDashboardResponse } from '../services/studentPortal';

const StudentDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await studentPortalApi.getDashboard();
                setData(res);
            } catch (err) {
                console.error('Failed to load dashboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();

        // Sync local time every second
        const timer = setInterval(() => setNow(new Date()), 1000);
        
        // Refresh data every 2 minutes to keep status synced with backend
        const dataRefresh = setInterval(fetchDashboard, 120000);

        return () => {
            clearInterval(timer);
            clearInterval(dataRefresh);
        };
    }, []);

    // Deriving state for the "Highlight" exam (Today's or Next)
    const targetExam = useMemo(() => data?.targetExam || data?.upcomingExams?.[0], [data]);

    const examTiming = useMemo(() => {
        if (!targetExam?.startTime) return null;
        const start = new Date(targetExam.startTime);
        const end = new Date(start.getTime() + (targetExam.duration || 180) * 60000);
        return { start, end };
    }, [targetExam]);

    const statusInfo = useMemo(() => {
        if (!examTiming) return { status: 'UPCOMING', label: 'Upcoming', color: 'bg-slate-50 text-slate-500' };
        
        if (now < examTiming.start) {
            return { status: 'UPCOMING', label: 'Upcoming', color: 'bg-blue-50 text-blue-600 border-blue-100' };
        } else if (now >= examTiming.start && now < examTiming.end) {
            return { status: 'LIVE', label: 'Live Now', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' };
        } else {
            return { status: 'COMPLETED', label: 'Completed', color: 'bg-slate-100 text-slate-400 border-slate-200' };
        }
    }, [examTiming, now]);

    const countdown = useMemo(() => {
        if (!examTiming) return null;
        
        let target = examTiming.start;
        let prefix = "Starts in";
        
        if (now >= examTiming.start && now < examTiming.end) {
            target = examTiming.end;
            prefix = "Ends in";
        } else if (now >= examTiming.end) {
            return { h: '00', m: '00', s: '00', prefix: 'Ended', expired: true };
        }

        const diff = target.getTime() - now.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        return {
            h: String(h).padStart(2, '0'),
            m: String(m).padStart(2, '0'),
            s: String(s).padStart(2, '0'),
            prefix,
            expired: now >= examTiming.end
        };
    }, [examTiming, now]);

    const canViewSeating = useMemo(() => {
        if (!targetExam) return false;
        // The backend already calculates isSeatingVisible based on the 45-min rule
        // But for real-time UI switching, we recalculate locally too
        if (targetExam.isSeatingVisible) return true;
        
        if (!examTiming) return false;
        const visibleAt = new Date(examTiming.start.getTime() - 45 * 60 * 1000);
        return now >= visibleAt;
    }, [targetExam, examTiming, now]);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
                <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="mb-6"
                >
                    <BookOpen size={60} className="text-indigo-600 opacity-20" />
                </motion.div>
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Synchronizing Terminal</p>
            </div>
        );
    }

    const stats = [
        { label: "Today's Exams", value: data?.todayExam ? '1' : '0', icon: CalendarDays, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Registered Papers', value: String(data?.stats?.totalExams || 0), icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'History', value: String(data?.history?.length || 0), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Next Session', value: targetExam?.session || '—', icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-20 px-4 sm:px-6">
            {/* Minimal Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-1 font-semibold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Academic identity: {data?.student?.registerNumber}
                    </p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Network Live: {now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
            </header>

            {/* Premium Exam Highlight Card */}
            <section className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                    <div className="grid lg:grid-cols-[1fr_350px]">
                        <div className="p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-slate-100">
                            <div className="flex items-center gap-3 mb-8">
                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border ${statusInfo.color}`}>
                                    {statusInfo.label}
                                </span>
                                <span className="text-slate-200">/</span>
                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <Clock3 size={14} className="text-slate-300" />
                                    {targetExam?.duration} MINS DURATION
                                </div>
                            </div>

                            {targetExam ? (
                                <div className="space-y-8">
                                    <h2 className="text-4xl sm:text-5xl font-black text-slate-900 leading-none tracking-tight">
                                        {targetExam.subject}
                                    </h2>
                                    
                                    <div className="grid sm:grid-cols-2 gap-8">
                                        <div className="flex items-start gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-500">
                                                <CalendarClock size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Schedule</p>
                                                <p className="font-extrabold text-slate-800 text-lg">{targetExam.dateLabel}</p>
                                                <p className="text-sm font-bold text-slate-500">Session {targetExam.session}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-500">
                                                <MapPin size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Seating Portal</p>
                                                <p className="font-extrabold text-slate-800 text-lg">
                                                    {data?.seating?.roomCode || (canViewSeating ? 'Checking...' : 'Pending Visibility')}
                                                </p>
                                                <p className="text-sm font-bold text-slate-500">
                                                    {data?.seating ? `${data.seating.blockName}, ${data.seating.floorName}` : (canViewSeating ? 'Retrieving assignment' : 'Visible 45m before')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                        <button
                                            onClick={() => canViewSeating && navigate(`/student/seating/${targetExam.examId}`)}
                                            className={`px-10 py-5 rounded-[1.25rem] font-black flex items-center justify-center gap-4 transition-all duration-500 ${
                                                canViewSeating
                                                    ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] transform hover:-translate-y-1'
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {canViewSeating ? 'VIEW SEATING DETAILS' : 'SEATING LOCKED'} 
                                            <ArrowRight size={20} className={canViewSeating ? 'animate-bounce-x' : ''} />
                                        </button>
                                        <Link to="/student/exams" className="px-8 py-5 rounded-[1.25rem] font-bold text-slate-600 hover:bg-slate-50 text-center transition-all border border-transparent hover:border-slate-200">
                                            MY FULL SCHEDULE
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 size={40} className="text-slate-300" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-400">All Clear.</h3>
                                    <p className="text-slate-500 mt-2 font-medium">No active or upcoming exams found.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 sm:p-12 bg-slate-900 flex flex-col justify-center items-center text-center relative overflow-hidden">
                            {/* Decorative background pattern */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] -mr-32 -mt-32" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] -ml-32 -mb-32" />
                            </div>

                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-10 relative z-10">
                                {countdown?.prefix || 'System Clock'}
                            </p>
                            
                            <div className="flex gap-6 relative z-10">
                                {[
                                    { label: 'HR', value: countdown?.h || '00' },
                                    { label: 'MIN', value: countdown?.m || '00' },
                                    { label: 'SEC', value: countdown?.s || '00' },
                                ].map((unit, i) => (
                                    <div key={unit.label} className="flex flex-col items-center">
                                        <div className="relative">
                                            <span className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tighter block tabular-nums">
                                                {unit.value}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase mt-2 tracking-widest">{unit.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 flex items-center gap-3 text-white bg-white/5 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-sm relative z-10">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Reporting: 30M PRIOR</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Stats Grid */}
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ y: -5 }}
                        className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6 group cursor-default"
                    >
                        <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110`}>
                            <stat.icon size={28} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                            <h4 className="text-3xl font-black text-slate-900 mt-0.5">{stat.value}</h4>
                        </div>
                    </motion.div>
                ))}
            </section>

            <div className="grid lg:grid-cols-[1fr_400px] gap-10">
                {/* Upcoming Schedule Table */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Examination Schedule</h3>
                        <Link to="/student/exams" className="group flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
                            Full Calendar <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Subject Details</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Schedule</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Access</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data?.upcomingExams?.slice(0, 5).map((exam: any, i: number) => (
                                        <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">{exam.subject}</p>
                                                <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-tighter">{exam.subjectCode}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-extrabold text-slate-700">{exam.dateLabel}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Session {exam.session}</p>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                                    exam.status === 'LIVE' 
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                        : exam.status === 'UPCOMING' && new Date(exam.startTime).toDateString() === now.toDateString()
                                                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                            : 'bg-slate-50 text-slate-400 border-slate-200'
                                                }`}>
                                                    {exam.status === 'UPCOMING' && new Date(exam.startTime).toDateString() === now.toDateString() ? 'TODAY' : exam.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <Link 
                                                    to={exam.isSeatingVisible ? `/student/seating/${exam.examId}` : '#'}
                                                    className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                                        exam.isSeatingVisible ? 'text-indigo-600 hover:text-indigo-800' : 'text-slate-300 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {exam.isSeatingVisible ? 'View Seat' : 'Locked'}
                                                    {exam.isSeatingVisible && <ChevronRight size={14} />}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Notifications Panel */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Bulletins</h3>
                        <div className="px-3 py-1 bg-slate-100 rounded-full">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {data?.notifications?.length ? (
                            data.notifications.slice(0, 4).map((note: any, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                                >
                                    {note.priority === 'CRITICAL' && (
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                                    )}
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                                            note.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                                        }`}>
                                            <Bell size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h6 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{note.title}</h6>
                                            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-medium">{note.message}</p>
                                            <div className="flex items-center gap-3 mt-4">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1.5">
                                                    <Clock3 size={10} />
                                                    {new Date(note.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                    {new Date(note.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="p-16 text-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                <Bell size={32} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Quiet Zone</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;