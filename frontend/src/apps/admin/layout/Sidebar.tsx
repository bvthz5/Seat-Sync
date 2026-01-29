import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap,
    LogOut,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { sidebarConfig, SidebarItem as SidebarItemType } from '../config/sidebar.config';

const Sidebar: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
    const { user, logout } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    // State for collapsible sections - key is the label of the section
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        "Administration": true // Default open or closed? Let's keep it open by default for visibility if they have access
    });
    const location = useLocation();

    const toggleSection = (label: string) => {
        setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
    };

    // Animation variants
    const sidebarVariants = {
        open: { width: "16rem", transition: { type: "spring", stiffness: 100, damping: 20 } },
        closed: { width: "5rem", transition: { type: "spring", stiffness: 100, damping: 20 } },
    };

    const textVariants = {
        open: { opacity: 1, display: "block", transition: { delay: 0.1 } },
        closed: { opacity: 0, display: "none", transition: { duration: 0.1 } },
    };

    const getLinkClass = ({ isActive, isChild }: { isActive: boolean; isChild?: boolean }) =>
        `relative flex items-center gap-4 px-4 py-3 my-1 rounded-xl transition-all duration-300 group overflow-hidden ${isActive
            ? 'bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        } ${isChild ? 'ml-4 text-sm py-2' : ''}`;

    const renderSidebarItem = (item: SidebarItemType) => {
        // PERMISSION CHECK
        if (item.requiresRoot && !user?.IsRootAdmin) return null;

        // GROUP / COLLAPSIBLE SECTION
        if (item.children) {
            const isExpanded = openSections[item.label];
            const hasActiveChild = item.children.some(child => location.pathname === child.path);

            return (
                <div key={item.label} className="mb-2">
                    {/* Section Header */}
                    <div
                        onClick={() => isOpen && toggleSection(item.label)}
                        className={`flex items-center justify-between px-4 py-2 mt-4 cursor-pointer text-slate-500 hover:text-slate-800 transition-colors ${!isOpen && 'justify-center'}`}
                    >
                        <div className="flex items-center gap-4">
                            {/* If sidebar closed, show icon tooltip style or just icon. Here we just show the icon */}
                            <span className={isOpen ? "" : "mx-auto"}>{item.icon}</span>

                            <motion.span variants={textVariants} className="font-bold text-[11px] uppercase tracking-widest">
                                {item.label}
                            </motion.span>
                        </div>
                        {isOpen && (
                            <motion.div variants={textVariants}>
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </motion.div>
                        )}
                    </div>

                    {/* Children */}
                    <AnimatePresence>
                        {isExpanded && isOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                {item.children.map(child => (
                                    <SidebarItem
                                        key={child.path}
                                        item={child}
                                        isOpen={isOpen}
                                        variants={textVariants}
                                        getLinkClass={getLinkClass}
                                        isChild={true}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        // STANDARD ITEM
        return (
            <SidebarItem
                key={item.path}
                item={item}
                isOpen={isOpen}
                variants={textVariants}
                getLinkClass={getLinkClass}
            />
        );
    };

    return (
        <motion.aside
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={sidebarVariants as any}
            className="h-screen sticky top-0 bg-white/80 border-r border-slate-200/60 shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-2xl"
        >
            {/* Logo Area */}
            <div className="p-6 flex items-center justify-center border-b border-slate-200/60 bg-white/40 backdrop-blur-sm h-20">
                <div className="flex items-center gap-3">
                    <GraduationCap className="w-8 h-8 text-blue-700" />
                    <motion.div variants={textVariants} className="font-bold text-xl text-slate-800 tracking-widest whitespace-nowrap">
                        SEAT<span className="text-blue-600">SYNC</span>
                    </motion.div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                {sidebarConfig.map(renderSidebarItem)}
            </nav>

            {/* Footer Profile */}
            <div className="relative">
                {isProfileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 right-0 mx-3 mb-2 p-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                    >
                        <button
                            onClick={() => logout()}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            <span className="font-medium">Log Out</span>
                        </button>
                    </motion.div>
                )}

                <div
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={`p-4 border-t border-slate-200/60 bg-white/40 backdrop-blur-md cursor-pointer hover:bg-white/60 transition-colors ${!isOpen && 'justify-center'}`}
                >
                    <div className={`flex items-center gap-3 ${!isOpen && 'justify-center'}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-blue-700 p-[2px] shadow-lg shadow-blue-500/20">
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-blue-700 font-bold text-sm">
                                {user?.Email?.[0].toUpperCase() || 'A'}
                            </div>
                        </div>
                        <motion.div variants={textVariants} className="overflow-hidden text-left">
                            <p className="text-sm font-semibold text-slate-800 truncate">{user?.Email?.split('@')[0]}</p>
                            <p className="text-[10px] text-slate-500 tracking-wider uppercase font-medium truncate">
                                {user?.IsRootAdmin ? 'Super Admin' : 'Exam Admin'}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.aside>
    );
};

// Helper Component for Single Sidebar Item link
const SidebarItem = ({ item, isOpen, variants, getLinkClass, isChild }: any) => (
    <NavLink to={item.path} className={({ isActive }) => getLinkClass({ isActive, isChild })}>
        {({ isActive }: any) => (
            <>
                {isActive && (
                    <motion.div
                        layoutId="active-pill"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full shadow-sm"
                    />
                )}

                <span className="relative z-10">{item.icon}</span>
                <motion.span variants={variants} className="font-medium tracking-wide whitespace-nowrap relative z-10">
                    {item.label}
                </motion.span>

                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/5 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -translate-x-full group-hover:translate-x-full" />
            </>
        )}
    </NavLink>
);

export default Sidebar;

