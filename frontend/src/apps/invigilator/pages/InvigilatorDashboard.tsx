import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, ClipboardList, Grid3X3, Users,
    RefreshCcw, Bell, UserCircle, LogOut, CheckCircle2,
    Clock, Calendar, DoorOpen, LayoutGrid, ClipboardCheck,
    AlertTriangle, ChevronRight, Eye, Menu, X,
    Wifi, MapPin, Settings, Moon, Sun, User, ChevronDown, RefreshCw, Lock,
    EyeOff, Shield, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { invigilatorService } from '../../admin/services/invigilatorService';
import { SeatingService } from '../../admin/services/seatingService';

// --- TYPES ---
interface DashboardData {
    user: {
        name: string;
        email: string;
        department: string;
        designation: string;
        date: string;
        status: string;
    };
    metrics: Array<{
        title: string;
        value: string;
        icon: any;
        color: string;
        label: string;
    }>;
    duties: Array<{
        id: number;
        exam: string;
        session: string;
        date: string;
        roomID: number;
        room: string;
        block: string;
        time: string;
        students: number;
        presentCount: number;
        status: string;
        isHallRevealed?: boolean;
        isAttendanceMarked?: boolean;
        isReliefDuty?: boolean;
    }>;
    swaps: any[];
    incidents: any[];
}

const NAV_GROUPS = [
    {
        title: 'GENERAL',
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, path: '/invigilator/dashboard', id: 'dashboard' },
            { label: 'My Duties', icon: ClipboardList, path: '/invigilator/duties', id: 'duties' },
            { label: 'Seating View', icon: Grid3X3, path: '/invigilator/seating', id: 'seating' },
            { label: 'Attendance', icon: Users, path: '/invigilator/attendance', id: 'attendance' },
        ]
    }
];

const ACCOUNT_ITEMS = [
    { label: 'Profile', icon: User, path: '/invigilator/profile', id: 'profile' },
];

// --- ANIMATION VARIANTS ---
const fadeUp: any = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

const popIn: any = {
    hidden: { opacity: 0, scale: 0.98 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

export default function InvigilatorDashboard() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeNav, setActiveNav] = useState('dashboard');
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [timeRemaining, setTimeRemaining] = useState("00:00:00");
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [incidentText, setIncidentText] = useState("");
    const [announcement, setAnnouncement] = useState<string | null>("🔔 BROADCAST: Please ensure all students have their ID cards visible before distributing question papers.");
    const [selectedDutyTab, setSelectedDutyTab] = useState<'scheduled' | 'history' | 'incidents'>('scheduled');
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [swapReason, setSwapReason] = useState("");
    const [selectedDutyForSwap, setSelectedDutyForSwap] = useState<any>(null);
    const [submittingSwap, setSubmittingSwap] = useState(false);

    const handleReportIncident = async () => {
        if (!incidentText.trim() || !data?.duties[0]) return;
        try {
            await invigilatorService.reportIncident({
                examId: data.duties[0].id,
                roomId: data.duties[0].roomID,
                type: "Malpractice",
                description: incidentText
            });
            toast.success("Incident reported to Exam Cell successfully.", { icon: '🚨' });
            setShowIncidentModal(false);
            setIncidentText("");
            fetchDashboardData();
        } catch (err) {
            toast.error("Failed to report incident.");
        }
    };

    const handleRequestSwap = async () => {
        if (!swapReason.trim() || !selectedDutyForSwap) return;
        try {
            setSubmittingSwap(true);
            await invigilatorService.requestSwap({
                examId: selectedDutyForSwap.id,
                roomId: selectedDutyForSwap.roomID,
                reason: swapReason
            });
            toast.success("Swap request sent to Exam Cell admin.");
            setShowSwapModal(false);
            setSwapReason("");
            fetchDashboardData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to request swap.");
        } finally {
            setSubmittingSwap(false);
        }
    };

    useEffect(() => {
        if (!data || data.user.status !== 'active' || !data.duties || data.duties.length === 0) return;

        const session = data.duties[0].session;
        const endTime = new Date();
        if (session === 'FN') {
            endTime.setHours(12, 30, 0, 0);
        } else {
            endTime.setHours(16, 30, 0, 0);
        }

        const interval = setInterval(() => {
            const now = new Date();
            const diff = endTime.getTime() - now.getTime();
            
            if (diff <= 0) {
                setTimeRemaining("00:00:00");
                clearInterval(interval);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeRemaining(
                `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [data]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await invigilatorService.getDashboardData();
            // Map icon strings back to Lucide components
            const iconMap: any = { Calendar, MapPin, Users, ClipboardCheck, ClipboardList, CheckCircle2 };
            if (res.metrics) {
                res.metrics = res.metrics.map((m: any) => ({
                    ...m,
                    icon: iconMap[m.icon] || Calendar
                }));
            }
            setData(res);
        } catch (err: any) {
            console.error('Failed to fetch dashboard data:', err);
            setError(err.response?.data?.message || err.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    // Responsive Checking
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth < 1024) setSidebarOpen(false);
            else setSidebarOpen(true);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/invigilator/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Color utility for metric cards
    const getMetricColor = (color: string) => {
        const map: any = {
            blue: "border-blue-200 shadow-blue-50/50",
            green: "border-emerald-200 shadow-emerald-50/50",
            indigo: "border-indigo-200 shadow-indigo-50/50",
            amber: "border-amber-200 shadow-amber-50/50",
        };
        return map[color] || "border-slate-200 shadow-slate-100";
    };

    const getIconColor = (color: string) => {
        const map: any = {
            blue: "bg-blue-100 text-blue-600",
            green: "bg-emerald-100 text-emerald-600",
            indigo: "bg-indigo-100 text-indigo-600",
            amber: "bg-amber-100 text-amber-600",
        };
        return map[color] || "bg-slate-100 text-slate-600";
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4 font-sans">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Synchronizing Portal...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-4 shadow-sm border border-red-200">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Portal Access Error</h2>
                <p className="text-slate-500 max-w-md mb-6">{error || "Your invigilator profile is incomplete or not linked correctly. Please contact the exam admin."}</p>
                <button 
                    onClick={fetchDashboardData}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                    <RefreshCcw size={18} /> Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className={`flex h-screen font-sans selection:bg-blue-500/20 selection:text-blue-900 overflow-hidden ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-[#F4F7FB] text-slate-800'}`}>

            {/* --- SIDEBAR --- */}
            <AnimatePresence mode="wait">
                {sidebarOpen && (
                    <>
                        <motion.aside
                            initial={isMobile ? { x: '-100%' } : { width: 0, opacity: 0 }}
                            animate={isMobile ? { x: 0 } : { width: 250, opacity: 1 }}
                            exit={isMobile ? { x: '-100%' } : { width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className={`fixed lg:relative z-50 h-full flex flex-col whitespace-nowrap overflow-hidden shadow-2xl lg:shadow-[2px_0_12px_rgba(0,0,0,0.02)] border-r ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-100 text-slate-600'}`}
                        >
                            {/* Logo Area */}
                            <div className={`h-16 px-5 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-[#2F3FA5] to-[#1E2A78] rounded-lg text-white shadow-lg shadow-blue-900/20">
                                        <CheckCircle2 size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-extrabold text-base leading-tight ${darkMode ? 'text-white' : 'text-[#1E2A78]'}`}>SeatSync</span>
                                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest leading-tight">Invigilator</span>
                                    </div>
                                </div>
                                {isMobile && (
                                    <button onClick={() => setSidebarOpen(false)} className={`p-1.5 rounded-md ${darkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-800'}`}>
                                        <X size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Navigation */}
                            <nav className="flex-1 py-5 px-3 space-y-5 overflow-y-auto custom-scrollbar">
                                {NAV_GROUPS.map((group, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className={`px-2 mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{group.title}</div>
                                        {group.items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => { 
                                                    console.log('[NAV] Clicked item:', item.id);
                                                    setActiveNav(item.id); 
                                                    if (item.path && item.path !== '/invigilator/dashboard' && item.id !== 'seating' && item.id !== 'duties') {
                                                        // For attendance, try to find an active duty ID
                                                        if (item.id === 'attendance' && data?.duties && data.duties.length > 0) {
                                                            navigate(`${item.path}/${data.duties[0].id}`);
                                                        } else {
                                                            navigate(item.path);
                                                        }
                                                    }
                                                }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all font-semibold text-[13px] group relative ${activeNav === item.id
                                                    ? 'bg-blue-50 text-[#2F3FA5] shadow-[inset_0_0_0_1px_rgba(47,63,165,0.05)]' // ERP active state highlight
                                                    : darkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {/* Left indicator bar */}
                                                {activeNav === item.id && (
                                                    <motion.div layoutId="activeNavIndicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2F3FA5] rounded-r-full" />
                                                )}
                                                <item.icon size={18} className={activeNav === item.id ? 'text-[#2F3FA5]' : 'text-slate-400 group-hover:text-slate-600'} />
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                ))}

                                <div className="space-y-1 pt-3">
                                    <div className={`px-2 mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>ACCOUNT</div>
                                    {ACCOUNT_ITEMS.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => { setActiveNav(item.id); if (item.path === '/invigilator/profile') navigate(item.path) }}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all font-semibold text-[13px] group relative ${activeNav === item.id
                                                ? 'bg-blue-50 text-[#2F3FA5] shadow-[inset_0_0_0_1px_rgba(47,63,165,0.05)]'
                                                : darkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                                }`}
                                        >
                                            {activeNav === item.id && <motion.div layoutId="activeNavIndicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2F3FA5] rounded-r-full" />}
                                            <item.icon size={18} className={activeNav === item.id ? 'text-[#2F3FA5]' : 'text-slate-400 group-hover:text-slate-600'} />
                                            {item.label}
                                        </button>
                                    ))}
                                    <button
                                        onClick={handleLogout}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all font-semibold text-[13px] hover:!bg-red-50 hover:!text-red-700 group ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                                    >
                                        <LogOut size={18} className="text-slate-400 group-hover:!text-red-500 transition-colors" />
                                        Logout
                                    </button>
                                </div>
                            </nav>
                        </motion.aside>

                        {/* Mobile Overlay */}
                        {isMobile && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setSidebarOpen(false)}
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
                            />
                        )}
                    </>
                )}
            </AnimatePresence>

            {/* --- MAIN CONTENT AREA --- */}
            <div className={`flex-1 flex flex-col min-w-0 overflow-hidden relative ${darkMode ? 'bg-[#0f172a]' : 'bg-[#F4F7FB]'}`}>

                {announcement && (
                    <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider z-40 relative shadow-sm">
                        <div className="flex-1 flex justify-center items-center gap-2">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            {announcement}
                        </div>
                        <button onClick={() => setAnnouncement(null)} className="p-1 hover:bg-black/10 rounded-md transition-colors"><X size={14} /></button>
                    </div>
                )}

                {/* 1. TOP HEADER (Command Center Bar) */}
                <header className={`h-16 flex items-center justify-between px-5 sm:px-8 shrink-0 z-30 shadow-sm relative transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b border-slate-100/80'}`}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={`p-2 -ml-2 rounded-lg transition-colors group ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                        >
                            <Menu size={20} className={darkMode ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-500 group-hover:text-slate-800'} />
                        </button>
                        <div>
                            <h2 className={`text-[17px] leading-none font-extrabold hidden sm:block ${darkMode ? 'text-white' : 'text-[#1E2A78]'}`}>Dashboard Overview</h2>
                            <p className="text-[11px] font-semibold text-slate-500 hidden sm:block mt-1">Welcome back, {data?.user.name.split(' ')[0] || 'Invigilator'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold font-mono border hidden md:flex ${darkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                            <Wifi size={12} className="animate-pulse" /> Live Server Sync
                        </div>

                        <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full transition-colors ${darkMode ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setNotificationsOpen(!notificationsOpen)}
                                className={`p-2 rounded-full transition-colors relative ${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-[#2F3FA5] hover:bg-indigo-50'}`}
                            >
                                <Bell size={18} />
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                        </div>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-2.5 transition-colors group"
                            >
                                <div className="flex flex-col items-end hidden sm:flex">
                                    <span className={`text-[13px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{data?.user.name.split(' ')[0] || 'User'}</span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Invigilator</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50 flex items-center justify-center text-indigo-700 border border-white shadow-sm group-hover:shadow transition-all">
                                    <UserCircle size={18} />
                                </div>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {activeNav === 'dashboard' ? (
                        <>
                            {/* 2. HERO STATUS BANNER (FULL WIDTH) */}
                            <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-6 w-full">
                        <div className={`w-full overflow-hidden relative rounded-[20px] shadow-lg transition-all duration-500 ${data?.user.status === 'active' ? 'bg-[#2D3C8A] shadow-[#2F3FA5]/10' : 'bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700'}`}>
                            {/* Decorative background shapes */}
                            <div className="absolute top-0 right-[15%] w-[400px] h-[400px] bg-white/5 rounded-full blur-[80px] pointer-events-none"></div>
                            <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                            <div className="px-6 sm:px-8 lg:px-10 py-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                                <div className="space-y-3 max-w-2xl">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 bg-white/10 text-white backdrop-blur-md rounded-full text-[9px] font-extrabold uppercase tracking-widest border border-white/10 shadow-sm">Command Center</span>
                                        <p className="text-blue-100/90 font-semibold text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                            <Calendar size={12} /> {data?.user.date || 'Today'}
                                        </p>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow">Welcome, {data?.user.name || 'Invigilator'}</h1>
                                    {data?.user.status === 'active' && (
                                        <div className="inline-flex items-center gap-2 mt-1 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#1F2B6C] text-blue-50 text-[11px] font-bold tracking-wide shadow-sm">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            EXAM IN PROGRESS – ROOM {data?.duties?.[0]?.room || '...'}
                                        </div>
                                    )}
                                </div>

                                {data?.user.status === "active" && (
                                    <div className="bg-[#1F2B6C] backdrop-blur-md border border-[rgba(255,255,255,0.05)] rounded-[16px] p-5 sm:p-6 flex flex-col items-start lg:items-end w-full lg:w-auto shadow-lg">
                                        <span className="text-[10px] font-bold text-blue-200/70 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                                            <Clock size={12} className="text-blue-400" /> Live Time Remaining
                                        </span>
                                        <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-widest tabular-nums leading-none drop-shadow-sm">
                                            {timeRemaining}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-4 sm:px-6 lg:px-8 pb-8 space-y-6 w-full">

                        {/* 3. SUMMARY METRICS ROW - ERP Depth Style */}
                        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {data?.metrics?.map((metric, i) => (
                                <motion.div
                                    key={i} variants={fadeUp}
                                    className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 group ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200/60 block'}`}
                                >
                                    {/* Subtle gradient overlay on hover */}
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-transparent to-${metric.color}-500/5 ${darkMode ? 'to-slate-800' : ''}`} />

                                    <div className="flex justify-between items-start relative z-10 mb-1">
                                        <div className="flex flex-col">
                                            <span className={`text-[13px] font-extrabold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{metric.title}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{metric.label}</span>
                                        </div>
                                        <div className={`p-2 rounded-xl shadow-inner border border-white/50 ${getIconColor(metric.color)}`}>
                                            <metric.icon size={18} strokeWidth={2} />
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between relative z-10">
                                        <span className={`text-3xl sm:text-4xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>{metric.value}</span>
                                        {/* Fake sparkline for ERP feel */}
                                        <svg className={`w-16 h-8 ${darkMode ? 'text-slate-700' : 'text-slate-100'}`} viewBox="0 0 100 30" fill="none">
                                            <path d="M0 25 Q 25 5, 50 15 T 100 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="group-hover:text-current transition-colors duration-300" />
                                        </svg>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* 4. QUICK ACTION BAR (Sticky Horizontal Scroll) */}
                        {data?.user.status === "active" && (
                            <div className={`sticky top-0 z-20 py-3 -mx-4 px-4 sm:mx-0 sm:px-0 bg-gradient-to-b ${darkMode ? 'from-[#0f172a] via-[#0f172a]' : 'from-[#F4F7FB] via-[#F4F7FB]'} to-transparent backdrop-blur-md`}>
                                <motion.div initial="hidden" animate="show" variants={popIn} className="flex items-center gap-3 sm:gap-4 overflow-x-auto custom-scrollbar pb-1.5 pt-1 px-0.5">
                                    {[
                                        { icon: ClipboardCheck, label: "Start Attendance", color: "bg-[#2D3C8A] hover:bg-[#1E2A78] text-white shadow-[0_4px_12px_rgba(47,63,165,0.25)] border-transparent transform hover:-translate-y-0.5", priority: true },
                                        { icon: LayoutGrid, label: "View Seating Grid", color: darkMode ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-sm" },
                                        { icon: AlertTriangle, label: "Report Incident", color: darkMode ? "bg-slate-800 text-red-400 border-slate-700 hover:bg-slate-700" : "bg-white text-red-600 hover:bg-red-50 border-red-200 shadow-sm" },
                                        { icon: RefreshCcw, label: "Request Swap", color: darkMode ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-sm" },
                                    ].map((action, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                if (action.label === 'Start Attendance') navigate('/invigilator/attendance');
                                                if (action.label === 'View Seating Grid') setActiveNav('seating');
                                                if (action.label === 'Report Incident') setShowIncidentModal(true);
                                                if (action.label === 'Request Swap') navigate('/invigilator/swaps');
                                            }}
                                            className={`flex flex-row items-center gap-2.5 px-5 py-2.5 rounded-[10px] border font-bold text-[13px] transition-all active:scale-[0.98] whitespace-nowrap ${action.color}`}
                                        >
                                            <action.icon size={16} strokeWidth={action.priority ? 2.5 : 2} />
                                            <span>{action.label}</span>
                                        </button>
                                    ))}
                                </motion.div>
                            </div>
                        )}

                        {/* 5. MAIN DOSSIER (2 Column Grid) */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                            {/* LEFT COLUMN (65%): Duties Table */}
                            <motion.div variants={fadeUp} initial="hidden" animate="show" className="xl:col-span-2 space-y-6">
                                <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col h-full ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200/80'}`}>
                                    <div className={`p-5 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                                        <div className="flex items-center gap-4">
                                            <h3 className={`text-[17px] font-black flex items-center gap-2.5 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
                                                <div className="p-1.5 bg-blue-100 text-[#2F3FA5] rounded-lg"><ClipboardList size={18} /></div>
                                                Duty Dossier
                                            </h3>
                                            <div className="flex bg-slate-200/50 p-1 rounded-xl ml-2">
                                                {['scheduled', 'history', 'incidents'].map((tab) => (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setSelectedDutyTab(tab as any)}
                                                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${selectedDutyTab === tab ? 'bg-white text-[#2F3FA5] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        {tab}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button className="text-[12px] font-bold text-[#2F3FA5] bg-blue-50/80 px-4 py-1.5 rounded-lg hover:bg-blue-100 transition-colors hidden sm:block border border-blue-100 shadow-sm">Export My Log</button>
                                    </div>
                                    <div className="overflow-x-auto flex-1 p-2">
                                        {selectedDutyTab === 'incidents' ? (
                                            <div className="p-4 space-y-4">
                                                {!data?.incidents || data.incidents.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                                        <CheckCircle2 size={32} className="opacity-20 mb-2" />
                                                        <p className="text-[11px] font-bold uppercase tracking-widest">No Incidents Reported</p>
                                                    </div>
                                                ) : data.incidents.map(inc => (
                                                    <div key={inc.id} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded uppercase border border-red-200">{inc.type}</span>
                                                                <span className="text-[11px] font-bold text-slate-500">{new Date(inc.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${inc.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {inc.status}
                                                            </span>
                                                        </div>
                                                        <p className={`text-[13px] font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{inc.exam} · {inc.room}</p>
                                                        <p className="text-[12px] text-slate-500 leading-relaxed italic">"{inc.description}"</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <table className="w-full text-left text-[13px] whitespace-nowrap">
                                                <thead className={`font-bold uppercase tracking-wider text-[10px] ${darkMode ? 'text-slate-400 bg-slate-800/80' : 'text-slate-500 bg-slate-50'}`}>
                                                    <tr>
                                                        <th className="px-4 py-3 rounded-l-xl">Exam Session</th>
                                                        <th className="px-4 py-3">Room & Time</th>
                                                        <th className="px-4 py-3">Metrics</th>
                                                        <th className="px-4 py-3">Attendance</th><th className="px-4 py-3 text-center">Actions</th>
                                                        <th className="px-4 py-3 text-right rounded-r-xl">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y ${darkMode ? 'divide-slate-700/50' : 'divide-slate-100/80'}`}>
                                                    {(selectedDutyTab === 'scheduled' 
                                                        ? data?.duties?.filter(d => d.status !== 'Completed')
                                                        : data?.duties?.filter(d => d.status === 'Completed')
                                                    )?.map(duty => (
                                                        <tr key={duty.id} className={`transition-colors group ${duty.isReliefDuty ? (darkMode ? 'bg-indigo-900/20 hover:bg-indigo-900/30' : 'bg-indigo-50/50 hover:bg-indigo-50/80') : (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50')}`}>
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center font-bold text-[11px] ${duty.session === 'FN' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                                        {duty.session}
                                                                    </div>
                                                                    <div>
                                                                        <p className={`font-extrabold text-[14px] ${darkMode ? 'text-white' : 'text-slate-800'}`}>{duty.exam}</p>
                                                                        {duty.isReliefDuty ? (
                                                                            <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><RefreshCcw size={10} /> Relief Duty</p>
                                                                        ) : (
                                                                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Regular Exam</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <p className="font-extrabold text-[#2F3FA5] text-[14px]">{duty.room} <span className="text-slate-400 font-medium text-[12px] ml-1">({duty.block})</span></p>
                                                                <p className="text-slate-500 text-[11px] mt-0.5 font-semibold flex items-center gap-1.5"><Clock size={12} /> {duty.time}</p>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{duty.students} Students</span>
                                                                    {duty.status !== "Upcoming" && <span className="text-[9px] font-bold text-emerald-600 uppercase">{duty.presentCount} Present</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                {duty.isAttendanceMarked ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded border border-emerald-100"><ClipboardCheck size={12} /> Marked</span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded border border-slate-200">Pending</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 text-center">{duty.status !== "Completed" && (<button onClick={() => { setSelectedDutyForSwap(duty); setShowSwapModal(true); }} className={`p-1.5 rounded-lg border transition-all ${darkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm"}`} title="Request Relief / Swap"><RefreshCcw size={14} /></button>)}</td><td className="px-4 py-4 text-right">
                                                                {duty.status === "In Progress" && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200 shadow-sm">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                        In Progress
                                                                    </span>
                                                                )}
                                                                {duty.status === "Upcoming" && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-200 shadow-sm">
                                                                        Upcoming
                                                                    </span>
                                                                )}
                                                                {duty.status === "Completed" && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider border border-slate-200 shadow-sm">
                                                                        Completed
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </motion.div>

                            {/* RIGHT COLUMN (35%): Live Room & Swap Panels */}
                            <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6 flex flex-col">

                                {/* Live Room Command Panel */}
                                <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col group ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200/80'}`}>
                                    <div className={`p-5 border-b relative z-10 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                                        <div className="flex items-center justify-between">
                                            <h3 className={`text-[16px] font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
                                                Room Pulse <span className="px-2 py-0.5 bg-blue-100 text-[#2F3FA5] text-[11px] rounded-md border border-blue-200 ml-1 shadow-inner">A-204</span>
                                            </h3>
                                            <span className="flex items-center gap-1.5 text-[9px] uppercase font-extrabold text-emerald-600 tracking-[0.1em] bg-emerald-50 px-2 py-1 rounded bg-emerald-50 border border-emerald-100"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span> Live Sync</span>
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-6 relative z-10">
                                        {/* Simplified Heatmap */}
                                        <div className={`rounded-xl p-4 border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                                                <span>Live Seating Matrix</span> <Eye size={14} className="text-slate-400" />
                                            </p>
                                            <div className="grid grid-cols-5 gap-2">
                                                {Array.from({ length: 20 }).map((_, i) => (
                                                    <div key={i} className={`h-8 sm:h-9 rounded-lg border-2 ${[2, 7, 18].includes(i) ? 'bg-red-50 border-red-200' :
                                                        [4, 9, 11, 14, 15, 16, 17, 19].includes(i) ? 'bg-white border-slate-200' : 'bg-emerald-50 border-emerald-300'
                                                        } transition-all duration-300 hover:scale-105 cursor-pointer shadow-sm`} title={`Seat ${i + 1}`}></div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Attendance Analytics Mini */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <span className={`text-[14px] font-extrabold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Attendance Live</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 border border-slate-200 px-1.5 py-0.5 rounded inline-flex w-max bg-slate-50 shadow-sm">3 Unmarked</span>
                                                </div>
                                                <div className="flex gap-5">
                                                    <div className="flex flex-col items-center"><span className="text-emerald-600 font-black text-xl leading-none">28</span><span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-1">Present</span></div>
                                                    <div className="flex flex-col items-center"><span className="text-red-500 font-black text-xl leading-none">4</span><span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-1">Absent</span></div>
                                                </div>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className={`w-full h-2 rounded-full overflow-hidden flex shadow-inner ${darkMode ? 'bg-slate-700' : 'bg-slate-100 ring-1 ring-slate-200'}`}>
                                                <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} transition={{ duration: 1.5, ease: 'easeOut' }} className="bg-emerald-500 h-full border-r border-emerald-600/50 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-white/20 w-full h-full transform -skew-x-12 translate-x-full animate-[shimmer_2s_infinite]"></div>
                                                </motion.div>
                                                <motion.div initial={{ width: 0 }} animate={{ width: '15%' }} transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }} className="bg-red-500 h-full" />
                                            </div>
                                        </div>

                                        <button className="w-full py-2.5 bg-[#2F3FA5] hover:bg-[#1E2A78] text-white font-bold text-[13px] rounded-xl transition-all shadow-md shadow-blue-900/20 flex items-center justify-center gap-1.5 transform hover:-translate-y-0.5">
                                            Open Full Console <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>


                            </motion.div>
                        </div>
                    </div>
                </>
                ) : activeNav === 'duties' ? (
                    <InvigilatorDutiesView darkMode={darkMode} duties={data?.duties || []} />
                ) : activeNav === 'seating' ? (
                    <InvigilatorSeatingView darkMode={darkMode} />
                ) : (
                    <div className="p-8 text-center opacity-50 flex flex-col items-center justify-center h-full">
                        <ClipboardList size={48} className="mb-4" />
                        <h2 className="text-xl font-bold">View Under Construction</h2>
                        <p>This module is coming soon in the next update.</p>
                    </div>
                )}

                {/* --- INCIDENT REPORT MODAL --- */}
                <AnimatePresence>
                    {showIncidentModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowIncidentModal(false)} />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className={`bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}
                            >
                                <div className={`p-5 border-b flex items-center justify-between ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                    <h3 className="text-lg font-black flex items-center gap-2 text-red-600">
                                        <AlertTriangle size={20} /> Report Incident
                                    </h3>
                                    <button onClick={() => setShowIncidentModal(false)} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="p-5 space-y-4">
                                    <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                        Please describe the incident or malpractice observed. This report will be sent immediately to the Exam Cell and Chief Superintendent.
                                    </p>
                                    <textarea
                                        value={incidentText}
                                        onChange={(e) => setIncidentText(e.target.value)}
                                        placeholder="E.g., Student found with unauthorized material..."
                                        className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all min-h-[120px] resize-none text-sm font-medium ${darkMode ? 'bg-slate-900 border-slate-700 placeholder-slate-500' : 'bg-slate-50 border-slate-200 placeholder-slate-400'}`}
                                    ></textarea>
                                </div>
                                <div className={`p-4 border-t flex justify-end gap-3 ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                    <button onClick={() => setShowIncidentModal(false)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}>
                                        Cancel
                                    </button>
                                    <button onClick={handleReportIncident} disabled={!incidentText.trim()} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                        Submit Report
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
 
                {/* --- SWAP REQUEST MODAL --- */}
                <AnimatePresence>
                    {showSwapModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSwapModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <RefreshCcw size={20} />
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Request Duty Relief</h3>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Exam Hall Swap Request</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowSwapModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><X size={20} /></button>
                                </div>

                                <div className="p-6 space-y-4">
                                    {selectedDutyForSwap && (
                                        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Selected Duty</p>
                                            <p className={`text-[14px] font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedDutyForSwap.exam}</p>
                                            <p className="text-[12px] font-bold text-indigo-600 mt-1">{selectedDutyForSwap.room} ({selectedDutyForSwap.block})</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{selectedDutyForSwap.date} · {selectedDutyForSwap.time}</p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Reason for Relief</label>
                                        <textarea 
                                            value={swapReason}
                                            onChange={(e) => setSwapReason(e.target.value)}
                                            placeholder="Please provide a valid reason for requesting duty relief (e.g., Medical Emergency, Duty Conflict...)"
                                            className={`w-full h-32 p-4 rounded-xl border text-[13px] font-medium resize-none transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`}
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium">Your request will be sent to the Exam Cell admin for review and approval.</p>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                                    <button onClick={() => setShowSwapModal(false)} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-[13px] hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button 
                                        onClick={handleRequestSwap}
                                        disabled={!swapReason.trim() || submittingSwap}
                                        className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-black text-[13px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                        {submittingSwap ? <RefreshCcw size={16} className="animate-spin" /> : "Send Request"}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>


            </main>
        </div>
    </div>
    );
}

// ==========================================
// DUTIES VIEW COMPONENT
// ==========================================
interface DutyItem {
    id: number;
    exam: string;
    session: string;
    date: string;
    roomID: number;
    room: string;
    block: string;
    time: string;
    students: number;
    presentCount: number;
    status: string;
    isHallRevealed?: boolean;
    isAttendanceMarked?: boolean;
    isReliefDuty?: boolean;
}

function InvigilatorDutiesView({ darkMode, duties }: { darkMode: boolean; duties: DutyItem[] }) {
    const navigate = useNavigate();
    const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'inProgress' | 'completed'>('all');

    console.log('[DUTIES VIEW] Rendering with duties:', duties);
    console.log('[DUTIES VIEW] Dark mode:', darkMode);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'upcoming':
                return darkMode ? 'bg-blue-900/20 border-blue-700 text-blue-100' : 'bg-blue-50 border-blue-200 text-blue-900';
            case 'in progress':
                return darkMode ? 'bg-amber-900/20 border-amber-700 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900';
            case 'completed':
                return darkMode ? 'bg-green-900/20 border-green-700 text-green-100' : 'bg-green-50 border-green-200 text-green-900';
            default:
                return darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-gray-50 border-gray-200 text-gray-900';
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'upcoming':
                return darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800';
            case 'in progress':
                return darkMode ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-800';
            case 'completed':
                return darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800';
            default:
                return darkMode ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return <CheckCircle2 className="w-4 h-4" />;
            case 'in progress':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const filteredDuties = duties.filter(duty => {
        if (filterStatus === 'all') return true;
        const status = duty.status?.toLowerCase();
        if (filterStatus === 'upcoming') return status === 'upcoming';
        if (filterStatus === 'inProgress') return status === 'in progress';
        if (filterStatus === 'completed') return status === 'completed';
        return true;
    });

    const dutyStats = {
        total: duties.length,
        upcoming: duties.filter(d => d.status?.toLowerCase() === 'upcoming').length,
        inProgress: duties.filter(d => d.status?.toLowerCase() === 'in progress').length,
        completed: duties.filter(d => d.status?.toLowerCase() === 'completed').length,
    };

    return (
        <>
            <div className={`px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full min-h-full ${darkMode ? 'bg-[#0f172a]' : 'bg-[#F4F7FB]'}`}>
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="mb-6">
                        <h1 className={`text-3xl sm:text-4xl font-black tracking-tight mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            My Invigilator Duties
                        </h1>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            View all your assigned examination duties and their details
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Total Duties', value: dutyStats.total, color: 'from-blue-600 to-blue-700' },
                            { label: 'Upcoming', value: dutyStats.upcoming, color: 'from-purple-600 to-purple-700' },
                            { label: 'In Progress', value: dutyStats.inProgress, color: 'from-amber-600 to-amber-700' },
                            { label: 'Completed', value: dutyStats.completed, color: 'from-green-600 to-green-700' },
                        ].map((stat, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 text-white`}
                            >
                                <p className="text-xs font-medium opacity-90">{stat.label}</p>
                                <p className="text-3xl font-black mt-2">{stat.value}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'upcoming', 'inProgress', 'completed'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setFilterStatus(filter as any)}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                    filterStatus === filter
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                        : darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {filter === 'all' ? 'All' : filter === 'inProgress' ? 'In Progress' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Duties List */}
                {filteredDuties.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`text-center py-12 rounded-2xl border-2 border-dashed ${darkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}
                    >
                        <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        <p className={`text-lg font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No duties found</p>
                    </motion.div>
                ) : (
                    <div className="grid gap-4">
                        <AnimatePresence>
                            {filteredDuties.map((duty, idx) => (
                                <motion.div
                                    key={duty.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`border rounded-xl p-6 transition-all cursor-pointer hover:shadow-lg ${getStatusColor(duty.status)} ${
                                        darkMode ? 'hover:bg-opacity-80' : 'hover:shadow-blue-100/50'
                                    }`}
                                    onClick={() => {
                                        if (duty.status?.toLowerCase() === 'in progress' && !duty.isAttendanceMarked) {
                                            navigate(`/invigilator/attendance/${duty.id}`);
                                        }
                                    }}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {/* Exam Info */}
                                        <div className="md:col-span-2">
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="flex-1">
                                                    <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                        {duty.exam}
                                                    </h3>
                                                    <div className={`flex gap-3 text-sm flex-wrap ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4" />
                                                            {new Date(duty.date).toLocaleDateString('en-IN', {
                                                                weekday: 'short',
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-4 h-4" />
                                                            {duty.time} ({duty.session})
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 whitespace-nowrap ${getStatusBadgeColor(duty.status)}`}>
                                                    {getStatusIcon(duty.status)}
                                                    {duty.status}
                                                </span>
                                            </div>

                                            {/* Relief Duty Badge */}
                                            {duty.isReliefDuty && (
                                                <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                    <Shield className="w-4 h-4" />
                                                    <span>Relief Duty</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Room & Block Info */}
                                        <div>
                                            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Location
                                            </p>
                                            <div className="space-y-1">
                                                <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    {duty.isHallRevealed ? duty.room : <>
                                                        <EyeOff className="w-4 h-4 inline mr-1" />
                                                        Locked
                                                    </>}
                                                </p>
                                                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {duty.isHallRevealed ? duty.block : 'Reveals 1hr before'}
                                                </p>
                                                {duty.isHallRevealed && (
                                                    <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                                        Room #{duty.roomID}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Students & Attendance */}
                                        <div>
                                            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Students
                                            </p>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Users className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                                                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{duty.students}</span>
                                                    <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>allocated</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                                                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{duty.presentCount}</span>
                                                    <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>present</span>
                                                </div>
                                                {duty.isAttendanceMarked && (
                                                    <p className={`text-xs flex items-center gap-1 mt-2 font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Attendance marked
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </>
    );
}

// ==========================================
// SEATING VIEW COMPONENT
// ==========================================
function InvigilatorSeatingView({ darkMode }: { darkMode: boolean }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [duties, setDuties] = useState<any[]>([]);
    const [selectedDuty, setSelectedDuty] = useState<any>(null);
    const [benches, setBenches] = useState<any[]>([]);
    const [studentAllocations, setStudentAllocations] = useState<Record<number, any>>({});
    const [revealCountdown, setRevealCountdown] = useState<string>("00:00:00");

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!selectedDuty || selectedDuty.isHallRevealed !== false) return;

        const session = selectedDuty.session;
        const examDateStr = selectedDuty.date;
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
    }, [selectedDuty]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const dashboard = await invigilatorService.getDashboardData();
            if (dashboard.duties && dashboard.duties.length > 0) {
                setDuties(dashboard.duties);
                handleDutySelect(dashboard.duties[0]);
            } else {
                setError("No duties assigned to view seating.");
                setLoading(false);
            }
        } catch (err: any) {
            setError("Failed to load duty data.");
            setLoading(false);
        }
    };

    const handleDutySelect = async (duty: any) => {
        if (!duty) return;
        try {
            setLoading(true);
            setSelectedDuty(duty);
            
            if (duty.isHallRevealed === false) {
                setLoading(false);
                return;
            }

            const examDate = duty.date;
            const session = duty.session;
            const roomId = duty.roomID || duty.id; // ensure roomId exists

            if (!roomId) {
                console.error("No RoomID for duty:", duty);
                setError("Invalid room configuration.");
                return;
            }

            const layout = await SeatingService.getHallLayout(roomId);
            setBenches(layout.benches || []);

            const alloc = await SeatingService.getAllocationForHall(examDate, session, roomId);
            setStudentAllocations(alloc.assignments || {});

        } catch (err: any) {
            console.error("Layout fetch error:", err);
            setError("Failed to fetch room layout.");
        } finally {
            setLoading(false);
        }
    };

    const benchRows = useMemo(() => {
        const rows: Record<string, any[]> = {};
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

    if (loading && duties.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold animate-pulse text-xs uppercase tracking-widest">Generating Room Map...</p>
            </div>
        );
    }

    if (error && duties.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{error}</h3>
                <button onClick={fetchInitialData} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2">
                    <RefreshCw size={16} /> Retry
                </button>
            </div>
        );
    }

    if (selectedDuty && selectedDuty.isHallRevealed === false) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 mb-6 shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/50 to-transparent"></div>
                    <Lock size={40} className="relative z-10" />
                </div>
                <h3 className={`text-2xl font-black uppercase tracking-widest mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Hall Details Locked</h3>
                <p className="text-slate-500 max-w-md text-sm font-semibold leading-relaxed mb-6">
                    For security reasons, your assigned exam room and seating arrangement will be revealed exactly <span className="text-blue-600">1 hour</span> before the session starts.
                </p>
                <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unlocking In</p>
                    <div className="text-3xl font-mono font-black text-slate-700 tracking-wider">
                        {revealCountdown}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Header / Selector */}
            <div className={`p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div>
                    <h2 className={`text-lg font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        <LayoutGrid className="text-blue-500" size={20} /> Exam Room Layout
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                        {selectedDuty?.room} • {selectedDuty?.exam}
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select 
                        onChange={(e) => handleDutySelect(duties.find(d => d.id === parseInt(e.target.value)))}
                        value={selectedDuty?.id}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                    >
                        {duties.map(d => (
                            <option key={d.id} value={d.id}>{d.room} - {d.exam.slice(0, 20)}...</option>
                        ))}
                    </select>
                    
                    <button onClick={() => handleDutySelect(selectedDuty)} className={`p-2 rounded-xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-blue-600'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Layout Map Area */}
            <div className={`flex-1 overflow-auto p-12 custom-scrollbar ${darkMode ? 'bg-[#0a0f1d]' : 'bg-slate-50'}`}>
                <div className="inline-flex flex-col items-center min-w-full">
                    
                    {/* Teacher's Desk - More Professional */}
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-72 h-10 bg-[#0f172a] rounded-xl border border-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center mb-16 relative overflow-hidden group mx-auto"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10 opacity-50"></div>
                        <span className="text-blue-400 font-black text-[9px] tracking-[0.4em] uppercase">Teacher's Station / Front</span>
                    </motion.div>

                    {loading && benches.length === 0 ? (
                        <div className="py-20 text-center">
                             <div className="w-10 h-10 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Generating Seating Matrix...</p>
                        </div>
                    ) : (
                        <div className="pb-32 flex justify-center">
                            {benchRows.length === 0 ? (
                                <div className="py-20 text-center opacity-30 flex flex-col items-center justify-center min-w-[600px]">
                                    <DoorOpen size={48} className="mb-4 stroke-1" />
                                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">No Allocation Found</h3>
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
                                    <div /> {/* Spacer for row numbers column */}
                                    {benchRows.map(({ rowLabel }) => (
                                        <div key={rowLabel} className="flex justify-center pb-4">
                                            <div className="relative group">
                                                <div className="absolute -inset-2 bg-blue-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="w-12 h-12 rounded-2xl bg-[#0f172a] shadow-2xl flex items-center justify-center text-xl font-black text-white border border-slate-700 relative z-10">
                                                    {rowLabel}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* GRID BODY */}
                                    {Array.from({ length: Math.max(...benchRows.map(r => r.benches.length)) }).map((_, benchIdx) => (
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
                                                    <div key={`${rowLabel}-${bench.benchNumber}`} className="flex gap-3 p-2.5 bg-slate-50/50 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
                                                        {bench.seats.map((seat: any) => {
                                                            const alloc = studentAllocations[seat.SeatID];
                                                            const getSubjectColor = (code: string) => {
                                                                if (!code) return { border: 'border-slate-200', text: 'text-slate-400', pill: 'bg-slate-100', glow: 'shadow-none' };
                                                                const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                                                const colors = [
                                                                    { border: 'border-emerald-200', text: 'text-emerald-700', pill: 'bg-emerald-50', glow: 'shadow-emerald-500/5' },
                                                                    { border: 'border-blue-200', text: 'text-blue-700', pill: 'bg-blue-50', glow: 'shadow-blue-500/5' },
                                                                    { border: 'border-violet-200', text: 'text-violet-700', pill: 'bg-violet-50', glow: 'shadow-violet-500/5' },
                                                                    { border: 'border-amber-200', text: 'text-amber-700', pill: 'bg-amber-50', glow: 'shadow-amber-500/5' },
                                                                ];
                                                                return colors[hash % colors.length];
                                                            };
                                                            const sStyles = getSubjectColor(alloc?.subjectCode);

                                                            return (
                                                                <motion.div
                                                                    key={seat.SeatID}
                                                                    whileHover={{ y: -4, scale: 1.02 }}
                                                                    className={`
                                                                        w-[75px] h-[100px] rounded-2xl p-2.5 flex flex-col justify-between transition-all relative border-2
                                                                        ${!alloc ? 'bg-white border-dashed border-slate-200 opacity-40' : 
                                                                          `bg-white ${sStyles.border} ${sStyles.glow} shadow-lg`}
                                                                    `}
                                                                >
                                                                    <span className={`absolute top-1.5 left-2 text-[7px] font-black uppercase opacity-40 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                                        {seat.SeatNumber === 1 ? 'L' : 'R'}
                                                                    </span>

                                                                    {alloc ? (
                                                                        <>
                                                                            <div className="mt-2 flex flex-col items-center">
                                                                                <span className="text-[9px] font-black text-[#0F172A] tracking-tighter leading-none mb-1">
                                                                                    {alloc.registerNumber}
                                                                                </span>
                                                                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter truncate w-full text-center">
                                                                                    {alloc.studentName.split(' ')[0]}
                                                                                </span>
                                                                            </div>
                                                                            
                                                                            <div className={`mt-auto py-1 px-1.5 rounded-lg ${sStyles.pill} border ${sStyles.border} flex items-center justify-center`}>
                                                                                <span className={`text-[6px] font-black uppercase tracking-widest truncate ${sStyles.text}`}>
                                                                                    {alloc.subjectCode?.split('-').pop() || 'EXAM'}
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="flex-1 flex items-center justify-center">
                                                                            <span className="text-[7px] font-black text-slate-300 tracking-widest uppercase">Vacant</span>
                                                                        </div>
                                                                    )}
                                                                </motion.div>
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
                    )}
                </div>
            </div>
        </div>
    );
}
