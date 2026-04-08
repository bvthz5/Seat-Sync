import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowRight,
    Bell,
    BookOpen,
    CalendarClock,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    History,
    LayoutDashboard,
    Loader2,
    LogOut,
    MapPin,
    Menu,
    MonitorSmartphone,
    RefreshCcw,
    Settings,
    ShieldAlert,
    Sparkles,
    User,
    UserCircle2,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { studentPortalApi, StudentDashboardResponse } from '../services/studentPortal';
import { destroyStudentNotificationSocket, initStudentNotificationSocket } from '../services/studentNotificationSocket';

type Countdown = {
    hours: string;
    minutes: string;
    seconds: string;
    isExpired: boolean;
};

type NavItem = {
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
};

const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'exams', label: 'My Exams', icon: CalendarDays },
    { key: 'seating', label: 'Seating Plan', icon: MonitorSmartphone },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'history', label: 'History', icon: History },
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'settings', label: 'Settings', icon: Settings },
];

const cardMotion = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.36 },
};

const staggerCards = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
        },
    },
};

const statusStyles: Record<string, string> = {
    Today: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    Upcoming: 'bg-amber-100 text-amber-700 border-amber-200',
    Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Absent: 'bg-rose-100 text-rose-700 border-rose-200',
    Pending: 'bg-slate-100 text-slate-600 border-slate-200',
    CRITICAL: 'bg-rose-100 text-rose-700 border-rose-200',
    EMERGENCY: 'bg-amber-100 text-amber-700 border-amber-200',
};

const formatClock = (value: string | Date) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
    }).format(date);
};

const toCountdown = (targetIso?: string | null): Countdown => {
    if (!targetIso) return { hours: '--', minutes: '--', seconds: '--', isExpired: false };
    const target = new Date(targetIso).getTime();
    if (Number.isNaN(target)) return { hours: '--', minutes: '--', seconds: '--', isExpired: false };
    const diff = target - Date.now();
    if (diff <= 0) return { hours: '00', minutes: '00', seconds: '00', isExpired: true };

    const totalSeconds = Math.floor(diff / 1000);
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return { hours: h, minutes: m, seconds: s, isExpired: false };
};

const StudentDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [data, setData] = useState<StudentDashboardResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
    const [activeNav, setActiveNav] = useState('dashboard');
    const [isLiveConnected, setIsLiveConnected] = useState(false);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const tick = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => window.clearInterval(tick);
    }, []);

    const loadDashboard = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await studentPortalApi.getDashboard();
            setData(response);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Unable to load dashboard.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        if (!data?.student?.userId) return;

        const socket = initStudentNotificationSocket(data.student.userId, (notification) => {
            setData((prev) => {
                if (!prev) return prev;
                const nextNotifications = [notification, ...(prev.notifications || [])].slice(0, 10);
                return {
                    ...prev,
                    notifications: nextNotifications,
                    stats: {
                        ...prev.stats,
                        unreadNotifications: prev.stats.unreadNotifications + 1,
                    },
                };
            });

            if (notification.priority === 'CRITICAL' || notification.type === 'EMERGENCY') {
                toast.error(`Emergency: ${notification.title}`, { duration: 9000 });
            } else {
                toast.success(notification.title);
            }
        });

        socket.on('connect', () => setIsLiveConnected(true));
        socket.on('disconnect', () => setIsLiveConnected(false));

        return () => {
            socket.off('notification');
            socket.off('connect');
            socket.off('disconnect');
            destroyStudentNotificationSocket();
            setIsLiveConnected(false);
        };
    }, [data?.student?.userId]);

    const todayExam = data?.todayExam;
    const upcomingExams = data?.upcomingExams || [];
    const notifications = data?.notifications || [];
    const history = data?.history || [];
    const criticalAlerts = notifications.filter((item: any) => item.priority === 'CRITICAL' || item.type === 'EMERGENCY');

    const initials = useMemo(() => {
        const name = data?.student?.name || user?.FullName || 'Student';
        return name
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('');
    }, [data?.student?.name, user?.FullName]);

    const examStartTime =
        todayExam?.startAt || todayExam?.startTime || todayExam?.startDateTime || upcomingExams?.[0]?.startAt || upcomingExams?.[0]?.startTime || null;

    const countdown = useMemo(() => toCountdown(examStartTime), [examStartTime, now]);

    const nextExamTimeLabel = useMemo(() => {
        if (!upcomingExams.length) return 'No upcoming exam';
        const candidate = upcomingExams[0];
        if (candidate.startAt || candidate.startTime || candidate.startDateTime) {
            return formatClock(candidate.startAt || candidate.startTime || candidate.startDateTime);
        }
        return `${candidate.dateLabel || 'Date TBD'} • ${candidate.session || 'Session TBD'}`;
    }, [upcomingExams]);

    const smartStats = [
        {
            label: 'Today\'s Exams',
            value: todayExam ? '1' : '0',
            helper: todayExam?.subject || 'No exam today',
            icon: CalendarDays,
        },
        {
            label: 'Total Subjects',
            value: String(Math.max(data?.stats?.totalExams || 0, upcomingExams.length + history.length)),
            helper: `${data?.academic?.program || 'Program'} curriculum`,
            icon: BookOpen,
        },
        {
            label: 'Completed Exams',
            value: String(history.length),
            helper: 'Attendance verified records',
            icon: CheckCircle2,
        },
        {
            label: 'Next Exam Time',
            value: nextExamTimeLabel,
            helper: `${upcomingExams.length} scheduled ahead`,
            icon: CalendarClock,
        },
    ];

    const triggerNavAction = (key: string) => {
        setActiveNav(key);
        setIsMobileSidebarOpen(false);

        if (key === 'profile') {
            setIsProfileDrawerOpen(true);
            return;
        }

        const sectionMap: Record<string, string> = {
            exams: 'upcoming-exams-panel',
            seating: 'seating-panel',
            notifications: 'notifications-panel',
            history: 'history-panel',
        };

        const targetId = sectionMap[key];
        if (targetId) {
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/student/login');
    };

    return (
        <div
            className="ss-dashboard min-h-screen text-slate-900"
            style={{
                background:
                    'radial-gradient(circle at 8% 2%, rgba(56,189,248,0.17), transparent 32%), radial-gradient(circle at 97% 0%, rgba(251,191,36,0.16), transparent 34%), linear-gradient(155deg, #f5f9ff 0%, #eaf3ff 42%, #f7fbff 100%)',
            }}
        >
            <div className="ss-aurora ss-aurora-cyan" />
            <div className="ss-aurora ss-aurora-amber" />
            <div className="ss-aurora ss-aurora-indigo" />
            <div className="fixed inset-0 pointer-events-none opacity-45 [background-image:radial-gradient(#dbeafe_1px,transparent_1px)] [background-size:20px_20px]" />

            <div className="relative flex min-h-screen">
                <Sidebar
                    activeNav={activeNav}
                    collapsed={isSidebarCollapsed}
                    mobileOpen={isMobileSidebarOpen}
                    onCloseMobile={() => setIsMobileSidebarOpen(false)}
                    onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                    onSelect={triggerNavAction}
                />

                <main className="flex-1 min-w-0">
                    <TopBar
                        pageTitle="Student Dashboard"
                        unreadCount={data?.stats?.unreadNotifications || 0}
                        isLiveConnected={isLiveConnected}
                        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                        onOpenProfile={() => setIsProfileDrawerOpen(true)}
                        initials={initials || 'S'}
                    />

                    <div className="px-4 sm:px-6 lg:px-8 pb-8">
                        {isLoading ? (
                            <DashboardSkeleton />
                        ) : error ? (
                            <motion.div {...cardMotion} className="rounded-3xl bg-white/90 border border-rose-100 p-8 shadow-lg shadow-slate-900/5 mt-6">
                                <div className="flex items-start gap-4 text-rose-700">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0"><ShieldAlert size={22} /></div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Could not load dashboard</h2>
                                        <p className="mt-1 text-slate-600">{error}</p>
                                        <button
                                            onClick={loadDashboard}
                                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-white font-medium"
                                        >
                                            <RefreshCcw size={16} /> Retry
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="space-y-6 pt-4">
                                <motion.section
                                    {...cardMotion}
                                    className="ss-hero rounded-[1.6rem] sm:rounded-[2rem] p-6 sm:p-7 text-white border border-cyan-300/25 shadow-[0_28px_80px_rgba(3,7,18,0.22)] overflow-hidden relative"
                                    style={{
                                        background:
                                            'linear-gradient(130deg, rgba(15,23,42,0.95) 0%, rgba(12,74,110,0.92) 46%, rgba(3,105,161,0.92) 100%)',
                                    }}
                                >
                                    <div className="absolute inset-[1px] rounded-[1.55rem] sm:rounded-[1.95rem] border border-white/10 pointer-events-none" />
                                    <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
                                    <div className="absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-sky-200/10 blur-3xl" />
                                    <div className="absolute inset-0 opacity-60 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.1)_50%,transparent_80%)] ss-shimmer" />

                                    <div className="relative grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                                        <div>
                                            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
                                                <Sparkles size={12} /> SeatSync Priority Panel
                                            </span>
                                            <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight">{data?.student?.name || 'Student'}</h1>
                                            <p className="mt-2 text-cyan-100 text-sm sm:text-base">
                                                {data?.academic?.program || 'Program'} • Semester {data?.academic?.semester || '—'}
                                            </p>

                                            {todayExam ? (
                                                <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                                                    <p className="text-cyan-100 text-xs uppercase tracking-[0.22em]">Today&apos;s exam</p>
                                                    <h2 className="mt-2 text-xl font-semibold">{todayExam.subject}</h2>
                                                    <p className="mt-1 text-sm text-cyan-100">{todayExam.subjectCode} • {todayExam.dateLabel} • {todayExam.session}</p>
                                                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                                        <GlassPill icon={<MapPin size={14} />} text={`Room ${data?.seating?.roomCode || 'TBD'}`} />
                                                        <GlassPill icon={<LayoutDashboard size={14} />} text={`Seat ${data?.seating?.seatNumber || 'TBD'}`} />
                                                        <GlassPill icon={<Clock3 size={14} />} text={`${todayExam.duration || '—'} mins`} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-5 rounded-2xl border border-dashed border-white/25 bg-white/5 p-4">
                                                    <p className="font-medium">No exam scheduled for today.</p>
                                                    <p className="text-sm text-cyan-100 mt-1">Review upcoming timetable and keep notifications enabled.</p>
                                                </div>
                                            )}

                                            <div className="mt-5">
                                                <RippleButton
                                                    onClick={() => document.getElementById('seating-panel')?.scrollIntoView({ behavior: 'smooth' })}
                                                    className="rounded-xl bg-white text-slate-900 px-4 py-3 font-semibold"
                                                >
                                                    View Seating Plan <ArrowRight size={16} />
                                                </RippleButton>
                                            </div>
                                        </div>

                                            <div className="rounded-2xl bg-white/10 border border-white/20 p-4 sm:p-5 backdrop-blur-md self-start lg:sticky lg:top-24 shadow-[0_12px_40px_rgba(6,182,212,0.18)]">
                                            <div className="flex items-center justify-between gap-4">
                                                <p className="text-sm text-cyan-100 uppercase tracking-[0.2em]">Countdown</p>
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${countdown.isExpired ? 'bg-amber-200/30 text-amber-100' : 'bg-emerald-300/30 text-emerald-100'}`}>
                                                    {countdown.isExpired ? 'Exam started' : 'Live'}
                                                </span>
                                            </div>
                                            <div className="mt-4 grid grid-cols-3 gap-2">
                                                <CountdownBox label="Hours" value={countdown.hours} />
                                                <CountdownBox label="Minutes" value={countdown.minutes} />
                                                <CountdownBox label="Seconds" value={countdown.seconds} pulse />
                                            </div>
                                            <p className="mt-4 text-xs text-cyan-100">Next critical milestone is updated every second for real-time exam readiness.</p>
                                        </div>
                                    </div>
                                </motion.section>

                                <motion.section variants={staggerCards} initial="initial" animate="animate" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    {smartStats.map((item, index) => {
                                        const Icon = item.icon;
                                        return (
                                            <motion.article
                                                key={item.label}
                                                {...cardMotion}
                                                transition={{ duration: 0.3, delay: index * 0.04 }}
                                                whileHover={{ y: -6, scale: 1.015 }}
                                                className="ss-glass-card rounded-3xl border border-white/75 bg-white/58 backdrop-blur-xl p-5 shadow-[0_18px_40px_rgba(14,116,144,0.11)]"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                                                    <span className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                                                        <Icon size={18} />
                                                    </span>
                                                </div>
                                                <p className="mt-3 text-lg font-semibold text-slate-900 break-words">{item.value}</p>
                                                <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
                                            </motion.article>
                                        );
                                    })}
                                </motion.section>

                                <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                                    <div className="space-y-6">
                                        <motion.article id="seating-panel" {...cardMotion} className="ss-glass-card rounded-3xl border border-white/75 bg-white/72 backdrop-blur-xl p-6 shadow-[0_14px_38px_rgba(2,132,199,0.10)]">
                                            <SectionHeader title="Seating Information" subtitle="Room and mini-grid preview for quick physical orientation" />
                                            {data?.seating ? (
                                                <>
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <InfoTile label="Room" value={data.seating.roomCode || '—'} icon={<MapPin size={16} />} compact />
                                                        <InfoTile label="Block" value={data.seating.blockName || '—'} icon={<LayoutDashboard size={16} />} compact />
                                                        <InfoTile label="Seat" value={data.seating.seatNumber ? `Seat ${data.seating.seatNumber}` : '—'} icon={<BookOpen size={16} />} compact />
                                                        <InfoTile label="Row / Bench" value={`${data.seating.rowLabel || '—'} • ${data.seating.benchNumber || '—'}`} icon={<MonitorSmartphone size={16} />} compact />
                                                    </div>
                                                    <MiniSeatGrid seatNumber={String(data.seating.seatNumber || '')} rowLabel={String(data.seating.rowLabel || '')} />
                                                </>
                                            ) : (
                                                <EmptyPanel title="Seating not published yet" description="Allocation will appear here as soon as exam operations release the final seating matrix." icon={<MapPin size={20} />} />
                                            )}
                                        </motion.article>

                                        <motion.article id="upcoming-exams-panel" {...cardMotion} className="ss-glass-card rounded-3xl border border-white/75 bg-white/72 backdrop-blur-xl p-6 shadow-[0_14px_38px_rgba(2,132,199,0.10)]">
                                            <SectionHeader title="Upcoming Exams Timeline" subtitle="Chronological schedule with session details" />
                                            {upcomingExams.length ? (
                                                <div className="space-y-3">
                                                    {upcomingExams.map((exam: any, index: number) => (
                                                        <motion.div
                                                            key={exam.examId || `${exam.subject}-${index}`}
                                                            whileHover={{ x: 3 }}
                                                            className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-cyan-700 text-white text-xs font-semibold flex items-center justify-center">
                                                                    {index + 1}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h4 className="font-semibold text-slate-900 truncate">{exam.subject}</h4>
                                                                        <Badge status={exam.status || 'Upcoming'} />
                                                                    </div>
                                                                    <p className="text-sm text-slate-500 mt-1">{exam.dateLabel || 'Date TBD'} • {exam.session || 'Session TBD'} • {exam.duration || '—'} mins</p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyPanel title="No upcoming exams" description="As new schedules are published, your timeline will update automatically." icon={<CalendarDays size={20} />} />
                                            )}
                                        </motion.article>
                                    </div>

                                    <div className="space-y-6">
                                        <motion.article id="notifications-panel" {...cardMotion} className="ss-glass-card rounded-3xl border border-white/75 bg-white/72 backdrop-blur-xl p-6 shadow-[0_14px_38px_rgba(2,132,199,0.10)]">
                                            <SectionHeader title="Notifications" subtitle="Real-time communication channel" />
                                            <div className="space-y-3 max-h-[390px] overflow-auto pr-1">
                                                <AnimatePresence initial={false}>
                                                    {notifications.length ? (
                                                        notifications.map((notification: any) => (
                                                            <motion.div
                                                                key={notification.id}
                                                                initial={{ opacity: 0, x: 24 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: 18 }}
                                                                className="rounded-2xl border border-slate-200 bg-white/90 p-4"
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${notification.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : notification.type === 'EMERGENCY' ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'}`}>
                                                                        <Bell size={15} />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <h4 className="font-semibold text-sm text-slate-900">{notification.title}</h4>
                                                                            <Badge status={String(notification.priority || notification.type || 'Normal')} />
                                                                        </div>
                                                                        <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                                                                        <p className="text-[11px] text-slate-400 mt-2">{formatClock(notification.sentAt)}</p>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))
                                                    ) : (
                                                        <EmptyPanel title="No notifications" description="Announcements, hall changes, and invigilator messages will appear here." icon={<Bell size={20} />} />
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </motion.article>

                                        <motion.article id="history-panel" {...cardMotion} className="ss-glass-card rounded-3xl border border-white/75 bg-white/72 backdrop-blur-xl p-6 shadow-[0_14px_38px_rgba(2,132,199,0.10)]">
                                            <SectionHeader title="Important Alerts" subtitle="Critical notices requiring immediate attention" />
                                            {criticalAlerts.length ? (
                                                <div className="space-y-3">
                                                    {criticalAlerts.slice(0, 4).map((alert: any) => (
                                                        <div key={alert.id} className="rounded-2xl border border-rose-200/70 bg-rose-50/80 p-4">
                                                            <div className="flex items-start gap-2">
                                                                <AlertTriangle size={16} className="text-rose-700 mt-0.5" />
                                                                <div>
                                                                    <p className="font-semibold text-rose-900 text-sm">{alert.title}</p>
                                                                    <p className="text-rose-800/90 text-sm mt-1">{alert.message}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyPanel title="No urgent alerts" description="You are clear for now. Any emergency communications will be pinned in this panel." icon={<CheckCircle2 size={20} />} />
                                            )}
                                        </motion.article>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <AnimatePresence>
                {isProfileDrawerOpen && (
                    <>
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsProfileDrawerOpen(false)}
                            className="fixed inset-0 bg-slate-950/35 backdrop-blur-[1px] z-40"
                        />
                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-white/90 backdrop-blur-xl border-l border-white shadow-2xl p-5"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">Profile</h3>
                                <button onClick={() => setIsProfileDrawerOpen(false)} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800">
                                    <X size={16} className="mx-auto" />
                                </button>
                            </div>

                            <div className="mt-5 rounded-2xl bg-gradient-to-br from-cyan-600 to-sky-700 text-white p-5">
                                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold">{initials || 'S'}</div>
                                <p className="mt-3 text-lg font-semibold">{data?.student?.name || 'Student'}</p>
                                <p className="text-cyan-100 text-sm">{data?.student?.email || 'No email available'}</p>
                            </div>

                            <div className="mt-5 space-y-3">
                                <DrawerItem label="Register Number" value={data?.student?.registerNumber || '—'} />
                                <DrawerItem label="Department" value={data?.academic?.department || '—'} />
                                <DrawerItem label="Program" value={data?.academic?.program || '—'} />
                                <DrawerItem label="Semester" value={String(data?.academic?.semester || '—')} />
                                <DrawerItem label="Batch" value={String(data?.academic?.batchYear || '—')} />
                            </div>

                            <div className="mt-6 grid gap-3">
                                <button
                                    onClick={() => navigate('/student/forgot-password')}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Change Password
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white inline-flex items-center justify-center gap-2"
                                >
                                    <LogOut size={15} /> Logout
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');

                .ss-dashboard {
                    font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
                }

                .ss-aurora {
                    position: fixed;
                    pointer-events: none;
                    z-index: 0;
                    filter: blur(70px);
                    opacity: 0.5;
                    animation: ssFloat 12s ease-in-out infinite;
                }

                .ss-aurora-cyan {
                    width: 360px;
                    height: 360px;
                    left: -80px;
                    top: -60px;
                    background: radial-gradient(circle, rgba(34,211,238,0.45), transparent 70%);
                }

                .ss-aurora-amber {
                    width: 340px;
                    height: 340px;
                    right: -100px;
                    top: -80px;
                    background: radial-gradient(circle, rgba(245,158,11,0.42), transparent 70%);
                    animation-delay: 1.7s;
                }

                .ss-aurora-indigo {
                    width: 320px;
                    height: 320px;
                    right: 15%;
                    bottom: -110px;
                    background: radial-gradient(circle, rgba(99,102,241,0.30), transparent 70%);
                    animation-delay: 3s;
                }

                .ss-hero {
                    animation: ssGlowPulse 5.2s ease-in-out infinite;
                }

                .ss-shimmer {
                    animation: ssShimmerMove 7s linear infinite;
                }

                .ss-glass-card {
                    transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
                }

                .ss-glass-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(56,189,248,0.45);
                    box-shadow: 0 20px 46px rgba(8,145,178,0.16);
                }

                @keyframes ssFloat {
                    0% { transform: translate3d(0, 0, 0) scale(1); }
                    50% { transform: translate3d(14px, -16px, 0) scale(1.06); }
                    100% { transform: translate3d(0, 0, 0) scale(1); }
                }

                @keyframes ssGlowPulse {
                    0%, 100% { box-shadow: 0 28px 80px rgba(3,7,18,0.22), 0 0 0 rgba(34,211,238,0.1); }
                    50% { box-shadow: 0 34px 90px rgba(3,7,18,0.28), 0 0 45px rgba(34,211,238,0.2); }
                }

                @keyframes ssShimmerMove {
                    0% { transform: translateX(-65%); }
                    100% { transform: translateX(70%); }
                }
            `}</style>
        </div>
    );
};

const Sidebar: React.FC<{
    activeNav: string;
    collapsed: boolean;
    mobileOpen: boolean;
    onCloseMobile: () => void;
    onToggleCollapse: () => void;
    onSelect: (key: string) => void;
}> = ({ activeNav, collapsed, mobileOpen, onCloseMobile, onToggleCollapse, onSelect }) => (
    <>
        <AnimatePresence>
            {mobileOpen && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCloseMobile}
                    className="fixed inset-0 bg-slate-950/35 z-30 lg:hidden"
                />
            )}
        </AnimatePresence>

        <motion.aside
            animate={{ width: collapsed ? 86 : 256 }}
            className={`fixed lg:sticky top-0 left-0 z-40 h-screen border-r border-white/75 bg-white/75 backdrop-blur-xl shadow-[12px_0_36px_rgba(14,116,144,0.10)] p-4 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
            <div className="flex items-center justify-between gap-3 mb-6">
                {!collapsed && (
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">SeatSync</p>
                        <p className="text-lg font-semibold text-slate-900">Student Portal</p>
                    </div>
                )}
                <button
                    onClick={onToggleCollapse}
                    className="hidden lg:flex w-9 h-9 rounded-xl border border-slate-200 items-center justify-center text-slate-500 hover:text-slate-800"
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
                <button onClick={onCloseMobile} className="lg:hidden w-9 h-9 rounded-xl border border-slate-200 text-slate-500">
                    <X size={16} className="mx-auto" />
                </button>
            </div>

            <nav className="space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeNav === item.key;
                    return (
                        <button
                            key={item.key}
                            onClick={() => onSelect(item.key)}
                            className={`w-full rounded-xl px-3 py-2.5 flex items-center gap-3 text-sm font-medium transition relative overflow-hidden ${active ? 'bg-cyan-500 text-white shadow-[0_0_28px_rgba(6,182,212,0.55)]' : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'}`}
                        >
                            {active && <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.35)_50%,transparent_75%)] animate-[ssNavShimmer_2.6s_linear_infinite]" />}
                            <Icon size={17} />
                            {!collapsed && <span>{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            <div className="mt-auto rounded-2xl border border-cyan-100 bg-cyan-50/80 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-700">Exam Tip</p>
                {!collapsed && <p className="text-xs text-cyan-800 mt-1">Reach your room at least 20 minutes early for stress-free entry.</p>}
            </div>
        </motion.aside>
    </>
);

const TopBar: React.FC<{
    pageTitle: string;
    unreadCount: number;
    isLiveConnected: boolean;
    onOpenSidebar: () => void;
    onOpenProfile: () => void;
    initials: string;
}> = ({ pageTitle, unreadCount, isLiveConnected, onOpenSidebar, onOpenProfile, initials }) => (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <button onClick={onOpenSidebar} className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 text-slate-600">
                    <Menu size={18} className="mx-auto" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{pageTitle}</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className={`inline-flex w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{isLiveConnected ? 'Live system status: Connected' : 'Live system status: Standby'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                <button className="relative w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                    <Bell size={17} className="mx-auto" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-semibold px-1 flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </button>

                <button onClick={onOpenProfile} className="w-10 h-10 rounded-xl bg-slate-900 text-white font-semibold text-sm">
                    {initials || 'S'}
                </button>
            </div>
        </div>
    </header>
);

const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
    <div className="flex items-end justify-between gap-4 mb-4">
        <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {action}
    </div>
);

const CountdownBox: React.FC<{ label: string; value: string; pulse?: boolean }> = ({ label, value, pulse }) => (
    <motion.div
        animate={pulse ? { scale: [1, 1.04, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-xl bg-white/10 border border-white/20 py-3 text-center"
    >
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100 mt-1">{label}</p>
    </motion.div>
);

const GlassPill: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5">
        {icon}
        {text}
    </span>
);

const InfoTile: React.FC<{ label: string; value: string; icon: React.ReactNode; compact?: boolean }> = ({ label, value, icon, compact }) => (
    <div className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-4' : 'p-5'}`}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">{icon} {label}</div>
        <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
);

const Badge: React.FC<{ status: string }> = ({ status }) => {
    const cls = statusStyles[status] || 'bg-slate-100 text-slate-600 border-slate-200';
    return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{status}</span>;
};

const EmptyPanel: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({ title, description, icon }) => (
    <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/75 p-6 text-center">
        <div className="mx-auto w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500">{icon}</div>
        <h4 className="mt-3 font-semibold text-slate-900">{title}</h4>
        <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
    </div>
);

const MiniSeatGrid: React.FC<{ seatNumber: string; rowLabel: string }> = ({ seatNumber, rowLabel }) => {
    const active = `${rowLabel}${seatNumber}`;
    const rows = ['A', 'B', 'C', 'D'];
    const cols = ['01', '02', '03', '04', '05'];
    return (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span>Mini layout preview</span>
                <span className="font-semibold text-cyan-700">Your seat: {active || 'TBD'}</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
                {rows.flatMap((row) =>
                    cols.map((col) => {
                        const id = `${row}${col}`;
                        const isActive = id === active;
                        return (
                            <div
                                key={id}
                                className={`rounded-lg border text-[11px] py-2 text-center font-medium ${isActive ? 'bg-cyan-600 text-white border-cyan-700 shadow-[0_0_16px_rgba(8,145,178,0.45)]' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                            >
                                {id}
                            </div>
                        );
                    }),
                )}
            </div>
        </div>
    );
};

const DrawerItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
);

const DashboardSkeleton: React.FC = () => (
    <div className="pt-5 space-y-5 animate-pulse">
        <div className="h-60 rounded-[2rem] bg-white/60 border border-white" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="h-32 rounded-3xl bg-white/60 border border-white" />
            <div className="h-32 rounded-3xl bg-white/60 border border-white" />
            <div className="h-32 rounded-3xl bg-white/60 border border-white" />
            <div className="h-32 rounded-3xl bg-white/60 border border-white" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="h-72 rounded-3xl bg-white/60 border border-white" />
            <div className="h-72 rounded-3xl bg-white/60 border border-white" />
        </div>
        <div className="flex items-center justify-center text-slate-500 py-8">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading premium dashboard experience...
        </div>
    </div>
);

const RippleButton: React.FC<{
    onClick?: () => void;
    className?: string;
    children: React.ReactNode;
}> = ({ onClick, className, children }) => {
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

    const onMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const id = Date.now();
        setRipples((prev) => [...prev, { id, x, y }]);
        window.setTimeout(() => {
            setRipples((prev) => prev.filter((item) => item.id !== id));
        }, 600);
    };

    return (
        <button
            onClick={onClick}
            onMouseDown={onMouseDown}
            className={`relative overflow-hidden inline-flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 ${className || ''}`}
        >
            {ripples.map((ripple) => (
                <span
                    key={ripple.id}
                    className="absolute rounded-full bg-slate-900/15 pointer-events-none"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: 10,
                        height: 10,
                        transform: 'translate(-50%, -50%)',
                        animation: 'ripple-grow 600ms ease-out',
                    }}
                />
            ))}
            <span className="relative z-10">{children}</span>
            <style>{`@keyframes ripple-grow { from { opacity: 0.55; transform: translate(-50%, -50%) scale(1); } to { opacity: 0; transform: translate(-50%, -50%) scale(24); } }`}</style>
        </button>
    );
};

export default StudentDashboard;