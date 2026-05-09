import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar } from '@heroui/react';
import Sidebar from './Sidebar';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { GlobalNotificationDrawer } from '../components/notifications/GlobalNotificationDrawer';
import SeatingTypeModal from '../components/seating/SeatingTypeModal';
import CollegeStructureTypeModal from '../components/structure/CollegeStructureTypeModal';
import StudentTypeModal from '../components/students/StudentTypeModal';

const AdminLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [isSeatingModalOpen, setIsSeatingModalOpen] = useState(false);
    const [isCollegeStructureModalOpen, setIsCollegeStructureModalOpen] = useState(false);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans selection:bg-indigo-100">
            {/* Global Notification Drawer */}
            <GlobalNotificationDrawer isOpen={notificationOpen} onClose={() => setNotificationOpen(false)} />
            <SeatingTypeModal isOpen={isSeatingModalOpen} onClose={() => setIsSeatingModalOpen(false)} />
            <CollegeStructureTypeModal isOpen={isCollegeStructureModalOpen} onClose={() => setIsCollegeStructureModalOpen(false)} />
            <StudentTypeModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} />

            {/* Top App Bar — Glass Navbar */}
            <div className="fixed top-0 left-0 right-0 h-16 glass-navbar z-50 flex items-center px-6 justify-between shadow-sm">
                {/* Left: hamburger + brand */}
                <div className="flex items-center gap-6">
                    <button
                        aria-label="Toggle navigation"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300 group"
                    >
                        <Menu size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-float">
                            <span className="text-white font-black text-lg leading-none">S</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="hidden md:block text-base font-black tracking-tight leading-none">
                                <span className="text-slate-900">Seat</span><span className="text-indigo-600">Sync</span>
                            </span>
                            <span className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Management Hub</span>
                        </div>
                    </div>
                </div>

                {/* Right: bell + profile */}
                <div className="flex items-center gap-3">
                    <button
                        aria-label="Notifications"
                        onClick={() => setNotificationOpen(true)}
                        className="relative w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300"
                    >
                        <Bell size={20} />
                        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white animate-pulse" />
                    </button>

                    <Dropdown placement="bottom-end" classNames={{ content: "glass-card border-slate-200/50 p-2 shadow-2xl" }} disableAnimation>
                        <DropdownTrigger aria-label="Profile actions">
                            <button className="flex items-center gap-3 ml-2 px-3 py-1.5 rounded-2xl hover:bg-indigo-50/50 transition-all group border border-transparent hover:border-indigo-100">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shadow-md group-hover:scale-110 transition-transform duration-300">
                                    {user?.Email?.[0].toUpperCase() || 'A'}
                                </div>
                                <div className="hidden md:flex flex-col items-start text-left">
                                    <span className="text-slate-900 text-xs font-bold leading-none">{user?.FullName?.split(' ')[0] || user?.Email?.split('@')[0]}</span>
                                    <span className="text-indigo-500 text-[10px] leading-none mt-1 font-black uppercase tracking-wider">
                                        {user?.Role === 'exam_admin' ? 'Admin' : user?.IsRootAdmin ? 'Root' : user?.Role}
                                    </span>
                                </div>
                                <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors hidden md:block" />
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
                            <DropdownItem key="profile_header" className="h-auto opacity-100 cursor-default hover:!bg-transparent mb-2 p-0" isReadOnly textValue="Profile Header">
                                <div className="flex gap-4 items-center p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 border border-white/20 m-1 shadow-lg shadow-indigo-100">
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white text-xl font-black border border-white/30">
                                        {user?.Email?.[0].toUpperCase() || 'A'}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bold text-white text-base truncate">{user?.FullName || 'User'}</p>
                                        <p className="text-xs text-indigo-100 truncate mt-0.5 font-medium opacity-80">{user?.Email}</p>
                                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-lg bg-white/20 text-white text-[9px] font-black tracking-widest uppercase border border-white/10 backdrop-blur-sm">
                                            {user?.Role === 'exam_admin' ? 'Administrator' : user?.IsRootAdmin ? 'Root Access' : user?.Role}
                                        </div>
                                    </div>
                                </div>
                            </DropdownItem>

                            {(user?.Role === 'exam_admin' || user?.IsRootAdmin) ? (
                                <DropdownItem
                                    key="my_profile"
                                    startContent={<div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><User size={16} /></div>}
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
                                startContent={<div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><LogOut size={16} /></div>}
                                textValue="Sign out"
                            >
                                <span className="text-sm font-bold">Sign out</span>
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </div>
            </div>

            <div
                className="fixed left-0 top-16 bottom-0 z-40 transition-all duration-500 ease-in-out overflow-hidden glass-sidebar"
                style={{ width: sidebarOpen ? '260px' : '88px' }}
            >
                <Sidebar 
                    isOpen={sidebarOpen} 
                    onSeatingClick={() => setIsSeatingModalOpen(true)} 
                    onCollegeStructureClick={() => setIsCollegeStructureModalOpen(true)}
                    onStudentsClick={() => setIsStudentModalOpen(true)}
                />
            </div>

            {/* Main Content Area */}
            <div
                className="flex-1 flex flex-col h-full relative z-0 min-w-0 pt-16 transition-all duration-500"
                style={{ marginLeft: sidebarOpen ? '260px' : '88px' }}
            >
                <main className="flex-1 overflow-auto p-8 bg-[#f8fafc]">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="max-w-7xl mx-auto"
                    >
                        <Outlet />
                    </motion.div>
                </main>
            </div>
        </div>

    );
};

export default AdminLayout;
