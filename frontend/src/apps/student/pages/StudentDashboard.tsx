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
    Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { studentPortalApi } from '../services/studentPortal';
import { useStudentTheme } from '../components/StudentThemeContext';

const StudentDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useStudentTheme();
    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());

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

    useEffect(() => {
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
        if (!examTiming) return { status: 'UPCOMING', label: 'Upcoming', color: 'bg-white/5 text-slate-300 dark:text-slate-300 border-white/10' };
        
        if (now < examTiming.start) {
            return { status: 'UPCOMING', label: 'Upcoming', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
        } else if (now >= examTiming.start && now < examTiming.end) {
            return { status: 'LIVE', label: 'Live Now', color: 'bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/35' };
        } else {
            return { status: 'COMPLETED', label: 'Completed', color: 'bg-white/5 text-slate-500 border-white/10' };
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
        if (targetExam.isSeatingVisible) return true;
        
        if (!examTiming) return false;
        // Released exactly 60 minutes prior
        const visibleAt = new Date(examTiming.start.getTime() - 60 * 60 * 1000);
        return now >= visibleAt;
    }, [targetExam, examTiming, now]);

    const isDark = theme === 'dark';

    if (loading) {
        return (
            <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center">
                <motion.div
                    animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="mb-6 relative"
                >
                    <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                    <Sparkles size={50} className="text-indigo-500 dark:text-indigo-400 relative z-10" />
                </motion.div>
                <Loader2 className="animate-spin text-indigo-500 dark:text-indigo-400 mb-4" size={28} />
                <p className="text-indigo-600 dark:text-indigo-300/60 font-black uppercase tracking-[0.25em] text-[10px]">Accessing Secure Terminal</p>
            </div>
        );
    }

    const stats = [
        { label: "Today's Exams", value: data?.todayExam ? '1' : '0', icon: CalendarDays, color: 'text-fuchsia-500 dark:text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20' },
        { label: 'Registered Papers', value: String(data?.stats?.totalExams || 0), icon: BookOpen, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
        { label: 'History', value: String(data?.history?.length || 0), icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        { label: 'Next Session', value: targetExam?.session || '—', icon: CalendarClock, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    ];

    return (
        <div className="space-y-10 flex flex-col justify-start h-full w-full max-w-7xl mx-auto">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-3xl sm:text-4xl font-black tracking-tight transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Academic Portal</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 flex items-center gap-2 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        Academic ID: <span className={`font-extrabold transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{data?.student?.registerNumber}</span>
                    </p>
                </div>
            </div>

            {/* Premium Spotlight Card */}
            <section className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-35 transition duration-1000" />
                <div className={`relative rounded-[2rem] border shadow-2xl overflow-hidden backdrop-blur-xl transition-colors duration-500 ${isDark ? 'bg-[#0C1220] border-slate-800/80' : 'bg-white border-slate-200'}`}>
                    <div className="grid lg:grid-cols-[1.3fr_1fr]">
                        {/* Highlights Left Info */}
                        <div className={`p-8 sm:p-12 lg:border-r flex flex-col justify-between transition-colors duration-500 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                            <div>
                                <div className="flex flex-wrap items-center gap-3 mb-8">
                                    <span className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border backdrop-blur-md ${statusInfo.color}`}>
                                        {statusInfo.label}
                                    </span>
                                    {targetExam?.isInternal && (
                                        <span className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            INTERNAL
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider ml-auto sm:ml-0">
                                        <Clock3 size={13} className="text-slate-500" />
                                        {targetExam?.duration} MINS
                                    </div>
                                </div>

                                {targetExam ? (
                                    <div className="space-y-8">
                                        <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                            {targetExam.subject}
                                        </h2>
                                        
                                        <div className="grid sm:grid-cols-2 gap-6 pt-4">
                                            <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors duration-500 ${isDark ? 'bg-slate-900/50 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                                    <CalendarClock size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Schedule</p>
                                                    <p className={`font-extrabold text-sm truncate mt-0.5 transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{targetExam.dateLabel}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Session {targetExam.session}</p>
                                                </div>
                                            </div>

                                            <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors duration-500 ${isDark ? 'bg-slate-900/50 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                                    <MapPin size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Seating room</p>
                                                    <p className={`font-extrabold text-sm truncate mt-0.5 transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                                        {data?.seating?.roomCode || (canViewSeating ? 'Ready...' : 'Pending Visibility')}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase truncate mt-0.5">
                                                        {data?.seating ? `${data.seating.blockName}` : (canViewSeating ? 'View seating below' : 'Releases 60m prior')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-14 text-center">
                                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle2 size={32} className="text-indigo-400" />
                                        </div>
                                        <h3 className={`text-xl font-extrabold transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>All Clear</h3>
                                        <p className="text-slate-400 mt-2 text-xs font-semibold">No active or upcoming exams registered.</p>
                                    </div>
                                )}
                            </div>

                            {targetExam && (
                                <div className="pt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                    <button
                                        onClick={() => canViewSeating && navigate(`/student/seating/${targetExam.examId}${targetExam.isInternal ? '?isInternal=true' : ''}`)}
                                        className={`px-8 py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 ${
                                            canViewSeating
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5'
                                                : isDark ? 'bg-white/5 text-slate-500 border border-slate-800 cursor-not-allowed' : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                                        }`}
                                    >
                                        <span>{canViewSeating ? 'VIEW SEATING DETAILS' : 'SEATING LOCKED'}</span> 
                                        <ArrowRight size={16} />
                                    </button>
                                    <Link to="/student/exams" className={`px-6 py-4.5 rounded-2xl font-bold text-xs uppercase tracking-widest border text-center transition-all ${isDark ? 'text-slate-300 hover:text-white bg-slate-900/50 hover:bg-slate-900 border-slate-800 hover:border-slate-700' : 'text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300'}`}>
                                        MY FULL SCHEDULE
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Countdown Right Pane */}
                        <div className={`p-8 sm:p-12 flex flex-col justify-center items-center text-center relative overflow-hidden border-t lg:border-t-0 lg:border-l transition-colors duration-500 ${isDark ? 'bg-gradient-to-br from-indigo-950/20 to-[#0A0E1A]/80 border-slate-800/60' : 'bg-slate-50/50 border-slate-200'}`}>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0%,transparent_60%)] pointer-events-none" />
                            
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-8 relative z-10 flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                {countdown?.prefix || 'PORTAL CLOCK'}
                            </p>
                            
                            <div className="flex gap-4 relative z-10">
                                {[
                                    { label: 'HOURS', value: countdown?.h || '00' },
                                    { label: 'MINUTES', value: countdown?.m || '00' },
                                    { label: 'SECONDS', value: countdown?.s || '00' },
                                ].map((unit) => (
                                    <div key={unit.label} className="flex flex-col items-center">
                                        <div className={`border rounded-2xl w-18 h-22 sm:w-22 sm:h-26 flex items-center justify-center shadow-2xl backdrop-blur-md transition-colors duration-500 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                                            <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums transition-colors duration-500 ${isDark ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-slate-800'}`}>
                                                {unit.value}
                                            </span>
                                        </div>
                                        <span className="text-[8px] font-black text-slate-500 uppercase mt-3.5 tracking-wider">{unit.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex items-center gap-2 text-indigo-300 bg-indigo-500/10 px-4 py-2.5 rounded-xl border border-indigo-500/20 backdrop-blur-md relative z-10">
                                <Info size={13} className="text-indigo-400" />
                                <span className="text-[9px] font-black uppercase tracking-wider">REPORTING PROTOCOL: 30M PRIOR</span>
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
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -4, scale: 1.01 }}
                        className={`p-6 rounded-3xl border shadow-lg flex items-center gap-5 group cursor-default transition-all duration-500 ${
                            isDark 
                                ? 'bg-[#0C1220]/75 border-slate-800/85' 
                                : 'bg-white border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.02)]'
                        }`}
                    >
                        <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-transform duration-500 group-hover:rotate-3`}>
                            <stat.icon size={22} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{stat.label}</p>
                            <h4 className={`text-2xl font-black mt-1 transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>{stat.value}</h4>
                        </div>
                    </motion.div>
                ))}
            </section>

            {/* Two-Column Details Area */}
            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
                {/* Examination Schedule */}
                <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5"
                >
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <h3 className={`text-lg font-black uppercase tracking-wider transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Examination Schedule</h3>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${
                                isDark ? 'bg-slate-900 border-slate-800 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                            }`}>
                                {data?.stats?.totalExams || 0} Papers
                            </span>
                        </div>
                        <Link to="/student/exams" className="group flex items-center gap-1.5 text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-400 transition-colors">
                            Full Calendar <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>

                    <div className={`rounded-3xl border overflow-hidden shadow-xl transition-colors duration-500 ${
                        isDark ? 'bg-[#0C1220]/80 border-slate-800/85' : 'bg-white border-slate-200'
                    }`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`border-b transition-colors duration-500 ${isDark ? 'bg-slate-900/40 border-slate-800/85' : 'bg-slate-50 border-slate-100'}`}>
                                        <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Subject</th>
                                        <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Chronology</th>
                                        <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500 text-center">Status</th>
                                        <th className="px-6 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500 text-right">Access</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y transition-colors duration-500 ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                                    {data?.upcomingExams?.slice(0, 4).map((exam: any, i: number) => {
                                        const isToday = new Date(exam.startTime).toDateString() === now.toDateString();
                                        return (
                                            <tr key={i} className={`group transition-colors ${isDark ? 'hover:bg-slate-900/20' : 'hover:bg-slate-50'}`}>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-extrabold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{exam.subject}</p>
                                                        {exam.isInternal && (
                                                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 dark:text-purple-400 text-[8px] font-black uppercase border border-purple-500/20">INT</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-500 mt-1 uppercase tracking-widest">{exam.subjectCode}</p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <p className={`text-sm font-extrabold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{exam.dateLabel}</p>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{exam.session} Session</p>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                                                        exam.status === 'LIVE' 
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                            : isToday
                                                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                                                : isDark ? 'bg-slate-900 text-slate-500 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}>
                                                        {isToday ? 'TODAY' : exam.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <Link 
                                                        to={exam.isSeatingVisible ? `/student/seating/${exam.examId}${exam.isInternal ? '?isInternal=true' : ''}` : '#'}
                                                        className={`inline-flex items-center justify-end gap-1 text-[9px] font-black uppercase tracking-widest transition-all ${
                                                            exam.isSeatingVisible 
                                                                ? 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300' 
                                                                : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {exam.isSeatingVisible ? 'VIEW SEAT' : 'LOCKED'}
                                                        {exam.isSeatingVisible && <ChevronRight size={12} />}
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {(!data?.upcomingExams || data.upcomingExams.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-xs font-semibold">
                                                No exams scheduled for the current cycle.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>

                {/* Bulletins Panel */}
                <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5"
                >
                    <div className="flex items-center justify-between px-2">
                        <h3 className={`text-lg font-black uppercase tracking-wider transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Bulletins</h3>
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors duration-500 ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>Active</span>
                    </div>

                    <div className="space-y-4">
                        {data?.notifications?.length ? (
                            data.notifications.slice(0, 3).map((note: any, i: number) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ x: 4 }}
                                    className={`p-5.5 rounded-3xl border shadow-lg relative overflow-hidden group transition-colors duration-500 ${
                                        isDark 
                                            ? 'bg-[#0C1220]/75 border-slate-800/85' 
                                            : 'bg-white border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.02)]'
                                    }`}
                                >
                                    {note.priority === 'CRITICAL' && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                                    )}
                                    <div className="flex items-start gap-4">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                            note.priority === 'CRITICAL' 
                                                ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20' 
                                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                        }`}>
                                            <Bell size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h6 className={`font-extrabold text-sm truncate uppercase tracking-tight transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{note.title}</h6>
                                            <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed font-semibold transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{note.message}</p>
                                            <div className="flex items-center gap-2.5 mt-3 text-[9px] font-black text-slate-500">
                                                <Clock3 size={10} />
                                                <span>{new Date(note.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="w-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
                                                <span>{new Date(note.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className={`py-20 text-center rounded-3xl border border-dashed transition-all duration-500 ${
                                isDark ? 'bg-[#0C1220]/40 border-slate-800/80' : 'bg-white border-slate-200'
                            }`}>
                                <div className={`w-12 h-12 border rounded-xl flex items-center justify-center mx-auto mb-4 ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}>
                                    <Bell size={20} />
                                </div>
                                <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Quiet Zone</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default StudentDashboard;
