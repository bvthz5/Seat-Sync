import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar } from '@heroui/react';
import Sidebar from './Sidebar';
import { useAuth } from '../../../hooks/useAuth';
import { motion } from 'framer-motion';

const AdminLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const navigate = useNavigate();

    return (
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative z-0">
                {/* Glassmorphic Header */}
                <Navbar
                    maxWidth="full"
                    className="bg-white/70 backdrop-blur-md border-b border-white/50 shadow-sm sticky top-0 z-40 h-16"
                    isBordered={false}
                >
                    <NavbarContent justify="start">
                        <Button
                            isIconOnly
                            variant="light"
                            onPress={() => setSidebarOpen(!sidebarOpen)}
                            className="mr-2 text-slate-600 hover:bg-slate-100 rounded-full"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </Button>
                        <NavbarBrand>
                            <div className="flex flex-col">
                                <p className="font-bold text-lg text-primary tracking-tight">SeatSync Portal</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{user?.IsRootAdmin ? 'Central Administration' : 'Department Admin'}</p>
                            </div>
                        </NavbarBrand>
                    </NavbarContent>

                    <NavbarContent justify="end">
                        <NavbarItem className="flex items-center gap-4">
                            {/* Role Badge */}
                            <div className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${user?.IsRootAdmin
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-amber-100'
                                    : 'bg-blue-50 text-blue-700 border-blue-200 shadow-blue-100'
                                }`}>
                                {user?.IsRootAdmin ? '★ Super Admin' : '• Exam Admin'}
                            </div>

                            {/* Use Dropdown for better UX */}
                            <Dropdown placement="bottom-end">
                                <DropdownTrigger>
                                    <Avatar
                                        as="button"
                                        className="transition-transform w-8 h-8 text-xs font-bold ring-2 ring-primary/20 hover:ring-primary/40"
                                        name={user?.Email?.[0].toUpperCase()}
                                        color={user?.IsRootAdmin ? "warning" : "primary"}
                                    />
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Profile Actions" variant="flat">
                                    <DropdownItem key="profile" className="h-14 gap-2">
                                        <p className="font-semibold">Signed in as</p>
                                        <p className="font-semibold">{user?.Email}</p>
                                    </DropdownItem>
                                    <DropdownItem key="settings">My Settings</DropdownItem>
                                    <DropdownItem key="help_and_feedback">Help & Feedback</DropdownItem>
                                    <DropdownItem key="logout" color="danger" onPress={() => logout()}>
                                        Log Out
                                    </DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                        </NavbarItem>
                    </NavbarContent>
                </Navbar>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-0 relative scroll-smooth bg-transparent">
                    {/* Subtle animated background elements for depth */}
                    <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none -z-10" />

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="h-full"
                    >
                        <Outlet />
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
