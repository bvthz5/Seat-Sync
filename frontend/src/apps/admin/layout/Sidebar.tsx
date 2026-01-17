import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';

const Sidebar: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
    const { user } = useAuth();

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
            ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/10'
            : 'text-blue-100/70 hover:bg-white/5 hover:text-white hover:pl-5'
        }`;

    return (
        <motion.aside
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={sidebarVariants}
            className="h-screen sticky top-0 bg-gradient-to-b from-primary via-primary-800 to-primary-900 border-r border-white/5 shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-xl"
        >
            {/* Logo Area */}
            <div className="p-6 flex items-center justify-center border-b border-white/5 bg-black/10 backdrop-blur-sm h-20">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🎓</span>
                    <motion.div variants={textVariants} className="font-bold text-xl text-white tracking-widest whitespace-nowrap">
                        SEAT<span className="text-accent">SYNC</span>
                    </motion.div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                <SidebarItem to="/admin/dashboard" icon="🏠" label="Dashboard" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/exams" icon="📝" label="Exams" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/seating" icon="🪑" label="Seating Plans" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/invigilators" icon="👨‍🏫" label="Invigilators" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/attendance" icon="✅" label="Attendance" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                <SidebarItem to="/admin/reports" icon="📊" label="Reports" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />

                {user?.IsRootAdmin && (
                    <>
                        <motion.div variants={textVariants} className="mt-6 mb-2 px-4 text-[10px] font-bold text-accent uppercase tracking-widest opacity-80">
                            Administration
                        </motion.div>
                        <SidebarItem to="/admin/manage-admins" icon="🛡️" label="Access Control" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                        <SidebarItem to="/admin/setup" icon="⚙️" label="System Setup" isOpen={isOpen} variants={textVariants} getLinkClass={getLinkClass} />
                    </>
                )}
            </nav>

            {/* Footer Profile */}
            <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
                <div className={`flex items-center gap-3 ${!isOpen && 'justify-center'}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-secondary p-[2px] shadow-lg shadow-accent/20">
                        <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                            {user?.Email?.[0].toUpperCase() || 'A'}
                        </div>
                    </div>
                    <motion.div variants={textVariants} className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{user?.Email?.split('@')[0]}</p>
                        <p className="text-[10px] text-accent/80 tracking-wider uppercase font-medium truncate">{user?.IsRootAdmin ? 'Super Admin' : 'Exam Admin'}</p>
                    </motion.div>
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
                        className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-full shadow-[0_0_10px_#D4AF37]"
                    />
                )}

                <span className="text-xl relative z-10 filter drop-shadow-md">{icon}</span>
                <motion.span variants={variants} className="font-medium tracking-wide whitespace-nowrap relative z-10">
                    {label}
                </motion.span>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -translate-x-full group-hover:translate-x-full" />
            </>
        )}
    </NavLink>
);

export default Sidebar;
