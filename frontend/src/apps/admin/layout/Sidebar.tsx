import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LogOut,
    ChevronDown,
    ChevronRight,
    GraduationCap
} from 'lucide-react';
import { sidebarConfig, SidebarItem as SidebarItemType } from '../config/sidebar.config';

const Sidebar: React.FC<{ 
    isOpen: boolean; 
    onSeatingClick: () => void; 
    onCollegeStructureClick: () => void;
    onStudentsClick: () => void;
}> = ({ isOpen, onSeatingClick, onCollegeStructureClick, onStudentsClick }) => {
    const { user, logout } = useAuth();
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ "Administration": true });
    const location = useLocation();

    const toggleSection = (label: string) => {
        setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const getLinkClass = (isActive: boolean, isChild: boolean = false) =>
        [
            'relative flex items-center gap-3 rounded-[14px] transition-all duration-300 group select-none',
            isChild ? 'px-4 py-2 mx-3 text-[13px]' : 'px-4 py-2.5 mx-3 text-sm',
            !isOpen ? 'justify-center mx-3' : '',
            isActive
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-100'
                : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 font-semibold',
        ].join(' ');

    const renderSidebarItem = (item: SidebarItemType) => {
        if (item.requiresRoot && !user?.IsRootAdmin) return null;

        if (item.children) {
            const isExpanded = openSections[item.label] && isOpen;

            return (
                <div key={item.label} className="mt-6 first:mt-2">
                    {/* Section Header */}
                    <button
                        onClick={() => isOpen && toggleSection(item.label)}
                        className={`w-full flex items-center px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-500 transition-colors ${
                            isOpen ? 'justify-between' : 'justify-center'
                        }`}
                    >
                        {isOpen ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="opacity-70">{item.icon}</span>
                                    <span>{item.label}</span>
                                </div>
                                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                    <ChevronDown size={12} />
                                </motion.span>
                            </>
                        ) : (
                            <span className="opacity-70" title={item.label}>{item.icon}</span>
                        )}
                    </button>

                    <AnimatePresence initial={false}>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden mt-2 space-y-1"
                            >
                                {item.children.map(child => {
                                    const isChildCollegeStructure = child.label === "College Structure";
                                    const isChildActiveCS = isChildCollegeStructure && location.pathname.startsWith('/admin/college-structure');

                                    return (
                                        <NavLink
                                            key={child.path}
                                            to={isChildCollegeStructure ? '/admin/college-structure' : child.path!}
                                            end={true}
                                            onClick={(e) => {
                                                if (isChildCollegeStructure) {
                                                    e.preventDefault();
                                                    onCollegeStructureClick();
                                                }
                                            }}
                                            title={!isOpen ? child.label : undefined}
                                            className={({ isActive }) => getLinkClass(isActive || isChildActiveCS, true)}
                                        >
                                            {({ isActive }) => {
                                                const effectivelyActive = isActive || isChildActiveCS;
                                                return (
                                                    <>
                                                        <span className={effectivelyActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600 transition-colors'}>{child.icon}</span>
                                                        {isOpen && <span className="truncate">{child.label}</span>}
                                                        {effectivelyActive && isOpen && (
                                                            <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                                                        )}
                                                    </>
                                                );
                                            }}
                                        </NavLink>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        const isStudents = item.label === "Students";
        const isSeatingPlans = item.label === "Seating Plans";
        const isCollegeStructure = item.label === "College Structure";
        
        // Manual active checks for sub-routes
        const isActiveStudents = isStudents && location.pathname.startsWith('/admin/students');
        const isActiveSeating = isSeatingPlans && location.pathname.startsWith('/admin/seating');
        const isActiveCollegeStructure = isCollegeStructure && location.pathname.startsWith('/admin/college-structure');

        return (
            <NavLink
                key={item.path}
                to={isStudents ? '/admin/students' : isSeatingPlans ? '/admin/seating' : isCollegeStructure ? '/admin/college-structure' : item.path!}
                end={!isActiveStudents && !isActiveSeating && !isActiveCollegeStructure}
                onClick={(e) => {
                    if (isStudents) {
                        e.preventDefault();
                        onStudentsClick();
                    } else if (isSeatingPlans) {
                        e.preventDefault();
                        onSeatingClick();
                    } else if (isCollegeStructure) {
                        e.preventDefault();
                        onCollegeStructureClick();
                    }
                }}
                title={!isOpen ? item.label : undefined}
                className={({ isActive }) => getLinkClass(isActive || isActiveStudents || isActiveSeating || isActiveCollegeStructure)}
            >
                {({ isActive }) => {
                    const effectivelyActive = isActive || isActiveStudents || isActiveSeating || isActiveCollegeStructure;
                    return (
                        <>
                            <span className={effectivelyActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600 transition-colors'}>{item.icon}</span>
                            {isOpen && <span className="truncate">{item.label}</span>}
                            {effectivelyActive && isOpen && (
                                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                            )}
                        </>
                    );
                }}
            </NavLink>
        );
    };

    return (
        <aside className={`h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/50 flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${
            isOpen ? 'w-[260px]' : 'w-[88px]'
        }`}>
            {/* Logo / Brand Header */}
            <div className={`flex items-center h-16 shrink-0 transition-all duration-500 ${
                isOpen ? 'px-6 gap-4 justify-start' : 'justify-center px-0'
            }`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                    <GraduationCap size={20} className="text-white" />
                </div>
                {isOpen && (
                    <div className="flex flex-col">
                        <span className="font-black text-lg text-slate-900 tracking-tight whitespace-nowrap leading-none">
                            Seat<span className="text-indigo-600">Sync</span>
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Admin Panel</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto overflow-x-hidden
                scrollbar-none">
                <div className="space-y-1">
                    {sidebarConfig.map(renderSidebarItem)}
                </div>
            </nav>

            {/* Footer - User Profile */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                <div className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-white hover:shadow-premium transition-all duration-300 group cursor-default ${
                    !isOpen ? 'justify-center' : ''
                }`}>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-black shadow-md shrink-0"
                        title={!isOpen ? (user?.Email?.split('@')[0] || 'Admin') : undefined}>
                        {user?.Email?.[0].toUpperCase() || 'A'}
                    </div>
                    {isOpen && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-slate-900 truncate leading-none">{user?.Email?.split('@')[0]}</p>
                                <p className="text-[10px] text-indigo-500 mt-1.5 leading-none uppercase tracking-widest font-black">
                                    {user?.IsRootAdmin ? 'Super' : 'Admin'}
                                </p>
                            </div>
                            <button
                                onClick={() => logout()}
                                className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 hover:scale-110"
                                title="Sign out"
                            >
                                <LogOut size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </aside>

    );
};

export default Sidebar;

