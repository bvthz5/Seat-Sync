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

const Sidebar: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
    const { user, logout } = useAuth();
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ "Administration": true });
    const location = useLocation();

    const toggleSection = (label: string) => {
        setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const getLinkClass = (isActive: boolean, isChild: boolean = false) =>
        [
            'relative flex items-center gap-3 rounded-lg transition-all duration-200 group select-none',
            isChild ? 'px-3 py-2 mx-2 text-[13px]' : 'px-3 py-2.5 mx-2 text-sm',
            !isOpen ? 'justify-center mx-2' : '',
            isActive
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-medium',
        ].join(' ');

    const renderSidebarItem = (item: SidebarItemType) => {
        if (item.requiresRoot && !user?.IsRootAdmin) return null;

        if (item.children) {
            const isExpanded = openSections[item.label] && isOpen;

            return (
                <div key={item.label} className="mt-4">
                    {/* Section Header */}
                    <button
                        onClick={() => isOpen && toggleSection(item.label)}
                        className={`w-full flex items-center px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-600 transition-colors ${
                            isOpen ? 'justify-between' : 'justify-center'
                        }`}
                    >
                        {isOpen ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">{item.icon}</span>
                                    <span>{item.label}</span>
                                </div>
                                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronDown size={12} />
                                </motion.span>
                            </>
                        ) : (
                            <span className="text-slate-400" title={item.label}>{item.icon}</span>
                        )}
                    </button>

                    <AnimatePresence initial={false}>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden mt-1"
                            >
                                {item.children.map(child => (
                                    <NavLink
                                        key={child.path}
                                        to={child.path!}
                                        title={!isOpen ? child.label : undefined}
                                        className={({ isActive }) => getLinkClass(isActive, true)}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-500" />
                                                )}
                                                <span className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}>{child.icon}</span>
                                                {isOpen && <span className="truncate">{child.label}</span>}
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        return (
            <NavLink
                key={item.path}
                to={item.path!}
                title={!isOpen ? item.label : undefined}
                className={({ isActive }) => getLinkClass(isActive)}
            >
                {({ isActive }) => (
                    <>
                        {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-indigo-500" />
                        )}
                        <span className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors'}>{item.icon}</span>
                        {isOpen && <span className="truncate">{item.label}</span>}
                    </>
                )}
            </NavLink>
        );
    };

    return (
        <aside className={`h-full bg-white border-r border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
            isOpen ? 'w-[240px]' : 'w-[72px]'
        }`}>
            {/* Logo / Brand Header */}
            <div className={`flex items-center border-b border-slate-100 h-14 shrink-0 transition-all duration-300 ${
                isOpen ? 'px-5 gap-3 justify-start' : 'justify-center px-0'
            }`}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                    <GraduationCap size={16} className="text-white" />
                </div>
                {isOpen && (
                    <span className="font-bold text-base text-slate-800 tracking-wide whitespace-nowrap">
                        Seat<span className="text-indigo-600">Sync</span>
                    </span>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden
                scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300 scrollbar-track-transparent">
                <div className="space-y-0.5 mt-1">
                    {sidebarConfig.map(renderSidebarItem)}
                </div>
            </nav>

            {/* Footer - User Profile */}
            <div className="border-t border-slate-100 p-3">
                <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-default ${
                    !isOpen ? 'justify-center' : ''
                }`}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shadow-sm shadow-indigo-200 shrink-0"
                        title={!isOpen ? (user?.Email?.split('@')[0] || 'Admin') : undefined}>
                        {user?.Email?.[0].toUpperCase() || 'A'}
                    </div>
                    {isOpen && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate leading-none">{user?.Email?.split('@')[0]}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-none uppercase tracking-wide font-medium">
                                    {user?.IsRootAdmin ? 'Super Admin' : 'Exam Admin'}
                                </p>
                            </div>
                            <button
                                onClick={() => logout()}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                                title="Sign out"
                            >
                                <LogOut size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

