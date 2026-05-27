import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    CalendarDays,
    MonitorSmartphone,
    History,
    Bell,
    User,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Circle,
    Sparkles,
    Sun,
    Moon,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { studentPortalApi } from '../services/studentPortal';
import { useStudentTheme } from './StudentThemeContext';

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
    { label: 'My Exams', icon: CalendarDays, path: '/student/exams' },
    { label: 'Seating Plan', icon: MonitorSmartphone, path: '/student/seating' },
    { label: 'Exam History', icon: History, path: '/student/history' },
    { label: 'Notifications', icon: Bell, path: '/student/notifications' },
    { label: 'Profile', icon: User, path: '/student/profile' },
    { label: 'Settings', icon: Settings, path: '/student/settings' },
];

const StudentLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const { theme, toggleTheme } = useStudentTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLive, setIsLive] = useState(true);
    const [studentData, setStudentData] = useState<any>(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const fetchStudent = async () => {
            try {
                const data = await studentPortalApi.getDashboard();
                setStudentData(data.student);
            } catch (err) {
                console.error('Error fetching student data:', err);
            }
        };
        fetchStudent();

        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/student/login');
    };

    const initials = studentData?.name
        ? studentData.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'S';

    const isDark = theme === 'dark';

    return (
        <div className={`min-h-screen flex font-sans overflow-x-hidden relative transition-colors duration-500 ${
            isDark ? 'bg-[#070B13] text-slate-100' : 'bg-[#F4F6FA] text-slate-800'
        }`}>
            {/* Ambient Background Glows */}
            <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none z-0 transition-opacity duration-500 ${
                isDark ? 'bg-indigo-500/10 opacity-100' : 'bg-indigo-500/5 opacity-70'
            }`} />
            <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none z-0 transition-opacity duration-500 ${
                isDark ? 'bg-purple-500/10 opacity-100' : 'bg-purple-500/5 opacity-70'
            }`} />

            {/* Desktop Sidebar */}
            <aside className={`hidden lg:flex w-72 flex-col fixed h-full z-30 backdrop-blur-xl border-r transition-colors duration-500 ${
                isDark ? 'bg-[#0C1220]/80 border-slate-800/60' : 'bg-white/80 border-slate-200/80 shadow-sm'
            }`}>
                <div className="p-8">
                    <Link to="/student/dashboard" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] group-hover:scale-105 transition-all duration-300">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        <span className={`font-black text-2xl tracking-tight bg-gradient-to-r bg-clip-text text-transparent transition-all duration-500 ${
                            isDark ? 'from-white via-slate-100 to-indigo-300' : 'from-slate-900 via-slate-800 to-indigo-600'
                        }`}>
                            SeatSync
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto py-4">
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 group relative ${
                                    isActive
                                        ? isDark ? 'text-white font-bold' : 'text-indigo-600 font-bold'
                                        : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-655 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavDesktop"
                                        className={`absolute inset-0 rounded-2xl border z-0 transition-colors duration-500 ${
                                            isDark 
                                                ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/15 border-indigo-500/20' 
                                                : 'bg-indigo-50 border-indigo-100/50'
                                        }`}
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <item.icon 
                                    size={20} 
                                    className={`relative z-10 transition-transform duration-300 group-hover:scale-110 ${
                                        isActive 
                                            ? isDark ? 'text-indigo-400' : 'text-indigo-600'
                                            : isDark ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-500 group-hover:text-slate-700'
                                    }`} 
                                />
                                <span className="relative z-10 text-[14px] tracking-wide font-semibold">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeDotDesktop"
                                        className={`ml-auto w-2 h-2 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)] relative z-10 ${
                                            isDark ? 'bg-gradient-to-tr from-indigo-400 to-purple-400' : 'bg-indigo-600'
                                        }`}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Profile Card */}
                <div className="p-6">
                    <div className={`rounded-3xl p-5 border shadow-2xl relative overflow-hidden group transition-colors duration-500 ${
                        isDark 
                            ? 'bg-gradient-to-b from-[#131B2E]/90 to-[#0C1220]/90 border-slate-800/80' 
                            : 'bg-slate-50 border-slate-200'
                    }`}>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-lg shadow-[0_4px_20px_rgba(99,102,241,0.3)] shrink-0">
                                {initials}
                            </div>
                            <div className="overflow-hidden min-w-0 flex-1">
                                <p className={`font-extrabold truncate text-[14px] ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{studentData?.name || 'Loading...'}</p>
                                <p className="text-xs text-indigo-500 font-bold truncate mt-0.5 uppercase tracking-widest">{studentData?.program || '—'}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all duration-300 text-xs font-black relative z-10 ${
                                isDark 
                                    ? 'bg-white/5 border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/20 text-slate-300 hover:text-rose-400' 
                                    : 'bg-white border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600'
                            }`}
                        >
                            <LogOut size={14} /> SIGN OUT
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-72 flex flex-col min-h-screen relative z-10">
                {/* Header */}
                <header className={`h-24 sticky top-0 z-20 flex items-center justify-between px-6 sm:px-10 transition-all duration-300 ${
                    scrolled 
                        ? isDark 
                            ? 'bg-[#070B13]/85 border-b border-slate-800/50 shadow-[0_10px_30px_rgba(0,0,0,0.3)]' 
                            : 'bg-white/85 border-b border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
                        : 'bg-transparent'
                } backdrop-blur-md`}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className={`lg:hidden p-3 rounded-2xl border transition-colors duration-500 ${
                                isDark ? 'bg-[#0C1220] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                            }`}
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h2 className={`font-black text-xl tracking-tight transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                {navItems.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLive ? 'bg-emerald-400' : 'bg-slate-400'} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                                </span>
                                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">
                                    {isLive ? 'System Online' : 'System Standby'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle Button */}
                        <button 
                            onClick={toggleTheme}
                            className={`p-3 rounded-2xl border transition-all duration-300 relative ${
                                isDark 
                                    ? 'bg-[#0C1220]/80 border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/30' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-500/30 shadow-sm'
                            }`}
                            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* Notifications */}
                        <Link 
                            to="/student/notifications" 
                            className={`p-3 rounded-2xl border transition-all duration-300 relative ${
                                isDark 
                                    ? 'bg-[#0C1220]/80 border-slate-800 text-slate-300 hover:text-indigo-400 hover:border-indigo-500/30' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-500/30 shadow-sm'
                            }`}
                        >
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#070B13]" />
                        </Link>
                        
                        <div className={`h-8 w-[1px] mx-1 hidden sm:block ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        
                        <Link to="/student/profile" className="flex items-center gap-3 pl-1 group">
                            <div className="text-right hidden sm:block">
                                <p className={`text-sm font-extrabold transition-colors duration-500 ${isDark ? 'text-slate-200 group-hover:text-indigo-400' : 'text-slate-700 group-hover:text-indigo-600'}`}>
                                    {studentData?.name?.split(' ')[0] || 'Student'}
                                </p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                                    Sem {studentData?.semester || '—'}
                                </p>
                            </div>
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-105 shrink-0">
                                {initials}
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6 sm:p-10 flex-1 flex flex-col justify-start">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-[#04060b]/80 backdrop-blur-md z-40 lg:hidden"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`fixed inset-y-0 left-0 w-80 z-50 lg:hidden flex flex-col border-r transition-colors duration-500 ${
                                isDark ? 'bg-[#070B13] border-slate-800/80' : 'bg-white border-slate-200'
                            }`}
                        >
                            <div className={`p-6 flex items-center justify-between border-b ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">
                                        <Sparkles size={16} />
                                    </div>
                                    <span className={`font-black text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>SeatSync</span>
                                </div>
                                <button onClick={() => setIsMobileMenuOpen(false)} className={`p-2.5 rounded-xl border transition-colors ${
                                    isDark ? 'bg-[#0C1220] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                    <X size={18} />
                                </button>
                            </div>
                            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                                {navItems.map((item) => {
                                    const isActive = location.pathname.startsWith(item.path);
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all relative ${
                                                isActive
                                                    ? isDark 
                                                        ? 'text-white font-bold bg-indigo-500/10 border border-indigo-500/20'
                                                        : 'text-indigo-600 font-bold bg-indigo-50 border border-indigo-100/50'
                                                    : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            <item.icon size={22} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
                                            <span className={`text-[15px] font-semibold ${isActive ? '' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className={`p-6 border-t ${isDark ? 'border-slate-800/60 bg-[#0C1220]/50' : 'border-slate-100 bg-slate-50'}`}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shrink-0">
                                        {initials}
                                    </div>
                                    <div>
                                        <p className={`font-extrabold text-[15px] ${isDark ? 'text-white' : 'text-slate-800'}`}>{studentData?.name || 'Student'}</p>
                                        <p className="text-xs text-slate-500 font-bold mt-0.5">{studentData?.registerNumber || '—'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black border transition-all duration-300 ${
                                        isDark 
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' 
                                            : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                                    }`}
                                >
                                    <LogOut size={18} /> SIGN OUT
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                
                :root {
                    --font-sans: 'Plus Jakarta Sans', sans-serif;
                }

                body {
                    font-family: var(--font-sans);
                    -webkit-font-smoothing: antialiased;
                    transition: background-color 0.5s ease;
                }

                .light .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
                }

                .dark .glass-card {
                    background: rgba(12, 18, 32, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
            `}</style>
        </div>
    );
};

export default StudentLayout;
