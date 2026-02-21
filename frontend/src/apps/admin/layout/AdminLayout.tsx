import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar } from '@heroui/react';
import Sidebar from './Sidebar';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Menu, Bell, LogOut, User } from 'lucide-react';
import { GlobalNotificationDrawer } from '../components/notifications/GlobalNotificationDrawer';

const AdminLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden font-sans text-[#202124] selection:bg-blue-100">
            {/* Global Notification Drawer */}
            <GlobalNotificationDrawer isOpen={notificationOpen} onClose={() => setNotificationOpen(false)} />

            {/* Top App Bar */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-50 flex items-center px-4 justify-between transition-colors">
                <div className="flex items-center gap-4">
                    <Button
                        isIconOnly
                        aria-label="Toggle navigation"
                        variant="light"
                        radius="full"
                        onPress={() => setSidebarOpen(!sidebarOpen)}
                        className="text-[#5f6368] hover:bg-[#3c4043]/10"
                    >
                        <Menu size={24} />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <span className="text-[22px] fonts-normal text-[#5f6368] hidden md:block" style={{ fontFamily: 'Product Sans, sans-serif' }}>
                            Seat<span className="font-medium text-[#202124]">Sync</span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Notification Bell */}
                    <Button
                        isIconOnly
                        aria-label="Notifications"
                        variant="light"
                        radius="full"
                        onPress={() => setNotificationOpen(true)}
                        className="text-[#5f6368] hover:bg-[#3c4043]/10 relative overflow-visible"
                    >
                        <Bell size={24} />
                        <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    </Button>

                    {/* Profile Avatar */}
                    <Dropdown placement="bottom-end" classNames={{ content: " " }} disableAnimation>
                        <DropdownTrigger aria-label="Profile actions">
                            <div className="ml-2 cursor-pointer p-1 rounded-full hover:bg-[#f1f3f4] transition-colors">
                                <Avatar
                                    className="w-8 h-8 bg-blue-600 text-white text-sm font-medium relative"
                                    name={user?.Email?.[0].toUpperCase()}
                                    src={undefined}
                                    classNames={{
                                        name: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-normal text-center text-inherit"
                                    }}
                                />
                            </div>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="Profile Actions"
                            variant="flat"
                            className="w-80 z-[9999] bg-white shadow-xl rounded-2xl border border-gray-100 p-2"
                            itemClasses={{
                                base: "gap-4 h-12 data-[hover=true]:bg-gray-50 rounded-lg",
                            }}
                        >
                            <DropdownItem key="profile_header" className="h-auto opacity-100 cursor-default hover:!bg-white mb-2" isReadOnly textValue="Profile Header">
                                <div className="flex gap-4 items-center p-2 rounded-xl bg-gray-50/50 border border-gray-100/50">
                                    <Avatar
                                        className="w-14 h-14 bg-blue-100 text-blue-600 text-lg font-bold"
                                        name={user?.Email?.[0].toUpperCase()}
                                        src={undefined}
                                    />
                                    <div className="flex-1 w-full flex flex-col gap-1 overflow-hidden">
                                        <p className="font-normal text-gray-900 text-sm truncate">{user?.FullName || 'User'}</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.Email}</p>
                                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold w-fit tracking-wide uppercase">
                                            {user?.Role === 'exam_admin' ? 'Administrator' : user?.Role}
                                        </span>
                                    </div>
                                </div>
                            </DropdownItem>

                            {(user?.Role === 'exam_admin' || user?.IsRootAdmin) ? (
                                <DropdownItem
                                    key="my_profile"
                                    startContent={<User size={18} className="text-gray-500" />}
                                    textValue="My Profile"
                                    onPress={() => navigate('/admin/profile')}
                                >
                                    <span className="text-sm font-medium text-gray-700">My Profile</span>
                                </DropdownItem>
                            ) : null}

                            <DropdownItem
                                key="logout"
                                showDivider
                                className="text-red-600 data-[hover=true]:bg-red-50"
                                onPress={() => logout()}
                                startContent={<LogOut size={18} className="text-red-600" />}
                                textValue="Sign out"
                            >
                                <span className="text-sm font-medium">Sign out</span>
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </div>
            </div>

            {/* Sidebar (Light, Floating or Fixed) */}
            <div className={`fixed left-0 top-16 bottom-0 z-40 bg-white transition-all duration-200 ease-in-out ${sidebarOpen ? 'w-[256px]' : 'w-0 overflow-hidden'}`}>
                <Sidebar isOpen={true} />
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-full relative z-0 min-w-0 pt-16 transition-all duration-200 ${sidebarOpen ? 'ml-[256px]' : 'ml-0'}`}>
                <main className="flex-1 overflow-auto bg-[#f0f2f5] p-8 transition-colors">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Outlet />
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
