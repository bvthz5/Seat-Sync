import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, ClipboardList, Grid3X3, Users,
    RefreshCcw, Bell, UserCircle, LogOut, CheckCircle2,
    Clock, Calendar, DoorOpen, LayoutGrid, ClipboardCheck,
    AlertTriangle, ChevronRight, Eye, Menu, X,
    Wifi, MapPin, Settings, Moon, Sun, User, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

// --- MOCK DATA ---
const MOCK_USER = {
    name: "John Mathew",
    date: "20 Feb 2026",
    status: "active", // "active" | "inactive"
    currentExamRoom: "A-204",
    timeRemaining: "01:32:12",
};

const SUMMARY_METRICS = [
    { title: "Today's Exams", value: "2", icon: Calendar, color: "blue", label: "Scheduled" },
    { title: "Current Location", value: "A-204", icon: MapPin, color: "green", label: "Block 2" },
    { title: "Total Students", value: "85", icon: Users, color: "indigo", label: "Supervising" },
    { title: "Attendance", value: "28/32", icon: ClipboardCheck, color: "amber", label: "Marked" },
];

const ASSIGNED_DUTIES = [
    { id: 1, exam: "OS – MCA", session: "FN", room: "A-204", block: "Block 2", time: "9:30 - 12:30", students: 32, status: "In Progress" },
    { id: 2, exam: "DBMS – BCA", session: "AN", room: "B-102", block: "Block 1", time: "13:30 - 16:30", students: 53, status: "Upcoming" },
];

const SWAP_REQUESTS = [
    { id: 1, duty: "13:30 - B-102", type: "Give Away", with: "Dr. Smith", status: "Pending Admin", reason: "Medical Emergency" },
    { id: 2, duty: "Yesterday", type: "Take Over", with: "Prof. Alan", status: "Approved", reason: "Mutually agreed" },
];

const NAV_GROUPS = [
    {
        title: 'GENERAL',
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, path: '/invigilator/dashboard', id: 'dashboard' },
            { label: 'My Duties', icon: ClipboardList, path: '/invigilator/duties', id: 'duties' },
            { label: 'Seating View', icon: Grid3X3, path: '/invigilator/seating', id: 'seating' },
            { label: 'Attendance', icon: Users, path: '/invigilator/attendance', id: 'attendance' },
        ]
    },
    {
        title: 'OPERATIONS',
        items: [
            { label: 'Swap Requests', icon: RefreshCcw, path: '/invigilator/swaps', id: 'swaps' },
            { label: 'Issue Reports', icon: AlertTriangle, path: '/invigilator/issues', id: 'issues' },
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

    // Live Clock & Responsive Checking
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
                                                onClick={() => { setActiveNav(item.id); if (item.path === '/invigilator/profile') navigate(item.path) }}
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
                            <p className="text-[11px] font-semibold text-slate-500 hidden sm:block mt-1">Welcome back, {MOCK_USER.name.split(' ')[0]}</p>
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
                                    <span className={`text-[13px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Prof. {MOCK_USER.name.split(' ')[0]}</span>
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

                    {/* 2. HERO STATUS BANNER (FULL WIDTH) */}
                    <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-6 w-full">
                        <div className={`w-full overflow-hidden relative rounded-[20px] shadow-lg transition-all duration-500 ${MOCK_USER.status === 'active' ? 'bg-[#2D3C8A] shadow-[#2F3FA5]/10' : 'bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700'}`}>
                            {/* Decorative background shapes */}
                            <div className="absolute top-0 right-[15%] w-[400px] h-[400px] bg-white/5 rounded-full blur-[80px] pointer-events-none"></div>
                            <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                            <div className="px-6 sm:px-8 lg:px-10 py-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                                <div className="space-y-3 max-w-2xl">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 bg-white/10 text-white backdrop-blur-md rounded-full text-[9px] font-extrabold uppercase tracking-widest border border-white/10 shadow-sm">Command Center</span>
                                        <p className="text-blue-100/90 font-semibold text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                            <Calendar size={12} /> {MOCK_USER.date}
                                        </p>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow">Welcome, {MOCK_USER.name}</h1>
                                    {MOCK_USER.status === 'active' && (
                                        <div className="inline-flex items-center gap-2 mt-1 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#1F2B6C] text-blue-50 text-[11px] font-bold tracking-wide shadow-sm">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            EXAM IN PROGRESS – ROOM {MOCK_USER.currentExamRoom}
                                        </div>
                                    )}
                                </div>

                                {MOCK_USER.status === "active" && (
                                    <div className="bg-[#1F2B6C] backdrop-blur-md border border-[rgba(255,255,255,0.05)] rounded-[16px] p-5 sm:p-6 flex flex-col items-start lg:items-end w-full lg:w-auto shadow-lg">
                                        <span className="text-[10px] font-bold text-blue-200/70 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                                            <Clock size={12} className="text-blue-400" /> Live Time Remaining
                                        </span>
                                        <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-widest tabular-nums leading-none drop-shadow-sm">
                                            {MOCK_USER.timeRemaining}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-4 sm:px-6 lg:px-8 pb-8 space-y-6 w-full">

                        {/* 3. SUMMARY METRICS ROW - ERP Depth Style */}
                        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {SUMMARY_METRICS.map((metric, i) => (
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
                        {MOCK_USER.status === "active" && (
                            <div className={`sticky top-0 z-20 py-3 -mx-4 px-4 sm:mx-0 sm:px-0 bg-gradient-to-b ${darkMode ? 'from-[#0f172a] via-[#0f172a]' : 'from-[#F4F7FB] via-[#F4F7FB]'} to-transparent backdrop-blur-md`}>
                                <motion.div initial="hidden" animate="show" variants={popIn} className="flex items-center gap-3 sm:gap-4 overflow-x-auto custom-scrollbar pb-1.5 pt-1 px-0.5">
                                    {[
                                        { icon: ClipboardCheck, label: "Start Attendance", color: "bg-[#2D3C8A] hover:bg-[#1E2A78] text-white shadow-[0_4px_12px_rgba(47,63,165,0.25)] border-transparent transform hover:-translate-y-0.5", priority: true },
                                        { icon: LayoutGrid, label: "View Seating Grid", color: darkMode ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-sm" },
                                        { icon: Users, label: "Subject List", color: darkMode ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-sm" },
                                        { icon: RefreshCcw, label: "Request Swap", color: darkMode ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-sm" },
                                    ].map((action, i) => (
                                        <button
                                            key={i}
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
                                    <div className={`p-5 sm:p-6 border-b flex items-center justify-between ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                                        <div>
                                            <h3 className={`text-[17px] font-black flex items-center gap-2.5 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
                                                <div className="p-1.5 bg-blue-100 text-[#2F3FA5] rounded-lg"><ClipboardList size={18} /></div>
                                                My Assigned Duties
                                            </h3>
                                        </div>
                                        <button className="text-[12px] font-bold text-[#2F3FA5] bg-blue-50/80 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors hidden sm:block border border-blue-100 shadow-sm">View Full Schedule</button>
                                    </div>
                                    <div className="overflow-x-auto flex-1 p-2">
                                        <table className="w-full text-left text-[13px] whitespace-nowrap">
                                            <thead className={`font-bold uppercase tracking-wider text-[10px] ${darkMode ? 'text-slate-400 bg-slate-800/80' : 'text-slate-500 bg-slate-50'}`}>
                                                <tr>
                                                    <th className="px-4 py-3 rounded-l-xl">Exam Session</th>
                                                    <th className="px-4 py-3">Room & Time</th>
                                                    <th className="px-4 py-3">Metrics</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3 text-right rounded-r-xl">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${darkMode ? 'divide-slate-700/50' : 'divide-slate-100/80'}`}>
                                                {ASSIGNED_DUTIES.map(duty => (
                                                    <tr key={duty.id} className={`transition-colors group ${darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}`}>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center font-bold text-[11px] ${duty.session === 'FN' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                                    {duty.session}
                                                                </div>
                                                                <div>
                                                                    <p className={`font-extrabold text-[14px] ${darkMode ? 'text-white' : 'text-slate-800'}`}>{duty.exam}</p>
                                                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Regular Exam</p>
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
                                                                {duty.status === "In Progress" && <span className="text-[9px] font-bold text-emerald-600 uppercase">28 Marked</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {duty.status === "In Progress" && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200 shadow-sm">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                    In Progress
                                                                </span>
                                                            )}
                                                            {duty.status === "Upcoming" && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-200 shadow-sm">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                                    Upcoming
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <button className={`inline-flex items-center gap-1.5 px-4 py-2 hover:bg-[#2F3FA5] hover:text-white font-bold text-[12px] rounded-lg transition-all shadow-sm ${darkMode ? 'bg-slate-700 text-white' : 'bg-white text-[#2F3FA5] border border-slate-200 hover:border-[#2F3FA5]'}`}>
                                                                Open Console <ChevronRight size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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

                                {/* Swap Requests Cards Stack */}
                                <div className={`rounded-2xl border shadow-sm p-5 flex-1 ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200/80'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className={`text-[16px] font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
                                            <RefreshCcw size={16} className="text-[#2F3FA5]" /> Swap Queue
                                        </h3>
                                        <button className="text-[9px] font-bold text-[#2F3FA5] hover:text-white uppercase tracking-widest bg-blue-50 hover:bg-[#2F3FA5] px-2.5 py-1 rounded-lg transition-colors">View All</button>
                                    </div>
                                    <div className="space-y-3">
                                        {SWAP_REQUESTS.map(swap => (
                                            <div key={swap.id} className={`p-3 sm:p-4 rounded-xl border transition-all shadow-sm group ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:border-slate-500' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-md'}`}>
                                                <div className="flex justify-between items-start mb-2 pointer-events-none">
                                                    <span className={`text-[13px] font-black tracking-wide transition-colors ${darkMode ? 'text-white' : 'text-slate-800 group-hover:text-[#2F3FA5]'}`}>{swap.duty}</span>
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${swap.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                                        }`}>
                                                        {swap.status}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11px] text-slate-500 font-bold">With: <span className={`font-black ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{swap.with}</span></p>
                                                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border shadow-sm ${darkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-white text-slate-500 border-slate-200'}`}>{swap.type}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium italic truncate">"{swap.reason}"</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className={`w-full mt-4 py-2.5 border-2 border-dashed font-bold text-[13px] rounded-xl transition-all group ${darkMode ? 'border-slate-600 text-slate-400 hover:bg-slate-800 hover:border-slate-500 hover:text-white' : 'border-slate-300 text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-[#2F3FA5]'}`}>
                                        <span className="group-hover:hidden flex items-center justify-center gap-1.5"><span className="text-lg leading-none">+</span> Request New Swap</span>
                                        <span className="hidden group-hover:block">Initialize Request Panel</span>
                                    </button>
                                </div>

                            </motion.div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
