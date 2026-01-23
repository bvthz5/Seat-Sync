import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    FileText,
    Armchair,
    Users,
    ClipboardCheck,
    BarChart3,
    ShieldAlert,
    Settings,
    GraduationCap,
    LogOut
} from 'lucide-react';

const Sidebar: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
    const { user, canAccess, logout } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Animation variants for sidebar width
    const sidebarVariants = {
        open: { width: "16rem", transition: { type: "spring", stiffness: 100, damping: 20 } },
        closed: { width: "5rem", transition: { type: "spring", stiffness: 100, damping: 20 } },
    };

    // Text fade variants
    const textVariants = {
        open: { opacity: 1, display: "block", transition: { delay: 0.1 } },
        closed: { opacity: 0, display: "none", transition: { duration: 0.1 } },
    };

    const getLinkClass = ({ isActive }: { isActive: boolean }) =>
        `relative flex items-center gap-4 px-4 py-3 my-1 rounded-xl transition-all duration-300 group overflow-hidden ${isActive
            ? 'bg-blue-50/80 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800'
            : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-gray-200 hover:pl-5'
        }`;

    return (
        <motion.aside
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={sidebarVariants as any}
            className="h-screen sticky top-0 bg-white/80 dark:bg-zinc-900/90 border-r border-slate-200/60 dark:border-zinc-800 shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-2xl"
        >
            {/* Logo Area */}
            <div className="p-6 flex items-center justify-center border-b border-slate-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm h-20">
                <div className="flex items-center gap-3">
                    <GraduationCap className="w-8 h-8 text-blue-700 dark:text-blue-500" />
                    <motion.div variants={textVariants} className="font-bold text-xl text-slate-800 dark:text-white tracking-widest whitespace-nowrap">
                        SEAT<span className="text-blue-600 dark:text-blue-500">SYNC</span>
                    </motion.div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-700">
                <SidebarItem to="/admin/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/students" icon={<GraduationCap size={20} />} label="Students" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/exams" icon={<FileText size={20} />} label="Exams" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/seating" icon={<Armchair size={20} />} label="Seating Plans" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/invigilators" icon={<Users size={20} />} label="Invigilators" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/attendance" icon={<ClipboardCheck size={20} />} label="Attendance" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/reports" icon={<BarChart3 size={20} />} label="Reports" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />

                {canAccess('admin_management') && (
                    <>
                        <motion.div variants={textVariants} className="mt-6 mb-2 px-4 text-[10px] font-bold text-accent dark:text-gray-500 uppercase tracking-widest opacity-80">
                            Administration
                        </motion.div>
                        {canAccess('admin_management') && (
                            <SidebarItem to="/admin/manage-admins" icon={<ShieldAlert size={20} />} label="Access Control" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                        )}
                        {canAccess('college_structure') && (
                            <SidebarItem to="/admin/setup" icon={<Settings size={20} />} label="System Setup" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                        )}
                    </>
                )}
            </nav>

            {/* Footer Profile */}
            <div className="relative">
                {/* Profile Menu Dropdown */}
                {isProfileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 right-0 mx-3 mb-2 p-1 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden z-50"
                    >
                        <button
                            onClick={() => logout()}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            <span className="font-medium">Log Out</span>
                        </button>
                    </motion.div>
                )}

                <div
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={`p-4 border-t border-slate-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md cursor-pointer hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-colors ${!isOpen && 'justify-center'}`}
                >
                    <div className={`flex items-center gap-3 ${!isOpen && 'justify-center'}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-blue-700 p-[2px] shadow-lg shadow-blue-500/20">
                            <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm">
                                {user?.Email?.[0].toUpperCase() || 'A'}
                            </div>
                        </div>
                        <motion.div variants={textVariants} className="overflow-hidden text-left">
                            <p className="text-sm font-semibold text-slate-800 dark:text-gray-200 truncate">{user?.Email?.split('@')[0]}</p>
                            <p className="text-[10px] text-slate-500 dark:text-gray-500 tracking-wider uppercase font-medium truncate">{user?.IsRootAdmin ? 'Super Admin' : 'Exam Admin'}</p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.aside>
    );
};

// Helper Component for Sidebar Items
const SidebarItem = ({ to, icon, label, isOpen, variants, getLinkClass }: any) => (
    <NavLink to={to} className={getLinkClass}>
        {({ isActive }: any) => (
            <>
                {/* Active Indicator Line */}
                {isActive && (
                    <motion.div
                        layoutId="active-pill"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-500 rounded-r-full shadow-sm"
                    />
                )}

                <span className="relative z-10">{icon}</span>
                <motion.span variants={variants} className="font-medium tracking-wide whitespace-nowrap relative z-10">
                    {label}
                </motion.span>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/5 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -translate-x-full group-hover:translate-x-full" />
            </>
        )}
    </NavLink>
);

export default Sidebar;
