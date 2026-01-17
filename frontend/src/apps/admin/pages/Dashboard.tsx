import React from 'react';
import { Button, Card, CardHeader, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tooltip } from '@heroui/react';
import { DashboardCards } from '../components/DashboardCards';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="p-8 max-w-[1600px] mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="mb-10 flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-primary tracking-tight">Dashboard Overview</h1>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Welcome back, get an update on recent exam activities.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        className="bg-primary text-white font-semibold shadow-lg shadow-primary/30"
                        size="md"
                        startContent={<span>➕</span>}
                    >
                        Create New Exam
                    </Button>
                    <Button
                        className="bg-white text-primary border border-primary/20 font-semibold shadow-sm hover:bg-slate-50"
                        variant="bordered"
                        size="md"
                        startContent={<span>⚙️</span>}
                    >
                        Settings
                    </Button>
                </div>
            </motion.div>

            <DashboardCards />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Table Section */}
                <motion.div variants={itemVariants} className="xl:col-span-2">
                    <Card className="border-none shadow-[0_10px_40px_rgba(0,0,0,0.08)] bg-white/70 backdrop-blur-md h-full">
                        <CardHeader className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">📅</div>
                                <h3 className="text-lg font-bold text-slate-800">Today's Schedule</h3>
                            </div>
                            <Button size="sm" variant="light" color="primary" className="font-semibold">View All</Button>
                        </CardHeader>
                        <CardBody className="p-0">
                            <Table
                                aria-label="Today's exams table"
                                removeWrapper
                                className="h-full"
                                classNames={{
                                    th: "bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider py-4 border-b border-slate-100",
                                    td: "py-4 border-b border-slate-50 group-hover:bg-blue-50/50 transition-colors",
                                    tr: "hover:bg-slate-50/50 transition-all cursor-pointer"
                                }}
                            >
                                <TableHeader>
                                    <TableColumn>EXAM SUBJECT</TableColumn>
                                    <TableColumn>SESSION TIME</TableColumn>
                                    <TableColumn>CANDIDATES</TableColumn>
                                    <TableColumn>STATUS</TableColumn>
                                    <TableColumn>ACTION</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    <TableRow key="1">
                                        <TableCell>
                                            <div>
                                                <p className="font-bold text-slate-700">Computer Science 101</p>
                                                <p className="text-xs text-slate-400">Hall A, B, C</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-slate-600">
                                                <span className="font-semibold">09:00 AM</span> - 12:00 PM
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">45</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-emerald-100">
                                                Live Now
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Tooltip content="Monitor Exam">
                                                    <span className="cursor-pointer text-lg opacity-70 hover:opacity-100 transition-opacity">👁️</span>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow key="2">
                                        <TableCell>
                                            <div>
                                                <p className="font-bold text-slate-700">Engineering Math II</p>
                                                <p className="text-xs text-slate-400">Hall D, E</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-slate-600">
                                                <span className="font-semibold">02:00 PM</span> - 05:00 PM
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">120</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-amber-100">
                                                Upcoming
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Tooltip content="Edit Details">
                                                    <span className="cursor-pointer text-lg opacity-70 hover:opacity-100 transition-opacity">✏️</span>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardBody>
                    </Card>
                </motion.div>

                {/* Secondary Actions Column */}
                <motion.div variants={itemVariants} className="xl:col-span-1 flex flex-col gap-6">
                    {/* Quick Actions Panel */}
                    <Card className="border-none shadow-lg bg-gradient-to-br from-primary to-primary-800 text-white overflow-visible relative">
                        {/* Decorative swirls */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <CardHeader className="px-6 pt-6 pb-2 relative z-10">
                            <h3 className="text-lg font-bold">Quick Actions</h3>
                        </CardHeader>
                        <CardBody className="px-6 pb-6 pt-2 flex flex-col gap-3 relative z-10">
                            <QuickActionButton label="Generate Seating Plan" icon="🪑" />
                            <QuickActionButton label="Assign New Invigilator" icon="👨‍🏫" />
                            <QuickActionButton label="Download Attendance Sheet" icon="📄" />
                            <QuickActionButton label="System Health Check" icon="💓" />
                        </CardBody>
                    </Card>

                    {/* Recent Alerts or Notifications */}
                    <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/40 p-6">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Live Alerts</h4>
                        <div className="flex flex-col gap-4">
                            <AlertItem title="Server maintenance scheduled" time="2h ago" type="info" />
                            <AlertItem title="Room 101 capacity reached" time="4h ago" type="warning" />
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

const QuickActionButton = ({ label, icon }: { label: string, icon: string }) => (
    <Button
        className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all font-medium py-6"
        startContent={<span className="text-xl bg-white/20 p-1.5 rounded-md backdrop-blur-sm">{icon}</span>}
    >
        {label}
    </Button>
);

const AlertItem = ({ title, time, type }: { title: string, time: string, type: 'info' | 'warning' }) => (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
        <div className={`w-2 h-2 mt-1.5 rounded-full ${type === 'info' ? 'bg-blue-400' : 'bg-amber-400'}`} />
        <div>
            <p className="text-sm font-semibold text-slate-700 leading-tight">{title}</p>
            <p className="text-xs text-slate-400 mt-1">{time}</p>
        </div>
    </div>
);

export default Dashboard;
