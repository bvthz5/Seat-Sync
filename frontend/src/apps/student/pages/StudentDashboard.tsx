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
    const [data, setData] = useState<StudentDashboardResponse | null>(null);
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

        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const nextExam = useMemo(() => {
        if (!data?.upcomingExams?.length) return null;
        return data.upcomingExams[0];
    }, [data]);

    const examTime = useMemo(() => {
        if (!nextExam?.date) return null;
        const d = new Date(nextExam.date);
        if (nextExam.session?.toLowerCase().includes('fn') || nextExam.session?.toLowerCase().includes('forenoon')) {
            d.setHours(9, 30, 0);
        } else {
            d.setHours(13, 30, 0);
        }
        return d;
    }, [nextExam]);

    const countdown = useMemo(() => {
        if (!examTime) return null;
        const diff = examTime.getTime() - now.getTime();
        if (diff <= 0) return { h: '00', m: '00', s: '00', expired: true };

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        return {
            h: String(h).padStart(2, '0'),
            m: String(m).padStart(2, '0'),
            s: String(s).padStart(2, '0'),
            expired: false
        };
    }, [examTime, now]);

    const canViewSeating = useMemo(() => {
        if (!examTime) return false;
        const oneHourBefore = new Date(examTime.getTime() - 60 * 60 * 1000);
        return now >= oneHourBefore;
    }, [examTime, now]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium tracking-wide">Syncing academic records...</p>
            </div>
        );
    }

    const stats = [
        { label: "Today's Exams", value: data?.todayExam ? '1' : '0', icon: CalendarDays, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Total Subjects', value: String(data?.stats?.totalExams || 0), icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Completed Exams', value: String(data?.history?.length || 0), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Next Session', value: nextExam?.session || '—', icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Minimal Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Overview</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        Welcome back, {data?.student?.name?.split(' ')[0]}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Real-time Data Active</span>
                </div>
            </header>

            {/* Professional Exam Highlight Card */}
            <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden group">
                <div className="grid lg:grid-cols-[1fr_300px]">
                    <div className="p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                countdown?.expired ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                                {countdown?.expired ? 'Live Now' : 'Upcoming Exam'}
                            </span>
                            <span className="text-slate-300">|</span>
                            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <Clock3 size={14} />
                                {nextExam?.duration} Minutes
                            </div>
                        </div>

                        {nextExam ? (
                            <div className="space-y-6">
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                                    {nextExam.subject}
                                </h2>
                                
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                            <CalendarClock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date & Session</p>
                                            <p className="font-bold text-slate-700">{nextExam.dateLabel} • {nextExam.session}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                            <MapPin size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hall / Room</p>
                                            <p className="font-bold text-slate-700">{data?.seating?.roomCode || 'Available 1hr before'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div className="relative group/btn">
                                        <button
                                            onClick={() => canViewSeating && navigate(`/student/seating/${nextExam.examId}`)}
                                            disabled={!canViewSeating}
                                            className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all ${
                                                canViewSeating
                                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transform hover:-translate-y-1'
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            View Seating Details <ArrowRight size={18} />
                                        </button>
                                        {!canViewSeating && (
                                            <div className="absolute top-full left-0 mt-2 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                Available 1 hour before exam
                                            </div>
                                        )}
                                    </div>
                                    <Link to="/student/exams" className="px-6 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all">
                                        View Schedule
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12">
                                <h3 className="text-xl font-bold text-slate-400">No exams scheduled in the immediate horizon.</h3>
                                <p className="text-slate-500 mt-1">Updates will reflect here as soon as schedules are published.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-8 sm:p-10 bg-slate-50 flex flex-col justify-center items-center text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Exam starts in</p>
                        <div className="flex gap-4">
                            {[
                                { label: 'Hr', value: countdown?.h || '00' },
                                { label: 'Min', value: countdown?.m || '00' },
                                { label: 'Sec', value: countdown?.s || '00' },
                            ].map((unit, i) => (
                                <div key={unit.label} className="flex flex-col">
                                    <span className="text-4xl font-black text-slate-900 font-mono tracking-tighter">{unit.value}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">{unit.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                            <Info size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Reporting: 30m Prior</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Clean Summary Cards */}
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-4"
                    >
                        <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                            <h4 className="text-2xl font-black text-slate-900 mt-0.5">{stat.value}</h4>
                        </div>
                    </motion.div>
                ))}
            </section>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Upcoming Schedule Table */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900">Upcoming Schedule</h3>
                        <Link to="/student/exams" className="text-xs font-bold text-indigo-600 hover:underline">View All</Link>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50">
                                    <tr className="border-b border-slate-200">
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Subject</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data?.upcomingExams?.slice(0, 5).map((exam, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800 text-sm">{exam.subject}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">{exam.subjectCode}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-slate-600">{exam.dateLabel}</p>
                                                <p className="text-[10px] font-medium text-slate-400">{exam.session}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                    exam.status === 'Today' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-500'
                                                }`}>
                                                    {exam.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link 
                                                    to={exam.status === 'Today' ? `/student/seating/${exam.examId}` : '#'}
                                                    className={`text-xs font-bold ${
                                                        exam.status === 'Today' ? 'text-indigo-600' : 'text-slate-300 cursor-not-allowed'
                                                    }`}
                                                >
                                                    Seating
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Notifications & Updates */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900">Broadcasts</h3>
                        <Bell size={16} className="text-slate-400" />
                    </div>

                    <div className="space-y-4">
                        {data?.notifications?.length ? (
                            data.notifications.slice(0, 3).map((note, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm relative group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            note.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'
                                        }`}>
                                            <Bell size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <h6 className="font-bold text-slate-800 text-sm truncate">{note.title}</h6>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{note.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-tighter">
                                                {new Date(note.sentAt).toLocaleDateString()} • {new Date(note.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="p-10 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm font-medium">No active broadcasts.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;