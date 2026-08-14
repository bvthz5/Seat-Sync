import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar } from '@heroui/react';
import Sidebar from './Sidebar';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { GlobalNotificationDrawer } from '../components/notifications/GlobalNotificationDrawer';
import { invigilatorService } from '../services/invigilatorService';
import { getNotificationStats } from '../services/notificationService';
import { AccessTokenStore } from '../../../services/api';
import SeatingTypeModal from '../components/seating/SeatingTypeModal';
import CollegeStructureTypeModal from '../components/structure/CollegeStructureTypeModal';
import StudentTypeModal from '../components/students/StudentTypeModal';

const AdminLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isSeatingModalOpen, setIsSeatingModalOpen] = useState(false);
    const [isCollegeStructureModalOpen, setIsCollegeStructureModalOpen] = useState(false);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    const fetchCounts = async () => {
        if (!AccessTokenStore.token) return;
        try {
            const [notifStats, swaps] = await Promise.all([
                getNotificationStats().catch(() => null),
                invigilatorService.getSwaps('PENDING').catch(() => null)
            ]);
            const swapCount = Array.isArray(swaps) ? swaps.length : (Array.isArray(swaps?.data) ? swaps.data.length : 0);
            setUnreadCount((notifStats?.unread || 0) + swapCount);
        } catch (e) {
            // Silently handle background polling errors
        }
    };

    React.useEffect(() => {
        if (user && AccessTokenStore.token) {
            fetchCounts();
            const interval = setInterval(fetchCounts, 60000); // Check every minute
            return () => clearInterval(interval);
        }
    }, [user, notificationOpen]);

    React.useEffect(() => {
        const handleResize = () => {
            const mobile = window.matchMedia('(max-width: 1023px)').matches;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="page-container selection:bg-indigo-100 relative">
            {/* Global Notification Drawer */}
            <GlobalNotificationDrawer isOpen={notificationOpen} onClose={() => setNotificationOpen(false)} />
            <SeatingTypeModal isOpen={isSeatingModalOpen} onClose={() => setIsSeatingModalOpen(false)} />
            <CollegeStructureTypeModal isOpen={isCollegeStructureModalOpen} onClose={() => setIsCollegeStructureModalOpen(false)} />
            <StudentTypeModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} />

            {/* Top App Bar — Glass Navbar */}
            <header className="fixed top-0 left-0 right-0 h-16 glass-navbar z-50 flex items-center px-4 lg:px-6 justify-between shadow-sm shrink-0">
                {/* Left: hamburger + brand */}
                <div className="flex items-center gap-4 lg:gap-6">
                    <button
                        aria-label="Toggle navigation"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300 group shrink-0"
                    >
                        <Menu size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-float shrink-0">
                            <span className="text-white font-black text-lg leading-none">S</span>
                        </div>
                        <div className="flex flex-col hidden sm:flex">
                            <span className="text-base font-black tracking-tight leading-none">
                                <span className="text-slate-900">Seat</span><span className="text-indigo-600">Sync</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Management Hub</span>
                        </div>
                    </div>
                </div>

                {/* Right: bell + profile */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        aria-label="Notifications"
                        onClick={() => setNotificationOpen(true)}
                        className="relative w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300 shrink-0"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-2 ring-red-100 animate-in zoom-in-50 duration-300">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    <Dropdown placement="bottom-end" classNames={{ content: "glass-card border-slate-200/50 p-2 shadow-2xl" }} disableAnimation>
                        <DropdownTrigger aria-label="Profile actions">
                            <button className="flex items-center gap-3 px-2 sm:px-3 py-1.5 rounded-2xl hover:bg-indigo-50/50 transition-all group border border-transparent hover:border-indigo-100 shrink-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shadow-md group-hover:scale-110 transition-transform duration-300">
                                    {user?.Email?.[0].toUpperCase() || 'A'}
                                </div>
                                <div className="hidden lg:flex flex-col items-start text-left">
                                    <span className="text-slate-900 text-xs font-bold leading-none">{user?.FullName?.split(' ')[0] || user?.Email?.split('@')[0]}</span>
                                    <span className="text-indigo-600 text-[10px] leading-none mt-1 font-black uppercase tracking-wider">
                                        {user?.Role === 'exam_admin' ? 'Admin' : user?.IsRootAdmin ? 'Root' : user?.Role}
                                    </span>
                                </div>
                                <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors hidden lg:block" />
                            </button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="Profile Actions"
                            variant="flat"
                            className="w-72"
                            itemClasses={{
                                base: "gap-3 h-11 data-[hover=true]:bg-indigo-50 rounded-xl transition-all duration-200",
                            }}
                        >
                            <DropdownItem key="profile_header" className="h-auto opacity-100 cursor-default hover:!bg-transparent focus:!bg-transparent data-[hover=true]:!bg-transparent mb-2 p-0 select-none" isReadOnly textValue="Profile Header">
                                <div className="flex gap-4 items-center p-4 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 border border-indigo-400/30 m-1 shadow-xl shadow-indigo-200/50">
                                    <div className="w-13 h-13 rounded-2xl bg-white/25 backdrop-blur-xl flex items-center justify-center text-white !text-white text-xl font-black border border-white/30 shrink-0 shadow-inner" style={{ color: '#ffffff' }}>
                                        {user?.Email?.[0].toUpperCase() || 'A'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-white !text-white text-base truncate leading-snug tracking-tight" style={{ color: '#ffffff' }}>{user?.FullName || 'User'}</p>
                                        <p className="text-xs text-indigo-100 !text-indigo-100 truncate mt-0.5 font-medium opacity-90" style={{ color: '#e0e7ff' }}>{user?.Email}</p>
                                        <div className="mt-2.5 inline-flex items-center px-2.5 py-0.5 rounded-lg bg-white/20 text-white !text-white text-[9px] font-black tracking-widest uppercase border border-white/20 backdrop-blur-md shadow-sm" style={{ color: '#ffffff' }}>
                                            {user?.Role === 'exam_admin' ? 'Administrator' : user?.IsRootAdmin ? 'Root Access' : user?.Role}
                                        </div>
                                    </div>
                                </div>
                            </DropdownItem>

                            {(user?.Role === 'exam_admin' || user?.IsRootAdmin) ? (
                                <DropdownItem
                                    key="my_profile"
                                    startContent={<div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><User size={16} /></div>}
                                    textValue="My Profile"
                                    onPress={() => navigate('/admin/profile')}
                                >
                                    <span className="text-sm font-bold text-slate-700">My Profile</span>
                                </DropdownItem>
                            ) : null}

                            <DropdownItem
                                key="logout"
                                showDivider
                                className="text-red-600 data-[hover=true]:bg-red-50 rounded-xl group"
                                onPress={() => logout()}
                                startContent={<div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform shrink-0"><LogOut size={16} /></div>}
                                textValue="Sign out"
                            >
                                <span className="text-sm font-bold">Sign out</span>
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </div>
            </header>

            {/* Sidebar & Main Layout Wrapper */}
            <div className="flex w-full h-[calc(100vh-64px)] mt-16 overflow-hidden relative">
                {/* Mobile Sidebar Overlay */}
                {isMobile && sidebarOpen && (
                    <div
                        onClick={() => setSidebarOpen(false)}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[40] transition-opacity duration-300"
                    />
                )}

                {/* Sidebar */}
                <aside
                    className="flex-shrink-0 z-[45] transition-all duration-300 ease-in-out overflow-hidden glass-sidebar shadow-2xl lg:shadow-none"
                    style={{
                        width: isMobile ? '260px' : (sidebarOpen ? '260px' : '88px'),
                        position: isMobile ? 'fixed' : 'relative',
                        height: '100%',
                        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none'
                    }}
                >
                    <Sidebar 
                        isOpen={isMobile ? true : sidebarOpen} 
                        onSeatingClick={() => setIsSeatingModalOpen(true)} 
                        onCollegeStructureClick={() => setIsCollegeStructureModalOpen(true)}
                        onStudentsClick={() => setIsStudentModalOpen(true)}
                    />
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 h-full overflow-y-auto bg-[#f8fafc] relative">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={`w-full h-full ${isMobile && sidebarOpen ? 'pl-[260px]' : ''} transition-all duration-300`}
                    >
                        <Outlet />
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;