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
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { studentPortalApi } from '../services/studentPortal';

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
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLive, setIsLive] = useState(true);
    const [studentData, setStudentData] = useState<any>(null);

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
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/student/login');
    };

    const initials = studentData?.name
        ? studentData.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'S';

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col fixed h-full z-30">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-800">SeatSync</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <item.icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
                                <span className="font-medium">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto">
                    <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-indigo-300">
                                {initials}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold truncate text-sm">{studentData?.name || 'Loading...'}</p>
                                <p className="text-xs text-slate-400 truncate">{studentData?.program || '—'}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold"
                        >
                            <LogOut size={14} /> Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 rounded-lg bg-slate-100 text-slate-600"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="font-bold text-slate-800 text-lg">
                                {navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                    {isLive ? 'Live System Connected' : 'System Standby'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                        </button>
                        <div className="h-10 w-[1px] bg-slate-200 mx-1" />
                        <Link to="/student/profile" className="flex items-center gap-3 pl-1 group">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                    {studentData?.name?.split(' ')[0] || 'Student'}
                                </p>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                                    Sem {studentData?.semester || '—'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200 transition-transform group-hover:scale-105">
                                {initials}
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6 sm:p-8 flex-1">
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
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden flex flex-col"
                        >
                            <div className="p-6 flex items-center justify-between border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">S</div>
                                    <span className="font-bold text-xl text-slate-800">SeatSync</span>
                                </div>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-lg bg-slate-100 text-slate-500">
                                    <X size={20} />
                                </button>
                            </div>
                            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                                {navItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${
                                                isActive
                                                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <item.icon size={22} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="p-6 border-t border-slate-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                        {initials}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{studentData?.name || 'Student'}</p>
                                        <p className="text-sm text-slate-500">{studentData?.registerNumber || '—'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-colors"
                                >
                                    <LogOut size={18} /> Sign Out
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
                }

                .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                }
            `}</style>
        </div>
    );
};

export default StudentLayout;
