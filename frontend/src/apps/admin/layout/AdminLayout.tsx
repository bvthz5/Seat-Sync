import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar } from '@heroui/react';
import Sidebar from './Sidebar';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { GlobalNotificationDrawer } from '../components/notifications/GlobalNotificationDrawer';

const AdminLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full bg-[#f4f6f9] overflow-hidden font-sans selection:bg-indigo-100">
            {/* Global Notification Drawer */}
            <GlobalNotificationDrawer isOpen={notificationOpen} onClose={() => setNotificationOpen(false)} />

            {/* Top App Bar — White navbar */}
            <div className="fixed top-0 left-0 right-0 h-14 bg-white z-50 flex items-center px-5 justify-between border-b border-slate-200">
                {/* Left: hamburger + brand */}
                <div className="flex items-center gap-4">
                    <button
                        aria-label="Toggle navigation"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                    >
                        <Menu size={18} />
                    </button>
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200">
                            <span className="text-white font-black text-sm leading-none">S</span>
                        </div>
                        <span className="hidden md:block text-sm font-semibold tracking-wide">
                            <span className="text-slate-400">Seat</span><span className="text-slate-800">Sync</span>
                        </span>
                    </div>
                </div>

                {/* Right: bell + profile */}
                <div className="flex items-center gap-1">
                    <button
                        aria-label="Notifications"
                        onClick={() => setNotificationOpen(true)}
                        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                    >
                        <Bell size={18} />
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-[1.5px] border-white animate-pulse" />
                    </button>

                    <Dropdown placement="bottom-end" classNames={{ content: "" }} disableAnimation>
                        <DropdownTrigger aria-label="Profile actions">
                            <button className="flex items-center gap-2.5 ml-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-all group">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                    {user?.Email?.[0].toUpperCase() || 'A'}
                                </div>
                                <div className="hidden md:flex flex-col items-start">
                                    <span className="text-slate-800 text-xs font-semibold leading-none">{user?.FullName?.split(' ')[0] || user?.Email?.split('@')[0]}</span>
                                    <span className="text-slate-400 text-[10px] leading-none mt-0.5 font-medium">
                                        {user?.Role === 'exam_admin' ? 'Administrator' : user?.IsRootAdmin ? 'Root Admin' : user?.Role}
                                    </span>
                                </div>
                                <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 transition-colors hidden md:block" />
                            </button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="Profile Actions"
                            variant="flat"
                            className="w-72 z-[9999] bg-white shadow-2xl shadow-black/10 rounded-2xl border border-slate-100 p-2"
                            itemClasses={{
                                base: "gap-3 h-11 data-[hover=true]:bg-slate-50 rounded-xl",
                            }}
                        >
                            <DropdownItem key="profile_header" className="h-auto opacity-100 cursor-default hover:!bg-transparent mb-1 p-0" isReadOnly textValue="Profile Header">
                                <div className="flex gap-3 items-center p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100/60 m-1">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-black shadow-md shadow-indigo-200">
                                        {user?.Email?.[0].toUpperCase() || 'A'}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold text-slate-900 text-sm truncate">{user?.FullName || 'User'}</p>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">{user?.Email}</p>
                                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold tracking-wide uppercase">
                                            {user?.Role === 'exam_admin' ? 'Administrator' : user?.IsRootAdmin ? 'Root Admin' : user?.Role}
                                        </span>
                                    </div>
                                </div>
                            </DropdownItem>

                            {(user?.Role === 'exam_admin' || user?.IsRootAdmin) ? (
                                <DropdownItem
                                    key="my_profile"
                                    startContent={<User size={16} className="text-slate-400" />}
                                    textValue="My Profile"
                                    onPress={() => navigate('/admin/profile')}
                                >
                                    <span className="text-sm font-medium text-slate-700">My Profile</span>
                                </DropdownItem>
                            ) : null}

                            <DropdownItem
                                key="logout"
                                showDivider
                                className="text-red-600 data-[hover=true]:bg-red-50 rounded-xl"
                                onPress={() => logout()}
                                startContent={<LogOut size={16} className="text-red-500" />}
                                textValue="Sign out"
                            >
                                <span className="text-sm font-medium">Sign out</span>
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </div>
            </div>

            {/* Sidebar */}
            <div
                className="fixed left-0 top-14 bottom-0 z-40 transition-all duration-300 ease-in-out overflow-hidden"
                style={{ width: sidebarOpen ? '240px' : '72px' }}
            >
                <Sidebar isOpen={sidebarOpen} />
            </div>

            {/* Main Content Area */}
            <div
                className="flex-1 flex flex-col h-full relative z-0 min-w-0 pt-14 transition-all duration-300"
                style={{ marginLeft: sidebarOpen ? '240px' : '72px' }}
            >
                <main className="flex-1 overflow-auto bg-[#f4f6f9]">
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <Outlet />
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
