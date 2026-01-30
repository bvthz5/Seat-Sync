import React, { useState } from 'react';
import { Button, Card, CardBody, Chip, Avatar, Pagination, Input, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import {
    Download,
    Plus,
    Hash,
    BookOpen,
    User,
    Users,
    MoreVertical,
    Search,
    Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

const Departments: React.FC = () => {
    // Mock Data for UI matching
    const stats = [
        { label: "DEPT CODE", value: "CS-IT", icon: <Hash className="text-blue-500" />, color: "bg-blue-50" },
        { label: "DEPT NAME", value: "Comp. Science", icon: <BookOpen className="text-purple-500" />, color: "bg-purple-50" },
        { label: "HEAD (HOD)", value: "Dr. S. Verma", icon: <User className="text-green-500" />, color: "bg-green-50" },
        { label: "TOTAL STUDENTS", value: "420", icon: <Users className="text-orange-500" />, color: "bg-orange-50" },
        { label: "TOTAL FACULTY", value: "28", icon: <Hash className="text-pink-500" />, color: "bg-pink-50" },
    ];

    const faculties = [
        { id: "#FAC-2024-001", name: "Dr. Arpit Saxena", role: "Sr. Professor", email: "arpit.s@university.edu", status: "Active", joinDate: "Joined Aug 2018", avatar: "A" },
        { id: "#FAC-2024-045", name: "Prof. Sarah J.", role: "Asst. Professor", email: "sarah.j@university.edu", status: "Active", joinDate: "Joined Jan 2021", avatar: "S" },
        { id: "#FAC-2024-112", name: "Dr. Mark Taylor", role: "Lecturer", email: "mark.t@university.edu", status: "On Leave", joinDate: "Joined Mar 2019", avatar: "M" },
        { id: "#FAC-2024-210", name: "Mrs. Emma Watson", role: "Asst. Professor", email: "emma.w@university.edu", status: "Active", joinDate: "Joined Nov 2022", avatar: "E" },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <motion.div
            className="p-8 max-w-[1600px] mx-auto space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Department Details</h1>
                    <p className="text-slate-500 mt-2 text-base font-medium">Manage core department metrics and faculty staff.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="bordered"
                        startContent={<Download size={18} />}
                        className="font-bold border-slate-300 text-slate-700 bg-white"
                    >
                        Export
                    </Button>
                    <Button
                        color="primary"
                        startContent={<Plus size={18} />}
                        className="font-bold bg-blue-600 shadow-md shadow-blue-500/20"
                    >
                        Add Department
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {stats.map((stat, index) => (
                    <Card key={index} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardBody className="p-6 h-full flex flex-col justify-between min-h-[140px]">
                            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                                <h3 className="text-2xl font-extrabold text-slate-800 leading-tight">{stat.value}</h3>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Faculty Table Section */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardBody className="p-0">
                    {/* Table Header / Toolbar */}
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="text-xl font-bold text-slate-800">Faculties in this Department</h3>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="flat"
                                size="sm"
                                className="bg-slate-100 text-slate-600 font-medium"
                                endContent={<Filter size={14} />}
                            >
                                Sort by: Name
                            </Button>
                            <Button isIconOnly variant="light" size="sm" className="text-slate-400">
                                <MoreVertical size={18} />
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {faculties.map((faculty) => (
                                    <tr key={faculty.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-500 font-mono">{faculty.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={faculty.avatar} size="sm" className="bg-slate-200 text-slate-600 font-bold" />
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{faculty.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{faculty.joinDate}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-600">{faculty.role}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{faculty.email}</td>
                                        <td className="px-6 py-4">
                                            <Chip
                                                size="sm"
                                                className={`font-bold border ${faculty.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}
                                            >
                                                {faculty.status}
                                            </Chip>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button isIconOnly variant="light" size="sm" className="text-slate-300 group-hover:text-slate-500">
                                                <MoreVertical size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-6 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-sm text-slate-500 font-medium">Showing 1 to 4 of 28 faculties</span>
                        <Pagination
                            total={3}
                            initialPage={1}
                            size="sm"
                            classNames={{
                                wrapper: "gap-2",
                                cursor: "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20",
                                item: "bg-transparent text-slate-600 font-medium hover:bg-slate-100",
                            }}
                        />
                    </div>
                </CardBody>
            </Card>
        </motion.div>
    );
};

export default Departments;
