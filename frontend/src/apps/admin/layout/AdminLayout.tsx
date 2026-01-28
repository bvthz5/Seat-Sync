import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar, Badge } from '@heroui/react';
import Sidebar from './Sidebar';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Menu, Bell, Settings, LogOut, Search, Grip, HelpCircle } from 'lucide-react';

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

                {/* Omni-Search Box */}
                <div className="hidden md:flex max-w-2xl w-full mx-auto relative bg-[#f1f3f4]  rounded-lg h-12 items-center px-4 focus-within:bg-white  focus-within:shadow-md transition-all duration-200">
                    <Button isIconOnly size="sm" variant="light" radius="full" className="text-[#5f6368] ">
                        <Search size={20} />
                    </Button>
                    <input
                        type="text"
                        placeholder="Search student, rooms, or exams"
                        className="bg-transparent border-none outline-none w-full ml-2 text-[#202124]  placeholder-[#5f6368]  text-base"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button isIconOnly variant="light" radius="full" className="text-[#5f6368]  hover:bg-[#3c4043]/10 ">
                        <HelpCircle size={24} />
                    </Button>
                    <Button isIconOnly variant="light" radius="full" className="text-[#5f6368]  hover:bg-[#3c4043]/10 ">
                        <Settings size={24} />
                    </Button>
                    <Button isIconOnly variant="light" radius="full" className="text-[#5f6368]  hover:bg-[#3c4043]/10 ">
                        <Grip size={24} />
                    </Button>

                    {/* Profile Avatar */}
                    <Dropdown placement="bottom-end" classNames={{ content: " " }} disableAnimation>
                        <DropdownTrigger>
                            <div className="ml-2 cursor-pointer p-1 rounded-full hover:bg-[#f1f3f4]  transition-colors">
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
                            className="w-64 z-[9999] bg-white  shadow-xl rounded-xl border border-gray-100  p-2"
                        >
                            <DropdownItem key="profile" className="h-16 gap-2  " textValue="Signed in as">
                                <div className="flex flex-col">
                                    <p className="font-semibold">{user?.Email}</p>
                                    <p className="text-xs text-gray-500">{user?.IsRootAdmin ? 'Administrator' : 'User'}</p>
                                </div>
                            </DropdownItem>
                            <DropdownItem key="logout" className="text-danger " onPress={() => logout()} startContent={<LogOut size={18} />}>
                                Sign out
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
