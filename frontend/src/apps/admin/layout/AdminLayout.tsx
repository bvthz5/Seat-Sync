import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar, Badge } from '@heroui/react';
import Sidebar from './Sidebar';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Menu, Bell, Settings, LogOut, Search, Grip, HelpCircle, AlertCircle, AlertTriangle, Info, CheckCircle, X, User, Sliders, ChevronRight, Key } from 'lucide-react';

const AdminLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full bg-[#f0f2f5]  overflow-hidden font-sans text-[#202124]  selection:bg-blue-100 ">
            {/* Top App Bar */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white  shadow-sm   z-50 flex items-center px-4 justify-between transition-colors">
                <div className="flex items-center gap-4">
                    <Button
                        isIconOnly
                        variant="light"
                        radius="full"
                        onPress={() => setSidebarOpen(!sidebarOpen)}
                        className="text-[#5f6368]  hover:bg-[#3c4043]/10 "
                    >
                        <Menu size={24} />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <span className="text-[22px] font-normal text-[#5f6368]  hidden md:block" style={{ fontFamily: 'Product Sans, sans-serif' }}>
                            Seat<span className="font-medium text-[#202124] ">Sync</span>
                        </span>
                    </div>
                </div>

                {/* Omni-Search Box Removed per USER request */}


                <div className="flex items-center gap-2">
                    <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                            <Button isIconOnly variant="light" radius="full" className="text-[#5f6368] hover:bg-[#3c4043]/10 relative overflow-visible">
                                <Bell size={24} />
                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="Notifications"
                            variant="flat"
                            className="w-96 z-[9999] bg-white shadow-xl rounded-xl border border-gray-100 p-2"
                            itemClasses={{
                                base: "gap-4",
                            }}
                        >
                            <DropdownItem key="title" className="h-10 cursor-default" isReadOnly textValue="Notifications">
                                <div className="flex justify-between items-center bg-white">
                                    <span className="font-semibold text-lg">Notifications</span>
                                    <span className="text-xs text-blue-600 cursor-pointer hover:underline">Mark all as read</span>
                                </div>
                            </DropdownItem>

                            <DropdownItem key="1" textValue="System Alert">
                                <div className="flex items-start gap-3 w-full">
                                    <div className="mt-1 p-2 rounded-full bg-red-100 text-red-600">
                                        <AlertCircle size={18} />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-sm text-gray-900">System Alert</span>
                                            <span className="text-[10px] text-gray-400">2 min ago</span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2">Critical security update required for server kernel.</p>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 w-fit">
                                            High Priority
                                        </span>
                                    </div>
                                </div>
                            </DropdownItem>

                            <DropdownItem key="2" textValue="Exam Schedule">
                                <div className="flex items-start gap-3 w-full">
                                    <div className="mt-1 p-2 rounded-full bg-amber-100 text-amber-600">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-sm text-gray-900">Schedule Change</span>
                                            <span className="text-[10px] text-gray-400">1 hour ago</span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2">Exam schedule updated for CSE 3rd Year due to clash.</p>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 w-fit">
                                            Medium Priority
                                        </span>
                                    </div>
                                </div>
                            </DropdownItem>

                            <DropdownItem key="3" textValue="New User">
                                <div className="flex items-start gap-3 w-full">
                                    <div className="mt-1 p-2 rounded-full bg-blue-100 text-blue-600">
                                        <Info size={18} />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-sm text-gray-900">New Registration</span>
                                            <span className="text-[10px] text-gray-400">3 hours ago</span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2">New invigilator joined: Sarah Connor.</p>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 w-fit">
                                            Info
                                        </span>
                                    </div>
                                </div>
                            </DropdownItem>

                            <DropdownItem key="4" textValue="Backup">
                                <div className="flex items-start gap-3 w-full">
                                    <div className="mt-1 p-2 rounded-full bg-green-100 text-green-600">
                                        <CheckCircle size={18} />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-sm text-gray-900">Backup Complete</span>
                                            <span className="text-[10px] text-gray-400">5 hours ago</span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2">Daily database backup completed successfully.</p>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 w-fit">
                                            Success
                                        </span>
                                    </div>
                                </div>
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                    <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                            <Button isIconOnly variant="light" radius="full" className="text-[#5f6368] hover:bg-[#3c4043]/10">
                                <Settings size={24} />
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="Settings Actions"
                            variant="flat"
                            className="w-48 z-[9999] bg-white shadow-xl rounded-xl border border-gray-100 p-2"
                        >
                            <DropdownItem
                                key="change_password"
                                startContent={<Key size={18} className="text-red-500" />}
                                className="text-red-600 data-[hover=true]:bg-red-50"
                            >
                                Change Password
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>

                    {/* Profile Avatar */}
                    <Dropdown placement="bottom-end" classNames={{ content: " " }} disableAnimation>
                        <DropdownTrigger>
                            <div className="ml-2 cursor-pointer p-1 rounded-full hover:bg-[#f1f3f4] transition-colors">
                                <Avatar
                                    className="w-8 h-8 bg-blue-600 text-white text-sm font-medium"
                                    name={user?.Email?.[0].toUpperCase()}
                                    src={undefined}
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
                                    <div className="flex flex-col gap-1 overflow-hidden">
                                        <p className="font-bold text-gray-900 text-sm truncate">Root Administrator</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.Email}</p>
                                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold w-fit tracking-wide">
                                            ADMINISTRATOR
                                        </span>
                                    </div>
                                </div>
                            </DropdownItem>

                            <DropdownItem key="my_profile" startContent={<User size={18} className="text-gray-500" />} textValue="My Profile">
                                <span className="text-sm font-medium text-gray-700">My Profile</span>
                            </DropdownItem>
                            <DropdownItem key="settings" startContent={<Settings size={18} className="text-gray-500" />} textValue="Account Settings">
                                <span className="text-sm font-medium text-gray-700">Account Settings</span>
                            </DropdownItem>
                            <DropdownItem key="preferences" startContent={<Sliders size={18} className="text-gray-500" />} textValue="Preferences">
                                <span className="text-sm font-medium text-gray-700">Preferences</span>
                            </DropdownItem>

                            <DropdownItem key="help_support" showDivider startContent={<HelpCircle size={18} className="text-gray-500" />} textValue="Help & Support">
                                <span className="text-sm font-medium text-gray-700">Help & Support</span>
                            </DropdownItem>

                            <DropdownItem
                                key="logout"
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
            <div className={`fixed left-0 top-16 bottom-0 z-40 bg-white  transition-all duration-200 ease-in-out ${sidebarOpen ? 'w-[256px]' : 'w-0 overflow-hidden'}`}>
                <Sidebar isOpen={true} />
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-full relative z-0 min-w-0 pt-16 transition-all duration-200 ${sidebarOpen ? 'ml-[256px]' : 'ml-0'}`}>
                <main className="flex-1 overflow-auto bg-[#f0f2f5]  p-8 transition-colors">
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
